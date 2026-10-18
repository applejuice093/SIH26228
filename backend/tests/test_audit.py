"""Audit chain: tamper detection and key handling (stdlib only)."""
import json

import pytest

from app.repositories.store import Store
from app.services.audit import KIND, Audit


@pytest.fixture
def audit(tmp_path):
    store = Store(tmp_path / "db.sqlite3")
    yield Audit(store, tmp_path / "audit.key")
    store.close()


def test_key_file_created_private(tmp_path, audit):
    key = tmp_path / "audit.key"
    assert key.stat().st_mode & 0o777 == 0o600
    assert len(bytes.fromhex(key.read_text())) == 32


def test_bad_key_file_rejected(tmp_path):
    store = Store(tmp_path / "db.sqlite3")
    (tmp_path / "k1").write_text("not-hex")
    with pytest.raises(ValueError, match="not valid hex"):
        Audit(store, tmp_path / "k1")
    (tmp_path / "k2").write_text("abcd")
    with pytest.raises(ValueError, match="too short"):
        Audit(store, tmp_path / "k2")
    store.close()


def test_clean_chain_verifies(audit):
    for i in range(3):
        audit.append("TEST", [f"X-{i}"], {"i": i})
    r = audit.verify()
    assert r["chain_valid"] and r["signatures_valid"] and r["first_failure"] is None
    assert r["events_checked"] == 3


def test_payload_edit_breaks_chain(audit):
    for i in range(3):
        audit.append("TEST", [f"X-{i}"], {"i": i})
    ev = audit.store.get(KIND, "AUD-2")
    ev["payload"]["i"] = 99
    audit.store.put(KIND, "AUD-2", ev)
    r = audit.verify()
    assert not r["chain_valid"] and r["first_failure"] == 2


def test_stripped_fields_reported_not_raised(audit):
    audit.append("TEST", ["X"])
    ev = audit.store.get(KIND, "AUD-1")
    del ev["signature"], ev["record_digest"]
    audit.store._db.execute("UPDATE docs SET body=? WHERE kind=? AND id=?", (json.dumps(ev), KIND, "AUD-1"))
    r = audit.verify()
    assert not r["chain_valid"] and not r["signatures_valid"] and r["first_failure"] == 1


def test_wrong_key_fails_signatures(tmp_path, audit):
    audit.append("TEST", ["X"])
    other = Audit(audit.store, tmp_path / "other.key")
    r = other.verify()
    assert r["chain_valid"] and not r["signatures_valid"]
