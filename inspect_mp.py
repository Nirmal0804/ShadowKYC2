import mediapipe
print("Mediapipe version:", getattr(mediapipe, "__version__", "unknown"))
print("Mediapipe dir:", dir(mediapipe))
try:
    from mediapipe.python import solutions
    print("Found mediapipe.python.solutions")
except ImportError:
    print("Could not find mediapipe.python.solutions")

try:
    from mediapipe import solutions
    print("Found mediapipe.solutions")
except ImportError:
    print("Could not find mediapipe.solutions")
