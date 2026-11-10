"""App-level error handling: validation errors must always serialise to JSON."""
from fastapi.testclient import TestClient
from pydantic import BaseModel, field_validator

from app.core.config import BACKEND_ROOT, Settings
from app.main import create_app


class _Body(BaseModel):
    value: int

    @field_validator("value")
    @classmethod
    def _positive(cls, v):
        if v <= 0:
            raise ValueError("must be positive")
        return v


def _client(tmp_path):
    app = create_app(Settings(cors_origins=[], db_path=tmp_path / "db.sqlite3",
                              data_roots=[(BACKEND_ROOT / "testdata").resolve()],
                              audit_key_path=tmp_path / "audit.key"))

    @app.post("/_probe")
    def _probe(body: _Body):
        return {"ok": body.value}

    return TestClient(app)


def test_custom_validator_error_returns_422_json(tmp_path):
    r = _client(tmp_path).post("/_probe", json={"value": -1})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR"
    assert "must be positive" in str(err["details"])
