import base64
import cv2
import numpy as np
import json
import hashlib
import secrets
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import shutil
import os
from pathlib import Path
from dataclasses import asdict

from app.core.orchestrator import SessionOrchestrator

# ─── In-Memory User Store (replace with DB later) ────────────────────────────
_users: dict = {}  # email -> {name, hashed_pw, role, org, id}
_tokens: dict = {}  # token -> email

# ─── In-Memory Feature Stores ────────────────────────────────────────────────
_session_history: list = []       # [{session_id, user_id, tenant_id, timestamp, status, decision, notes, risk_score, ...}]
_app_status: dict = {}            # user_id -> [{session_id, status, decision, notes, updated_at}]
_support_tickets: list = []       # [{id, user_id, subject, description, status, created_at, updated_at}]
_notifications: dict = {}         # user_id -> [{id, message, type, read, created_at}]

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _get_user_from_token(token: str):
    email = _tokens.get(token)
    if email:
        return _users.get(email)
    return None

def _add_notification(user_id: str, message: str, ntype: str = "info"):
    if user_id not in _notifications:
        _notifications[user_id] = []
    _notifications[user_id].insert(0, {
        "id": secrets.token_hex(6),
        "message": message,
        "type": ntype,
        "read": False,
        "created_at": time.time(),
    })

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # 'user' | 'tenant'
    organization: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

class DecisionRequest(BaseModel):
    session_id: str
    user_id: str
    decision: str  # 'approved' | 'rejected' | 'manual_review' | 'visit_branch'
    notes: str
    risk_score: Optional[float] = None
    tenant_id: Optional[str] = None  # Tenant making the decision



class TicketRequest(BaseModel):
    subject: str
    description: str

app = FastAPI(title="Shadow API", description="KYC Video Integrity Analysis")

# Mount directories
app.mount("/evidence", StaticFiles(directory="evidence"), name="evidence")
# Serve the React build files
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# ─── Auth Endpoints ──────────────────────────────────────────────────────────

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    if req.email in _users:
        raise HTTPException(status_code=400, detail="Email already registered.")
    if req.role not in ("user", "tenant"):
        raise HTTPException(status_code=400, detail="Invalid role.")
    user_id = secrets.token_hex(8)
    _users[req.email] = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "hashed_pw": _hash(req.password),
        "role": req.role,
        "organization": req.organization,
        "created_at": time.time(),
    }
    _add_notification(user_id, "Welcome to SHADOW KYC! Your account has been created.", "success")
    return {"message": "Account created successfully.", "user_id": user_id}

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = _users.get(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["hashed_pw"] != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["role"] != req.role:
        raise HTTPException(status_code=403, detail=f"This account is registered as '{user['role']}', not '{req.role}'.")
    # Generate simple token
    token = secrets.token_hex(32)
    _tokens[token] = req.email
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "organization": user.get("organization"),
            "created_at": user.get("created_at"),
        }
    }

# ─── Session History Endpoints ────────────────────────────────────────────────

@app.post("/session/record-history")
async def record_session_history(
    session_id: str = Query(...),
    user_id: str = Query(default=None),
    tenant_id: str = Query(default=None),
):
    """Record a session for history tracking."""
    entry = {
        "session_id": session_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "timestamp": time.time(),
        "status": "completed",
        "decision": "pending",
        "notes": "",
        "risk_score": None,
    }
    _session_history.append(entry)
    return {"message": "Session recorded.", "entry": entry}

@app.get("/session/history/{role_id}")
async def get_session_history(role_id: str, role: str = Query(default="user")):
    """Get session history for a user or tenant."""
    key = "user_id" if role == "user" else "tenant_id"
    history = [s for s in _session_history if s.get(key) == role_id]
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"history": history}

# ─── Tenant Decision Endpoint ────────────────────────────────────────────────

@app.post("/session/decision")
async def submit_decision(req: DecisionRequest):
    """Tenant submits final decision on a session."""
    # Update session history
    for entry in _session_history:
        if entry["session_id"] == req.session_id:
            entry["decision"] = req.decision
            entry["notes"] = req.notes
            entry["risk_score"] = req.risk_score
            if req.tenant_id:
                entry["tenant_id"] = req.tenant_id
            break
    else:
        # Create history entry if doesn't exist
        _session_history.append({
            "session_id": req.session_id,
            "user_id": req.user_id,
            "tenant_id": req.tenant_id,
            "timestamp": time.time(),
            "status": "completed",
            "decision": req.decision,
            "notes": req.notes,
            "risk_score": req.risk_score,
        })

    # Update application status
    if req.user_id not in _app_status:
        _app_status[req.user_id] = []
    _app_status[req.user_id].append({
        "session_id": req.session_id,
        "status": req.decision,
        "notes": req.notes,
        "updated_at": time.time(),
    })

    # Notify user
    labels = {
        "approved": "Your KYC verification has been approved! ✅",
        "rejected": "Your KYC verification was not successful. ❌",
        "manual_review": "Your KYC is under manual review. 🔍",
        "visit_branch": "Please visit the nearest branch for verification. 🏦",
    }
    _add_notification(req.user_id, labels.get(req.decision, "Your KYC status has been updated."), req.decision)

    return {"message": "Decision submitted successfully.", "decision": req.decision}

# ─── Application Status ──────────────────────────────────────────────────────

@app.get("/application/status/{user_id}")
async def get_application_status(user_id: str):
    """Get application status for a user."""
    statuses = _app_status.get(user_id, [])
    statuses.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"statuses": statuses}

# ─── Support Tickets ──────────────────────────────────────────────────────────

@app.post("/support/ticket")
async def create_ticket(req: TicketRequest, user_id: str = Query(...)):
    """Create a support ticket."""
    ticket = {
        "id": secrets.token_hex(6),
        "user_id": user_id,
        "subject": req.subject,
        "description": req.description,
        "status": "open",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    _support_tickets.append(ticket)
    _add_notification(user_id, f"Your support ticket '{req.subject}' has been created.", "info")
    return {"message": "Ticket created.", "ticket": ticket}

@app.get("/support/tickets/{user_id}")
async def get_tickets(user_id: str):
    """Get all tickets for a user."""
    tickets = [t for t in _support_tickets if t["user_id"] == user_id]
    tickets.sort(key=lambda x: x["created_at"], reverse=True)
    return {"tickets": tickets}

@app.get("/tenant/tickets")
async def get_all_tickets():
    """Get all support tickets (for tenant)."""
    sorted_tickets = sorted(_support_tickets, key=lambda x: x["created_at"], reverse=True)
    return {"tickets": sorted_tickets}

# ─── Notifications ────────────────────────────────────────────────────────────

@app.get("/notifications/{user_id}")
async def get_notifications(user_id: str):
    """Get all notifications for a user."""
    notifs = _notifications.get(user_id, [])
    return {"notifications": notifs}

@app.post("/notifications/{user_id}/read")
async def mark_notifications_read(user_id: str):
    """Mark all notifications as read."""
    for n in _notifications.get(user_id, []):
        n["read"] = True
    return {"message": "All notifications marked as read."}

# ─── Tenant Stats ────────────────────────────────────────────────────────────

@app.get("/tenant/stats/{tenant_id}")
async def get_tenant_stats(tenant_id: str):
    """Get aggregate stats for tenant reports."""
    history = [s for s in _session_history if s.get("tenant_id") == tenant_id]
    total = len(history)
    approved = sum(1 for s in history if s["decision"] == "approved")
    rejected = sum(1 for s in history if s["decision"] == "rejected")
    manual = sum(1 for s in history if s["decision"] == "manual_review")
    visit = sum(1 for s in history if s["decision"] == "visit_branch")
    pending = sum(1 for s in history if s["decision"] == "pending")
    fraud = sum(1 for s in history if (s.get("risk_score") or 0) > 65)
    return {
        "total": total,
        "approved": approved,
        "rejected": rejected,
        "manual_review": manual,
        "visit_branch": visit,
        "pending": pending,
        "fraud_suspected": fraud,
    }

@app.get("/session/validate/{code}")
async def validate_session(code: str):
    """Check if a session code exists and is active."""
    session = session_manager.active_sessions.get(code)
    if session:
        return {
            "valid": True,
            "session_id": code,
            "has_client": session.client_socket is not None,
            "has_tenant": session.tenant_socket is not None,
        }
    return {"valid": False}

# ─── Document Upload & Approval ───────────────────────────────────────────────
# In-memory store: session_id -> { approved: bool, docs: [filenames] }
_doc_approvals: dict = {}

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "application/pdf"
}
MAX_DOC_SIZE_MB = 5
REQUIRED_DOCS = {"gov_id", "selfie"}

@app.post("/session/upload-docs")
async def upload_docs(
    session_id: str = Query(..., description="Session code"),
    gov_id: UploadFile = File(...),
    selfie: UploadFile = File(...),
    address_proof: Optional[UploadFile] = File(None),
):
    """
    Validate and store KYC documents before allowing client into live session.
    Required: gov_id + selfie. Optional: address_proof.
    Returns { approved: true } on success.
    """
    # Note: we don't require the session to be active yet —
    # the tenant may not have connected. We just validate the docs.

    docs = {"gov_id": gov_id, "selfie": selfie}
    if address_proof and address_proof.filename:
        docs["address_proof"] = address_proof

    upload_dir = Path("temp_uploads") / "docs" / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for doc_key, upload_file in docs.items():
        # MIME type check
        content_type = upload_file.content_type or ""
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"'{doc_key}': Invalid file type '{content_type}'. Only JPG, PNG, PDF accepted."
            )

        # Size check
        contents = await upload_file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_DOC_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"'{doc_key}': File too large ({size_mb:.1f} MB). Maximum is {MAX_DOC_SIZE_MB} MB."
            )

        # Must not be empty (at least 100 bytes)
        if len(contents) < 100:
            raise HTTPException(
                status_code=400,
                detail=f"'{doc_key}': File appears to be empty or corrupt."
            )

        # Save to disk
        ext = Path(upload_file.filename).suffix or ".bin"
        save_path = upload_dir / f"{doc_key}{ext}"
        with open(save_path, "wb") as f:
            f.write(contents)
        saved.append(str(save_path))

    # Mark session as document-approved
    _doc_approvals[session_id] = {
        "approved": True,
        "docs": saved,
        "timestamp": time.time(),
    }

    return {
        "approved": True,
        "session_id": session_id,
        "message": "Documents verified successfully. You may now join the live session.",
        "docs_received": list(docs.keys()),
    }


# Mount temp_uploads for accessing uploaded documents
app.mount("/uploads", StaticFiles(directory="temp_uploads"), name="uploads")


@app.get("/session/doc-status/{session_id}")
async def doc_status(session_id: str):
    """Check if a session has approved documents."""
    approval = _doc_approvals.get(session_id)
    return {
        "approved": approval["approved"] if approval else False,
        "session_id": session_id,
    }

@app.get("/tenant/documents")
async def get_tenant_documents():
    """List all sessions with uploaded documents for review."""
    # Convert _doc_approvals dict to a list of details
    # _doc_approvals: session_id -> { approved, docs, timestamp }
    results = []
    for sid, data in _doc_approvals.items():
        # Convert local paths to URLs
        doc_urls = []
        for path in data.get("docs", []):
            # path is e.g. "temp_uploads\docs\SESSIONID\file.jpg"
            # We want "/uploads/docs/SESSIONID/file.jpg"
            p = Path(path)
            # relative_to("temp_uploads") might fail if path is absolute or different. 
            # But the code saves as relative Path("temp_uploads") / ...
            try:
                rel = p.relative_to("temp_uploads")
                doc_urls.append(f"/uploads/{rel.as_posix()}")
            except ValueError:
                doc_urls.append(str(path)) # Fallback
        
        results.append({
            "session_id": sid,
            "timestamp": data.get("timestamp"),
            "doc_urls": doc_urls
        })
    
    # Sort by recent first
    results.sort(key=lambda x: x["timestamp"] or 0, reverse=True)
    return {"documents": results}



@app.post("/analyze-session")
async def analyze_session(file: UploadFile = File(...)):
    """
    Upload a video file for integrity analysis (Post-Upload mode).
    """
    try:
        temp_dir = Path("temp_uploads")
        temp_dir.mkdir(exist_ok=True)
        file_path = temp_dir / f"upload_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        orchestrator = SessionOrchestrator()
        report = orchestrator.start_session(str(file_path))
        
        try:
             os.remove(file_path)
        except Exception as e:
             print(f"Error removing temp file: {e}")
             
        return asdict(report)
        
    except Exception as e:
        print(f"Error processing session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-recording")
async def upload_recording(session_id: str, file: UploadFile = File(...)):
    """
    Save the recorded video from a live session.
    """
    try:
        session_dir = Path("evidence") / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        file_path = session_dir / "session_recording.webm"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"status": "success", "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.core.session_manager import SessionManager

# Initialize Session Manager
session_manager = SessionManager()

@app.post("/session/create")
async def create_session():
    """Create a new session and return the 6-digit code."""
    code = session_manager.create_session()
    return {"session_id": code}

@app.websocket("/ws/session/{session_id}/{role}")
async def session_websocket(websocket: WebSocket, session_id: str, role: str):
    """
    Handle role-based WebSocket connections for a specific session.
    Role: 'client' (User uploading video) or 'tenant' (Bank Officer viewing results).
    """
    session = session_manager.active_sessions.get(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    try:
        if role == "client":
            await session.connect_client(websocket)
            try:
                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message.get("type") == "frame":
                        payload = message.get("data")
                        timestamp = message.get("timestamp", 0)
                        
                        # Decode
                        header, encoded = payload.split(",", 1)
                        data_bytes = base64.b64decode(encoded)
                        nparr = np.frombuffer(data_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is not None:
                            # Process
                            frame_results = session.orchestrator.process_single_frame(frame, timestamp)
                            current_stats = session.orchestrator.get_current_stats()
                            
                            # Broadcast detailed results to Tenant
                            await session.broadcast_to_tenant({
                                "type": "results",
                                "frame": frame_results,
                                "session": current_stats,
                                "image": payload
                            })
                            
                            # Send minimal feedback to Client (e.g., quality warnings only)
                            # Spec says: "Users only see final session result".
                            # But we might want real-time quality feedback (blur, lighting).
                            quality_warning = None
                            if frame_results["quality"] < 0.4:
                                quality_warning = "Low Quality: Adjust Lighting"
                            
                            await session.send_to_client({
                                "type": "ack",
                                "status": "processed",
                                "quality_warning": quality_warning
                            })

                    elif message.get("type") == "stop":
                        report = session.orchestrator.finalize_live_session()
                        # Send full report to Tenant
                        await session.broadcast_to_tenant({
                            "type": "report",
                            "data": asdict(report)
                        })
                        # Send summary to Client
                        await session.send_to_client({
                            "type": "completion",
                            "status": report.classification
                        })
                        break
            except WebSocketDisconnect:
                session.disconnect_client()
                
        elif role == "tenant":
            await session.connect_tenant(websocket)
            try:
                while True:
                    # Tenant just listens mostly, or sends control commands
                    data = await websocket.receive_text()
                    # Handle tenant commands if any (e.g. "request_high_res")
            except WebSocketDisconnect:
                session.disconnect_tenant()
    
    except Exception as e:
        print(f"WebSocket error in session {session_id}: {e}")
        await websocket.close()

@app.websocket("/ws/live")
async def websocket_existing(websocket: WebSocket):
    """
    Legacy endpoint for current Dashboard (Single View).
    Creates a temporary session and acts as both Client and Tenant.
    """
    await websocket.accept()
    
    # Create an isolated session for this connection
    session_code = session_manager.create_session()
    session = session_manager.active_sessions[session_code]
    
    # Manually attach this socket as BOTH?
    # Actually just reuse the logic but verify it works.
    # We will simulate the loop here directly using the new session instance.
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                payload = message.get("data")
                timestamp = message.get("timestamp", 0)
                
                header, encoded = payload.split(",", 1)
                data_bytes = base64.b64decode(encoded)
                nparr = np.frombuffer(data_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    frame_results = session.orchestrator.process_single_frame(frame, timestamp)
                    current_stats = session.orchestrator.get_current_stats()
                    
                    await websocket.send_json({
                        "type": "results",
                        "frame": frame_results,
                        "session": current_stats
                    })
            
            elif message.get("type") == "stop":
                report = session.orchestrator.finalize_live_session()
                await websocket.send_json({
                    "type": "report",
                    "data": asdict(report)
                })
                break
                
    except WebSocketDisconnect:
        session_manager.remove_session(session_code)
    except Exception as e:
        print(f"WS Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# SPA catch-all — must be LAST so it doesn't shadow API routes
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if full_path.startswith("assets") or full_path.startswith("evidence"):
        return FileResponse(f"frontend/dist/{full_path}")
    return FileResponse("frontend/dist/index.html")
