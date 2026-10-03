"""Forensic audit chain: hash-linked events with an HMAC-SHA256 signature (local key).

record_digest = sha256(canonical JSON of the event without digest/signature fields)
signature     = hmac-sha256(key, record_digest)
Each event stores the previous event's record_digest, so any edit breaks the chain.
Ed25519 signing (docs/05) is not implemented yet; the key never leaves this host.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path

from app.repositories.store import Store

KIND = "audit"
KEY_ID = "AUDIT-HMAC-LOCAL-01"
GENESIS = "0" * 64


def _key(path: Path) -> bytes:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_hex(32))
        path.chmod(0o600)
    return bytes.fromhex(path.read_text().strip())


def _digest(ev: dict) -> str:
    core = {k: v for k, v in ev.items() if k not in ("record_digest", "signature")}
    return hashlib.sha256(json.dumps(core, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class Audit:
    def __init__(self, store: Store, key_path: Path):
        self.store = store
        self.key = _key(key_path)

    def append(self, event_type: str, subject_ids: list[str], payload: dict | None = None, actor_id: str = "SYSTEM") -> dict:
        with self.store._lock:
            events = self.store.list(KIND)
            seq = (events[-1]["sequence"] + 1) if events else 1
            ev = {
                "event_id": f"AUD-{seq}", "sequence": seq, "event_type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "actor_id": actor_id, "subject_ids": subject_ids, "payload": payload or {},
                "previous_event_hash": events[-1]["record_digest"] if events else GENESIS, "key_id": KEY_ID,
            }
            ev["record_digest"] = _digest(ev)
            ev["signature"] = "hmac-sha256:" + hmac.new(self.key, ev["record_digest"].encode(), hashlib.sha256).hexdigest()
            self.store.put(KIND, ev["event_id"], ev, seq=seq)
        return ev

    def events(self) -> list[dict]:
        return self.store.list(KIND)

    def verify(self) -> dict:
        events = self.events()
        chain_ok, sig_ok, first = True, True, None
        prev = GENESIS
        for ev in events:
            good_link = ev["previous_event_hash"] == prev and _digest(ev) == ev["record_digest"]
            good_sig = hmac.compare_digest(
                ev["signature"], "hmac-sha256:" + hmac.new(self.key, ev["record_digest"].encode(), hashlib.sha256).hexdigest())
            if not good_link:
                chain_ok = False
            if not good_sig:
                sig_ok = False
            if (not good_link or not good_sig) and first is None:
                first = ev["sequence"]
            prev = ev["record_digest"]
        return {"chain_valid": chain_ok, "signatures_valid": sig_ok, "checkpoints_valid": True,
                "first_failure": first, "events_checked": len(events), "checkpoints": 0,
                "signature_scheme": "hmac-sha256 (local key)"}
