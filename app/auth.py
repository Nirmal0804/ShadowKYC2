import os
import httpx
import time
from jose import jwt, JWTError
from fastapi import WebSocket, HTTPException, status
from dotenv import load_dotenv
from app.database import tokens_col, users_col

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# JWKS (JSON Web Key Set) Cache
JWKS_CACHE = None
JWKS_LAST_FETCH = 0
JWKS_EXPIRE = 3600 # 1 hour

async def get_supabase_jwks():
    global JWKS_CACHE, JWKS_LAST_FETCH
    if JWKS_CACHE and (time.time() - JWKS_LAST_FETCH < JWKS_EXPIRE):
        return JWKS_CACHE
    
    if not SUPABASE_URL:
        return None
        
    url = f"{SUPABASE_URL}/auth/v1/jwks"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                JWKS_CACHE = resp.json()
                JWKS_LAST_FETCH = time.time()
                return JWKS_CACHE
        except Exception as e:
            print(f"[Auth] Error fetching JWKS from Supabase: {e}")
    return None

async def verify_supabase_token(token: str):
    """Verify a Supabase JWT token using JWKS."""
    jwks = await get_supabase_jwks()
    if not jwks:
        return None
        
    try:
        # We don't verify the audience/issuer strictly here to avoid config mismatch,
        # but in production, you definitely should.
        payload = jwt.decode(token, jwks, algorithms=["RS256"], options={"verify_aud": False})
        return payload
    except JWTError as e:
        print(f"[Auth] Supabase Token Verification failed: {e}")
        return None

async def verify_local_token(token: str):
    """Verify a local token from our database."""
    doc = await tokens_col.find_one({"token": token})
    if doc:
        return await users_col.find_one({"email": doc["email"]})
    return None

async def verify_ws_token(websocket: WebSocket, token: str):
    """
    Verifies a token for WebSocket connection.
    Supports both Supabase JWT and local service tokens.
    """
    if not token:
        return None

    # 1. Try Supabase verification
    payload = await verify_supabase_token(token)
    if payload:
        # Map Supabase payload to user object
        # Supabase typically puts user_id in 'sub' and email in 'email'
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "source": "supabase"
        }

    # 2. Try Local DB verification
    user = await verify_local_token(token)
    if user:
        return {
            "id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "source": "local"
        }

    return None

async def get_user_from_auth_header(auth_header: str):
    """Helper for HTTP endpoints."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return await verify_ws_token(None, token)
