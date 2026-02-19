import cv2
import numpy as np
import mediapipe.python.solutions.face_detection as mp_face_detection
import mediapipe.python.solutions.face_mesh as mp_face_mesh

def test_imports_and_simple_process():
    print("Testing OpenCV version:", cv2.__version__)
    print("Testing NumPy version:", np.__version__)
    
    # Create a simple image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(img, (200, 100), (400, 300), (255, 255, 255), -1)
    
    print("Initializing MediaPipe Face Detection...")
    with mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5) as face_detection:
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        print("Running MediaPipe processing...")
        results = face_detection.process(img_rgb)
        print("MediaPipe results:", results.detections if results.detections else "None")

    print("Initializing MediaPipe Face Mesh...")
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
        results = face_mesh.process(img_rgb)
        print("Face Mesh success:", results.multi_face_landmarks is not None)

if __name__ == "__main__":
    try:
        test_imports_and_simple_process()
        print("SUCCESS: Core ML libraries are working together.")
    except Exception as e:
        print("FAILED with error:")
        print(e)
        import traceback
        traceback.print_exc()
