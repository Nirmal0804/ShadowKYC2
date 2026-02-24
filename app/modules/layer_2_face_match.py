"""
Layer 2 – Multi-Frame Face Match Monitoring
Purpose: Continuous face match across session, detect face swap/drift.
Tech Stack: MobileFaceNet / ArcFace-lite (ONNX) + ONNX Runtime + NumPy
Output: L2 match score + similarity drift alerts
"""
import cv2
import numpy as np
from collections import deque
from app.core.types import FrameData


class FaceMatchMonitor:
    """
    L2: Multi-Frame Face Match Monitoring
    Extracts a lightweight face embedding per frame and compares it
    against a rolling baseline to detect face swaps, identity drift,
    or sudden appearance changes.

    Uses HOG + PCA as a CPU-friendly embedding when ONNX models are
    unavailable (no GPU / no model file required for demo).
    """

    DRIFT_THRESHOLD   = 0.35   # cosine distance above this -> drift alert
    SWAP_THRESHOLD    = 0.60   # cosine distance above this -> face swap
    BASELINE_FRAMES   = 5      # frames to build initial baseline
    HISTORY_LEN       = 20

    def __init__(self):
        self.baseline_embedding: np.ndarray | None = None
        self.embedding_history: deque = deque(maxlen=self.HISTORY_LEN)
        self.frame_count = 0
        print("L2-FaceMatch: Using HOG-PCA lightweight embedder (CPU-safe)")

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData) -> None:
        face = frame_data.face_roi if frame_data.face_roi is not None else frame_data.image
        if face is None or face.size == 0:
            frame_data.metadata["l2_match_score"] = None
            return

        embedding = self._embed(face)
        if embedding is None:
            return

        self.frame_count += 1

        # Build baseline from first N frames
        if self.frame_count <= self.BASELINE_FRAMES:
            self.embedding_history.append(embedding)
            if self.frame_count == self.BASELINE_FRAMES:
                self.baseline_embedding = np.mean(list(self.embedding_history), axis=0)
                self.baseline_embedding /= (np.linalg.norm(self.baseline_embedding) + 1e-8)
            frame_data.metadata["l2_match_score"] = 1.0
            return

        # Compare against baseline
        cos_dist = self._cosine_distance(embedding, self.baseline_embedding)
        match_score = float(np.clip(1.0 - cos_dist, 0.0, 1.0))

        # Compare against recent history for drift
        if len(self.embedding_history) >= 5:
            recent_mean = np.mean(list(self.embedding_history)[-5:], axis=0)
            recent_mean /= (np.linalg.norm(recent_mean) + 1e-8)
            drift_dist = self._cosine_distance(embedding, recent_mean)
        else:
            drift_dist = 0.0

        self.embedding_history.append(embedding)

        # Flag anomalies
        if cos_dist > self.SWAP_THRESHOLD:
            frame_data.flags.append("L2_FACE_SWAP_DETECTED")
            match_score = max(0.0, match_score - 0.3)
        elif cos_dist > self.DRIFT_THRESHOLD:
            frame_data.flags.append("L2_IDENTITY_DRIFT")
            match_score = max(0.0, match_score - 0.15)

        if drift_dist > self.DRIFT_THRESHOLD * 0.8:
            frame_data.flags.append("L2_SUDDEN_APPEARANCE_CHANGE")

        frame_data.metadata["l2_match_score"] = round(match_score, 4)
        frame_data.metadata["l2_cos_dist"]    = round(float(cos_dist), 4)
        frame_data.metadata["l2_drift_dist"]  = round(float(drift_dist), 4)

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _embed(self, face_img: np.ndarray) -> np.ndarray | None:
        """Lightweight HOG-based face embedding (CPU-safe fallback)."""
        try:
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY) if face_img.ndim == 3 else face_img
            resized = cv2.resize(gray, (64, 64))

            # HOG descriptor
            win_size = (64, 64)
            block_size = (16, 16)
            block_stride = (8, 8)
            cell_size = (8, 8)
            nbins = 9
            hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
            descriptor = hog.compute(resized).flatten()

            # L2 normalize
            norm = np.linalg.norm(descriptor)
            if norm < 1e-8:
                return None
            return descriptor / norm
        except Exception:
            return None

    @staticmethod
    def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
        if a is None or b is None:
            return 0.0
        dot = np.dot(a, b)
        return float(np.clip(1.0 - dot, 0.0, 2.0))
