-- ============================================================
-- SHADOW KYC - Supabase Schema (Idempotent Version)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- Sessions table
create table if not exists sessions (
    id          text        primary key,
    user_id     uuid        references auth.users(id),
    status      text        not null default 'active',
    risk_score  numeric,
    decision    text,
    created_at  timestamptz not null default now()
);

-- Enable RLS
alter table sessions enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can read own sessions" on sessions;
drop policy if exists "Service role has full access" on sessions;

-- Create policies
create policy "Users can read own sessions"
    on sessions for select
    using (auth.uid() = user_id);

create policy "Service role has full access"
    on sessions for all
    using (true)
    with check (true);

-- Indexes
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_status_idx  on sessions(status);
