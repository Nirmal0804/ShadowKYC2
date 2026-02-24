from dataclasses import dataclass, field
from typing import List, Optional, Dict
import numpy as np


@dataclass
class FrameData:
    image: np.ndarray               # Original frame (BGR)
    timestamp_sec: float            # Timestamp in seconds
    face_roi: Optional[np.ndarray] = None  # Cropped face ROI

    # ── Layer scores (1.0 = clean, 0.0 = highly suspicious) ──────────────
    # L1 – Temporal Liveness
    liveness_score: Optional[float] = None
    # L2 – Face Match (stored in metadata["l2_match_score"])
    # L3 – Texture / Frequency Artifact
    artifact_score: Optional[float] = None
    # L4 – Geometry (stored in metadata["l4_geometry_score"])
    # L5 – Lip-Sync (stored in metadata["l5_lipsync_score"])
    # L6 – Environment (stored in metadata["l6_env_score"])
    # Legacy fields kept for backward compatibility
    quality_score: Optional[float] = None
    temporal_score: Optional[float] = None
    deepfake_probability: Optional[float] = None

    # ── Shared containers ─────────────────────────────────────────────────
    flags: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class SessionReport:
    session_id: str
    risk_score: float               # 0.0–1.0
    risk_pct: int                   # 0–100
    classification: str             # LOW_RISK / MEDIUM_RISK / HIGH_RISK
    recommendation: str             # Human-readable decision
    layer_scores: Dict[str, float]  # Per-layer risk contributions
    reason_codes: List[str]         # Top flag reasons
    top_suspicious_timestamps: List[float]
    flagged_frame_count: int
    evidence_frames: List[str]
    # Legacy fields
    deepfake_probability: Optional[float] = None
    replay_score: float = 0.0
    liveness_score: float = 0.0
