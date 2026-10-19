-- Two-account RLS isolation test. Run AFTER 0001_core_schema.sql, in the
-- Supabase SQL Editor. Needs at least two rows in auth.users (sign up two
-- accounts first). Everything runs in one transaction and is rolled back.
-- Expected output: NOTICE "RLS ISOLATION: PASS". Any leak raises an exception.

begin;

select
  set_config('test.a', coalesce((select id::text from auth.users order by created_at limit 1), ''), true),
  set_config('test.b', coalesce((select id::text from auth.users order by created_at offset 1 limit 1), ''), true);

do $$
declare
  a uuid;
  b uuid;
  sid uuid;
  n integer;
begin
  if current_setting('test.a') = '' or current_setting('test.b') = '' then
    raise exception 'Need two accounts in auth.users — sign up two users first.';
  end if;
  a := current_setting('test.a')::uuid;
  b := current_setting('test.b')::uuid;

  -- Account A creates a session with child rows.
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', a, 'role', 'authenticated')::text, true);

  insert into public.learning_sessions (user_id, pack_id)
    values (a, 'binomial_square') returning id into sid;
  insert into public.attempts (session_id, user_id, phase) values (sid, a, 'diagnose');
  insert into public.narration_steps (session_id, user_id, step_order, spoken_line)
    values (sid, a, 0, 'hello');
  insert into public.quiz_results (session_id, user_id, item_seed) values (sid, a, 'q1');
  insert into public.model_runs (session_id, user_id, role, model) values (sid, a, 'detective', 'm');
  insert into public.board_states (session_id, user_id) values (sid, a);
  insert into public.lesson_summaries (session_id, user_id) values (sid, a);
  insert into public.activity_events (user_id, session_id, event_type) values (a, sid, 'test');

  select count(*) into n from public.learning_sessions where id = sid;
  if n <> 1 then raise exception 'Owner A cannot read own session'; end if;

  -- Account B must see nothing of A's.
  perform set_config('request.jwt.claims',
    json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.learning_sessions where id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A learning_sessions'; end if;
  select count(*) into n from public.attempts where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A attempts'; end if;
  select count(*) into n from public.narration_steps where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A narration_steps'; end if;
  select count(*) into n from public.quiz_results where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A quiz_results'; end if;
  select count(*) into n from public.model_runs where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A model_runs'; end if;
  select count(*) into n from public.board_states where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A board_states'; end if;
  select count(*) into n from public.lesson_summaries where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A lesson_summaries'; end if;
  select count(*) into n from public.activity_events where session_id = sid;
  if n <> 0 then raise exception 'LEAK: B reads A activity_events'; end if;

  -- B cannot update/delete A's session.
  update public.learning_sessions set status = 'abandoned' where id = sid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'LEAK: B updated A session'; end if;
  delete from public.learning_sessions where id = sid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'LEAK: B deleted A session'; end if;

  -- B cannot attach child rows to A's session (even with B's own user_id).
  begin
    insert into public.attempts (session_id, user_id, phase) values (sid, b, 'diagnose');
    raise exception 'LEAK: B inserted attempt on A session';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.quiz_results (session_id, user_id, item_seed) values (sid, b, 'q1');
    raise exception 'LEAK: B inserted quiz_result on A session';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.narration_steps (session_id, user_id, step_order, spoken_line)
      values (sid, b, 9, 'x');
    raise exception 'LEAK: B inserted narration_step on A session';
  exception when insufficient_privilege then null;
  end;

  -- B cannot create a session as A.
  begin
    insert into public.learning_sessions (user_id, pack_id) values (a, 'binomial_square');
    raise exception 'LEAK: B inserted session for A';
  exception when insufficient_privilege then null;
  end;

  raise notice 'RLS ISOLATION: PASS';
end $$;

rollback;
