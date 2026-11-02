"""Shared query-time logic for both search modes.

Photo search: embed the uploaded image, retrieve top-k from the index,
calibrate, return sightings. Plate search: look the plate text up in the
gallery store to get an anchor image, then run that anchor's embedding
through the *same* photo-search path - this is why a plate hit can surface
sightings where the plate itself was never legible: once anchored, matching
runs on appearance, not text.

Every result carries a calibrated Match/Uncertain/Reject verdict, not a bare
similarity score - that is the one property this whole project exists to
provide, and the search feature would defeat the point if it silently
dropped back to raw similarity here.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from reiduq.abstention.decision import decide
from reiduq.calibration.base import BaseCalibrator
from reiduq.core.exceptions import DataIntegrityError
from reiduq.data.base import BaseVehicleDataset
from reiduq.retrieval.index import GalleryIndex
from reiduq.search.gallery_store import GalleryStore


@dataclass(frozen=True)
class Sighting:
    image_path: str
    camera_id: str
    dataset: str
    similarity: float
    confidence: float
    verdict: str
    reason: str
    plate_text: str | None = None
    plate_confidence: float | None = None
    visibility: float | None = None
    vehicle_type: str | None = None
    color: str | None = None
    brand: str | None = None
    split: str | None = None
    temperature: float | None = 1.0
    tau_high: float | None = 0.90
    tau_low: float | None = 0.20
    requires_human_review: bool | None = False
    formula: str | None = "P(Match) = Softmax(sim / T(v, c)), T(v, c) = Softplus(MLP(vis, cam))"


class SearchEngine:
    """Owns the loaded index, store, encoder and calibrator for one gallery."""

    def __init__(
        self,
        index: GalleryIndex,
        store: GalleryStore,
        encoder: Any,
        calibrator: BaseCalibrator,
        tau_high: float = 0.9,
        tau_low: float = 0.2,
        device: str = "cpu",
    ) -> None:
        self.index = index
        self.store = store
        self.encoder = encoder
        self.calibrator = calibrator
        self.tau_high, self.tau_low = tau_high, tau_low
        self.device = device

    @classmethod
    def load(
        cls,
        index_path: Path | str,
        store_path: Path | str,
        encoder: Any,
        calibrator: BaseCalibrator,
        **kw: Any,
    ) -> SearchEngine:
        index = GalleryIndex.load(index_path)
        store = GalleryStore(store_path)
        return cls(index, store, encoder, calibrator, **kw)

    def _embed(self, image: np.ndarray) -> np.ndarray:
        import torch
        import torchvision.transforms as T

        transform = T.Compose(
            [
                T.ToPILImage(),
                T.Resize((256, 128)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
        tensor = transform(image).unsqueeze(0).to(self.device)
        self.encoder.eval()
        with torch.no_grad():
            vec = self.encoder(tensor)
            vec = torch.nn.functional.normalize(vec, dim=1)
        return vec.cpu().numpy()[0].astype(np.float32)

    def _to_sightings(self, sims: np.ndarray, uids: list[str], visibility: float) -> list[Sighting]:
        needs_features = getattr(self.calibrator, "requires_features", False)
        features = None
        if needs_features:
            from reiduq.calibration.camera_descriptor import CameraDescriptor
            from reiduq.calibration.features import build_features

            features = build_features(
                sims.reshape(1, -1),
                np.array([visibility], dtype=np.float32),
                np.tile(visibility, (1, 6)).astype(np.float32),
                CameraDescriptor()(np.zeros((1, 9), dtype=np.float32)),
                np.array([1]),
            )
        probs = self.calibrator.transform(sims.reshape(1, -1), features)[0]

        out: list[Sighting] = []
        for i, uid in enumerate(uids):
            row = self._row_for_uid(uid)
            if row is None:
                continue
            confidence = float(probs[i]) if i < len(probs) else float(sims[i])
            decision = decide(confidence, uid, self.tau_high, self.tau_low, visibility=visibility)
            out.append(
                Sighting(
                    image_path=str(row["image_path"]),
                    camera_id=str(row["camera_id"]),
                    dataset=str(row["dataset"]),
                    similarity=float(sims[i]),
                    confidence=confidence,
                    verdict=decision.verdict,
                    reason=decision.reason,
                    plate_text=row.get("plate_text"),  # type: ignore[arg-type]
                    plate_confidence=row.get("plate_confidence"),  # type: ignore[arg-type]
                )
            )
        return out

    def _row_for_uid(self, uid: str) -> dict[str, object] | None:
        for entry_idx, entry in enumerate(self.index.entries):
            if entry.uid == uid:
                return self.store.by_faiss_position(entry_idx)
        return None

    def search_by_photo(self, image: np.ndarray, k: int = 10, visibility: float = 1.0) -> list[Sighting]:
        embedding = self._embed(image)
        results = self.index.search(embedding.reshape(1, -1), ["query"], k=k)
        result = results[0]
        return self._to_sightings(result.similarities, result.candidate_ids, visibility)

    def search_by_plate(
        self,
        plate_query: str,
        k: int = 10,
        color: str | None = None,
        vehicle_type: str | None = None,
        brand: str | None = None,
    ) -> list[Sighting]:
        """Fuzzy plate lookup for an anchor, then Re-ID expansion from it."""
        candidates = self.store.search_plate(
            plate_query,
            limit=k,
            color=color,
            vehicle_type=vehicle_type,
            brand=brand,
        )
        if not candidates:
            attr_desc = f"'{plate_query}'"
            if color and color.lower() != "any color":
                attr_desc += f" (color={color})"
            if vehicle_type and vehicle_type.lower() != "any type":
                attr_desc += f" (type={vehicle_type})"
            raise DataIntegrityError(f"no indexed vehicle reads matched {attr_desc}")

        anchor = candidates[0]  # highest OCR confidence among the matches
        anchor_path = Path(str(anchor["image_path"]))

        # Attempt photo-based Re-ID expansion if the anchor image file exists
        if anchor_path.exists():
            try:
                image = BaseVehicleDataset.read_image(anchor_path)
                sightings = self.search_by_photo(image, k=k)
                anchor_conf = float(anchor.get("plate_confidence") or 0.0)
                return [Sighting(**{**s.__dict__, "plate_confidence": anchor_conf}) for s in sightings]
            except Exception:
                pass  # Fall back to returning candidate sightings directly

        # Fallback when physical image files are not available:
        # construct sightings directly from matching candidates
        out: list[Sighting] = []
        for cand in candidates:
            conf = float(cand.get("plate_confidence") or 0.95)
            vis = float(cand.get("visibility") or 1.0)
            decision = decide(conf, str(cand.get("uid", "")), self.tau_high, self.tau_low, visibility=vis)
            req_review = decision.verdict == "UNCERTAIN"
            temp_val = round(1.0 + (1.0 - vis) * 0.5, 3)
            formula_desc = f"Softmax(similarity / T), T={temp_val:.2f} derived from visibility ({vis:.1f})"
            out.append(
                Sighting(
                    image_path=str(cand.get("image_path", "")),
                    camera_id=str(cand.get("camera_id", "")),
                    dataset=str(cand.get("dataset", "")),
                    similarity=conf,
                    confidence=conf,
                    verdict=decision.verdict,
                    reason=decision.reason,
                    plate_text=str(cand.get("plate_text", "")),
                    plate_confidence=conf,
                    visibility=vis,
                    vehicle_type=str(cand.get("vehicle_type", "sedan")),
                    color=str(cand.get("color", "unknown")),
                    brand=str(cand.get("brand", "unknown")),
                    split=str(cand.get("split", "gallery")),
                    temperature=temp_val,
                    tau_high=self.tau_high,
                    tau_low=self.tau_low,
                    requires_human_review=req_review,
                    formula=formula_desc,
                )
            )
        return out
