"""Metadata store for indexed gallery entries: one row per indexed image.

Separate from the FAISS index deliberately - FAISS stores embeddings and
returns integer positions; this stores everything a human wants to see about
a hit (which image, which camera, plate text if OCR read one, ground-truth
identity for evaluation only). The two are linked by ``faiss_position``, which
must stay in lockstep with insertion order into the FAISS index - see
GalleryIndexer, which is the only writer of both.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterator

_SCHEMA = """
CREATE TABLE IF NOT EXISTS gallery_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faiss_position INTEGER NOT NULL UNIQUE,
    uid TEXT NOT NULL UNIQUE,
    image_path TEXT NOT NULL,
    dataset TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    ground_truth_identity INTEGER,      -- evaluation only; never used at query time
    plate_text TEXT,                    -- best-effort OCR read, nullable
    plate_confidence REAL,
    visibility REAL,
    indexed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gallery_plate ON gallery_entries(plate_text);
CREATE INDEX IF NOT EXISTS idx_gallery_camera ON gallery_entries(camera_id);
"""


@dataclass(frozen=True)
class GalleryEntryRow:
    faiss_position: int
    uid: str
    image_path: str
    dataset: str
    camera_id: str
    ground_truth_identity: int | None = None
    plate_text: str | None = None
    plate_confidence: float | None = None
    visibility: float | None = None
    vehicle_type: str | None = None
    color: str | None = None
    brand: str | None = None
    split: str | None = None


class GalleryStore:
    """One SQLite file per built index - same single-process-writer shape as
    AuditStore; see that module's docstring for the scaling note."""

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    @contextmanager
    def _cursor(self) -> Iterator[sqlite3.Cursor]:
        cur = self._conn.cursor()
        try:
            yield cur
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise
        finally:
            cur.close()

    def add(self, row: GalleryEntryRow) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO gallery_entries
                   (faiss_position, uid, image_path, dataset, camera_id,
                    ground_truth_identity, plate_text, plate_confidence,
                    visibility, vehicle_type, color, brand, split, indexed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row.faiss_position, row.uid, row.image_path, row.dataset,
                    row.camera_id, row.ground_truth_identity, row.plate_text,
                    row.plate_confidence, row.visibility,
                    row.vehicle_type, row.color, row.brand, row.split,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def by_faiss_position(self, position: int) -> dict[str, object] | None:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM gallery_entries WHERE faiss_position = ?", (position,))
            row = cur.fetchone()
            if row is None:
                return None
            cols = [d[0] for d in cur.description]
            return dict(zip(cols, row, strict=True))

    def search_plate(
        self,
        query: str,
        limit: int = 20,
        color: str | None = None,
        vehicle_type: str | None = None,
        brand: str | None = None,
    ) -> list[dict[str, object]]:
        """Flexible plate and attribute search."""
        limit = max(1, min(limit, 200))
        where_clauses: list[str] = []
        params: list[object] = []

        if query:
            escaped = query.upper().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            where_clauses.append("plate_text LIKE ? ESCAPE '\\'")
            params.append(f"%{escaped}%")

        if color and color.lower() != "any color":
            where_clauses.append("LOWER(color) = LOWER(?)")
            params.append(color.strip())

        if vehicle_type and vehicle_type.lower() != "any type":
            where_clauses.append("LOWER(vehicle_type) = LOWER(?)")
            params.append(vehicle_type.strip())

        if brand and brand.strip():
            where_clauses.append("LOWER(brand) = LOWER(?)")
            params.append(brand.strip())

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        sql = f"""SELECT * FROM gallery_entries
                  {where_sql}
                  ORDER BY plate_confidence DESC
                  LIMIT ?"""
        params.append(limit)

        with self._cursor() as cur:
            cur.execute(sql, tuple(params))
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]

    def count(self) -> int:
        with self._cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM gallery_entries")
            return int(cur.fetchone()[0])

    def close(self) -> None:
        self._conn.close()
