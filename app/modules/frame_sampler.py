import cv2
import numpy as np
from typing import Iterator, Tuple

class FrameSampler:
    """
    Extracts frames from a video file at a configurable FPS.
    """
    def __init__(self, target_fps: float = 3.0):
        self.target_fps = target_fps

    def extract_frames(self, video_path: str) -> Iterator[Tuple[np.ndarray, float]]:
        """
        Yields frames from the video at approximately `target_fps`.
        
        Args:
            video_path: Path to the video file.
        
        Yields:
            (frame: np.ndarray, timestamp_sec: float)
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Could not open video file: {video_path}")
        
        original_fps = cap.get(cv2.CAP_PROP_FPS)
        if original_fps <= 0:
            # Fallback if FPS is not detected correctly, assume 30 or handle error
            original_fps = 30.0
            
        frame_interval = int(round(original_fps / self.target_fps))
        if frame_interval < 1:
            frame_interval = 1
            
        frame_idx = 0
        extracted_count = 0
        
        while True:
            success, frame = cap.read()
            if not success:
                break
                
            # Extract frame if index aligns with interval
            # Using simple modulo for basic extraction. 
            # Could be more precise with time-based accumulation if needed.
            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / original_fps
                yield frame, timestamp
                extracted_count += 1
            
            frame_idx += 1
            
        cap.release()
