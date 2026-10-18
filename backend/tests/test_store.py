"""SQLite document store behaviour relied on for sequential IDs and ordering."""
from app.repositories.store import Store


def test_seq_and_order(tmp_path):
    s = Store(tmp_path / "x" / "db.sqlite3")   # parent dir is created
    assert s.next_seq("k") == 1
    s.put("k", "b", {"id": "b"})
    s.put("k", "a", {"id": "a"})
    assert s.next_seq("k") == 3
    assert [d["id"] for d in s.list("k")] == ["b", "a"]
    s.close()


def test_update_keeps_original_seq(tmp_path):
    s = Store(tmp_path / "db.sqlite3")
    s.put("k", "a", {"v": 1})
    s.put("k", "b", {"v": 2})
    s.put("k", "a", {"v": 3})               # replace must not move it to the end
    assert [d["v"] for d in s.list("k")] == [3, 2]
    s.close()


def test_parent_filter_and_missing(tmp_path):
    s = Store(tmp_path / "db.sqlite3")
    s.put("ev", "1", {"n": 1}, parent="ASM-1")
    s.put("ev", "2", {"n": 2}, parent="ASM-2")
    assert s.list("ev", parent="ASM-2") == [{"n": 2}]
    assert s.get("ev", "nope") is None
    s.close()


def test_persists_across_reopen(tmp_path):
    p = tmp_path / "db.sqlite3"
    s = Store(p)
    s.put("k", "a", {"v": 1})
    s.close()
    s2 = Store(p)
    assert s2.get("k", "a") == {"v": 1}
    s2.close()
