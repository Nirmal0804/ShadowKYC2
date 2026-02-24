import cv2
import numpy as np
import os
from app.core.orchestrator import SessionOrchestrator

def create_dummy_video(filename="test_video.mp4"):
    height, width = 480, 640
    fps = 30
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video = cv2.VideoWriter(filename, fourcc, fps, (width, height))

    for i in range(30): # 1 second
        # Create a frame (random noise + a rectangle to simulate a face?)
        frame = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
        # Draw a face-like rectangle
        cv2.rectangle(frame, (200, 100), (400, 300), (255, 200, 200), -1)
        video.write(frame)

    video.release()
    print(f"Created {filename}")
    return filename

def test_pipeline():
    print("Testing pipeline...")
    video_path = create_dummy_video()
    
    try:
        orch = SessionOrchestrator()
        report = orch.start_session(video_path)
        print("Pipeline execution successful!")
        print(f"Report: {report}")
    except Exception as e:
        print("Pipeline FAILED with error:")
        print(e)
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)

if __name__ == "__main__":
    test_pipeline()
