"""
Layer 6 – Environment & Background Consistency
Purpose: Detect flickering background, lighting drift, overlay edge shimmer.
Tech Stack: OpenCV (background diff + histogram + edge detection) + NumPy
Output: L6 environment anomaly score + stability reason
"""
import cv2
import numpy as np
from collections import deque
from app.core.types import FrameData


class EnvironmentIntegrityChecker:
    """
    L6: Environment & Background Consistency

    Detects:
    - Background flickering (virtual background glitches, screen replay)
    - Lighting drift (sudden illumination changes -> deepfake compositing)
    - Edge shimmer / halo artifacts around the face (face overlay / green screen)
    - Background motion while face is static (pre-recorded video)
    """

    HIST_DIFF_THRESHOLD    = 0.35   # Bhattacharyya distance above -> lighting shift
    BG_MOTION_THRESHOLD    = 15.0   # Mean pixel diff above -> background moving
    EDGE_SHIMMER_THRESHOLD = 0.12   # Normalised edge change above -> overlay shimmer
    HISTORY_LEN            = 20

    def __init__(self):
        self.prev_frame_gray: np.ndarray | None = None
        self.prev_bg_mask:    np.ndarray | None = None
        self.hist_history:    deque = deque(maxlen=self.HISTORY_LEN)
        self.bg_diff_history: deque = deque(maxlen=self.HISTORY_LEN)
        self.edge_history:    deque = deque(maxlen=self.HISTORY_LEN)
        print("L6-Environment: OpenCV background/lighting analyser ready")

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData) -> None:
        frame = frame_data.image
        if frame is None:
            frame_data.metadata["l6_env_score"] = 0.7
            return

        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        score = 1.0
        reasons = []

        # ── 1. Lighting / Colour Histogram Drift ───────────────────────────
        hist = cv2.calcHist([frame], [0, 1, 2], None,
                            [16, 16, 16], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist, hist)

        if self.hist_history:
            prev_hist = self.hist_history[-1]
            bhatt = cv2.compareHist(hist, prev_hist, cv2.HISTCMP_BHATTACHARYYA)
            self.hist_history.append(hist)

            if bhatt > self.HIST_DIFF_THRESHOLD:
                score -= 0.30
                reasons.append("L6_SUDDEN_LIGHTING_SHIFT")
            frame_data.metadata["l6_hist_diff"] = round(float(bhatt), 4)
        else:
            self.hist_history.append(hist)

        # ── 2. Background Motion Detection ─────────────────────────────────
        if self.prev_frame_gray is not None:
            prev_resized = cv2.resize(self.prev_frame_gray, (gray.shape[1], gray.shape[0]))
            frame_diff = cv2.absdiff(gray, prev_resized).astype(np.float32)

            # Estimate face region (centre 40% of frame) — exclude from bg check
            h, w = gray.shape
            face_mask = np.zeros((h, w), dtype=np.uint8)
            cy, cx = h // 2, w // 2
            face_mask[int(cy*0.3):int(cy*1.7), int(cx*0.3):int(cx*1.7)] = 1

            bg_diff = frame_diff * (1 - face_mask)
            bg_mean = float(bg_diff.mean())
            self.bg_diff_history.append(bg_mean)

            if bg_mean > self.BG_MOTION_THRESHOLD:
                score -= 0.25
                reasons.append("L6_BACKGROUND_MOTION_DETECTED")
            frame_data.metadata["l6_bg_motion"] = round(bg_mean, 2)

        # ── 3. Edge Shimmer / Overlay Halo ─────────────────────────────────
        edges = cv2.Canny(gray, 50, 150).astype(np.float32) / 255.0
        if self.edge_history:
            prev_edges = self.edge_history[-1]
            if prev_edges.shape == edges.shape:
                edge_change = float(np.mean(np.abs(edges - prev_edges)))
                if edge_change > self.EDGE_SHIMMER_THRESHOLD:
                    score -= 0.20
                    reasons.append("L6_EDGE_SHIMMER_OVERLAY")
                frame_data.metadata["l6_edge_change"] = round(edge_change, 4)
        self.edge_history.append(edges)

        # ── 4. Flickering detection (variance of bg_diff over time) ────────
        if len(self.bg_diff_history) >= 8:
            flicker_var = float(np.var(list(self.bg_diff_history)))
            if flicker_var > 50.0:
                score -= 0.15
                reasons.append("L6_BACKGROUND_FLICKERING")
            frame_data.metadata["l6_flicker_var"] = round(flicker_var, 2)

        self.prev_frame_gray = gray.copy()

        score = float(np.clip(score, 0.0, 1.0))
        frame_data.metadata["l6_env_score"] = round(score, 4)
        frame_data.flags.extend(reasons)
