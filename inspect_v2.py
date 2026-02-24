try:
    import mediapipe.python.solutions.face_detection as fd
    print("Imported face_detection")
except Exception as e:
    print("Failed face_detection:", e)

try:
    import mediapipe.python.solutions.face_mesh as fm
    print("Imported face_mesh")
except Exception as e:
    print("Failed face_mesh:", e)
