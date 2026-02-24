
import cv2
import numpy as np
from app.modules.layer_1_temporal_liveness import TemporalLivenessEngine
from app.core.types import FrameData
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class MockFrameData:
    image: np.ndarray
    liveness_score: float = 0.0
    flags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

def test_liveness():
    engine = TemporalLivenessEngine()
    print("Engine initialized.")
    
    # Create a dummy frame (black image)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Mock FrameData since we don't want to import the whole core if not needed
    # but the engine expects FrameData. Let's see if we can use the real one.
    try:
        from app.core.types import FrameData
        frame_data = FrameData(image=frame)
    except ImportError:
        print("Could not import FrameData, using mock.")
        frame_data = MockFrameData(image=frame)
        
    print("Processing frame...")
    engine.process(frame_data)
    
    print(f"Liveness Score: {frame_data.liveness_score}")
    print(f"Flags: {frame_data.flags}")
    print(f"Metadata: {frame_data.metadata}")

if __name__ == "__main__":
    test_liveness()
