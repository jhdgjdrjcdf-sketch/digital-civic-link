
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  pass_percent integer not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.quizzes to authenticated;
grant select on public.quizzes to anon;
grant all on public.quizzes to service_role;
alter table public.quizzes enable row level security;
create policy "quizzes readable" on public.quizzes for select using (true);
create policy "quizzes insert" on public.quizzes for insert to authenticated with check (public.can_manage(auth.uid(),'academy_manager'));
create policy "quizzes update" on public.quizzes for update to authenticated using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));
create trigger quizzes_updated before update on public.quizzes for each row execute function public.set_updated_at();

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  position integer not null default 1,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.quiz_questions to authenticated;
grant all on public.quiz_questions to service_role;
alter table public.quiz_questions enable row level security;
create policy "quiz questions manage" on public.quiz_questions for all to authenticated
  using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));

create table if not exists public.quiz_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  position integer not null default 1
);
grant select, insert, update on public.quiz_choices to authenticated;
grant all on public.quiz_choices to service_role;
alter table public.quiz_choices enable row level security;
create policy "quiz choices manage" on public.quiz_choices for all to authenticated
  using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
grant select on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
alter table public.quiz_attempts enable row level security;
create policy "own attempts readable" on public.quiz_attempts for select to authenticated using (user_id = auth.uid());

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer not null,
  serial text not null unique,
  issued_at timestamptz not null default now(),
  unique (user_id, quiz_id)
);
grant select on public.certificates to authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create policy "own certificates readable" on public.certificates for select to authenticated using (user_id = auth.uid());

create or replace function public.get_quiz(_quiz_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'pass_percent', q.pass_percent,
    'course_id', q.course_id,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qq.id,
        'prompt', qq.prompt,
        'choices', coalesce((
          select jsonb_agg(jsonb_build_object('id', qc.id, 'label', qc.label) order by qc.position)
          from public.quiz_choices qc where qc.question_id = qq.id
        ), '[]'::jsonb)
      ) order by qq.position)
      from public.quiz_questions qq where qq.quiz_id = q.id
    ), '[]'::jsonb)
  )
  from public.quizzes q where q.id = _quiz_id;
$$;

create or replace function public.submit_quiz(_quiz_id uuid, _answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q record;
  total integer;
  correct integer;
  pct integer;
  ok boolean;
  cert record;
begin
  if uid is null then raise exception 'You must be signed in to take a test'; end if;
  select * into q from public.quizzes where id = _quiz_id;
  if q is null then raise exception 'This test is not available'; end if;

  select count(*) into total from public.quiz_questions where quiz_id = _quiz_id;
  if total = 0 then raise exception 'This test has no questions yet'; end if;

  select count(*) into correct
  from public.quiz_questions qq
  join public.quiz_choices qc on qc.question_id = qq.id and qc.is_correct
  where qq.quiz_id = _quiz_id
    and (_answers ->> qq.id::text) = qc.id::text;

  pct := round((correct::numeric / total::numeric) * 100);
  ok := pct >= q.pass_percent;

  insert into public.quiz_attempts(quiz_id, user_id, score, passed)
  values (_quiz_id, uid, pct, ok);

  if ok then
    insert into public.certificates(user_id, course_id, quiz_id, score, serial)
    values (uid, q.course_id, _quiz_id, pct,
      'FZ-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)))
    on conflict (user_id, quiz_id) do update set score = greatest(public.certificates.score, excluded.score)
    returning * into cert;
  end if;

  return jsonb_build_object('score', pct, 'passed', ok, 'pass_percent', q.pass_percent,
    'correct', correct, 'total', total, 'serial', cert.serial);
end;
$$;

revoke all on function public.get_quiz(uuid) from public, anon;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
