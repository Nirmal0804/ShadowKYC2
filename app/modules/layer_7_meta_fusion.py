"""
Layer 7 – Meta Fusion + Explainable Final Decision
Purpose: Combine L1–L6, detect contradictions, generate final decision.
Tech Stack: Python + NumPy + Rule Engine
Output: Final risk score (0–100) + top reason tags + flagged frames + recommendation
"""
import numpy as np
from app.core.types import FrameData


# ── Layer weights (must sum to 1.0) ──────────────────────────────────────────
LAYER_WEIGHTS = {
    "l1_liveness":   0.25,   # Temporal liveness is most critical
    "l2_face_match": 0.20,   # Identity continuity
    "l3_texture":    0.15,   # Texture/frequency artifacts
    "l4_geometry":   0.15,   # Geometric integrity
    "l5_lipsync":    0.10,   # Lip-sync (lower weight; audio often unavailable)
    "l6_environment":0.15,   # Background/environment
}

# ── Contradiction rules ───────────────────────────────────────────────────────
# If these flag combinations appear together → extra risk penalty
CONTRADICTION_RULES = [
    # (flag_A, flag_B, penalty, reason_tag)
    ("L1_UNNATURAL_HEAD_STABILITY", "L6_BACKGROUND_MOTION_DETECTED", 0.10, "CONTRADICTION_STATIC_FACE_MOVING_BG"),
    ("L2_FACE_SWAP_DETECTED",       "L1_FROZEN_FRAME_REPLAY",        0.15, "CONTRADICTION_SWAP_AND_REPLAY"),
    ("L3_OVER_SMOOTH_FACE",         "L4_EYE_WIDTH_DISTORTION",       0.10, "CONTRADICTION_SMOOTH_WARPED"),
    ("L5_MOUTH_FROZEN_NO_SPEECH",   "L6_BACKGROUND_MOTION_DETECTED", 0.12, "CONTRADICTION_SILENT_FACE_ACTIVE_BG"),
]

# ── Final decision thresholds ─────────────────────────────────────────────────
RISK_HIGH   = 0.65
RISK_MEDIUM = 0.35


class MetaFusionEngine:
    """
    L7: Meta Fusion + Explainable Final Decision

    Aggregates scores from L1–L6, applies contradiction detection,
    and produces a final risk score with human-readable reasoning.
    """

    def __init__(self):
        print("L7-MetaFusion: Rule-based fusion engine ready")

    # ── Public API ────────────────────────────────────────────────────────────
    def compute_risk(self, frame_data: FrameData) -> dict:
        """
        Returns a dict with:
          - risk_score: float 0.0–1.0
          - risk_pct:   int 0–100
          - classification: str
          - top_reasons: list[str]
          - recommendation: str
          - layer_scores: dict
        """
        meta = frame_data.metadata
        flags = set(frame_data.flags)

        # ── Extract per-layer scores (higher = more suspicious) ───────────
        # Each layer returns a "goodness" score (1.0 = clean, 0.0 = suspicious)
        # We convert to risk contribution: risk_i = (1 - score_i)
        layer_scores = {
            "l1_liveness":    1.0 - (frame_data.liveness_score or 1.0),
            "l2_face_match":  1.0 - (meta.get("l2_match_score") or 1.0),
            "l3_texture":     1.0 - (frame_data.artifact_score or 1.0),
            "l4_geometry":    1.0 - (meta.get("l4_geometry_score") or 1.0),
            "l5_lipsync":     1.0 - (meta.get("l5_lipsync_score") or 1.0),
            "l6_environment": 1.0 - (meta.get("l6_env_score") or 1.0),
        }

        # ── Weighted fusion ───────────────────────────────────────────────
        base_risk = sum(
            layer_scores[k] * LAYER_WEIGHTS[k]
            for k in LAYER_WEIGHTS
        )

        # ── Contradiction penalty ─────────────────────────────────────────
        contradiction_reasons = []
        contradiction_penalty = 0.0
        for flag_a, flag_b, penalty, tag in CONTRADICTION_RULES:
            if flag_a in flags and flag_b in flags:
                contradiction_penalty += penalty
                contradiction_reasons.append(tag)

        final_risk = float(np.clip(base_risk + contradiction_penalty, 0.0, 1.0))

        # ── Classification ────────────────────────────────────────────────
        if final_risk >= RISK_HIGH:
            classification  = "HIGH_RISK"
            recommendation  = "REJECT – High probability of fraud. Do not proceed."
        elif final_risk >= RISK_MEDIUM:
            classification  = "MEDIUM_RISK"
            recommendation  = "REVIEW – Manual verification recommended."
        else:
            classification  = "LOW_RISK"
            recommendation  = "APPROVE – Session appears authentic."

        # ── Top reasons (flags + contradictions, sorted by severity) ─────
        top_reasons = list(flags) + contradiction_reasons
        # Prioritise high-severity flags
        priority_keywords = ["SWAP", "REPLAY", "FROZEN", "CONTRADICTION", "MISMATCH"]
        top_reasons.sort(key=lambda r: any(k in r for k in priority_keywords), reverse=True)

        return {
            "risk_score":      final_risk,
            "risk_pct":        int(final_risk * 100),
            "classification":  classification,
            "recommendation":  recommendation,
            "top_reasons":     top_reasons[:6],
            "layer_scores":    {k: round(v, 4) for k, v in layer_scores.items()},
            "contradiction_penalty": round(contradiction_penalty, 4),
        }
