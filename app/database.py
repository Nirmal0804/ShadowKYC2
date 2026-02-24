import time
import json
import os
import asyncio
import threading

_save_lock = threading.Lock()
DB_FILE = "db.json"

# ─── In-memory stores (MUST define before load) ───────────────────────────────
_users           = {}   # email -> user doc
_tokens          = {}   # token -> email
_notif_list      = []   # flat list of notifications
_ticket_list     = []   # flat list of tickets
_history_list    = []   # list of session history docs
_app_status_list = []   # list of app status docs
_doc_approvals   = {}   # session_id -> approval doc

def _save_db():
    # Synchronous save in a thread
    with _save_lock:
        try:
            data = {
                "users": _users,
                "tokens": _tokens,
                "notifs": _notif_list,
                "tickets": _ticket_list,
                "doc_approvals": _doc_approvals,
                "history": _history_list,
                "app_status": _app_status_list
            }
            with open(DB_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[DB] Error saving: {e}")

def save_async():
    """Trigger a non-blocking save in a separate thread."""
    threading.Thread(target=_save_db, daemon=True).start()

def _load_db():
    if not os.path.exists(DB_FILE): return
    try:
        with open(DB_FILE, "r") as f:
            data = json.load(f)
            _users.update(data.get("users", {}))
            _tokens.update(data.get("tokens", {}))
            _notif_list.extend(data.get("notifs", []))
            _ticket_list.extend(data.get("tickets", []))
            _doc_approvals.update(data.get("doc_approvals", {}))
            _history_list.extend(data.get("history", []))
            _app_status_list.extend(data.get("app_status", []))
        print(f"[DB] Loaded persistence from {DB_FILE}")
    except Exception as e:
        print(f"[DB] Error loading persistence: {e}")

# Call load on import
_load_db()


# ─── Fake collection API (matches motor async interface) ───────────────────────

class FakeCol:
    """A dead-simple async-compatible collection backed by a Python structure."""

    def __init__(self, store_ref, key_field: str = None):
        # store_ref is either a dict or list
        self._store = store_ref
        self._key = key_field

    async def find_one(self, query: dict, projection: dict = None):
        docs = await self._to_list()
        for doc in docs:
            if self._matches(doc, query):
                return doc
        return None

    async def insert_one(self, doc: dict):
        doc = {k: v for k, v in doc.items()}  # shallow copy
        if isinstance(self._store, list):
            self._store.append(doc)
        elif isinstance(self._store, dict) and self._key:
            key_val = doc.get(self._key)
            if key_val is not None:
                self._store[key_val] = doc
        save_async()

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        docs = await self._to_list()
        for doc in docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                save_async()
                return
        if upsert:
            new_doc = {**{k: v for k, v in query.items() if not k.startswith("$")}}
            if "$set" in update:
                new_doc.update(update["$set"])
            await self.insert_one(new_doc)

    async def update_many(self, query: dict, update: dict):
        docs = await self._to_list()
        for doc in docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])

    def find(self, query: dict = None, projection: dict = None):
        return _FakeCursor(self._store, query or {})

    async def create_index(self, *args, **kwargs):
        pass  # no-op

    async def _to_list(self):
        if isinstance(self._store, list):
            return list(self._store)
        elif isinstance(self._store, dict):
            return list(self._store.values())
        return []

    @staticmethod
    def _matches(doc: dict, query: dict) -> bool:
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True


class _FakeCursor:
    def __init__(self, store, query: dict):
        self._store = store
        self._query = query
        self._sort_key = None
        self._sort_dir = 1

    def sort(self, key: str, direction: int = -1):
        self._sort_key = key
        self._sort_dir = direction
        return self

    async def to_list(self, length: int = 1000):
        if isinstance(self._store, list):
            docs = list(self._store)
        elif isinstance(self._store, dict):
            docs = list(self._store.values())
        else:
            docs = []

        results = [d for d in docs if FakeCol._matches(d, self._query)]

        if self._sort_key:
            results.sort(
                key=lambda d: d.get(self._sort_key) or 0,
                reverse=(self._sort_dir == -1)
            )

        return results[:length]


# ─── Public collection references (same names as old motor collections) ────────
users_col           = FakeCol(_users, key_field="email")
tokens_col          = FakeCol(_tokens, key_field="token")
notifications_col   = FakeCol(_notif_list)
tickets_col         = FakeCol(_ticket_list)
session_history_col = FakeCol(_history_list)
app_status_col      = FakeCol(_app_status_list)
doc_approvals_col   = FakeCol(_doc_approvals, key_field="session_id")


# ─── Lifecycle (no-op, kept so main.py startup/shutdown hooks still work) ─────
async def connect_db():
    print("[DB] In-memory database ready (no MongoDB needed).")

async def close_db():
    print("[DB] Saving state to disk before shutdown...")
    _save_db()
    print("[DB] In-memory database cleared.")
