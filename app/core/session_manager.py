from typing import Dict, Optional, List
import uuid
import asyncio
from fastapi import WebSocket
from app.core.orchestrator import SessionOrchestrator

class SessionInstance:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.orchestrator = SessionOrchestrator()
        self.orchestrator.session_id = session_id # Override with specific ID
        self.client_socket: Optional[WebSocket] = None
        self.tenant_socket: Optional[WebSocket] = None
        self.user_id: Optional[str] = None
        self.tenant_id: Optional[str] = None
        self.is_active = True

    async def connect_client(self, websocket: WebSocket):
        self.client_socket = websocket
        await websocket.accept()

    async def connect_tenant(self, websocket: WebSocket):
        self.tenant_socket = websocket
        await websocket.accept()
        # If session already has history/state, maybe send initial state?

    def disconnect_client(self):
        self.client_socket = None
        # Should we stop session if client disconnects? Maybe pause.
        
    def disconnect_tenant(self):
        self.tenant_socket = None

    async def broadcast_to_tenant(self, message: dict):
        if self.tenant_socket:
            try:
                await self.tenant_socket.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to tenant {self.session_id}: {e}")
                self.disconnect_tenant()

    async def send_to_client(self, message: dict):
        if self.client_socket:
            try:
                await self.client_socket.send_json(message)
            except Exception as e:
                print(f"Error sending to client {self.session_id}: {e}")
                self.disconnect_client()


class SessionManager:
    def __init__(self):
        self.active_sessions: Dict[str, SessionInstance] = {}

    def create_session(self) -> str:
        """Creates a new session and returns the 6-digit code."""
        # For simplicity, use UUID first 6 chars or random digits? 
        # Spec says "random 6-digit session code".
        import random
        code = str(random.randint(100000, 999999))
        while code in self.active_sessions:
             code = str(random.randint(100000, 999999))
        
        self.active_sessions[code] = SessionInstance(code)
        print(f"Session Created: {code}")
        return code

    def get_session(self, session_id: str) -> Optional[SessionInstance]:
        return self.active_sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            print(f"Session Removed: {session_id}")
