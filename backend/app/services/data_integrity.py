"""Application service: register datasets, run data-integrity assessments, build findings/incidents.

Route handlers call into here; ML logic stays in app/engines (docs/10 section 2).
"""
from __future__ import annotations

import hashlib
import traceback
from datetime import datetime, timezone
from pathlib import Path

from app.core import thresholds as th
from app.core.config import Settings
from app.engines.data_integrity import embeddings, label_flip, near_duplicate, patch_trigger
from app.engines.data_integrity.dataset import load_yolo
from app.engines.data_integrity.records import stable_id
from app.repositories.store import Store
from app.schemas.records import Evidence, Finding
from app.services.audit import Audit

SEV_ORDER = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, recoverable: bool = True, **extra):
        super().__init__(message)
        self.status, self.body = status, {"code": code, "message": message, "recoverable": recoverable, **extra}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _max_sev(sevs) -> str:
    return max(sevs, key=SEV_ORDER.index) if sevs else "INFO"


class DataIntegrityService:
    def __init__(self, store: Store, audit: Audit, settings: Settings):
        self.store, self.audit, self.settings = store, audit, settings

    # ------------------------------------------------------------------ assets
    def _resolve_dataset(self, path: str) -> Path:
        p = Path(path)
        if not p.is_absolute():
            # relative paths are resolved against each allowed root (e.g. "test/dataset")
            for root in self.settings.data_roots:
                if (root / p).exists():
                    p = root / p
                    break
        p = p.resolve()
        if not any(p == r or p.is_relative_to(r) for r in self.settings.data_roots):
            raise ApiError(403, "PATH_NOT_ALLOWED", f"dataset path must be inside one of {[str(r) for r in self.settings.data_roots]}",
                           recoverable=False)
        if not (p / "images").is_dir():
            raise ApiError(422, "DATASET_FORMAT_UNSUPPORTED", "expected a YOLO dataset directory with images/ and labels/")
        return p

    def register_dataset(self, path: str, name: str | None, contributor_id: str | None) -> dict:
        p = self._resolve_dataset(path)
        ds = load_yolo(p)
        manifest = "\n".join(f"{s.sample_id} {s.sha256}" for s in ds.samples)
        digest = hashlib.sha256(manifest.encode()).hexdigest()
        size = sum(s.image_path.stat().st_size + (s.label_path.stat().st_size if s.label_path else 0) for s in ds.samples)
        seq = self.store.next_seq("asset")
        aid = f"AST-{seq:03d}"
        asset = {
            "asset_id": aid, "asset_type": "DATASET", "name": name or f"{p.parent.name}/{p.name} (YOLO)",
            "sha256": "sha256:" + digest, "byte_size": size,
            "source": {"contributor_id": contributor_id or "UNKNOWN", "submission_id": f"SUB-{seq:03d}"},
            "created_at": _now(), "ingested_at": _now(), "status": "UNTRUSTED",
            "path": str(p), "format": "YOLO", "sample_count": len(ds.samples),
            "structural_errors": sum(len(s.label_errors) for s in ds.samples),
            "manifest_digest_method": "sha256 over sorted '<sample_id> sha256:<hex>' lines",
        }
        self.store.put("asset", aid, asset, seq=seq)
        self.audit.append("ASSET_REGISTERED", [aid], {"sha256": asset["sha256"], "path": str(p)})
        return asset

    def get_asset(self, asset_id: str) -> dict:
        a = self.store.get("asset", asset_id)
        if not a:
            raise ApiError(404, "NOT_FOUND", f"asset {asset_id} not found")
        return a

    # ------------------------------------------------------------------ assessments
    def create_assessment(self, asset_id: str, assessment_type: str, options: dict) -> dict:
        asset = self.get_asset(asset_id)
        if assessment_type != "DATASET_INTEGRITY":
            raise ApiError(422, "ASSESSMENT_TYPE_NOT_SUPPORTED", f"{assessment_type} is not implemented yet; only DATASET_INTEGRITY")
        if asset["asset_type"] != "DATASET":
            raise ApiError(422, "ASSET_TYPE_MISMATCH", "DATASET_INTEGRITY needs a DATASET asset")
        seq = self.store.next_seq("assessment")
        asm = {
            "assessment_id": f"ASM-{seq:03d}", "asset_id": asset_id, "assessment_type": assessment_type,
            "status": "QUEUED", "progress": 0.0, "access_mode": "FILE_ONLY", "started_at": _now(), "finished_at": None,
            "finding_ids": [], "evidence_ids": [], "incident_id": None, "options": options or {},
            "detectors": {}, "errors": [],
        }
        self.store.put("assessment", asm["assessment_id"], asm, parent=asset_id, seq=seq)
        self.audit.append("ASSESSMENT_STARTED", [asm["assessment_id"], asset_id], {"assessment_type": assessment_type})
        return asm

    def get_assessment(self, assessment_id: str) -> dict:
        a = self.store.get("assessment", assessment_id)
        if not a:
            raise ApiError(404, "NOT_FOUND", f"assessment {assessment_id} not found")
        return a

    def _save(self, asm: dict) -> None:
        self.store.put("assessment", asm["assessment_id"], asm, parent=asm["asset_id"])

    def run_assessment(self, assessment_id: str) -> dict:
        asm = self.get_assessment(assessment_id)
        asset = self.get_asset(asm["asset_id"])
        asm["status"] = "RUNNING"
        self._save(asm)
        try:
            ds = load_yolo(asset["path"])
            steps = [
                (patch_trigger.DETECTOR, lambda: patch_trigger.detect(ds, th.for_detector(patch_trigger.DETECTOR))[0]),
                (label_flip.DETECTOR, lambda: self._run_flip(ds)),
                (near_duplicate.DETECTOR, lambda: near_duplicate.detect(ds, th.for_detector(near_duplicate.DETECTOR))[0]),
            ]
            by_det: dict[str, list[Evidence]] = {}
            for i, (name, fn) in enumerate(steps):
                try:
                    evs = fn()
                    by_det[name] = [self._rekey(e, assessment_id) for e in evs]
                    asm["detectors"][name] = {"status": "SUCCEEDED", "evidence": len(evs)}
                except embeddings.EncoderUnavailable as e:
                    asm["detectors"][name] = {"status": "UNAVAILABLE"}
                    asm["errors"].append({"code": e.code, "message": str(e), "recoverable": True, "detector": name,
                                          "fallback": "detector skipped; coverage reported as PARTIAL"})
                asm["progress"] = round((i + 1) / (len(steps) + 1), 3)
                self._save(asm)
            for evs in by_det.values():
                for e in evs:
                    self.store.put("evidence", e.evidence_id, e.model_dump(), parent=assessment_id)
            findings = self._findings(asm, asset, ds, by_det)
            inc = self._incident(asm, asset, findings, by_det) if findings else None
            asm["evidence_ids"] = [e.evidence_id for evs in by_det.values() for e in evs]
            asm["finding_ids"] = [f["finding_id"] for f in findings]
            asm["incident_id"] = inc["incident_id"] if inc else None
            asm["status"], asm["progress"], asm["finished_at"] = "SUCCEEDED", 1.0, _now()
            self._save(asm)
            self.audit.append("EVIDENCE_RECORDED", [assessment_id], {"evidence_ids": asm["evidence_ids"]})
            self.audit.append("ASSESSMENT_COMPLETED", [assessment_id, asset["asset_id"]],
                              {"finding_ids": asm["finding_ids"], "incident_id": asm["incident_id"]})
        except Exception as e:  # structured failure, never a silent crash
            asm["status"], asm["finished_at"] = "FAILED", _now()
            asm["errors"].append({"code": "ASSESSMENT_FAILED", "message": f"{type(e).__name__}: {e}", "recoverable": False,
                                  "trace_tail": traceback.format_exc().splitlines()[-3:]})
            self._save(asm)
            self.audit.append("ASSESSMENT_FAILED", [assessment_id], {"error": str(e)})
        return asm

    @staticmethod
    def _run_flip(ds):
        cfg = th.load()["detectors"][label_flip.DETECTOR]
        if not embeddings.available():
            raise embeddings.EncoderUnavailable("ResNet-18 weights not available locally")
        return label_flip.detect(ds, cfg["thresholds"], label_flip.FlipParams(**cfg["params"]))[0]

    @staticmethod
    def _rekey(e: Evidence, assessment_id: str) -> Evidence:
        # Detector IDs are reproducible per input; scope them to this assessment so re-scans don't collide.
        return e.model_copy(update={"evidence_id": stable_id("EV", assessment_id, e.evidence_id)})

    # ------------------------------------------------------------------ findings / incidents
    def _findings(self, asm: dict, asset: dict, ds, by_det: dict[str, list[Evidence]]) -> list[dict]:
        n_img = len(ds.samples)
        contributor = asset["source"]["contributor_id"]
        out = []
        coverage = {"images_scanned": n_img, "detectors": asm["detectors"]}

        def add(evs: list[Evidence], summary: str, reason: str, sev: str, disp: str):
            seq = self.store.next_seq("finding")
            f = Finding(
                finding_id=f"FND-{seq}", incident_id=None, assessment_id=asm["assessment_id"], contributor_id=contributor,
                summary=summary, reason=reason, evidence_ids=[e.evidence_id for e in evs],
                affected_asset_ids=[asset["asset_id"]], severity=sev,
                confidence=round(sum(e.confidence for e in evs) / len(evs), 3), status="OPEN",
                recommended_disposition=disp, limitations=evs[0].limitations, coverage=coverage,
            ).model_dump()
            f["detector"] = evs[0].detector
            f["sample_asset_ids"] = sorted({a for e in evs for a in e.asset_ids})
            self.store.put("finding", f["finding_id"], f, parent=asm["assessment_id"], seq=seq)
            out.append(f)

        evs = by_det.get(patch_trigger.DETECTOR) or []
        if evs:
            corners = {}
            for e in evs:
                c = e.measurements["window"]["corner"]
                corners[c] = corners.get(c, 0) + 1
            corner_txt = ", ".join(f"{k.replace('_', ' ')} x{v}" for k, v in sorted(corners.items()))
            add(evs, f"POSSIBLE_POISON: corner-patch trigger candidates in {len(evs)} of {n_img} images",
                f"{len(evs)} images contain a small corner square inconsistent with their own content and with batch corners "
                f"(corners: {corner_txt}). A repeated patch across images is consistent with a backdoor trigger, not proof of one.",
                "HIGH" if len(evs) >= 2 else "MEDIUM", "QUARANTINE" if len(evs) >= 2 else "REVIEW")
        evs = by_det.get(label_flip.DETECTOR) or []
        if evs:
            imgs = {e.measurements["sample_id"] for e in evs}
            pairs = {}
            for e in evs:
                k = f"{e.measurements['label_name']}->{e.measurements['suggested_name']}"
                pairs[k] = pairs.get(k, 0) + 1
            top = ", ".join(f"{k} x{v}" for k, v in sorted(pairs.items(), key=lambda t: -t[1])[:4])
            add(evs, f"{len(evs)} labels in {len(imgs)} images disagree with their visual neighbours",
                f"kNN label agreement in an embedding space flags {len(evs)} boxes (most common: {top}). Includes natural "
                f"annotation ambiguity; review before relabelling.", "MEDIUM" if len(evs) >= 5 else "LOW", "REVIEW")
        evs = by_det.get(near_duplicate.DETECTOR) or []
        if evs:
            members = {s for e in evs for s in e.measurements["sample_ids"]}
            share = len(members) / max(n_img, 1)
            add(evs, f"{len(evs)} near-duplicate groups covering {len(members)} of {n_img} images ({share:.0%})",
                f"pHash candidates confirmed by embedding similarity. Redundant samples inflate effective weight; "
                f"some may be natural repeats from the same camera sequence.", "MEDIUM" if share >= 0.1 else "LOW", "REVIEW")
        return out

    def _incident(self, asm: dict, asset: dict, findings: list[dict], by_det) -> dict:
        seq = self.store.next_seq("incident")
        iid = f"INC-{seq:03d}"
        sev = _max_sev([f["severity"] for f in findings])
        for f in findings:
            f["incident_id"] = iid
            self.store.put("finding", f["finding_id"], f, parent=asm["assessment_id"])
        flip_ok = asm["detectors"].get(label_flip.DETECTOR, {}).get("status") == "SUCCEEDED"
        inc = {
            "incident_id": iid, "title": f"Data-integrity anomalies in {asset['name']}",
            "state": "QUARANTINE_RECOMMENDED" if sev in ("HIGH", "CRITICAL") else "REVIEW_REQUIRED",
            "severity": sev, "opened_at": _now(),
            "summary": "; ".join(f["summary"] for f in findings) + ".",
            "finding_ids": [f["finding_id"] for f in findings],
            "evidence_ids": [e for f in findings for e in f["evidence_ids"]],
            "blast_radius": [{"asset_id": asset["asset_id"], "relation": "scanned dataset", "risk": sev}],
            "timeline": [
                {"at": asset["ingested_at"], "label": f"{asset['source']['contributor_id']} dataset registered", "ref": asset["asset_id"]},
                {"at": asm["started_at"], "label": "Data-integrity assessment started", "ref": asm["assessment_id"]},
            ] + [{"at": _now(), "label": f["summary"], "ref": f["finding_id"], "severity": f["severity"]} for f in findings],
            "limitations": ["Downstream lineage (training runs, models) is not linked yet, so blast radius covers only the scanned dataset.",
                            "Objective inference (docs/08) is not implemented; no hypothesis is proposed."]
                           + ([] if flip_ok else ["Label-flip detector unavailable (encoder weights missing)."]),
            "coverage": {"data": "COVERED" if flip_ok else "PARTIAL", "model": "NOT_SUPPORTED",
                         "provenance": "NOT_SUPPORTED", "drift": "NOT_SUPPORTED"},
            "dispositions": [], "assessment_id": asm["assessment_id"], "asset_id": asset["asset_id"],
        }
        self.store.put("incident", iid, inc, parent=asm["assessment_id"], seq=seq)
        self.audit.append("INCIDENT_OPENED", [iid] + inc["finding_ids"], {"severity": sev})
        return inc

    def graph(self, incident_id: str) -> dict:
        inc = self.get("incident", incident_id)
        asset = self.get_asset(inc["asset_id"])
        c = asset["source"]["contributor_id"]
        nodes = [{"id": c, "type": "CONTRIBUTOR"}, {"id": asset["asset_id"], "type": "DATASET", "label": asset["name"][:28]}]
        edges = [{"source": c, "target": asset["asset_id"], "relation": "SUBMITTED"}]
        for fid in inc["finding_ids"]:
            f = self.get("finding", fid)
            ev = max((self.store.get("evidence", e) for e in f["evidence_ids"]), key=lambda e: e["confidence"])
            nodes.append({"id": ev["evidence_id"], "type": "EVIDENCE", "label": f["detector"]})
            edges.append({"source": ev["evidence_id"], "target": asset["asset_id"], "relation": "FLAGS"})
        return {"nodes": nodes, "edges": edges}

    # ------------------------------------------------------------------ generic
    def get(self, kind: str, id_: str) -> dict:
        d = self.store.get(kind, id_)
        if not d:
            raise ApiError(404, "NOT_FOUND", f"{kind} {id_} not found")
        return d

    def dispose(self, finding_id: str, action: str, reason: str, actor_id: str) -> dict:
        f = self.get("finding", finding_id)
        seq = self.store.next_seq("disposition")
        ev = self.audit.append(f"DISPOSITION_{action}", [finding_id] + f["affected_asset_ids"], {"reason": reason}, actor_id=actor_id)
        d = {"disposition_id": f"DSP-{seq}", "finding_id": finding_id, "action": action, "reason": reason,
             "actor_id": actor_id, "created_at": ev["timestamp"], "audit_event_id": ev["event_id"]}
        self.store.put("disposition", d["disposition_id"], d, parent=finding_id, seq=seq)
        f["status"] = "CLOSED" if action in ("ACCEPT", "QUARANTINE", "ROLLBACK") else "UNDER_REVIEW"
        self.store.put("finding", finding_id, f)
        if action == "QUARANTINE":
            for aid in f["affected_asset_ids"]:
                a = self.store.get("asset", aid)
                if a:
                    a["status"] = "QUARANTINED"
                    self.store.put("asset", aid, a)
        if f.get("incident_id"):
            inc = self.store.get("incident", f["incident_id"])
            if inc:
                inc["dispositions"].append(d)
                inc["state"] = "HUMAN_DISPOSITION"
                self.store.put("incident", inc["incident_id"], inc)
        return d
