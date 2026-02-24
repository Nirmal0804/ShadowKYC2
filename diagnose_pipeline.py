import cv2
import numpy as np
import os
from pathlib import Path

print("--- DIAGNOSING SHADOW PIPELINE ---")

try:
    from app.core.orchestrator import SessionOrchestrator
    print("SUCCESS: SessionOrchestrator imported.")
except Exception as e:
    print(f"FAILED: SessionOrchestrator import failed: {e}")
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

# Create a dummy video or just test the modules with a dummy image
print("Testing modules with dummy image...")
dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
cv2.rectangle(dummy_img, (200, 100), (400, 300), (255, 255, 255), -1) # Draw a white box for "face"

try:
    print("Testing FaceDetector...")
    roi, bbox = orchestrator.face_detector.process_frame(dummy_img)
    print(f"FaceDetector result: {bbox}")
    
    print("Testing QualityGate...")
    qs, qf = orchestrator.quality_gate.process(roi if roi is not None else dummy_img)
    print(f"QualityGate result: {qs}, {qf}")
    
    print("Testing ArtifactDetector...")
    as_score, af = orchestrator.artifact_detector.process(roi if roi is not None else dummy_img)
    print(f"ArtifactDetector result: {as_score}, {af}")

except Exception as e:
    print(f"FAILED: Module testing failed: {e}")
    import traceback
    traceback.print_exc()

print("--- DIAGNOSIS COMPLETE ---")
