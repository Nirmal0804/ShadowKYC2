import cv2
import numpy as np
import mediapipe.solutions.face_detection as mp_face_detection
import mediapipe.solutions.face_mesh as mp_face_mesh

def test_v3():
    print("Testing MediaPipe v3 imports...")
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    detector = mp_face_detection.FaceDetection()
    results = detector.process(img_rgb)
    print("Detector processed.")
    
    mesh = mp_face_mesh.FaceMesh()
    results = mesh.process(img_rgb)
    print("Mesh processed.")

if __name__ == "__main__":
    try:
        test_v3()
        print("SUCCESS")
    except Exception as e:
        print("FAILED:", e)
        import traceback
        traceback.print_exc()
