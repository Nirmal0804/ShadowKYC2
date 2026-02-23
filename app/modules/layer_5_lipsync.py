"""
Layer 5 – Lip-Sync Integrity Validation
Purpose: Detect mismatch between voice and mouth movement.
Tech Stack: MediaPipe FaceMesh + Librosa/PyDub + NumPy correlation
Output: L5 lip-sync mismatch score + correlation reason
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


class LipSyncValidator:
    """
    L5: Lip-Sync Integrity Validation

    Tracks mouth aperture (MAR – Mouth Aspect Ratio) over time.
    In a live session without audio access, we use MAR variance as a
    proxy: a real speaker has natural mouth movement variation.
    A deepfake / replay with dubbed audio often shows:
      - Mouth frozen while audio plays
      - Mouth moving unnaturally fast/slow relative to speech rhythm

    When audio chunks are provided (future integration with Librosa),
    the module correlates audio RMS energy with MAR.
    """

    MAR_FROZEN_THRESHOLD  = 0.0005   # Variance below → mouth not moving
    MAR_ERRATIC_THRESHOLD = 0.08     # Variance above → erratic/unnatural
    HISTORY_LEN           = 30
    MIN_FRAMES_FOR_EVAL   = 10

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
                print("L5-LipSync: MediaPipe FaceMesh ready")
            except Exception as e:
                print(f"L5-LipSync: MediaPipe unavailable ({e})")

        self.mar_history: deque = deque(maxlen=self.HISTORY_LEN)
        self.audio_rms_history: deque = deque(maxlen=self.HISTORY_LEN)

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData, audio_rms: float | None = None) -> None:
        """
        Args:
            frame_data: current frame data
            audio_rms:  optional RMS energy of the corresponding audio chunk
        """
        if not self.use_mediapipe:
            frame_data.metadata["l5_lipsync_score"] = 0.7
            return

        frame = frame_data.image
        if frame is None:
            return

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            frame_data.metadata["l5_lipsync_score"] = 0.5
            return

        lm = results.multi_face_landmarks[0].landmark

        # Mouth Aspect Ratio
        mar = self._compute_mar(lm)
        self.mar_history.append(mar)

        if audio_rms is not None:
            self.audio_rms_history.append(audio_rms)

        score = 1.0
        reasons = []

        if len(self.mar_history) >= self.MIN_FRAMES_FOR_EVAL:
            mar_arr = np.array(list(self.mar_history))
            mar_var = float(np.var(mar_arr))

            # Frozen mouth (no movement while session is live)
            if mar_var < self.MAR_FROZEN_THRESHOLD:
                score -= 0.40
                reasons.append("L5_MOUTH_FROZEN_NO_SPEECH")

            # Erratic mouth (unnatural rapid movement)
            elif mar_var > self.MAR_ERRATIC_THRESHOLD:
                score -= 0.25
                reasons.append("L5_ERRATIC_MOUTH_MOVEMENT")

            # Audio-MAR correlation (if audio available)
            if len(self.audio_rms_history) >= self.MIN_FRAMES_FOR_EVAL:
                audio_arr = np.array(list(self.audio_rms_history))
                if audio_arr.std() > 1e-6 and mar_arr.std() > 1e-6:
                    corr = float(np.corrcoef(
                        mar_arr[-len(audio_arr):], audio_arr
                    )[0, 1])
                    frame_data.metadata["l5_audio_mar_corr"] = round(corr, 4)
                    if corr < 0.15:  # Very low correlation → lip-sync mismatch
                        score -= 0.30
                        reasons.append("L5_AUDIO_LIP_MISMATCH")

            frame_data.metadata["l5_mar_var"] = round(mar_var, 6)

        score = float(np.clip(score, 0.0, 1.0))
        frame_data.metadata["l5_lipsync_score"] = round(score, 4)
        frame_data.metadata["l5_mar"]           = round(float(mar), 4)
        frame_data.flags.extend(reasons)

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _compute_mar(lm) -> float:
        """Mouth Aspect Ratio using MediaPipe landmarks."""
        # Vertical: top lip (13) to bottom lip (14)
        # Horizontal: left corner (78) to right corner (308)
        from scipy.spatial import distance as dist
        top    = (lm[13].x, lm[13].y)
        bottom = (lm[14].x, lm[14].y)
        left   = (lm[78].x, lm[78].y)
        right  = (lm[308].x, lm[308].y)
        vertical   = dist.euclidean(top, bottom)
        horizontal = dist.euclidean(left, right)
        return vertical / (horizontal + 1e-6)
