-- 0001_core_schema.sql
-- Visual AI Tutor — Phase 1 (Uzair): Core data model (SPEC §9) + RLS.
-- Apply in Supabase Dashboard → SQL Editor, or `supabase db push`.

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text,
  pack_version text,
  topic_brief text check (topic_brief is null or char_length(topic_brief) <= 2000),
  language text not null default 'en' check (language in ('en', 'ur')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  detective_outcome text check (detective_outcome is null or detective_outcome in
    ('misconception_identified', 'insufficient_evidence', 'correct_answer',
     'arithmetic_slip', 'unrecognized_reasoning')),
  misconception_id text,
  detective_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint learning_sessions_source check (pack_id is not null or topic_brief is not null)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  phase text not null check (phase in
    ('diagnose', 'board', 'board_task', 'question', 'quiz', 'teach_ai', 'viva', 'test_prep')),
  prompt text,
  response text,
  correct boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.board_states (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scene jsonb not null default '{}'::jsonb,
  selected_element_ids text[] not null default '{}',
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.narration_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  step_order integer not null,
  operation jsonb not null default '{}'::jsonb,
  spoken_line text not null check (char_length(spoken_line) <= 160),
  language text not null default 'en' check (language in ('en', 'ur')),
  created_at timestamptz not null default now(),
  unique (session_id, step_order, language)
);

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null, -- detective | board_tutor | quiz_coach | summary
  model text not null,
  output jsonb,
  latency_ms integer,
  status text not null default 'ok' check (status in ('ok', 'invalid_json', 'error')),
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_seed text not null,
  answer text,
  completion boolean,
  correct boolean,
  explanation text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  bullets jsonb not null default '[]'::jsonb,
  language text not null default 'en' check (language in ('en', 'ur')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.learning_sessions (id) on delete cascade,
  event_type text not null,
  object_id text,
  created_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists learning_sessions_user_idx on public.learning_sessions (user_id, created_at desc);
create index if not exists attempts_session_idx on public.attempts (session_id, created_at);
create index if not exists attempts_user_idx on public.attempts (user_id);
create index if not exists narration_steps_session_idx on public.narration_steps (session_id, step_order);
create index if not exists model_runs_session_idx on public.model_runs (session_id);
create index if not exists quiz_results_session_idx on public.quiz_results (session_id);
create index if not exists activity_events_user_idx on public.activity_events (user_id, created_at desc);

-- ── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.learning_sessions;
create trigger set_updated_at before update on public.learning_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.board_states;
create trigger set_updated_at before update on public.board_states
  for each row execute function public.set_updated_at();

-- ── Row Level Security: strict per-account isolation (SPEC M3) ───────────────
-- Owner-only select/insert/update/delete per table. Child rows (attempts,
-- board_states, narration_steps, model_runs, quiz_results, lesson_summaries,
-- activity_events) must ALSO point at a learning_session owned by auth.uid(),
-- so account B can never attach rows to account A's session.
-- Idempotent: re-running replaces the earlier broad `owner_all` policies.

alter table public.learning_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.board_states enable row level security;
alter table public.narration_steps enable row level security;
alter table public.model_runs enable row level security;
alter table public.quiz_results enable row level security;
alter table public.lesson_summaries enable row level security;
alter table public.activity_events enable row level security;

-- learning_sessions: the root of ownership.
drop policy if exists owner_all on public.learning_sessions;
drop policy if exists learning_sessions_select on public.learning_sessions;
drop policy if exists learning_sessions_insert on public.learning_sessions;
drop policy if exists learning_sessions_update on public.learning_sessions;
drop policy if exists learning_sessions_delete on public.learning_sessions;

create policy learning_sessions_select on public.learning_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy learning_sessions_insert on public.learning_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy learning_sessions_update on public.learning_sessions
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy learning_sessions_delete on public.learning_sessions
  for delete to authenticated using (auth.uid() = user_id);

-- Child tables that always have a session_id.
do $$
declare
  t text;
  parent_ok constant text :=
    'auth.uid() = user_id and exists (select 1 from public.learning_sessions s '
    'where s.id = session_id and s.user_id = auth.uid())';
begin
  foreach t in array array[
    'attempts', 'board_states', 'narration_steps',
    'model_runs', 'quiz_results', 'lesson_summaries'
  ] loop
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (' || parent_ok || ')',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (' || parent_ok || ')',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      t || '_delete', t);
  end loop;
end $$;

-- activity_events: session_id is optional, but if present it must be owned.
drop policy if exists owner_all on public.activity_events;
drop policy if exists activity_events_select on public.activity_events;
drop policy if exists activity_events_insert on public.activity_events;
drop policy if exists activity_events_update on public.activity_events;
drop policy if exists activity_events_delete on public.activity_events;

create policy activity_events_select on public.activity_events
  for select to authenticated using (auth.uid() = user_id);
create policy activity_events_insert on public.activity_events
  for insert to authenticated with check (
    auth.uid() = user_id and (
      session_id is null or exists (
        select 1 from public.learning_sessions s
        where s.id = session_id and s.user_id = auth.uid())));
create policy activity_events_update on public.activity_events
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and (
      session_id is null or exists (
        select 1 from public.learning_sessions s
        where s.id = session_id and s.user_id = auth.uid())));
create policy activity_events_delete on public.activity_events
  for delete to authenticated using (auth.uid() = user_id);
