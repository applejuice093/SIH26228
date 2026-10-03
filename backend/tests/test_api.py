"""API integration tests: scan the held-out TEST split through /api/v1 and check shapes the frontend consumes."""
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.core.config import BACKEND_ROOT, Settings
from app.engines.data_integrity import embeddings
from app.main import create_app

# Keys the frontend's src/api/types.ts requires.
ASSET_KEYS = {"asset_id", "asset_type", "name", "sha256", "byte_size", "source", "created_at", "ingested_at", "status"}
ASSESSMENT_KEYS = {"assessment_id", "asset_id", "assessment_type", "status", "progress", "access_mode", "started_at", "finding_ids"}
FINDING_KEYS = {"finding_id", "incident_id", "assessment_id", "summary", "reason", "evidence_ids", "affected_asset_ids",
                "severity", "confidence", "status", "recommended_disposition", "limitations"}
EVIDENCE_KEYS = {"evidence_id", "evidence_type", "detector", "detector_version", "access_mode", "asset_ids", "observation",
                 "measurements", "baseline", "decision_rule", "confidence", "severity", "limitations", "created_at"}
INCIDENT_KEYS = {"incident_id", "title", "state", "severity", "opened_at", "summary", "finding_ids", "evidence_ids",
                 "blast_radius", "timeline", "limitations", "coverage", "dispositions"}


def make_settings(tmp):
    return Settings(cors_origins=[], db_path=tmp / "db.sqlite3", data_roots=[(BACKEND_ROOT / "testdata").resolve()],
                    audit_key_path=tmp / "audit.key")


@pytest.fixture(scope="module")
def env(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("api")
    client = TestClient(create_app(make_settings(tmp)))
    r = client.post("/api/v1/assessments", json={"dataset_path": "test/dataset", "contributor_id": "C17"})
    assert r.status_code == 202, r.text
    assert r.json()["status"] == "QUEUED"
    return tmp, client, r.json()["assessment_id"]


def test_scan_test_split_succeeds(env, results):
    _, c, asm_id = env
    a = c.get(f"/api/v1/assessments/{asm_id}").json()   # TestClient runs the background task before returning
    assert a["status"] == "SUCCEEDED", a["errors"]
    assert ASSESSMENT_KEYS <= a.keys() and a["progress"] == 1.0
    det = a["detectors"]
    assert det["corner_patch_trigger"]["evidence"] == results["detectors"]["corner_patch_trigger"]["test"]["caught"] + \
        results["detectors"]["corner_patch_trigger"]["test"]["false_flags"]
    if embeddings.available():
        b = results["detectors"]["label_flip_knn"]["test"]["box_level"]
        assert det["label_flip_knn"]["evidence"] == b["caught"] + b["false_flags"]
    assert len(a["finding_ids"]) >= 2 and a["incident_id"]


def test_assets_and_findings_shapes(env):
    _, c, asm_id = env
    assets = c.get("/api/v1/assets").json()
    assert len(assets) == 1 and ASSET_KEYS <= assets[0].keys() and assets[0]["sample_count"] == 89
    fs = c.get("/api/v1/findings").json()
    assert fs and all(FINDING_KEYS <= f.keys() for f in fs)
    assert all(f["contributor_id"] == "C17" for f in fs)
    assert {f["detector"] for f in fs} >= {"corner_patch_trigger", "near_duplicate"}
    for f in fs:
        assert c.get(f"/api/v1/findings/{f['finding_id']}").json() == f


def test_finding_filters(env):
    _, c, asm_id = env
    allf = c.get("/api/v1/findings").json()
    high = c.get("/api/v1/findings", params={"severity": "HIGH"}).json()
    assert high and all(f["severity"] == "HIGH" for f in high)
    assert c.get("/api/v1/findings", params={"assessment_id": asm_id}).json() == allf
    assert c.get("/api/v1/findings", params={"contributor_id": "nobody"}).json() == []
    assert c.get("/api/v1/findings", params={"asset_id": allf[0]["affected_asset_ids"][0]}).json() == allf
    # frontend sends empty strings for unset filters? it doesn't (URLSearchParams of {}), but unknown enums are rejected
    assert c.get("/api/v1/findings", params={"severity": "SEVERE"}).status_code == 422


def test_evidence_list_and_get(env):
    _, c, asm_id = env
    evs = c.get("/api/v1/evidence").json()
    assert evs and all(EVIDENCE_KEYS <= e.keys() for e in evs)
    one = evs[0]
    assert c.get(f"/api/v1/evidence/{one['evidence_id']}").json() == one
    patch = c.get("/api/v1/evidence", params={"detector": "corner_patch_trigger"}).json()
    assert patch and all(e["detector"] == "corner_patch_trigger" for e in patch)
    ids = {e["evidence_id"] for e in evs}
    for f in c.get("/api/v1/findings").json():
        assert set(f["evidence_ids"]) <= ids
    r = c.get("/api/v1/evidence/EV-NOPE")
    assert r.status_code == 404 and r.json()["error"]["code"] == "NOT_FOUND"


def test_incident_graph_objective(env):
    _, c, asm_id = env
    incs = c.get("/api/v1/incidents").json()
    assert len(incs) == 1 and INCIDENT_KEYS <= incs[0].keys()
    iid = incs[0]["incident_id"]
    assert iid == "INC-001"
    g = c.get(f"/api/v1/incidents/{iid}/graph").json()
    ids = {n["id"] for n in g["nodes"]}
    assert all(e["source"] in ids and e["target"] in ids for e in g["edges"])
    assert c.get(f"/api/v1/incidents/{iid}/objective").json() == []
    assert c.get(f"/api/v1/incidents/{iid}/timeline").json()


def test_capabilities_and_provenance(env):
    _, c, _ = env
    caps = c.get("/api/v1/capabilities").json()
    assert all({"name", "area", "status", "access_modes", "notes"} <= x.keys() for x in caps)
    r = c.post("/api/v1/provenance/verify", json={"record_path": "x", "expected_key_ids": []})
    assert r.status_code == 501 and r.json()["error"]["code"] == "CAPABILITY_NOT_IMPLEMENTED"


def test_rejects_paths_outside_data_roots(env):
    _, c, _ = env
    r = c.post("/api/v1/assets", json={"path": "/etc"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "PATH_NOT_ALLOWED"
    r = c.post("/api/v1/assets", json={"path": "test/../../app"})
    assert r.status_code == 403
    assert c.post("/api/v1/assets", json={"path": "test/dataset", "evil": 1}).status_code == 422
    r = c.post("/api/v1/assessments", json={"dataset_path": "test/dataset", "assessment_type": "MODEL_INTEGRITY"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "ASSESSMENT_TYPE_NOT_SUPPORTED"


def test_disposition_creates_audit_event_and_chain_verifies(env):
    tmp, c, _ = env
    f = c.get("/api/v1/findings", params={"severity": "HIGH"}).json()[0]
    before = len(c.get("/api/v1/audit/events").json())
    r = c.post("/api/v1/dispositions", json={"finding_id": f["finding_id"], "action": "QUARANTINE",
                                             "reason": "Analyst reviewed supporting evidence", "actor_id": "ANALYST-01"})
    assert r.status_code == 201
    events = c.get("/api/v1/audit/events").json()
    assert len(events) == before + 1 and events[-1]["event_id"] == r.json()["audit_event_id"]
    assert events[-1]["event_type"] == "DISPOSITION_QUARANTINE"
    assert c.get(f"/api/v1/assets/{f['affected_asset_ids'][0]}").json()["status"] == "QUARANTINED"
    v = c.post("/api/v1/audit/verify").json()
    assert v["chain_valid"] and v["signatures_valid"] and v["first_failure"] is None and v["events_checked"] == len(events)
    assert c.post("/api/v1/dispositions", json={"finding_id": f["finding_id"], "action": "DELETE", "reason": "x",
                                                "actor_id": "A"}).status_code == 422


def test_persistence_and_tamper_detection(env):
    tmp, c, asm_id = env
    # a fresh app on the same SQLite file sees the same records
    c2 = TestClient(create_app(make_settings(tmp)))
    assert c2.get("/api/v1/findings").json() == c.get("/api/v1/findings").json()
    # editing a stored audit event breaks the chain at that event
    db = sqlite3.connect(tmp / "db.sqlite3")
    body = json.loads(db.execute("SELECT body FROM docs WHERE kind='audit' AND id='AUD-2'").fetchone()[0])
    body["actor_id"] = "MALLORY"
    db.execute("UPDATE docs SET body=? WHERE kind='audit' AND id='AUD-2'", (json.dumps(body),))
    db.commit()
    v = c2.post("/api/v1/audit/verify").json()
    assert v["chain_valid"] is False and v["first_failure"] == 2
