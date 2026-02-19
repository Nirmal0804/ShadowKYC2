# Shadow - KYC Video Integrity Analysis

Local Build-First Software Architecture for analyzing KYC session videos for deepfakes and liveness spoofing.

## Setup & Run

1. **Install Dependencies & Run**:
   Double click `run_server.bat`
   OR manually:
   ```bash
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Test API**:
   - Open browser at `http://localhost:8000/docs`.
   - Use `POST /analyze-session` to upload a video file (mp4/avi).
   - The analysis runs synchronously (may take time for long videos).
   - Returns a structured JSON report with risk scores and flagged frames.

## Directory Structure

- `app/core`: Core logic (Orchestrator, Config, Types).
- `app/modules`: Individual analysis layers (Quality, Artifact, Liveness, Temporal, Deepfake).
- `app/main.py`: FastAPI entry point.
- `evidence/`: Stores flagged frames (evidence).
- `reports/`: Stores JSON analysis reports.

## Configuration

Adjust thresholds and weights in `app/core/config.py`.

## TFLite Model

Place your custom trained Deepfake Classifier TFLite model at `app/models/deepfake_model.tflite`.
If missing, Layer 5 is skipped.
