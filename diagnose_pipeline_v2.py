import cv2
import numpy as np
import os
from pathlib import Path

print("--- DIAGNOSING SHADOW PIPELINE V2 ---")

try:
    import mediapipe as mp
    print(f"Mediapipe version: {mp.__version__}")
    print(f"Mediapipe dir: {dir(mp)}")
    
    try:
        import mediapipe.solutions.face_detection as mp_face_detection
        print("SUCCESS: Explicitly imported mediapipe.solutions.face_detection")
    except Exception as e:
        print(f"FAILED: Explicitly import mediapipe.solutions.face_detection failed: {e}")

    from app.core.orchestrator import SessionOrchestrator
    print("SUCCESS: SessionOrchestrator imported.")
except Exception as e:
    print(f"FAILED: Import phase failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

try:
    print("Initializing Orchestrator...")
    orchestrator = SessionOrchestrator()
    print("SUCCESS: Orchestrator initialized.")
except Exception as e:
    print(f"FAILED: Orchestrator initialization failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("--- DIAGNOSIS COMPLETE ---")
