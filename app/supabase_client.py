"""
app/supabase_client.py
──────────────────────
Lightweight async Supabase writer using httpx.
Uses the service role key so it bypasses RLS.
All writes are fire-and-forget — failures are logged but never crash the server.
"""

import os
import time
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Headers used for every request
_HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",   # upsert behaviour
}

_enabled = bool(SUPABASE_URL and SERVICE_KEY)

if _enabled:
    print(f"[Supabase] Connected to {SUPABASE_URL}")
else:
    print("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — writes disabled.")


async def _post(table: str, payload: dict | list) -> bool:
    """POST (upsert) one or more rows into a Supabase table."""
    if not _enabled:
        return False
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    rows = payload if isinstance(payload, list) else [payload]
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(url, json=rows, headers=_HEADERS)
            if r.status_code not in (200, 201):
                print(f"[Supabase] POST {table} failed {r.status_code}: {r.text[:200]}")
                return False
        return True
    except Exception as e:
        print(f"[Supabase] POST {table} error: {e}")
        return False


async def _patch(table: str, match: dict, payload: dict) -> bool:
    """PATCH (update) rows matching `match` in a Supabase table."""
    if not _enabled:
        return False
    params = "&".join(f"{k}=eq.{v}" for k, v in match.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.patch(url, json=payload, headers=_HEADERS)
            if r.status_code not in (200, 204):
                print(f"[Supabase] PATCH {table} failed {r.status_code}: {r.text[:200]}")
                return False
        return True
    except Exception as e:
        print(f"[Supabase] PATCH {table} error: {e}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

async def upsert_session(
    session_id: str,
    user_id: str = None,
    tenant_id: str = None,
    status: str = "active",
    decision: str = "pending",
    notes: str = "",
    risk_score: float = None,
):
    """Create or update a session record in Supabase."""
    row = {
        "session_id": session_id,
        "user_id":    user_id,
        "tenant_id":  tenant_id,
        "timestamp":  time.time(),
        "status":     status,
        "decision":   decision,
        "notes":      notes,
        "risk_score": risk_score,
    }
    # Use upsert — POST with Prefer: resolution=merge-duplicates won't work on
    # tables without a unique constraint on session_id + decision combo.
    # We always insert a new row for history purposes.
    return await _post("session_history", row)


async def upsert_user(user: dict):
    """Sync a user record to Supabase shadow_users table."""
    row = {
        "id":           user.get("id"),
        "name":         user.get("name"),
        "email":        user.get("email"),
        "role":         user.get("role"),
        "organization": user.get("organization"),
        "created_at":   user.get("created_at", time.time()),
    }
    return await _post("shadow_users", row)


async def upsert_notification(notif: dict):
    """Write a notification to Supabase."""
    return await _post("notifications", {
        "id":         notif.get("id"),
        "user_id":    notif.get("user_id"),
        "message":    notif.get("message"),
        "type":       notif.get("type", "info"),
        "read":       notif.get("read", False),
        "created_at": notif.get("created_at", time.time()),
    })


async def upsert_doc_approval(session_id: str, approved: bool, docs: list):
    """Write document approval status to Supabase."""
    return await _post("doc_approvals", {
        "session_id": session_id,
        "approved":   approved,
        "docs":       docs,
        "timestamp":  time.time(),
    })


async def upsert_app_status(user_id: str, session_id: str, status: str, notes: str):
    """Write app/KYC status update to Supabase."""
    return await _post("app_status", {
        "user_id":    user_id,
        "session_id": session_id,
        "status":     status,
        "notes":      notes,
        "updated_at": time.time(),
    })


async def upsert_ticket(ticket: dict):
    """Write a support ticket to Supabase."""
    return await _post("tickets", {
        "id":          ticket.get("id"),
        "user_id":     ticket.get("user_id"),
        "subject":     ticket.get("subject"),
        "description": ticket.get("description"),
        "status":      ticket.get("status", "open"),
        "created_at":  ticket.get("created_at", time.time()),
        "updated_at":  ticket.get("updated_at", time.time()),
    })


async def sync_all_local_data(
    users: dict,
    history: list,
    notifs: list,
    tickets: list,
    doc_approvals: dict,
    app_status: list,
):
    """
    Bulk-sync everything from local db.json to Supabase.
    Called once on server startup so existing data is always present.
    """
    if not _enabled:
        return

    print("[Supabase] Starting bulk sync of local data...")

    tasks = []

    for user in users.values():
        tasks.append(upsert_user(user))

    for row in history:
        tasks.append(upsert_session(
            session_id=row.get("session_id"),
            user_id=row.get("user_id"),
            tenant_id=row.get("tenant_id"),
            status=row.get("status", "completed"),
            decision=row.get("decision", "pending"),
            notes=row.get("notes", ""),
            risk_score=row.get("risk_score"),
        ))

    for notif in notifs:
        tasks.append(upsert_notification(notif))

    for ticket in tickets:
        tasks.append(upsert_ticket(ticket))

    for session_id, appr in doc_approvals.items():
        tasks.append(upsert_doc_approval(
            session_id=session_id,
            approved=appr.get("approved", False),
            docs=appr.get("docs", []),
        ))

    for row in app_status:
        tasks.append(upsert_app_status(
            user_id=row.get("user_id"),
            session_id=row.get("session_id"),
            status=row.get("status"),
            notes=row.get("notes", ""),
        ))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    errors = sum(1 for r in results if isinstance(r, Exception) or r is False)
    ok = len(results) - errors
    print(f"[Supabase] Bulk sync done: {ok} OK, {errors} failed out of {len(results)} records.")
