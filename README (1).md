# 🛡️ ShadowKYC

> **Real-Time KYC Video Integrity & Deepfake Risk Detection System**

ShadowKYC is a multi-layer video integrity validation system designed to identify indicators of **deepfakes, replay attacks, presentation attacks, face manipulation, temporal inconsistencies, and environmental anomalies** during Video KYC.

Instead of replacing existing KYC providers, ShadowKYC acts as an additional **security and risk-analysis layer** that can run alongside existing identity-verification systems.

---

## 🚨 Problem

Modern Video KYC systems can be exposed to attacks such as:

- AI-generated or face-swapped videos
- Replay attacks using previously recorded KYC footage
- Frozen-frame or screen-replay attacks
- Synthetic facial texture and frequency artifacts
- Abnormal facial geometry
- Identity drift during a session
- Lip/mouth movement inconsistencies
- Background and lighting manipulation
- Overlay and screen-capture artifacts

Traditional identity verification may establish **who a person claims to be**, but a separate integrity layer is useful for determining whether the presented video itself appears trustworthy.

---

## 💡 Solution

ShadowKYC analyzes a KYC video at multiple levels and combines the resulting signals into a single explainable session-level risk score.

```text
                    ┌──────────────────────────┐
                    │      KYC Video Stream    │
                    │   Live Camera / Upload   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Frame Sampling & Face  │
                    │        Detection         │
                    └────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │ Layer 1     │        │ Layer 2     │        │ Layer 3     │
   │ Temporal    │        │ Face Match  │        │ Texture /   │
   │ Liveness    │        │ & Identity  │        │ Frequency   │
   └──────┬──────┘        └──────┬──────┘        └──────┬──────┘
          │                      │                      │
          └──────────────┬───────┴──────────────┬───────┘
                         │                      │
                         ▼                      ▼
                  ┌─────────────┐        ┌─────────────┐
                  │ Layer 4     │        │ Layer 5     │
                  │ Geometry /  │        │ Lip-Sync    │
                  │ Pseudo-Depth│        │ Integrity   │
                  └──────┬──────┘        └──────┬──────┘
                         │                      │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌─────────────┐       ┌─────────────┐
                  │ Layer 6     │       │ Layer 7     │
                  │ Environment │──────▶│ Meta Fusion │
                  │ Integrity   │       │ & Decision  │
                  └─────────────┘       └──────┬──────┘
                                               │
                                               ▼
                                  ┌────────────────────────┐
                                  │ Session Risk Assessment│
                                  │ LOW / MEDIUM / HIGH    │
                                  └────────────────────────┘
```

---

# 🧠 Seven-Layer Detection Architecture

ShadowKYC currently uses seven complementary analysis layers.

## Layer 1 — Temporal Liveness

**Module:** `app/modules/layer_1_temporal_liveness.py`

Analyzes temporal facial behavior to identify signs of replay or unnatural movement.

### Signals

- MediaPipe FaceMesh landmarks
- Eye Aspect Ratio (EAR)
- Blink variation
- Head pose / yaw / pitch
- Temporal head movement
- Frozen-frame detection
- Perceptual hashing
- Face mesh availability

### Example indicators

```text
FROZEN_FRAME_REPLAY
L1_UNNATURAL_HEAD_STABILITY
L1_NO_BLINK_VARIATION
L1_EXTREME_HEAD_POSE
L1_NO_FACE_MESH
```

---

## Layer 2 — Face Match & Identity Continuity

**Module:** `app/modules/layer_2_face_match.py`

Maintains a rolling facial baseline and checks whether the identity representation remains consistent throughout the session.

### Signals

- HOG-based CPU-friendly face representation
- Cosine distance
- Rolling face baseline
- Embedding drift
- Sudden facial appearance changes

### Example indicators

```text
L2_FACE_SWAP_DETECTED
L2_IDENTITY_DRIFT
L2_SUDDEN_APPEARANCE_CHANGE
```

This layer is intended to identify **identity continuity problems**, rather than acting as a standalone identity-verification provider.

---

## Layer 3 — Texture & Frequency Artifact Detection

**Module:** `app/modules/layer_3_texture_artifact.py`

Analyzes facial texture and frequency characteristics that may become abnormal after synthetic generation, manipulation, compression, or presentation attacks.

### Signals

- Laplacian variance
- FFT high-frequency energy ratio
- Simplified LBP variance
- Face ROI texture analysis
- Excessive smoothing
- Frequency-domain anomalies

### Current thresholds

```text
BLUR_THRESHOLD      = 80.0
FFT_LOW_THRESHOLD   = 0.08
FFT_HIGH_THRESHOLD  = 0.45
LBP_LOW_THRESHOLD   = 20.0
```

### Example indicators

```text
L3_OVER_SMOOTH_FACE
L3_LOW_HF_ENERGY_AI_FACE
L3_GAN_GRID_ARTIFACT
L3_UNIFORM_SKIN_TEXTURE
```

The layer also records metrics such as:

```text
l3_laplacian_var
l3_fft_hf_ratio
l3_lbp_var
```

---

## Layer 4 — Geometry & Pseudo-Depth Integrity

**Module:** `app/modules/layer_4_geometry.py`

Uses facial landmarks and geometric relationships to identify abnormal facial proportions or temporal geometry changes.

### Signals

- MediaPipe FaceMesh
- Eye-width ratio
- Eye-to-nose ratio
- Nose-to-chin ratio
- Facial symmetry
- Ratio drift across frames
- Eye-width distortion

### Current thresholds

```text
SYMMETRY_THRESHOLD = 0.25
RATIO_DRIFT_THRESH = 0.15
HISTORY_LEN        = 20
```

### Example indicators

```text
L4_FACE_ASYMMETRY
L4_LANDMARK_RATIO_DRIFT
L4_EYE_WIDTH_DISTORTION
L4_NO_LANDMARKS
```

---

## Layer 5 — Lip-Sync Integrity

**Module:** `app/modules/layer_5_lipsync.py`

Analyzes mouth movement over time to identify frozen or highly abnormal facial motion.

### Signals

- MediaPipe FaceMesh
- Mouth Aspect Ratio (MAR)
- Mouth movement variance
- Optional audio RMS
- Optional audio/MAR correlation

### Current thresholds

```text
MAR_FROZEN_THRESHOLD  = 0.0005
MAR_ERRATIC_THRESHOLD = 0.08
HISTORY_LEN           = 30
MIN_FRAMES_FOR_EVAL   = 10
```

### Example indicators

```text
L5_MOUTH_FROZEN_NO_SPEECH
L5_ERRATIC_MOUTH_MOVEMENT
L5_AUDIO_LIP_MISMATCH
```

> **Note:** The current implementation primarily uses visual mouth-motion analysis. Audio correlation is optional and should not be described as a complete audio deepfake detector.

---

## Layer 6 — Environment & Background Integrity

**Module:** `app/modules/layer_6_environment.py`

Analyzes the environment surrounding the face to detect inconsistencies that can occur during replay, overlays, screen capture, or manipulated video.

### Signals

- Color histogram drift
- Bhattacharyya distance
- Background motion
- Frame-difference analysis
- Edge shimmer / overlay halo
- Background flickering

### Current thresholds

```text
HIST_DIFF_THRESHOLD     = 0.35
BG_MOTION_THRESHOLD     = 15.0
EDGE_SHIMMER_THRESHOLD  = 0.12
HISTORY_LEN             = 20
```

### Example indicators

```text
L6_SUDDEN_LIGHTING_SHIFT
L6_BACKGROUND_MOTION_DETECTED
L6_EDGE_SHIMMER_OVERLAY
L6_BACKGROUND_FLICKERING
```

---

# Layer 7 — Meta Fusion & Explainable Decision

**Module:** `app/modules/layer_7_meta_fusion.py`

The final layer converts the outputs from the six detection layers into a unified risk score.

Each individual module produces a **goodness score**, where:

```text
1.0 = clean / authentic signal
0.0 = suspicious signal
```

Risk contribution is calculated as:

```text
risk contribution = 1 - layer score
```

## Layer Weights

| Layer | Signal | Weight |
|---|---|---:|
| L1 | Temporal Liveness | 0.25 |
| L2 | Face Match | 0.20 |
| L3 | Texture / Frequency | 0.15 |
| L4 | Geometry | 0.15 |
| L5 | Lip-Sync | 0.10 |
| L6 | Environment | 0.15 |
| | **Total** | **1.00** |

---

## Contradiction Rules

ShadowKYC also applies additional penalties when multiple suspicious signals contradict each other in meaningful ways.

| Combination | Additional Penalty |
|---|---:|
| Unnatural head stability + background motion | +0.10 |
| Face swap + frozen-frame replay | +0.15 |
| Over-smooth face + eye-width distortion | +0.10 |
| Frozen mouth + background motion | +0.12 |

This allows the final decision to consider **cross-layer evidence**, rather than treating every layer independently.

---

# 🎯 Risk Classification

The final risk score is classified into three levels.

| Risk Score | Classification | Recommendation |
|---:|---|---|
| `< 0.35` | 🟢 LOW RISK | APPROVE — Session appears authentic |
| `0.35 – < 0.65` | 🟡 MEDIUM RISK | REVIEW — Manual verification recommended |
| `>= 0.65` | 🔴 HIGH RISK | REJECT — High probability of fraud |

Example output:

```json
{
  "risk_score": 0.72,
  "risk_pct": 72,
  "classification": "HIGH_RISK",
  "recommendation": "REJECT – High probability of fraud. Do not proceed.",
  "top_reasons": [
    "Face swap indicators detected",
    "Frozen frame replay detected",
    "Cross-layer contradiction detected"
  ]
}
```

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      Frontend        │
                         │ React + Vite         │
                         │ Tailwind CSS          │
                         └──────────┬───────────┘
                                    │
                         HTTP / WebSocket
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      FastAPI         │
                         │      Backend         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Orchestrator     │
                         │ app/core/orchestrator│
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
       ┌──────────┐          ┌──────────┐          ┌──────────┐
       │   L1     │          │   L2     │          │   L3     │
       │ Liveness │          │Face Match│          │ Texture  │
       └────┬─────┘          └────┬─────┘          └────┬─────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                   ┌──────────┐      ┌──────────┐
                   │   L4     │      │   L5     │
                   │ Geometry │      │ Lip-Sync │
                   └────┬─────┘      └────┬─────┘
                        │                 │
                        └────────┬────────┘
                                 │
                                 ▼
                           ┌──────────┐
                           │   L6     │
                           │Environment│
                           └────┬─────┘
                                │
                                ▼
                         ┌─────────────┐
                         │     L7      │
                         │ Meta Fusion │
                         └──────┬──────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Risk + Evidence  │
                       │ + Recommendation │
                       └──────────────────┘
```

---

# 📁 Project Structure

```text
ShadowKYC2/
│
├── app/
│   ├── core/
│   │   └── orchestrator.py
│   │
│   ├── modules/
│   │   ├── layer_1_temporal_liveness.py
│   │   ├── layer_2_face_match.py
│   │   ├── layer_3_texture_artifact.py
│   │   ├── layer_4_geometry.py
│   │   ├── layer_5_lipsync.py
│   │   ├── layer_6_environment.py
│   │   └── layer_7_meta_fusion.py
│   │
│   └── main.py
│
├── frontend/
│   └── src/
│       └── pages/
│           └── DevDashboard.jsx
│
├── evidence/
├── reports/
├── temp_uploads/
│
├── tests/
│
├── requirements.txt
├── implementation_plan.md
├── supabase_schema.sql
├── db.json
├── run_server.bat
└── README.md
```

---

# 🖥️ User Interface

ShadowKYC supports two primary analysis workflows.

## 1. Live Session

The live workflow is designed for real-time KYC sessions.

```text
┌────────────────────────────────────────────────────────────┐
│                    SHADOW KYC — LIVE                       │
├──────────────────────────────┬─────────────────────────────┤
│                              │                             │
│       CAMERA FEED            │       RISK ANALYSIS        │
│                              │                             │
│     ┌────────────────┐       │    Risk Score: 42%         │
│     │                │       │    MEDIUM RISK              │
│     │     CAMERA     │       │                             │
│     │      FEED      │       │    L1  ████████░░           │
│     │                │       │    L2  ██████░░░░           │
│     └────────────────┘       │    L3  █████████░           │
│                              │    L4  ███████░░░           │
│                              │    L5  ██████░░░░           │
│                              │    L6  ████████░░           │
│                              │                             │
│ [ START ] [ STOP ]           │    ⚠ Evidence             │
│                              │    ⚠ Identity drift        │
├──────────────────────────────┴─────────────────────────────┤
│                    FLAGGED FRAMES / EVENTS                 │
└────────────────────────────────────────────────────────────┘
```

The live interface can display:

- Camera feed
- Rolling risk score
- Layer status
- Detection flags
- Flagged frames
- Session timeline
- Start / stop controls
- Session report

---

# 🎞️ Post-Session Video Analysis

Recorded KYC videos can also be uploaded and analyzed after the session.

```text
Upload Video
     │
     ▼
Frame Extraction
     │
     ▼
Face Detection
     │
     ├── L1 Temporal Liveness
     ├── L2 Face Match
     ├── L3 Texture
     ├── L4 Geometry
     ├── L5 Lip-Sync
     └── L6 Environment
             │
             ▼
        L7 Meta Fusion
             │
             ▼
       Final Risk Report
```

The report can expose:

- Overall risk score
- Risk classification
- Recommendation
- Layer scores
- Detection flags
- Top reasons
- Contradiction penalties
- Evidence frames
- Session-level metadata

---

# 🔌 API

The backend is implemented with **FastAPI**.

Important API workflows include:

```text
/analyze-session
/upload-recording
```

The frontend communicates with the backend using HTTP requests and WebSocket-based live-session communication.

---

# ⚙️ Installation

## Requirements

Recommended environment:

- Python 3.10
- Node.js 18+
- npm
- Git
- Webcam for live testing
- Linux / WSL / Windows supported depending on dependency configuration

---

## 1. Clone the Repository

```bash
git clone https://github.com/Nirmal0804/ShadowKYC2.git
cd ShadowKYC2
```

---

## 2. Create Python Virtual Environment

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Running the Backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

# ▶️ Running the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available through the Vite development server.

---

# 🧪 Testing

Run the test suite from the project root:

```bash
python -m unittest discover -s tests -v
```

The project should be tested after changes to:

- Individual detection layers
- Orchestrator logic
- API routes
- Risk fusion
- Frontend/backend communication

---

# 🔄 Live Processing Flow

```text
Browser Camera
      │
      ▼
WebSocket
      │
      ▼
FastAPI
      │
      ▼
Orchestrator.start_session()
      │
      ▼
process_single_frame()
      │
      ├─────────────┐
      │             │
      ▼             ▼
 Face Detection   Frame Metadata
      │
      ▼
 Seven-Layer Analysis
      │
      ▼
 Rolling Session State
      │
      ▼
 Live Risk Updates
      │
      ▼
 Browser Dashboard
      │
      ▼
finalize_live_session()
      │
      ▼
 Session Report
```

---

# 📊 Explainability

ShadowKYC is designed around **evidence-based risk scoring** rather than a single black-box prediction.

Instead of returning only:

```text
FAKE
```

the system can provide:

```text
Risk Score: 72%

Classification:
HIGH_RISK

Evidence:
- Frozen frame replay indicator
- Identity drift
- Facial texture anomaly
- Cross-layer contradiction

Recommendation:
Manual investigation / reject according to KYC policy
```

This makes the system more useful for fraud analysts and compliance workflows.

---

# 🛡️ Security Model

ShadowKYC should be deployed as a security layer around a KYC workflow.

```text
                 Customer
                    │
                    ▼
              Video KYC Flow
                    │
                    ▼
          ┌───────────────────┐
          │ Existing KYC      │
          │ Provider          │
          └─────────┬─────────┘
                    │
                    │
          ┌─────────▼─────────┐
          │    ShadowKYC      │
          │ Integrity Layer   │
          └─────────┬─────────┘
                    │
                    ▼
          Risk + Evidence
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Approve              Review /
                           Reject
```

ShadowKYC does **not** need to replace the customer's existing identity-verification provider.

---

# ☁️ Deployment Considerations

For production deployment, separate application logic from persistent storage.

Recommended architecture:

```text
                   ┌─────────────────┐
                   │   Frontend      │
                   │ React / Vite    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ FastAPI Server  │
                   │ ShadowKYC       │
                   └───────┬─────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        MongoDB Atlas    S3/Object    Processing
        Metadata         Storage      Worker
             │             │
             │             │
             └──────┬──────┘
                    ▼
              Session Reports
```

Large video and image files should preferably be stored in object storage rather than directly inside a database.

Database records should primarily contain:

- Session ID
- User/tenant reference
- Analysis status
- Risk score
- Classification
- Layer results
- Evidence references
- Timestamps
- Storage object references

---

# 🧰 Technology Stack

## Backend

- Python
- FastAPI
- OpenCV
- MediaPipe
- NumPy
- SciPy
- PyZBar
- WebSockets

## Computer Vision

- MediaPipe FaceMesh
- OpenCV
- HOG-based facial representation
- FFT analysis
- Laplacian variance
- LBP-based texture analysis
- Facial geometry analysis
- Temporal signal analysis

## Frontend

- React
- Vite
- Tailwind CSS
- Chart.js
- Lucide icons

## Planned / Deployment Infrastructure

- MongoDB Atlas
- Amazon S3
- Cloud deployment
- Private object storage
- Presigned media URLs

> MongoDB Atlas and S3 should only be considered production architecture components once they are actually integrated into the application.

---

# 📈 Performance Considerations

Real-time video analysis can be computationally expensive.

Potential optimizations include:

- Process only selected frames per second
- Resize face crops before analysis
- Use conditional execution
- Batch independent operations
- Cache repeated calculations
- Avoid unnecessary full-resolution processing
- Use asynchronous processing where appropriate
- Use ONNX / optimized inference where applicable
- Use CPU-friendly algorithms for lightweight layers

A production system should balance:

```text
Detection Accuracy
        ↕
Processing Latency
        ↕
Infrastructure Cost
```

---

# 🧪 Evaluation Strategy

A robust evaluation should test ShadowKYC against multiple attack categories.

## Authentic Sessions

- Normal webcam sessions
- Different lighting
- Different backgrounds
- Different camera qualities
- Different face angles
- Natural speaking and blinking

## Attack Sessions

- Replay videos
- Frozen-frame attacks
- Screen recordings
- Face-swap videos
- Synthetic/deepfake videos
- Overlay attacks
- Manipulated lighting/background
- Low-quality compressed videos

Recommended evaluation metrics:

```text
Precision
Recall
F1 Score
False Positive Rate
False Negative Rate
ROC-AUC
Detection Latency
Per-layer contribution
Session-level accuracy
```

---

# ⚠️ Limitations

ShadowKYC should be treated as a **risk-analysis system**, not an infallible deepfake detector.

Potential limitations include:

- Low-light environments
- Poor camera quality
- Strong video compression
- Occluded faces
- Extreme head poses
- Multiple faces
- Network-induced frame drops
- Legitimate unusual facial motion
- False positives from environmental changes
- New deepfake generation techniques
- Device-specific capture behavior

The risk score is an analytical signal and should be incorporated into an organization's broader fraud and compliance decision process.

---

# 🔐 Privacy Considerations

Video KYC data can contain highly sensitive personal information.

A production implementation should consider:

- Encryption in transit
- Encryption at rest
- Private object storage
- Short media retention periods
- Access-controlled evidence
- Tenant isolation
- Audit logs
- Secure deletion policies
- Least-privilege IAM
- No unnecessary storage of raw biometric data

Do not expose uploaded KYC videos or evidence frames through public URLs.

---

# 🚀 Future Roadmap

Potential future improvements:

### Detection

- Dedicated deepfake classifier
- Improved temporal transformer models
- Audio deepfake detection
- Stronger replay detection
- Device/camera fingerprinting
- Screen-reflection detection
- Advanced face embeddings
- Depth estimation
- Multi-face attack handling

### Infrastructure

- Background processing workers
- Redis-based session state
- MongoDB Atlas integration
- Amazon S3 integration
- Horizontal scaling
- GPU inference workers
- Queue-based processing

### Product

- Tenant dashboard
- Fraud analyst dashboard
- Session history
- Evidence explorer
- Risk analytics
- API keys
- Webhooks
- KYC provider integrations
- Configurable risk thresholds
- Organization-specific policies

---

# 🎯 Intended Use Cases

ShadowKYC can be used as an additional integrity layer for:

- Fintech onboarding
- Banking KYC
- Insurance onboarding
- Digital lending
- Remote account opening
- Government digital services
- Telecom onboarding
- High-value transaction verification
- Remote employee verification
- Fraud investigation workflows

---

# 🧩 Design Philosophy

ShadowKYC follows four core principles:

### 1. Multi-Signal Detection

No single visual signal is treated as sufficient evidence.

### 2. Temporal Analysis

Video should be analyzed across time, not only as independent images.

### 3. Cross-Layer Correlation

Contradictory signals can provide stronger evidence than isolated anomalies.

### 4. Explainable Risk

The system should provide reasons and evidence alongside the final risk score.

---

# 📌 Important Terminology

| Term | Meaning |
|---|---|
| Liveness | Evidence that the presented subject behaves like a live person |
| Replay Attack | Presenting previously recorded KYC footage |
| Presentation Attack | Presenting a photo, screen, mask, or other artifact as the subject |
| Face Swap | Replacing one person's facial identity with another |
| Identity Drift | Significant change in facial representation during a session |
| Temporal Consistency | Whether facial behavior remains coherent over time |
| Texture Artifact | Abnormal visual texture caused by synthesis, manipulation, or processing |
| Geometry Drift | Abnormal change in facial landmark relationships |
| Lip-Sync | Consistency between mouth movement and speech activity |
| Meta Fusion | Combining multiple detection signals into one risk assessment |

---

# 📜 Disclaimer

ShadowKYC is a security and fraud-analysis prototype intended to provide **risk indicators and supporting evidence**.

It should not be treated as a guaranteed deepfake detector or as the sole basis for identity, compliance, or financial decisions.

Production deployments should be evaluated against representative datasets, attack scenarios, regulatory requirements, privacy requirements, and organization-specific risk policies.

---

# 👨‍💻 Development

This project is actively developed as a research and engineering project focused on:

```text
Computer Vision
        +
Video Forensics
        +
Fraud Detection
        +
Real-Time Systems
        +
KYC Security
```

---

# 📄 License

Add the project's chosen license here before public production distribution.

---

# ⭐ Project Goal

> **Make Video KYC harder to fool by validating not only who is being presented, but whether the video itself appears trustworthy.**
