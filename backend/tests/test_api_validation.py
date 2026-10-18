"""Fast API validation / governance tests that don't run a full scan."""
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.test_api import make_settings


@pytest.fixture
def client(tmp_path):
    app = create_app(make_settings(tmp_path))
    with TestClient(app) as c:
        yield c


def _seed_finding(client, fid="FND-1", status="OPEN"):
    store = client.app.state.store
    store.put("asset", "AST-001", {"asset_id": "AST-001", "status": "UNTRUSTED"})
    store.put("finding", fid, {"finding_id": fid, "status": status, "affected_asset_ids": ["AST-001"], "incident_id": None})


def test_assessment_needs_exactly_one_target(client):
    r = client.post("/api/v1/assessments", json={})
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"
    r = client.post("/api/v1/assessments", json={"asset_id": "AST-001", "dataset_path": "test/dataset"})
    assert r.status_code == 422 and "not both" in r.json()["error"]["message"]


def test_empty_asset_path_rejected(client):
    r = client.post("/api/v1/assets", json={"path": ""})
    assert r.status_code == 422


def test_path_outside_roots_forbidden(client):
    r = client.post("/api/v1/assets", json={"path": "/etc"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "PATH_NOT_ALLOWED"


def test_traversal_outside_roots_forbidden(client):
    r = client.post("/api/v1/assets", json={"path": "../app"})
    assert r.status_code == 403


def test_unknown_ids_are_404(client):
    for path in ("/api/v1/assets/AST-999", "/api/v1/assessments/ASM-999", "/api/v1/findings/FND-999",
                 "/api/v1/incidents/INC-999/graph"):
        r = client.get(path)
        assert r.status_code == 404, path
        assert r.json()["error"]["code"] == "NOT_FOUND"


def test_disposition_closes_then_conflicts(client):
    _seed_finding(client)
    body = {"finding_id": "FND-1", "action": "QUARANTINE", "reason": "trigger patch", "actor_id": "analyst-1"}
    assert client.post("/api/v1/dispositions", json=body).status_code == 201
    assert client.get("/api/v1/assets/AST-001").json()["status"] == "QUARANTINED"
    r = client.post("/api/v1/dispositions", json={**body, "action": "ACCEPT"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "FINDING_CLOSED"
    assert client.post("/api/v1/audit/verify").json()["chain_valid"]


def test_review_keeps_finding_open_for_more_actions(client):
    _seed_finding(client)
    body = {"finding_id": "FND-1", "action": "REVIEW", "reason": "check", "actor_id": "a"}
    assert client.post("/api/v1/dispositions", json=body).status_code == 201
    assert client.get("/api/v1/findings/FND-1").json()["status"] == "UNDER_REVIEW"
    assert client.post("/api/v1/dispositions", json={**body, "action": "ACCEPT"}).status_code == 201


def test_provenance_is_honestly_unimplemented(client):
    r = client.post("/api/v1/provenance/verify")
    assert r.status_code == 501 and r.json()["error"]["code"] == "CAPABILITY_NOT_IMPLEMENTED"
