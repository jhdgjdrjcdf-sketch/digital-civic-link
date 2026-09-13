
-- === Course enrichment ===
alter table public.courses
  add column if not exists instructor_name text not null default 'Academy Faculty',
  add column if not exists instructor_title text not null default '',
  add column if not exists instructor_bio text not null default '',
  add column if not exists category text not null default 'leadership',
  add column if not exists duration_minutes integer not null default 0,
  add column if not exists outcomes text[] not null default '{}',
  add column if not exists requirements text[] not null default '{}';

-- === Modules ===
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 1,
  created_at timestamptz not null default now()
);
grant select on public.course_modules to anon, authenticated;
grant all on public.course_modules to service_role;
alter table public.course_modules enable row level security;
create policy "public reads modules" on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
create policy "academy manages modules" on public.course_modules for all to authenticated
  using (public.can_manage(auth.uid(),'academy_manager')) with check (public.can_manage(auth.uid(),'academy_manager'));
grant insert, update, delete on public.course_modules to authenticated;

alter table public.lessons
  add column if not exists module_id uuid references public.course_modules(id) on delete set null,
  add column if not exists video_url text,
  add column if not exists resources jsonb not null default '[]'::jsonb,
  add column if not exists is_required boolean not null default true;

-- === Enrollments ===
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'enrolled',
  last_lesson_id uuid references public.lessons(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
grant select, insert, update on public.course_enrollments to authenticated;
grant all on public.course_enrollments to service_role;
alter table public.course_enrollments enable row level security;
create policy "own enrollment" on public.course_enrollments for select to authenticated using (user_id = auth.uid() or public.can_manage(auth.uid(),'academy_manager'));
create policy "own enrollment insert" on public.course_enrollments for insert to authenticated with check (user_id = auth.uid());
create policy "own enrollment update" on public.course_enrollments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger course_enrollments_updated before update on public.course_enrollments
  for each row execute function public.set_updated_at();

-- === Notes ===
create table if not exists public.lesson_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
grant select, insert, update, delete on public.lesson_notes to authenticated;
grant all on public.lesson_notes to service_role;
alter table public.lesson_notes enable row level security;
create policy "own notes" on public.lesson_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- === Reviews ===
create table if not exists public.course_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
grant select on public.course_reviews to anon, authenticated;
grant insert, update on public.course_reviews to authenticated;
grant all on public.course_reviews to service_role;
alter table public.course_reviews enable row level security;
create policy "public reads reviews" on public.course_reviews for select to anon, authenticated using (true);
create policy "own review write" on public.course_reviews for insert to authenticated with check (user_id = auth.uid());
create policy "own review update" on public.course_reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- === Certificates for course completion ===
alter table public.certificates alter column quiz_id drop not null;
alter table public.certificates add column if not exists hours numeric not null default 0;
alter table public.certificates add column if not exists instructor_name text not null default '';
create unique index if not exists certificates_user_course_uniq on public.certificates(user_id, course_id);

-- === Functions ===
create or replace function public.enroll_course(_course_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); eid uuid;
begin
  if uid is null then raise exception 'You must be signed in to enrol'; end if;
  if not exists (select 1 from public.courses where id=_course_id and status='published') then
    raise exception 'This course is not available';
  end if;
  insert into public.course_enrollments(user_id, course_id, status)
  values (uid, _course_id, 'enrolled')
  on conflict (user_id, course_id) do update set updated_at = now()
  returning id into eid;
  return eid;
end; $$;

create or replace function public.complete_lesson(_lesson_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cid uuid;
begin
  if uid is null then raise exception 'You must be signed in'; end if;
  select course_id into cid from public.lessons where id = _lesson_id;
  if cid is null then raise exception 'Lesson not found'; end if;
  if not exists (select 1 from public.course_enrollments where user_id=uid and course_id=cid) then
    raise exception 'Enrol in this course first';
  end if;
  insert into public.lesson_progress(user_id, lesson_id) values (uid, _lesson_id)
  on conflict (user_id, lesson_id) do nothing;
  update public.course_enrollments set last_lesson_id = _lesson_id, status = case when status='enrolled' then 'in_progress' else status end
    where user_id=uid and course_id=cid;
  return public.course_progress(cid);
end; $$;

create or replace function public.set_last_lesson(_lesson_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cid uuid;
begin
  if uid is null then return; end if;
  select course_id into cid from public.lessons where id=_lesson_id;
  update public.course_enrollments set last_lesson_id=_lesson_id where user_id=uid and course_id=cid;
end; $$;

create or replace function public.course_progress(_course_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); total int; done int; quizzes_total int; quizzes_passed int;
begin
  if uid is null then return jsonb_build_object('enrolled', false); end if;
  select count(*) into total from public.lessons where course_id=_course_id and is_required;
  select count(*) into done from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id
    where lp.user_id=uid and l.course_id=_course_id and l.is_required;
  select count(*) into quizzes_total from public.quizzes where course_id=_course_id;
  select count(distinct qa.quiz_id) into quizzes_passed from public.quiz_attempts qa
    join public.quizzes q on q.id=qa.quiz_id where qa.user_id=uid and q.course_id=_course_id and qa.passed;
  return jsonb_build_object(
    'enrolled', exists (select 1 from public.course_enrollments where user_id=uid and course_id=_course_id),
    'status', coalesce((select status from public.course_enrollments where user_id=uid and course_id=_course_id),'none'),
    'last_lesson_id', (select last_lesson_id from public.course_enrollments where user_id=uid and course_id=_course_id),
    'lessons_total', total, 'lessons_done', done,
    'quizzes_total', quizzes_total, 'quizzes_passed', quizzes_passed,
    'percent', case when (total + quizzes_total) = 0 then 0
      else round(((done + quizzes_passed)::numeric / (total + quizzes_total)) * 100) end,
    'completed_lesson_ids', coalesce((select jsonb_agg(lp.lesson_id) from public.lesson_progress lp
      join public.lessons l on l.id=lp.lesson_id where lp.user_id=uid and l.course_id=_course_id), '[]'::jsonb)
  );
end; $$;

create or replace function public.finalize_course(_course_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p jsonb; c record; cert record; name text;
begin
  if uid is null then raise exception 'You must be signed in'; end if;
  p := public.course_progress(_course_id);
  if coalesce((p->>'percent')::int,0) < 100 then
    return jsonb_build_object('completed', false, 'progress', p);
  end if;
  select * into c from public.courses where id=_course_id;
  select display_name into name from public.profiles where id=uid;
  update public.course_enrollments set status='completed', completed_at=coalesce(completed_at, now())
    where user_id=uid and course_id=_course_id;
  insert into public.certificates(user_id, course_id, quiz_id, score, serial, hours, instructor_name)
  values (uid, _course_id, null, coalesce((p->>'percent')::int,100),
    'FZ-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    round(coalesce(c.duration_minutes,0)::numeric / 60, 1), c.instructor_name)
  on conflict (user_id, course_id) do update set score = greatest(public.certificates.score, excluded.score)
  returning * into cert;
  return jsonb_build_object('completed', true, 'progress', p, 'serial', cert.serial,
    'student', name, 'course', c.title, 'instructor', c.instructor_name,
    'issued_at', cert.issued_at, 'hours', cert.hours);
end; $$;

create or replace function public.verify_certificate(_serial text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('valid', true, 'serial', c.serial, 'student', p.display_name,
      'course', co.title, 'instructor', c.instructor_name, 'issued_at', c.issued_at,
      'hours', c.hours, 'score', c.score)
    from public.certificates c
    join public.profiles p on p.id = c.user_id
    join public.courses co on co.id = c.course_id
    where upper(c.serial) = upper(trim(_serial))
  ), jsonb_build_object('valid', false));
$$;

revoke all on function public.enroll_course(uuid), public.complete_lesson(uuid), public.set_last_lesson(uuid),
  public.course_progress(uuid), public.finalize_course(uuid) from public, anon;
grant execute on function public.enroll_course(uuid), public.complete_lesson(uuid), public.set_last_lesson(uuid),
  public.course_progress(uuid), public.finalize_course(uuid) to authenticated;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
