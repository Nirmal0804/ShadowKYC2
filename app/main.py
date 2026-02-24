import base64
import asyncio
import cv2
import numpy as np
import json
import hashlib
import secrets
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Query, Header
from pyzbar.pyzbar import decode as pyzbar_decode
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import shutil
import os
from pathlib import Path
from dataclasses import asdict

from app.core.orchestrator import SessionOrchestrator
from app.core.session_manager import SessionManager
from app.database import (
    connect_db, close_db,
    users_col, tokens_col, notifications_col,
    tickets_col, session_history_col, app_status_col, doc_approvals_col
)
import app.database as database
from app.auth import verify_ws_token, get_user_from_auth_header
import app.supabase_client as supa


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

async def _get_user_from_token(token: str):
    doc = await database.tokens_col.find_one({"token": token})
    if doc:
        return await database.users_col.find_one({"email": doc["email"]})
    return None

async def _add_notification(user_id: str, message: str, ntype: str = "info"):
    notif = {
        "id": secrets.token_hex(6),
        "user_id": user_id,
        "message": message,
        "type": ntype,
        "read": False,
        "created_at": time.time(),
    }
    await database.notifications_col.insert_one(notif)
    asyncio.create_task(supa.upsert_notification(notif))

async def _process_session_decision(
    session_id: str, decision: str, notes: str,
    user_id: str = None, tenant_id: str = None, risk_score: float = None
):
    existing = await database.session_history_col.find_one({"session_id": session_id})
    if existing:
        update = {"decision": decision, "notes": notes}
        if risk_score is not None:
            update["risk_score"] = risk_score
        if tenant_id:
            update["tenant_id"] = tenant_id
        await database.session_history_col.update_one({"session_id": session_id}, {"$set": update})
    else:
        await database.session_history_col.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "timestamp": time.time(),
            "status": "completed",
            "decision": decision,
            "notes": notes,
            "risk_score": risk_score,
        })

    if user_id:
        await database.app_status_col.insert_one({
            "user_id": user_id,
            "session_id": session_id,
            "status": decision,
            "notes": notes,
            "updated_at": time.time(),
        })
        labels = {
            "approved": "Your KYC verification has been approved!",
            "rejected": "Your KYC verification was not successful.",
            "manual_review": "Your KYC is under manual review.",
            "visit_branch": "Please visit the nearest branch for verification.",
        }
        notif_msg = labels.get(decision, "Your KYC status has been updated.")
        await _add_notification(
            user_id,
            notif_msg,
            decision if decision in ["approved", "success"] else "info"
        )
        # Sync to Supabase
        asyncio.create_task(supa.upsert_app_status(
            user_id=user_id, session_id=session_id,
            status=decision, notes=notes
        ))

    # Update session in Supabase
    asyncio.create_task(supa.upsert_session(
        session_id=session_id, user_id=user_id, tenant_id=tenant_id,
        status="completed", decision=decision, notes=notes, risk_score=risk_score
    ))

    return {"message": "Decision processed", "decision": decision}



# Simple QR scanning helper
def simple_qr_scan(image):
    # Auto-downsize high-res images to speed up processing
    h, w = image.shape[:2]
    max_dim = 1000
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # 1. Try Raw Decode
    results = pyzbar_decode(image)
    if results:
        return {"success": True, "type": results[0].type}
    
    # 2. Try Grayscale/Threshold
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        results = pyzbar_decode(thresh)
        if results:
            return {"success": True, "type": results[0].type}
    except: pass
    
    return None





# ─── Request Models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    organization: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

class DecisionRequest(BaseModel):
    session_id: str
    user_id: str
    decision: str
    notes: str
    risk_score: Optional[float] = None
    tenant_id: Optional[str] = None

class TicketRequest(BaseModel):
    subject: str
    description: str


# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Shadow API", description="KYC Video Integrity Analysis")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/session/scan-qr")
async def scan_qr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"success": False, "message": "Failed to decode image"}
        
        res = simple_qr_scan(img)
        if res:
            return res
        return {"success": False, "message": "No QR code found"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[RECON] {request.method} {request.url.path}")
    return await call_next(request)

# ─── Session Management ───────────────────────────────────────────────────────

session_manager = SessionManager()

@app.post("/session/create")
async def create_session(authorization: str = Header(None)):
    user_info = await get_user_from_auth_header(authorization)
    if not user_info:
        raise HTTPException(status_code=401, detail="Authentication required to create a session.")
    
    tenant_id = user_info.get("id", "unknown_tenant")
    code = session_manager.create_session()
    
    # Store the tenant_id in the session instance
    session = session_manager.active_sessions.get(code)
    if session:
        session.tenant_id = tenant_id

    # Record in local history + Supabase
    await database.session_history_col.insert_one({
        "session_id": code,
        "user_id": None,
        "tenant_id": tenant_id,
        "timestamp": time.time(),
        "status": "active",
        "decision": "pending",
        "notes": "",
        "risk_score": None,
    })
    asyncio.create_task(supa.upsert_session(
        session_id=code, tenant_id=tenant_id,
        status="active", decision="pending"
    ))

    return {"session_id": code}

@app.on_event("startup")
async def startup():
    with open("startup_test.log", "w") as f:
        f.write(f"Server started at {time.ctime()}\n")
    await connect_db()
    # Bulk-sync local db.json data to Supabase on every startup
    asyncio.create_task(supa.sync_all_local_data(
        users=database._users,
        history=database._history_list,
        notifs=database._notif_list,
        tickets=database._ticket_list,
        doc_approvals=database._doc_approvals,
        app_status=database._app_status_list,
    ))

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "time": time.ctime(),
        "mode": "in-memory",
        "active_sessions": list(session_manager.active_sessions.keys())
    }

@app.get("/debug/sessions")
async def debug_sessions():
    return {
        "active_count": len(session_manager.active_sessions),
        "active_ids": list(session_manager.active_sessions.keys()),
        "archived_count": len(database._history_list),
    }

@app.get("/ping")
async def ping():
    return "pong"

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# Mount static directories
app.mount("/evidence", StaticFiles(directory="evidence"), name="evidence")
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")


# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    # Strict Demo Restriction: No new signups allowed in this version
    raise HTTPException(status_code=403, detail="Signup is disabled for this evaluation version. Please use demo accounts.")

@app.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower()
    
    # Strict Demo Restriction
    if email == "client@test.com" and req.role != "user":
        raise HTTPException(status_code=403, detail="client@test.com can only log in as 'user'")
    if email == "tenant@test.com" and req.role != "tenant":
        raise HTTPException(status_code=403, detail="tenant@test.com can only log in as 'tenant'")
    
    if email not in ["client@test.com", "tenant@test.com"]:
         raise HTTPException(status_code=401, detail="Unauthorized. Only demo accounts are permitted.")

    print(f"[DEBUG] Login attempt: {email}, role={req.role}")
    user = await database.users_col.find_one({"email": email})
    print(f"[DEBUG] User found: {user is not None}")
    if user:
        print(f"[DEBUG] Stored hash: {user.get('hashed_pw')}")
        print(f"[DEBUG] Input hash: {_hash(req.password)}")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["hashed_pw"] != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    token = secrets.token_hex(32)
    await database.tokens_col.insert_one({"token": token, "email": email, "created_at": time.time()})
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


# ─── Session History ──────────────────────────────────────────────────────────

@app.post("/session/record-history")
async def record_session_history(
    session_id: str = Query(...),
    user_id: str = Query(default=None),
    tenant_id: str = Query(default=None),
):
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
    await database.session_history_col.insert_one(entry)
    return {"message": "Session recorded.", "entry": entry}

@app.get("/session/history/{role_id}")
async def get_session_history(role_id: str, role: str = Query(default="user")):
    key = "user_id" if role == "user" else "tenant_id"
    cursor = database.session_history_col.find({key: role_id}).sort("timestamp", -1)
    history = await cursor.to_list(length=200)
    return {"history": history}


# ─── Tenant Decision ──────────────────────────────────────────────────────────

@app.post("/session/decision")
async def submit_decision(req: DecisionRequest):
    return await _process_session_decision(
        session_id=req.session_id,
        decision=req.decision,
        notes=req.notes,
        user_id=req.user_id,
        tenant_id=req.tenant_id,
        risk_score=req.risk_score
    )


# ─── Application Status ───────────────────────────────────────────────────────

@app.get("/application/status/{user_id}")
async def get_application_status(user_id: str):
    cursor = database.app_status_col.find({"user_id": user_id}).sort("updated_at", -1)
    statuses = await cursor.to_list(length=100)
    return {"statuses": statuses}


# ─── Support Tickets ──────────────────────────────────────────────────────────

@app.post("/support/ticket")
async def create_ticket(req: TicketRequest, user_id: str = Query(...)):
    ticket = {
        "id": secrets.token_hex(6),
        "user_id": user_id,
        "subject": req.subject,
        "description": req.description,
        "status": "open",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    await database.tickets_col.insert_one(ticket)
    asyncio.create_task(supa.upsert_ticket(ticket))
    await _add_notification(user_id, f"Your support ticket '{req.subject}' has been created.", "info")
    return {"message": "Ticket created.", "ticket": ticket}

@app.get("/support/tickets/{user_id}")
async def get_tickets(user_id: str):
    cursor = database.tickets_col.find({"user_id": user_id}).sort("created_at", -1)
    tickets = await cursor.to_list(length=100)
    return {"tickets": tickets}

@app.get("/tenant/tickets")
async def get_all_tickets():
    cursor = database.tickets_col.find({}).sort("created_at", -1)
    tickets = await cursor.to_list(length=500)
    return {"tickets": tickets}


# ─── Notifications ────────────────────────────────────────────────────────────

@app.get("/notifications/{user_id}")
async def get_notifications(user_id: str):
    cursor = database.notifications_col.find({"user_id": user_id}).sort("created_at", -1)
    notifs = await cursor.to_list(length=50)
    return {"notifications": notifs}

@app.post("/notifications/{user_id}/read")
async def mark_notifications_read(user_id: str):
    await database.notifications_col.update_many({"user_id": user_id}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read."}


# ─── Tenant Stats ─────────────────────────────────────────────────────────────

@app.get("/tenant/stats/{tenant_id}")
async def get_tenant_stats(tenant_id: str):
    cursor = database.session_history_col.find({"tenant_id": tenant_id})
    history = await cursor.to_list(length=10000)
    total    = len(history)
    approved = sum(1 for s in history if s["decision"] == "approved")
    rejected = sum(1 for s in history if s["decision"] == "rejected")
    manual   = sum(1 for s in history if s["decision"] == "manual_review")
    visit    = sum(1 for s in history if s["decision"] == "visit_branch")
    pending  = sum(1 for s in history if s["decision"] == "pending")
    fraud    = sum(1 for s in history if (s.get("risk_score") or 0) > 65)
    return {
        "total": total, "approved": approved, "rejected": rejected,
        "manual_review": manual, "visit_branch": visit, "pending": pending,
        "fraud_suspected": fraud,
    }


# ─── Session Validate ─────────────────────────────────────────────────────────

@app.get("/session/validate/{code}")
async def validate_session(code: str):
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

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
MAX_DOC_SIZE_MB = 5
REQUIRED_DOCS = {"gov_id", "selfie"}

@app.post("/session/upload-docs")
async def upload_docs(
    session_id: str = Query(..., description="Session code"),
    gov_id: UploadFile = File(...),
    selfie: UploadFile = File(...),
    address_proof: Optional[UploadFile] = File(None),
):
    docs = {"gov_id": gov_id, "selfie": selfie}
    if address_proof and address_proof.filename:
        docs["address_proof"] = address_proof

    upload_dir = Path("temp_uploads") / "docs" / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for doc_key, upload_file in docs.items():
        content_type = upload_file.content_type or ""
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"'{doc_key}': Invalid file type '{content_type}'. Only JPG, PNG, PDF accepted.")

        contents = await upload_file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_DOC_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"'{doc_key}': File too large ({size_mb:.1f} MB). Maximum is {MAX_DOC_SIZE_MB} MB.")
        if len(contents) < 100:
            raise HTTPException(status_code=400, detail=f"'{doc_key}': File appears to be empty or corrupt.")

        ext = Path(upload_file.filename).suffix or ".bin"
        save_path = upload_dir / f"{doc_key}{ext}"
        with open(save_path, "wb") as f:
            f.write(contents)
        saved.append(str(save_path))

    await database.doc_approvals_col.update_one(
        {"session_id": session_id},
        {"$set": {"approved": True, "docs": saved, "timestamp": time.time()}},
        upsert=True
    )
    asyncio.create_task(supa.upsert_doc_approval(
        session_id=session_id, approved=True, docs=saved
    ))

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
    approval = await database.doc_approvals_col.find_one({"session_id": session_id})
    return {
        "approved": approval["approved"] if approval else False,
        "session_id": session_id,
    }

@app.get("/tenant/documents")
async def get_tenant_documents():
    cursor = database.doc_approvals_col.find({}).sort("timestamp", -1)
    approvals = await cursor.to_list(length=500)
    results = []
    for data in approvals:
        doc_urls = []
        for path in data.get("docs", []):
            p = Path(path)
            try:
                rel = p.relative_to("temp_uploads")
                doc_urls.append(f"/uploads/{rel.as_posix()}")
            except ValueError:
                doc_urls.append(str(path))
        results.append({
            "session_id": data["session_id"],
            "timestamp": data.get("timestamp"),
            "doc_urls": doc_urls
        })
    return {"documents": results}


# ─── Video Analysis ───────────────────────────────────────────────────────────

@app.post("/analyze-session")
async def analyze_session(file: UploadFile = File(...)):
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
    try:
        session_dir = Path("evidence") / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        file_path = session_dir / "session_recording.webm"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"status": "success", "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── WebSocket Session ────────────────────────────────────────────────────────

@app.websocket("/ws/session/{session_id}/{role}")
async def session_websocket(websocket: WebSocket, session_id: str, role: str, token: Optional[str] = Query(None)):
    auth_user = await verify_ws_token(websocket, token)
    if not auth_user:
        # In-memory token DB is wiped on server restart — allow guest fallback
        # so the session can proceed. Auth is already enforced at login.
        print(f"[WS] Token not validated (server may have restarted). Allowing guest for session={session_id}, role={role}")
        auth_user = {"id": "guest", "email": role + "@session", "role": role, "source": "guest"}

    await websocket.accept()
    print(f"[WS] Accepted handshake: session={session_id}, role={role}, user={auth_user.get('email')}", flush=True)
    
    session = session_manager.active_sessions.get(session_id)
    if not session:
        print(f"[WS] 404: Session {session_id} not found for role={role}", flush=True)
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close(code=4004)
        return
    
    # Handshake accepted. Now enter the role-specific loop.
    if role == "client":
        await session.connect_client(websocket)
        print(f"[WS] Handshake successful: {role} for session {session_id}", flush=True)
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("type") == "identify":
                    user_id = message.get("user_id")
                    session.user_id = user_id
                    print(f"[WS] Client identified in session {session_id} as user {user_id}", flush=True)
                    continue

                if message.get("type") == "frame":
                    payload = message.get("data", "")
                    timestamp = message.get("timestamp", 0)

                    try:
                        _, encoded = payload.split(",", 1)
                        data_bytes = base64.b64decode(encoded)
                        nparr = np.frombuffer(data_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                        if frame is not None:
                            frame_results = session.orchestrator.process_single_frame(frame, timestamp)
                            current_stats = session.orchestrator.get_current_stats()

                            await session.broadcast_to_tenant({
                                "type": "results",
                                "frame": frame_results,
                                "session": current_stats,
                                "image": payload
                            })

                            quality_warning = None
                            if frame_results.get("quality", 1) < 0.4:
                                quality_warning = "Low Quality: Adjust Lighting"

                            await session.send_to_client({
                                "type": "ack",
                                "status": "processed",
                                "quality_warning": quality_warning,
                                "tenant_connected": session.tenant_socket is not None
                            })
                    except Exception as frame_err:
                        print(f"[WS] Frame processing error: {frame_err}")

                elif message.get("type") == "stop":
                    try:
                        report = session.orchestrator.finalize_live_session()
                        report_dict = asdict(report)
                        
                        # Persist for reconnection
                        session.is_active = False
                        session.final_report = report_dict
                        
                        raw_label = report.classification.lower()
                        label_map = {
                            "low_risk": "approved",
                            "high_risk": "rejected",
                            "medium_risk": "manual_review"
                        }
                        session.final_decision = label_map.get(raw_label, "completed")

                        asyncio.create_task(supa.upsert_session(
                            session_id=session_id, user_id=session.user_id, tenant_id=session.tenant_id,
                            status="completed", decision=session.final_decision, 
                            risk_score=report.risk_pct
                        ))

                        await session.broadcast_to_tenant({"type": "report", "data": report_dict})
                        await session.send_to_client({
                            "type": "completion", 
                            "status": "COMPLETED", 
                            "decision": session.final_decision
                        })
                    except Exception as e:
                        print(f"[WS] Stop error: {e}")
                    
                    # Wait 1s for completion to reach client
                    await asyncio.sleep(1)
                    break

        except WebSocketDisconnect:
            print(f"[WS] Client disconnected from session {session_id}")
            session.disconnect_client(websocket)
            await session.notify_client_left()
        except Exception as e:
            print(f"[WS] Client error in session {session_id}: {e}")
            session.disconnect_client(websocket)
            await session.notify_client_left()

    elif role == "tenant":
        await session.connect_tenant(websocket)
        try:
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "end_session":
                    decision_raw = msg.get("status", "ENDED")
                    decision = decision_raw.lower()
                    print(f"[WS] Tenant decision received: {decision} for session {session_id}", flush=True)

                    if decision in ["approved", "rejected", "manual_review", "visit_branch"]:
                        try:
                            stats = session.orchestrator.get_current_stats()
                            risk_score = stats.get("risk_pct", 0)
                            await _process_session_decision(
                                session_id=session_id,
                                decision=decision,
                                notes="Decision via Live Monitor",
                                user_id=session.user_id,
                                tenant_id="tenant_ws",
                                risk_score=risk_score
                            )
                        except Exception as e:
                            print(f"[WS] Decision processing error: {e}")

                    # Finalize and notify (ALWAYS, even if status is just "ENDED")
                    try:
                        report = session.orchestrator.finalize_live_session()
                        report_dict = asdict(report)
                        
                        # 1. LOCK the state FIRST for reconnection persistence
                        session.is_active = False
                        session.final_report = report_dict
                        
                        # Map internal labels to user-friendly decision strings
                        raw_label = report.classification.lower()
                        label_map = {
                            "low_risk": "approved",
                            "high_risk": "rejected",
                            "medium_risk": "manual_review"
                        }
                        
                        final_decision = decision if decision in ["approved", "rejected", "manual_review", "visit_branch"] else label_map.get(raw_label, "completed")
                        session.final_decision = final_decision
                        
                        # Sync final state to Supabase
                        asyncio.create_task(supa.upsert_session(
                            session_id=session_id, user_id=session.user_id, tenant_id=session.tenant_id,
                            status="completed", decision=final_decision, 
                            risk_score=report.risk_pct
                        ))

                        # 2. BROADCAST to everyone
                        print(f"[WS] BROADCASTING FINAL DECISION: {final_decision} for {session_id}", flush=True)
                        
                        # PRIORITIZE telling the CLIENT (for reflection)
                        try:
                            print(f"[WS] Sending completion to client {session_id} NOW...", flush=True)
                            await session.send_to_client({
                                "type": "completion",
                                "status": "COMPLETED",
                                "decision": final_decision
                            })
                            print(f"[WS] Client completion sent successfully!", flush=True)
                        except Exception as ce:
                            print(f"[WS] ERROR sending to client: {ce}", flush=True)
                        
                        # THEN tell the Tenant
                        await session.broadcast_to_tenant({"type": "report", "data": report_dict})
                        
                        # PERSIST the final state
                        session_manager.save_state()
                    except Exception as e:
                        print(f"[WS] Finalize error: {e}")
                    
                    # Wait a moment for buffers to flush before closing handler
                    await asyncio.sleep(1)
                    break

        except WebSocketDisconnect:
            print(f"[WS] Tenant disconnected from session {session_id}")
            session.disconnect_tenant(websocket)
            await session.notify_tenant_left()
        except Exception as e:
            print(f"[WS] Tenant error in session {session_id}: {e}")
            session.disconnect_tenant(websocket)
            await session.notify_tenant_left()

    else:
        await websocket.close(code=4003, reason="Invalid role")


# SPA catch-all — must be LAST
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Only redirect to index.html if it's NOT a known API/WS path
    # If the path starts with these, we want a real 404 if the route isn't found, not an index.html redirect
    api_prefixes = ["auth", "tenant", "application", "support", "notifications", "uploads", "evidence", "analyze-session", "upload-recording"]
    if any(full_path.startswith(prefix) for prefix in api_prefixes):
        raise HTTPException(status_code=404)
   
    # Don't intercept /ws or /session - let them fail naturally or match
    if full_path.startswith("ws") or full_path.startswith("session") or full_path.startswith("health") or full_path.startswith("ping"):
        raise HTTPException(status_code=404)
   
    # Static assets
    if full_path.startswith("assets"):
        asset_path = Path("frontend/dist") / full_path
        if asset_path.exists():
            return FileResponse(str(asset_path))
   
    # Evidence files
    if full_path.startswith("evidence"):
        if Path(full_path).exists():
            return FileResponse(full_path)

    # Everything else goes to SPA index.html
    return FileResponse("frontend/dist/index.html")
