"""Tiny local document store on SQLite (stdlib only, no network).

Each record is stored as JSON in table `docs(kind, id, seq, parent, body)`. `seq` gives
insertion order and sequential human-friendly IDs (AST-001, ASM-001, FND-1, INC-001).
"""
from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any

_SCHEMA = """
CREATE TABLE IF NOT EXISTS docs (
  kind TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL, parent TEXT, body TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS docs_kind_seq ON docs(kind, seq);
CREATE INDEX IF NOT EXISTS docs_parent ON docs(kind, parent);
"""


class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._lock = threading.RLock()
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.executescript(_SCHEMA)
        self._db.commit()

    def next_seq(self, kind: str) -> int:
        with self._lock:
            r = self._db.execute("SELECT COALESCE(MAX(seq), 0) FROM docs WHERE kind=?", (kind,)).fetchone()
            return int(r[0]) + 1

    def put(self, kind: str, id_: str, body: dict, parent: str | None = None, seq: int | None = None) -> dict:
        with self._lock:
            row = self._db.execute("SELECT seq FROM docs WHERE kind=? AND id=?", (kind, id_)).fetchone()
            s = row[0] if row else (seq if seq is not None else self.next_seq(kind))
            self._db.execute("INSERT OR REPLACE INTO docs(kind, id, seq, parent, body) VALUES (?,?,?,?,?)",
                             (kind, id_, s, parent, json.dumps(body)))
            self._db.commit()
        return body

    def get(self, kind: str, id_: str) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT body FROM docs WHERE kind=? AND id=?", (kind, id_)).fetchone()
        return json.loads(r[0]) if r else None

    def list(self, kind: str, parent: str | None = None) -> list[dict[str, Any]]:
        q, args = "SELECT body FROM docs WHERE kind=?", [kind]
        if parent is not None:
            q += " AND parent=?"
            args.append(parent)
        with self._lock:
            rows = self._db.execute(q + " ORDER BY seq", args).fetchall()
        return [json.loads(r[0]) for r in rows]

    def close(self) -> None:
        self._db.close()
