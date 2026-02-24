# SHADOW KYC - Implementation Plan (Spec-1 Alignment)

## Goal
Align the current prototype with SPEC-1-Shadow-Real-Time-KYC-Integrity-Validator, focusing on Role Separation (User/Tenant), Session Gateway, and Database Integration.

## Current State
- **Frontend**: Single Dashboard combining Camera + Analysis.
- **Backend**: Single WebSocket endpoint (`/ws/live`) processing frames and returning results to the *same* socket. No persistence.
- **Layers**: 5 Implemented (Quality, Artifact, Liveness, Temporal, Deepfake). Spec requires 7 specific layers.

## Phase 1: Session Gateway & Backend logic (Priority)
Enable the "User streams, Tenant watches" workflow.
1.  **Session Manager** (`app/core/session_manager.py`):
    - Manage active sessions in memory.
    - Support two roles per session: `CLIENT` (sends video) and `TENANT` (receives analytics).
    - Generate 6-digit session codes.
2.  **WebSocket Endpoint Update** (`app/main.py`):
    - Update `/ws/live/{client_type}/{session_id}`.
    - Route frames from `CLIENT` to `Orchestrator`.
    - Broadcast results to `TENANT`.

## Phase 2: Frontend Roles & Routing
1.  **Dependencies**: Install `react-router-dom`.
2.  **Routes**:
    - `/` -> **User Portal** (Input Session Code or Upload).
    - `/session/:code` -> **Live Client** (Camera only, simple UI status).
    - `/tenant` -> **Tenant Portal** (Login/Create Session).
    - `/tenant/monitor/:code` -> **Integrity Dashboard** (The current complex UI).
3.  **Refactor**:
    - Extract `VideoInput` logic to `user/LiveClient.jsx`.
    - Extract `Dashboard` logic to `tenant/Monitor.jsx`.

## Phase 3: Database Integration (PostgreSQL/SQLite)
1.  **Database Module**: Setup `app/core/database.py` using SQLAlchemy.
2.  **Models**: `Session`, `Evidence`, `Score`.
3.  **Persistence**: Save final reports to DB in `orchestrator.finalize_session`.

## Phase 4: Algorithm Refinement (Layers 1-7)
1.  **Layer Extension**: Implement placeholders for L6 (Environment) and L5 (Lip-Sync).
2.  **Meta Fusion**: Refactor `RiskEngine` to `MetaFusionEngine` with specific "Explainable AI" output tags.

---
**Next Step**: Phase 1 (Backend Session Manager) & Phase 2 (Frontend Routing) in parallel.
