"""
Layer 1 – Temporal Liveness Integrity
Purpose: Detect unnatural stability, replay behavior, fake motion patterns.
Tech Stack: MediaPipe FaceMesh + OpenCV + NumPy
Output: L1 risk score + motion anomaly reason
"""
import cv2
import numpy as np
from collections import deque
from scipy.spatial import distance as dist
from app.core.types import FrameData

try:
    import mediapipe as mp
    _MP_AVAILABLE = True
except ImportError:
    _MP_AVAILABLE = False


class TemporalLivenessEngine:
    """
    L1: Temporal Liveness Integrity
    Detects replay attacks, frozen frames, unnatural head pose stability,
    blink patterns, and embedding drift over time.
    """

    def __init__(self, history_len: int = 30):
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
                print("L1-TemporalLiveness: MediaPipe FaceMesh ready")
            except Exception as e:
                print(f"L1-TemporalLiveness: MediaPipe unavailable ({e}), using fallback")

        # Rolling history buffers
        self.yaw_history   = deque(maxlen=history_len)
        self.pitch_history = deque(maxlen=history_len)
        self.ear_history   = deque(maxlen=history_len)
        self.frame_hashes  = deque(maxlen=history_len)

        # Landmark indices
        self.LEFT_EYE  = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData) -> None:
        frame = frame_data.image
        if frame is None:
            frame_data.liveness_score = 0.5
            return

        h, w = frame.shape[:2]

        # --- Frozen-frame / replay detection via perceptual hash ---
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (16, 16))
        fhash = (small > small.mean()).flatten().tolist()
        frozen = self._check_frozen(fhash)

        if frozen:
            frame_data.liveness_score = 0.1
            frame_data.flags.append("FROZEN_FRAME_REPLAY")
            frame_data.metadata["l1_frozen"] = True
            return

        # --- MediaPipe pose + blink analysis ---
        if not self.use_mediapipe:
            frame_data.liveness_score = 0.7
            return

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            frame_data.liveness_score = 0.3
            frame_data.flags.append("L1_NO_FACE_MESH")
            return

        lm = results.multi_face_landmarks[0].landmark

        def pt(idx):
            return (lm[idx].x * w, lm[idx].y * h)

        # EAR (Eye Aspect Ratio) for blink detection
        ear = self._ear(lm, w, h)
        self.ear_history.append(ear)

        # Head pose (yaw/pitch) via PnP
        yaw, pitch = self._head_pose(lm, w, h)
        self.yaw_history.append(yaw)
        self.pitch_history.append(pitch)

        # --- Score computation ---
        score = 1.0
        reasons = []

        # Unnatural stability: variance too low → likely replay
        if len(self.yaw_history) >= 10:
            yaw_var = float(np.var(list(self.yaw_history)))
            pitch_var = float(np.var(list(self.pitch_history)))
            if yaw_var < 0.5 and pitch_var < 0.5:
                score -= 0.4
                reasons.append("L1_UNNATURAL_HEAD_STABILITY")

        # Blink variance: real humans blink; no blink variation → suspicious
        if len(self.ear_history) >= 15:
            ear_var = float(np.var(list(self.ear_history)))
            if ear_var < 0.0001:
                score -= 0.3
                reasons.append("L1_NO_BLINK_VARIATION")

        # Extreme pose (printed photo / tilted screen)
        if abs(yaw) > 40 or abs(pitch) > 35:
            score -= 0.2
            reasons.append("L1_EXTREME_HEAD_POSE")

        score = max(0.0, min(1.0, score))
        frame_data.liveness_score = score
        frame_data.flags.extend(reasons)
        frame_data.metadata.update({
            "l1_yaw": round(yaw, 2),
            "l1_pitch": round(pitch, 2),
            "l1_ear": round(ear, 4),
        })

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _check_frozen(self, fhash: list) -> bool:
        if len(self.frame_hashes) < 5:
            self.frame_hashes.append(fhash)
            return False
        matches = sum(
            sum(a == b for a, b in zip(fhash, h)) / len(fhash)
            for h in self.frame_hashes
        ) / len(self.frame_hashes)
        self.frame_hashes.append(fhash)
        return matches > 0.97  # >97% identical → frozen

    def _ear(self, lm, w, h) -> float:
        def coords(indices):
            return [(lm[i].x * w, lm[i].y * h) for i in indices]
        le = coords(self.LEFT_EYE)
        re = coords(self.RIGHT_EYE)
        def _e(eye):
            A = dist.euclidean(eye[1], eye[5])
            B = dist.euclidean(eye[2], eye[4])
            C = dist.euclidean(eye[0], eye[3])
            return (A + B) / (2.0 * C + 1e-6)
        return (_e(le) + _e(re)) / 2.0

    def _head_pose(self, lm, w, h):
        model_pts = np.array([
            (0.0, 0.0, 0.0), (0.0, -330.0, -65.0),
            (-225.0, 170.0, -135.0), (225.0, 170.0, -135.0),
            (-150.0, -150.0, -125.0), (150.0, -150.0, -125.0)
        ])
        img_pts = np.array([
            (lm[1].x*w, lm[1].y*h), (lm[152].x*w, lm[152].y*h),
            (lm[33].x*w, lm[33].y*h), (lm[263].x*w, lm[263].y*h),
            (lm[61].x*w, lm[61].y*h), (lm[291].x*w, lm[291].y*h),
        ], dtype="double")
        fl = w
        cam = np.array([[fl,0,w/2],[0,fl,h/2],[0,0,1]], dtype="double")
        dc = np.zeros((4,1))
        ok, rvec, _ = cv2.solvePnP(model_pts, img_pts, cam, dc)
        if not ok:
            return 0.0, 0.0
        rmat, _ = cv2.Rodrigues(rvec)
        angles, *_ = cv2.RQDecomp3x3(rmat)
        return float(angles[1]), float(angles[0])  # yaw, pitch
