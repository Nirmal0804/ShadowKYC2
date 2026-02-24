-- ============================================================
-- SHADOW KYC - Supabase Schema (Full Version)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- ── 1. session_history ────────────────────────────────────────
create table if not exists session_history (
    id              bigserial   primary key,
    session_id      text        not null,
    user_id         text,
    tenant_id       text,
    timestamp       float8,
    status          text        default 'completed',
    decision        text        default 'pending',
    notes           text        default '',
    risk_score      float8,
    created_at      timestamptz not null default now()
);
create index if not exists session_history_session_id_idx on session_history(session_id);
create index if not exists session_history_user_id_idx    on session_history(user_id);
create index if not exists session_history_tenant_id_idx  on session_history(tenant_id);

-- ── 2. users ──────────────────────────────────────────────────
create table if not exists shadow_users (
    id          text primary key,
    name        text,
    email       text unique not null,
    role        text,
    organization text,
    created_at  float8
);

-- ── 3. notifications ──────────────────────────────────────────
create table if not exists notifications (
    id          text primary key,
    user_id     text not null,
    message     text,
    type        text default 'info',
    read        boolean default false,
    created_at  float8
);
create index if not exists notifications_user_id_idx on notifications(user_id);

-- ── 4. doc_approvals ──────────────────────────────────────────
create table if not exists doc_approvals (
    session_id  text primary key,
    approved    boolean default false,
    docs        jsonb,
    timestamp   float8
);

-- ── 5. tickets ────────────────────────────────────────────────
create table if not exists tickets (
    id          text primary key,
    user_id     text,
    subject     text,
    description text,
    status      text default 'open',
    created_at  float8,
    updated_at  float8
);

-- ── 6. app_status ─────────────────────────────────────────────
create table if not exists app_status (
    id          bigserial primary key,
    user_id     text,
    session_id  text,
    status      text,
    notes       text,
    updated_at  float8
);
create index if not exists app_status_user_id_idx on app_status(user_id);

-- ── Row Level Security (disable for service role writes) ──────
alter table session_history enable row level security;
alter table shadow_users     enable row level security;
alter table notifications    enable row level security;
alter table doc_approvals    enable row level security;
alter table tickets          enable row level security;
alter table app_status       enable row level security;

-- Service role bypasses RLS automatically — no extra policy needed.
-- Add user-facing read policies if needed:
create policy if not exists "Service role full access on session_history"
    on session_history for all using (true) with check (true);

create policy if not exists "Service role full access on shadow_users"
    on shadow_users for all using (true) with check (true);

create policy if not exists "Service role full access on notifications"
    on notifications for all using (true) with check (true);

create policy if not exists "Service role full access on doc_approvals"
    on doc_approvals for all using (true) with check (true);

create policy if not exists "Service role full access on tickets"
    on tickets for all using (true) with check (true);

create policy if not exists "Service role full access on app_status"
    on app_status for all using (true) with check (true);
