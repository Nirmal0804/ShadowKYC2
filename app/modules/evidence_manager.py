import cv2
import os
from pathlib import Path
from typing import Optional
from app.core import config
from app.core.types import FrameData

class EvidenceManager:
    """
    Manages storage of evidence frames for suspicious activity.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        # self.evidence_dir = config.EVIDENCE_DIR / session_id
        # self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.saved_count = 0

    def process(self, frame_data: FrameData) -> Optional[str]:
        """
        In-memory only: Tracking suspicious activity without disk storage.
        """
        if not frame_data.flags:
            return None

        # Format filename for tracking purposes (no disk write)
        filename = f"frame_{int(frame_data.timestamp_sec * 1000)}.jpg"
        
        # [SECURITY] Disk storage disabled as per user request
        # cv2.imwrite(str(self.evidence_dir / filename), frame_data.image)
        
        self.saved_count += 1
        # Return a sentinel or just None to indicate 'stored in memory/conceptually'
        return f"memory://{self.session_id}/{filename}"
