"""
Layer 3 – Texture / Frequency Artifact Detection
Purpose: Detect AI smoothing, missing skin texture, frequency anomalies.
Tech Stack: OpenCV (Laplacian Variance) + FFT (NumPy / OpenCV DFT)
Output: L3 texture anomaly score + artifact reason
"""
import cv2
import numpy as np
from app.core.types import FrameData


class TextureArtifactDetector:
    """
    L3: Texture & Frequency Artifact Detection
    - Laplacian variance → blur / over-smoothing (GAN faces are unnaturally smooth)
    - FFT high-frequency energy → compression artifacts, GAN grid patterns
    - Local Binary Pattern variance → skin texture authenticity
    """

    BLUR_THRESHOLD    = 80.0    # Below → suspiciously smooth (deepfake / printed photo)
    FFT_LOW_THRESHOLD = 0.08    # Below → missing high-freq detail (AI face)
    FFT_HIGH_THRESHOLD = 0.45   # Above → compression / GAN grid artifact
    LBP_LOW_THRESHOLD  = 20.0   # Below → unnaturally uniform texture

    def __init__(self):
        print("L3-TextureArtifact: OpenCV + NumPy FFT ready")

    # ── Public API ────────────────────────────────────────────────────────────
    def process(self, frame_data: FrameData) -> None:
        face = frame_data.face_roi if frame_data.face_roi is not None else frame_data.image
        if face is None or face.size == 0:
            frame_data.artifact_score = 0.5
            return

        gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY) if face.ndim == 3 else face.copy()
        gray = cv2.resize(gray, (128, 128))

        score = 1.0
        reasons = []

        # ── 1. Laplacian Variance (blur / smoothness) ──────────────────────
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if lap_var < self.BLUR_THRESHOLD:
            deficit = (self.BLUR_THRESHOLD - lap_var) / self.BLUR_THRESHOLD
            score -= 0.35 * deficit
            reasons.append("L3_OVER_SMOOTH_FACE")

        # ── 2. FFT High-Frequency Energy ───────────────────────────────────
        fft_energy_ratio = self._fft_hf_ratio(gray)
        if fft_energy_ratio < self.FFT_LOW_THRESHOLD:
            score -= 0.30
            reasons.append("L3_LOW_HF_ENERGY_AI_FACE")
        elif fft_energy_ratio > self.FFT_HIGH_THRESHOLD:
            score -= 0.20
            reasons.append("L3_GAN_GRID_ARTIFACT")

        # ── 3. Local Binary Pattern Variance (skin texture) ────────────────
        lbp_var = self._lbp_variance(gray)
        if lbp_var < self.LBP_LOW_THRESHOLD:
            score -= 0.25
            reasons.append("L3_UNIFORM_SKIN_TEXTURE")

        score = float(np.clip(score, 0.0, 1.0))
        frame_data.artifact_score = score
        frame_data.flags.extend(reasons)
        frame_data.metadata.update({
            "l3_laplacian_var": round(lap_var, 2),
            "l3_fft_hf_ratio":  round(fft_energy_ratio, 4),
            "l3_lbp_var":       round(lbp_var, 2),
        })

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _fft_hf_ratio(gray: np.ndarray) -> float:
        """Ratio of high-frequency energy to total energy in FFT spectrum."""
        f = np.fft.fft2(gray.astype(np.float32))
        fshift = np.fft.fftshift(f)
        magnitude = np.abs(fshift)

        h, w = magnitude.shape
        cy, cx = h // 2, w // 2
        radius = min(h, w) // 4  # inner circle = low freq

        Y, X = np.ogrid[:h, :w]
        mask_low = (X - cx)**2 + (Y - cy)**2 <= radius**2

        total_energy = float(magnitude.sum()) + 1e-8
        hf_energy    = float(magnitude[~mask_low].sum())
        return hf_energy / total_energy

    @staticmethod
    def _lbp_variance(gray: np.ndarray) -> float:
        """Simplified LBP: compare each pixel to its 8 neighbours."""
        padded = np.pad(gray.astype(np.float32), 1, mode='edge')
        center = padded[1:-1, 1:-1]
        lbp = np.zeros_like(center, dtype=np.uint8)
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                if dy == 0 and dx == 0:
                    continue
                neighbour = padded[1+dy:gray.shape[0]+1+dy, 1+dx:gray.shape[1]+1+dx]
                lbp += (neighbour >= center).astype(np.uint8)
        return float(np.var(lbp))
