import asyncio
import json
import os
import threading
from typing import Dict, Optional
from fastapi import WebSocket
from app.core.orchestrator import SessionOrchestrator

SESSIONS_FILE = "sessions_state.json"


class SessionInstance:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.orchestrator = SessionOrchestrator()
        self.orchestrator.session_id = session_id
        self.client_socket: Optional[WebSocket] = None
        self.tenant_socket: Optional[WebSocket] = None
        self.user_id: Optional[str] = None
        self.tenant_id: Optional[str] = None
        self.is_active = True
        self.final_decision: Optional[str] = None
        self.final_report: Optional[dict] = None

    async def connect_client(self, websocket: WebSocket):
        self.client_socket = websocket
        print(f"[Session {self.session_id}] Client connected. Tenant present: {self.tenant_socket is not None}")
        
        # If session already ended, tell the client immediately
        if not self.is_active and self.final_decision:
            print(f"[Session {self.session_id}] Sending cached completion to client.")
            await self._notify_client({
                "type": "completion",
                "status": "COMPLETED",
                "decision": self.final_decision
            })
            await websocket.close(code=4000)
            return

        # Notify tenant that client joined
        await self._notify_tenant({"type": "client_joined"})
        # Tell client whether tenant is already connected
        await self._notify_client({"type": "ack", "status": "connected", "tenant_connected": self.tenant_socket is not None})

    async def connect_tenant(self, websocket: WebSocket):
        self.tenant_socket = websocket
        print(f"[Session {self.session_id}] Tenant connected. Client present: {self.client_socket is not None}")
        
        # If already ended, show report to tenant
        if not self.is_active and self.final_report:
            await self._notify_tenant({"type": "report", "data": self.final_report})

        # Notify client that tenant joined
        await self._notify_client({"type": "tenant_joined"})
        # Notify tenant whether client is already connected
        await self._notify_tenant({"type": "ack", "status": "connected", "client_connected": self.client_socket is not None})

    def disconnect_client(self, websocket: WebSocket = None):
        """Standard disconnect. Only clears if this is still the active socket."""
        if websocket is None or self.client_socket == websocket:
            self.client_socket = None
            print(f"[Session {self.session_id}] Client disconnected.")

    def disconnect_tenant(self, websocket: WebSocket = None):
        """Standard disconnect. Only clears if this is still the active socket."""
        if websocket is None or self.tenant_socket == websocket:
            self.tenant_socket = None
            print(f"[Session {self.session_id}] Tenant disconnected.")

    async def notify_client_left(self):
        """Send client_left notification to tenant after client disconnects."""
        await self._notify_tenant({"type": "client_left"})

    async def notify_tenant_left(self):
        """Send tenant_left notification to client after tenant disconnects."""
        await self._notify_client({"type": "tenant_left"})

    async def broadcast_to_tenant(self, message: dict):
        """Send a message to the tenant socket (used for frame results etc.)."""
        await self._notify_tenant(message)

    async def send_to_client(self, message: dict):
        """Send a message to the client socket."""
        await self._notify_client(message)

    # ── Private send helpers (no cross-calling, no recursion) ──

    async def _notify_tenant(self, message: dict):
        if self.tenant_socket:
            try:
                await self.tenant_socket.send_json(message)
            except Exception as e:
                print(f"[Session {self.session_id}] Error sending to tenant: {e}")
                self.tenant_socket = None

    async def _notify_client(self, message: dict):
        if self.client_socket:
            try:
                await self.client_socket.send_json(message)
            except Exception as e:
                print(f"[Session {self.session_id}] Error sending to client: {e}")
                self.client_socket = None


class SessionManager:
    def __init__(self):
        self.active_sessions: Dict[str, SessionInstance] = {}
        self._load_sessions()

    def save_state(self):
        self._save_sessions_async()

    def _save_sessions_async(self):
        threading.Thread(target=self._save_sessions, daemon=True).start()

    def _save_sessions(self):
        try:
            data = {}
            for sid, inst in self.active_sessions.items():
                data[sid] = {
                    "is_active": inst.is_active,
                    "final_decision": inst.final_decision,
                    "final_report": inst.final_report,
                    "user_id": inst.user_id,
                    "tenant_id": inst.tenant_id
                }
            with open(SESSIONS_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[SessionManager] Save error: {e}")

    def _load_sessions(self):
        if not os.path.exists(SESSIONS_FILE): return
        try:
            with open(SESSIONS_FILE, "r") as f:
                data = json.load(f)
                for sid, state in data.items():
                    inst = SessionInstance(sid)
                    inst.is_active = state.get("is_active", True)
                    inst.final_decision = state.get("final_decision")
                    inst.final_report = state.get("final_report")
                    inst.user_id = state.get("user_id")
                    inst.tenant_id = state.get("tenant_id")
                    self.active_sessions[sid] = inst
            print(f"[SessionManager] Restored {len(self.active_sessions)} sessions from {SESSIONS_FILE}")
        except Exception as e:
            print(f"[SessionManager] Load error: {e}")

    def create_session(self) -> str:
        """Creates a new session and returns a 6-digit code."""
        import random
        code = str(random.randint(100000, 999999))
        while code in self.active_sessions:
            code = str(random.randint(100000, 999999))
        self.active_sessions[code] = SessionInstance(code)
        print(f"[SessionManager] Session Created: {code}")
        self._save_sessions_async()
        
        # Also triggers the shared db save
        from app.database import save_async
        save_async()
        return code

    def get_session(self, session_id: str) -> Optional[SessionInstance]:
        return self.active_sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            print(f"[SessionManager] Session Removed: {session_id}")
