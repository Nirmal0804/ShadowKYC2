"""
Layer 4 – Pseudo-Depth / Geometry Integrity
Purpose: Detect face warping, landmark distortion, unnatural proportions.
Tech Stack: MediaPipe FaceMesh + NumPy geometry ratios
Output: L4 geometry distortion score + ratio drift reason
"""
import cv2
import numpy as np
from collections import deque
from app.core.types import FrameData

try:
    import mediapipe as mp
    _MP_AVAILABLE = True
except ImportError:
    _MP_AVAILABLE = False


class GeometryIntegrityChecker:
    """
    L4: Pseudo-Depth / Geometry Integrity
    Analyses facial landmark geometry ratios to detect:
    - Face warping (deepfake morphing)
    - Unnatural facial proportions (printed photo / 3D mask)
    - Symmetry anomalies
    - Landmark drift across frames
    """

    SYMMETRY_THRESHOLD  = 0.25   # Asymmetry ratio above this -> suspicious
    RATIO_DRIFT_THRESH  = 0.15   # Ratio drift above this -> warping
    HISTORY_LEN         = 20

    def __init__(self):
        self.use_mediapipe = False
        if _MP_AVAILABLE:
            try:
                if hasattr(mp, 'solutions'):
                    mp_fm = mp.solutions.face_mesh
                else:
                    import mediapipe.python.solutions.face_mesh as face_mesh_sol
                    mp_fm = face_mesh_sol
                
                self.face_mesh = mp_fm.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                )
                self.use_mediapipe = True
                print("L4-Geometry: MediaPipe FaceMesh ready")
            except Exception as e:
                print(f"L4-Geometry: MediaPipe unavailable ({e})")

        self.ratio_history: deque = deque(maxlen=self.HISTORY_LEN)

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData) -> None:
        if not self.use_mediapipe:
            frame_data.metadata["l4_geometry_score"] = 0.7
            return

        frame = frame_data.image
        if frame is None:
            return

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            frame_data.metadata["l4_geometry_score"] = 0.5
            frame_data.flags.append("L4_NO_LANDMARKS")
            return

        lm = results.multi_face_landmarks[0].landmark

        def pt(idx):
            return np.array([lm[idx].x * w, lm[idx].y * h])

        score = 1.0
        reasons = []

        # ── 1. Facial proportion ratios ────────────────────────────────────
        # Eye width ratio (left/right should be ~1.0)
        left_eye_w  = np.linalg.norm(pt(33) - pt(133))
        right_eye_w = np.linalg.norm(pt(362) - pt(263))
        eye_ratio   = left_eye_w / (right_eye_w + 1e-6)

        # Nose-to-mouth / eye-to-nose ratio
        nose_tip    = pt(1)
        chin        = pt(152)
        left_eye_c  = (pt(33) + pt(133)) / 2
        right_eye_c = (pt(362) + pt(263)) / 2
        eye_center  = (left_eye_c + right_eye_c) / 2

        eye_nose_dist  = np.linalg.norm(eye_center - nose_tip)
        nose_chin_dist = np.linalg.norm(nose_tip - chin)
        proportion_ratio = eye_nose_dist / (nose_chin_dist + 1e-6)

        # ── 2. Symmetry check ──────────────────────────────────────────────
        face_center_x = (pt(33)[0] + pt(263)[0]) / 2
        left_dist  = abs(pt(33)[0]  - face_center_x)
        right_dist = abs(pt(263)[0] - face_center_x)
        symmetry_ratio = abs(left_dist - right_dist) / (left_dist + right_dist + 1e-6)

        if symmetry_ratio > self.SYMMETRY_THRESHOLD:
            score -= 0.25
            reasons.append("L4_FACE_ASYMMETRY")

        # ── 3. Proportion drift across frames ──────────────────────────────
        current_ratios = np.array([eye_ratio, proportion_ratio])
        if len(self.ratio_history) >= 5:
            hist_mean = np.mean(list(self.ratio_history), axis=0)
            drift = float(np.linalg.norm(current_ratios - hist_mean))
            if drift > self.RATIO_DRIFT_THRESH:
                score -= 0.30
                reasons.append("L4_LANDMARK_RATIO_DRIFT")
            frame_data.metadata["l4_ratio_drift"] = round(drift, 4)

        self.ratio_history.append(current_ratios)

        # ── 4. Unnatural eye ratio (warped face) ───────────────────────────
        if eye_ratio < 0.7 or eye_ratio > 1.4:
            score -= 0.20
            reasons.append("L4_EYE_WIDTH_DISTORTION")

        score = float(np.clip(score, 0.0, 1.0))
        frame_data.metadata["l4_geometry_score"] = round(score, 4)
        frame_data.metadata["l4_eye_ratio"]       = round(float(eye_ratio), 4)
        frame_data.metadata["l4_symmetry"]        = round(float(symmetry_ratio), 4)
        frame_data.flags.extend(reasons)
