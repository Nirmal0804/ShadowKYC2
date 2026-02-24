import mediapipe as mp
print("Imported mp")
try:
    import mediapipe.python.solutions.face_mesh as fm
    print("Imported fm via mediapipe.python.solutions")
except Exception as e:
    print("Failed fm via mediapipe.python.solutions:", e)

try:
    from mediapipe.python.solutions import face_mesh
    print("Imported face_mesh via from")
except Exception as e:
    print("Failed face_mesh via from:", e)
