# SHADOW KYC Toolkit

A comprehensive, modern KYC (Know Your Customer) solution designed to ensure identity integrity and seamless onboarding. The system consists of a robust video and document processing backend powered by machine learning, and an interactive, real-time React web application frontend for both user onboarding and tenant administration.

## 🚀 Features

- **Real-Time Video Liveness Detection:** Employs Mediapipe and OpenCV to analyze temporal liveness, detecting spoofing and recording attacks.
- **Deepfake & Deep Learning Image Analysis:** Uses TensorFlow to assess risks on incoming camera feeds.
- **QR Code Verification (`pyzbar`):** Instantly scans and processes secure user-generated QR codes from Government IDs.
- **Document Verification:** Secure document upload layer integrated directly into the verification pipeline.
- **Role-Based Tenant Dashboard:** Dedicated analytics (powered by Chart.js) and manual oversight dashboard for verifying or rejecting sessions in real-time.
- **Real-time Synchronization:** Built-in WebSocket communication keeps session statuses synced between tenants and end-users seamlessly.
- **Supabase Integration:** Uses Supabase for robust, scalable relational data storage and session management.

## 🛠️ Technology Stack

### Frontend
- **React.js (v18)** - Core UI framework.
- **Vite** - Build tool for fast local development.
- **Tailwind CSS / clsx** - Modular styling utilities.
- **React Router DOM** - Advanced client-side routing.
- **Chart.js & React-Chartjs-2** - For dashboard data visualizations.
- **Lucide React** - UI Icon library.

### Backend
- **FastAPI / Python (3.9+)** - High-performance backend routing & WebSockets.
- **OpenCV & MediaPipe** - For computer vision and temporal liveness checks.
- **TensorFlow** - Advanced machine learning verification pipelines.
- **Supabase** - Cloud database integration for persisting audit trails and states.
- **PyZBar** - Fast processing for ID barcodes/QR codes.

## 📂 Project Structure

```
├── app/                  # FastAPI backend server modules
│   ├── main.py           # Core FastAPI application & WebSockets
│   ├── modules/          # Layered ML & Integrity check modules
│   ├── api/              # API specific routing components
│   └── supabase_client.py# Supabase DB integration layer
├── frontend/             # React application frontend root
│   ├── src/              # React components, pages, context, styles
│   └── package.json      # Frontend package details
├── requirements.txt      # Python dependencies
├── run_server.bat        # Local Windows execution automation
└── ...
```

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en) (v18 or higher recommended)
- [Python](https://www.python.org/downloads/) (v3.9 - v3.11 recommended)
- Supabase account with configured database tables (see `supabase_schema.sql` for definitions).

### 1. Backend Setup (FastAPI Server)

Open a terminal at the root directory of the project:

```bash
# 1. Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Configure environments
# Ensure your active `.env` file exists with corresponding SUPABASE_URL and Keys.

# 4. Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Alternatively, you can run the batch script on Windows: run_server.bat
```

### 2. Frontend Setup (React App)

Open a new terminal window inside the `frontend` folder:

```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Run the development server
npm run dev
```

Your React app will now be available locally (usually at `http://localhost:5173/`).

## 🛡️ Key ML Modules (Backend)

- **Layer 1 Temporal Liveness (app/modules/layer_1_temporal_liveness.py):** Eye blink rate, continuous face tracking, and 3D position logic.
- **Layer 2 Edge Analysis (app/modules/layer_2...):** Device display bounding-box extraction to combat physical replay attacks.
- **Layer 3 Generative Detection:** Neural-network driven noise and deepfake probability scoring.
- **Layer 4 Global Verification:** Synthesis of confidence arrays returning a unified TRUST / REJECT classification.

## 🤝 Contribution & Maintenance

Always refer to `.agent/workflows` or the internal architecture blueprints before making structural modifications. Ensure local DB consistency against the active Supabase migrations inside `supabase_schema.sql`.

---
*Generated internally for the Shadow KYC Integrity Analysis System*

