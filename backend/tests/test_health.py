from fastapi.testclient import TestClient

from app.main import app


def test_health_ok():
    r = TestClient(app).get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["schema_version"]
    assert body["time"].endswith("+00:00")


def test_unknown_route_404():
    assert TestClient(app).get("/api/v1/does-not-exist").status_code == 404
