import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export whether Supabase is properly configured
export const supabaseAvailable = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// If env vars are missing, create a dummy client stub so imports don't crash
export const supabase = supabaseAvailable
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : {
        auth: {
            signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
            signInWithOAuth: async () => ({ error: new Error('Supabase not configured') }),
            signOut: async () => { },
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        }
    };

if (!supabaseAvailable) {
    console.warn('[ShadowKYC] Supabase env vars not set. Using local /auth/login instead. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable Supabase auth.');
}

/**
 * Get the current session's JWT access token (Supabase).
 * Returns null if not authenticated or Supabase is unavailable.
 */
export async function getAccessToken() {
    if (supabaseAvailable) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) return data.session.access_token;
    }
    // Fall back to custom token
    return localStorage.getItem('shadow_token');
}

/**
 * Build an Authorization header for fetch() calls.
 * Falls back to the locally stored shadow_token (works for both Supabase & custom auth).
 */
export async function authHeader() {
    // Prefer Supabase JWT if available
    const sbToken = await getAccessToken();
    if (sbToken) return { Authorization: `Bearer ${sbToken}` };

    // Fall back to custom token from local login
    const localToken = localStorage.getItem('shadow_token');
    if (localToken) return { Authorization: `Bearer ${localToken}` };

    return {};
}
