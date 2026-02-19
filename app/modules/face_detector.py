import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Tuple

class FaceDetector:
    """
    Wrapper for Face Detection. Tries MediaPipe first, falls back to OpenCV Haar Cascades
    if MediaPipe legacy solutions are missing (e.g. on Python 3.13).
    """
    def __init__(self, min_detection_confidence=0.5):
        self.use_mediapipe = False
        try:
            self.mp_face_detection = mp.solutions.face_detection
            self.face_detection = self.mp_face_detection.FaceDetection(
                model_selection=0, # 0 for short range
                min_detection_confidence=min_detection_confidence
            )
            self.use_mediapipe = True
            print("FaceDetector: Using MediaPipe")
        except (AttributeError, ImportError, ModuleNotFoundError):
            print("FaceDetector: MediaPipe legacy solutions not found. Falling back to OpenCV Haar Cascades.")
            # Load Haar Cascade
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            if self.face_cascade.empty():
                print("FaceDetector ERROR: Could not load Haar Cascade.")
        
        self.target_size = (224, 224)

    def process_frame(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[Tuple[int, int, int, int]]]:
        if self.use_mediapipe:
            return self._process_mediapipe(frame)
        else:
            return self._process_opencv(frame)

    def _process_mediapipe(self, frame: np.ndarray):
        # MediaPipe expects RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(frame_rgb)

        if not results.detections:
            return None, None

        h, w, _ = frame.shape
        detection = results.detections[0]
        bboxC = detection.location_data.relative_bounding_box
        
        x = int(bboxC.xmin * w)
        y = int(bboxC.ymin * h)
        width = int(bboxC.width * w)
        height = int(bboxC.height * h)

        return self._extract_roi(frame, x, y, width, height)

    def _process_opencv(self, frame: np.ndarray):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return None, None
        
        # Sort by area and take largest
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        
        return self._extract_roi(frame, x, y, w, h)

    def _extract_roi(self, frame, x, y, width, height):
        h, w, _ = frame.shape
        x = max(0, x)
        y = max(0, y)
        width = min(w - x, width)
        height = min(h - y, height)

        if width <= 0 or height <= 0:
            return None, None

        roi = frame[y:y+height, x:x+width]
        try:
            roi_resized = cv2.resize(roi, self.target_size)
            return roi_resized, (x, y, width, height)
        except Exception as e:
            print(f"Error resizing ROI: {e}")
            return None, None
