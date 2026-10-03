"""/api/v1 routes (docs/17_API_CONTRACT.md). Handlers stay thin; logic lives in app/services."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.services.data_integrity import ApiError, DataIntegrityService

router = APIRouter()

Severity = Literal["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
FindingStatus = Literal["OPEN", "UNDER_REVIEW", "CLOSED"]


class _Req(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AssetCreate(_Req):
    path: str = Field(description="YOLO dataset directory (absolute, or relative to an allowed data root, e.g. 'test/dataset')")
    name: str | None = None
    contributor_id: str | None = None


class AssessmentCreate(_Req):
    asset_id: str | None = None
    dataset_path: str | None = Field(None, description="convenience: register this dataset and assess it in one call")
    contributor_id: str | None = None
    assessment_type: Literal["DATASET_INTEGRITY", "MODEL_INTEGRITY", "PROVENANCE", "DISTRIBUTION_SHIFT"] = "DATASET_INTEGRITY"
    reference_asset_ids: list[str] = []
    options: dict = {}


class DispositionCreate(_Req):
    finding_id: str
    action: Literal["ACCEPT", "MONITOR", "REVIEW", "QUARANTINE", "ROLLBACK"]
    reason: str = Field(min_length=1)
    actor_id: str = Field(min_length=1)


def svc(request: Request) -> DataIntegrityService:
    return request.app.state.service


# ---------------------------------------------------------------- assets
@router.post("/assets", status_code=201, tags=["assets"])
def create_asset(body: AssetCreate, s: DataIntegrityService = Depends(svc)):
    return s.register_dataset(body.path, body.name, body.contributor_id)


@router.get("/assets", tags=["assets"])
def list_assets(s: DataIntegrityService = Depends(svc)):
    return s.store.list("asset")


@router.get("/assets/{asset_id}", tags=["assets"])
def get_asset(asset_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get_asset(asset_id)


# ---------------------------------------------------------------- assessments
@router.post("/assessments", status_code=202, tags=["assessments"])
def create_assessment(body: AssessmentCreate, bg: BackgroundTasks, s: DataIntegrityService = Depends(svc)):
    if not body.asset_id and not body.dataset_path:
        raise ApiError(422, "VALIDATION_ERROR", "provide asset_id or dataset_path")
    asset_id = body.asset_id or s.register_dataset(body.dataset_path, None, body.contributor_id)["asset_id"]
    asm = s.create_assessment(asset_id, body.assessment_type, body.options)
    if body.options.get("wait"):
        return s.run_assessment(asm["assessment_id"])
    bg.add_task(s.run_assessment, asm["assessment_id"])
    return asm


@router.get("/assessments", tags=["assessments"])
def list_assessments(s: DataIntegrityService = Depends(svc)):
    return s.store.list("assessment")


@router.get("/assessments/{assessment_id}", tags=["assessments"])
def get_assessment(assessment_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get_assessment(assessment_id)


# ---------------------------------------------------------------- findings & evidence
@router.get("/findings", tags=["findings"])
def list_findings(
    severity: Severity | None = None, status: FindingStatus | None = None, asset_id: str | None = None,
    contributor_id: str | None = None, assessment_id: str | None = None, s: DataIntegrityService = Depends(svc),
):
    out = s.store.list("finding")
    return [f for f in out
            if (not severity or f["severity"] == severity) and (not status or f["status"] == status)
            and (not asset_id or asset_id in f["affected_asset_ids"] or asset_id in f.get("sample_asset_ids", []))
            and (not contributor_id or f.get("contributor_id") == contributor_id)
            and (not assessment_id or f.get("assessment_id") == assessment_id)]


@router.get("/findings/{finding_id}", tags=["findings"])
def get_finding(finding_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get("finding", finding_id)


@router.get("/evidence", tags=["evidence"])
def list_evidence(assessment_id: str | None = None, detector: str | None = None, asset_id: str | None = None,
                  s: DataIntegrityService = Depends(svc)):
    out = s.store.list("evidence", parent=assessment_id) if assessment_id else s.store.list("evidence")
    return [e for e in out if (not detector or e["detector"] == detector) and (not asset_id or asset_id in e["asset_ids"])]


@router.get("/evidence/{evidence_id}", tags=["evidence"])
def get_evidence(evidence_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get("evidence", evidence_id)


# ---------------------------------------------------------------- incidents
@router.get("/incidents", tags=["incidents"])
def list_incidents(s: DataIntegrityService = Depends(svc)):
    return s.store.list("incident")


@router.get("/incidents/{incident_id}", tags=["incidents"])
def get_incident(incident_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get("incident", incident_id)


@router.get("/incidents/{incident_id}/graph", tags=["incidents"])
def incident_graph(incident_id: str, s: DataIntegrityService = Depends(svc)):
    return s.graph(incident_id)


@router.get("/incidents/{incident_id}/timeline", tags=["incidents"])
def incident_timeline(incident_id: str, s: DataIntegrityService = Depends(svc)):
    return s.get("incident", incident_id)["timeline"]


@router.get("/incidents/{incident_id}/objective", tags=["incidents"])
def incident_objective(incident_id: str, s: DataIntegrityService = Depends(svc)):
    s.get("incident", incident_id)
    return []  # objective inference (docs/08) not implemented: never invent a hypothesis


# ---------------------------------------------------------------- governance & audit
@router.post("/dispositions", status_code=201, tags=["governance"])
def create_disposition(body: DispositionCreate, s: DataIntegrityService = Depends(svc)):
    return s.dispose(body.finding_id, body.action, body.reason, body.actor_id)


@router.get("/audit/events", tags=["audit"])
def audit_events(s: DataIntegrityService = Depends(svc)):
    return s.audit.events()


@router.post("/audit/verify", tags=["audit"])
def audit_verify(s: DataIntegrityService = Depends(svc)):
    return s.audit.verify()


@router.post("/provenance/verify", tags=["provenance"])
def provenance_verify():
    raise ApiError(501, "CAPABILITY_NOT_IMPLEMENTED", "Inference provenance verification is not implemented in this backend yet.",
                   recoverable=True, fallback="frontend mock mode")


@router.get("/capabilities", tags=["system"])
def capabilities():
    from app.engines.data_integrity import embeddings

    enc = embeddings.available()
    return [
        {"name": "YOLO dataset ingest (local path)", "area": "Data", "status": "SUPPORTED", "access_modes": ["FILE_ONLY"],
         "notes": "COCO and multipart upload not implemented yet"},
        {"name": "Corner-patch trigger detection", "area": "Data", "status": "PARTIAL", "access_modes": ["FILE_ONLY"],
         "notes": "Small square corner patches; strongest on saturated digital colours (see results/data_integrity_eval.md)"},
        {"name": "Label-flip detection (kNN, ResNet-18 crops)", "area": "Data", "status": "SUPPORTED" if enc else "NOT_SUPPORTED",
         "access_modes": ["FILE_ONLY"], "notes": "Boxes >= 12 px only" if enc else "Encoder weights missing (scripts/fetch_weights.py)"},
        {"name": "Exact and near-duplicate detection (sha256, pHash, embedding)", "area": "Data", "status": "SUPPORTED",
         "access_modes": ["FILE_ONLY"], "notes": "" if enc else "pHash-only fallback"},
        {"name": "OOD / contributor roll-up", "area": "Data", "status": "NOT_SUPPORTED", "access_modes": [], "notes": "Planned"},
        {"name": "Model integrity analysis", "area": "Model", "status": "NOT_SUPPORTED", "access_modes": [], "notes": "Planned"},
        {"name": "Inference provenance verification", "area": "Provenance", "status": "NOT_SUPPORTED", "access_modes": [], "notes": "Planned"},
        {"name": "Distribution-shift characterisation", "area": "Drift", "status": "NOT_SUPPORTED", "access_modes": [], "notes": "Planned"},
        {"name": "Hash-chained audit log (HMAC-SHA256, local key)", "area": "Audit", "status": "PARTIAL", "access_modes": ["N_A"],
         "notes": "Ed25519 signatures and checkpoints pending"},
    ]
