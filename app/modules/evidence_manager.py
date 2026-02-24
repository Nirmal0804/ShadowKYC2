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
        self.evidence_dir = config.EVIDENCE_DIR / session_id
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.saved_count = 0

    def process(self, frame_data: FrameData) -> Optional[str]:
        """
        Saves the frame if it has any flags.
        Returns the relative path to the saved image if saved, else None.
        """
        if not frame_data.flags:
            return None

        # Format filename with timestamp or index
        filename = f"frame_{int(frame_data.timestamp_sec * 1000)}.jpg"
        filepath = self.evidence_dir / filename
        
        # Save image
        # Ensure we save the original image, not the ROI
        if frame_data.image is not None:
            cv2.imwrite(str(filepath), frame_data.image)
            self.saved_count += 1
            # Return relative path for the report
            return f"evidence/{self.session_id}/{filename}"
            
        return None
