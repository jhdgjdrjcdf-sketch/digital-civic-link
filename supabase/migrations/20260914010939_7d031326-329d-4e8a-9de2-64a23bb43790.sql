alter type public.app_role add value if not exists 'instructor';

alter table public.courses
  add column if not exists instructor_id uuid references public.profiles(id) on delete set null,
  add column if not exists require_all_lessons boolean not null default true,
  add column if not exists require_all_quizzes boolean not null default true,
  add column if not exists require_all_assignments boolean not null default true;

alter table public.lessons
  add column if not exists unlock_after_lesson_id uuid references public.lessons(id) on delete set null;

alter table public.quizzes
  add column if not exists is_required boolean not null default true,
  add column if not exists max_attempts integer check (max_attempts is null or max_attempts > 0);

create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null,
  instructions text not null default '',
  resource_path text,
  is_required boolean not null default true,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.course_assignments to anon, authenticated;
grant insert, update, delete on public.course_assignments to authenticated;
grant all on public.course_assignments to service_role;
alter table public.course_assignments enable row level security;
create policy "published assignments are visible" on public.course_assignments for select to anon, authenticated using (
  exists (select 1 from public.courses c where c.id=course_id and c.status='published')
);
create policy "academy managers manage assignments" on public.course_assignments for all to authenticated
  using (public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid()))
  with check (public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid()));
create trigger course_assignments_updated before update on public.course_assignments for each row execute function public.set_updated_at();

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  file_path text,
  status text not null default 'submitted' check (status in ('submitted','approved','changes_requested')),
  score integer check (score is null or score between 0 and 100),
  feedback text not null default '',
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id,user_id)
);
grant select, insert, update on public.assignment_submissions to authenticated;
grant all on public.assignment_submissions to service_role;
alter table public.assignment_submissions enable row level security;
create policy "students read own submissions" on public.assignment_submissions for select to authenticated using (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (
    select 1 from public.course_assignments a join public.courses c on c.id=a.course_id where a.id=assignment_id and c.instructor_id=auth.uid()
  )
);
create policy "students submit assignments" on public.assignment_submissions for insert to authenticated with check (
  user_id=auth.uid() and exists (select 1 from public.course_assignments a join public.course_enrollments e on e.course_id=a.course_id where a.id=assignment_id and e.user_id=auth.uid())
);
create policy "students revise or staff grade submissions" on public.assignment_submissions for update to authenticated using (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (
    select 1 from public.course_assignments a join public.courses c on c.id=a.course_id where a.id=assignment_id and c.instructor_id=auth.uid()
  )
) with check (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (
    select 1 from public.course_assignments a join public.courses c on c.id=a.course_id where a.id=assignment_id and c.instructor_id=auth.uid()
  )
);
create trigger assignment_submissions_updated before update on public.assignment_submissions for each row execute function public.set_updated_at();

create table public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 2000),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.course_questions to authenticated;
grant all on public.course_questions to service_role;
alter table public.course_questions enable row level security;
create policy "enrolled students read questions" on public.course_questions for select to authenticated using (
  exists (select 1 from public.course_enrollments e where e.course_id=course_id and e.user_id=auth.uid())
  or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
);
create policy "enrolled students ask questions" on public.course_questions for insert to authenticated with check (
  user_id=auth.uid() and exists (select 1 from public.course_enrollments e where e.course_id=course_id and e.user_id=auth.uid())
);
create policy "owners and academy staff update questions" on public.course_questions for update to authenticated using (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
) with check (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
);
create policy "owners and academy staff remove questions" on public.course_questions for delete to authenticated using (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid())
);
create trigger course_questions_updated before update on public.course_questions for each row execute function public.set_updated_at();

create table public.course_question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.course_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.course_question_replies to authenticated;
grant all on public.course_question_replies to service_role;
alter table public.course_question_replies enable row level security;
create policy "participants read replies" on public.course_question_replies for select to authenticated using (
  exists (select 1 from public.course_questions q join public.course_enrollments e on e.course_id=q.course_id where q.id=question_id and e.user_id=auth.uid())
  or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.course_questions q join public.courses c on c.id=q.course_id where q.id=question_id and c.instructor_id=auth.uid())
);
create policy "participants add replies" on public.course_question_replies for insert to authenticated with check (
  user_id=auth.uid() and (exists (select 1 from public.course_questions q join public.course_enrollments e on e.course_id=q.course_id where q.id=question_id and e.user_id=auth.uid())
  or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.course_questions q join public.courses c on c.id=q.course_id where q.id=question_id and c.instructor_id=auth.uid()))
);
create policy "reply owners update" on public.course_question_replies for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "reply owners and academy staff remove" on public.course_question_replies for delete to authenticated using (
  user_id=auth.uid() or public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.course_questions q join public.courses c on c.id=q.course_id where q.id=question_id and c.instructor_id=auth.uid())
);
create trigger course_question_replies_updated before update on public.course_question_replies for each row execute function public.set_updated_at();

create index if not exists course_modules_course_position_idx on public.course_modules(course_id,position);
create index if not exists lessons_course_position_idx on public.lessons(course_id,position);
create index if not exists assignments_course_position_idx on public.course_assignments(course_id,position);
create index if not exists assignment_submissions_user_idx on public.assignment_submissions(user_id,status);
create index if not exists course_questions_course_idx on public.course_questions(course_id,created_at desc);

create or replace function public.is_course_staff(_course_id uuid, _user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.can_manage(_user_id,'academy_manager') or exists (select 1 from public.courses where id=_course_id and instructor_id=_user_id)
$$;
revoke all on function public.is_course_staff(uuid,uuid) from public, anon;
grant execute on function public.is_course_staff(uuid,uuid) to authenticated;

create or replace function public.course_progress(_course_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid := auth.uid(); lessons_total int; lessons_done int; quizzes_total int; quizzes_passed int; assignments_total int; assignments_done int; total int; done int;
begin
  if uid is null then return jsonb_build_object('enrolled',false); end if;
  select count(*) into lessons_total from public.lessons where course_id=_course_id and is_required;
  select count(*) into lessons_done from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id where lp.user_id=uid and l.course_id=_course_id and l.is_required;
  select count(*) into quizzes_total from public.quizzes where course_id=_course_id and is_required;
  select count(distinct qa.quiz_id) into quizzes_passed from public.quiz_attempts qa join public.quizzes q on q.id=qa.quiz_id where qa.user_id=uid and q.course_id=_course_id and q.is_required and qa.passed;
  select count(*) into assignments_total from public.course_assignments where course_id=_course_id and is_required;
  select count(*) into assignments_done from public.assignment_submissions s join public.course_assignments a on a.id=s.assignment_id where s.user_id=uid and a.course_id=_course_id and a.is_required and s.status='approved';
  total := lessons_total + quizzes_total + assignments_total; done := lessons_done + quizzes_passed + assignments_done;
  return jsonb_build_object(
    'enrolled',exists(select 1 from public.course_enrollments where user_id=uid and course_id=_course_id),
    'status',coalesce((select status from public.course_enrollments where user_id=uid and course_id=_course_id),'none'),
    'last_lesson_id',(select last_lesson_id from public.course_enrollments where user_id=uid and course_id=_course_id),
    'lessons_total',lessons_total,'lessons_done',lessons_done,'quizzes_total',quizzes_total,'quizzes_passed',quizzes_passed,
    'assignments_total',assignments_total,'assignments_done',assignments_done,
    'percent',case when total=0 then 0 else round((done::numeric/total)*100) end,
    'completed_lesson_ids',coalesce((select jsonb_agg(lp.lesson_id) from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id where lp.user_id=uid and l.course_id=_course_id),'[]'::jsonb)
  );
end $$;

create or replace function public.finalize_course(_course_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p jsonb; c record; cert record; name text; average_score int;
begin
  if uid is null then raise exception 'You must be signed in'; end if;
  select * into c from public.courses where id=_course_id and status='published' for update;
  if c is null then raise exception 'This course is not available'; end if;
  p:=public.course_progress(_course_id);
  if not coalesce((p->>'enrolled')::boolean,false) then raise exception 'Enrol in this course first'; end if;
  if coalesce((p->>'percent')::int,0)<100 then return jsonb_build_object('completed',false,'progress',p); end if;
  select coalesce(round(avg(best)),100)::int into average_score from (select max(score) best from public.quiz_attempts qa join public.quizzes q on q.id=qa.quiz_id where qa.user_id=uid and q.course_id=_course_id and qa.passed group by qa.quiz_id) s;
  select display_name into name from public.profiles where id=uid;
  update public.course_enrollments set status='completed',completed_at=coalesce(completed_at,now()) where user_id=uid and course_id=_course_id;
  insert into public.certificates(user_id,course_id,quiz_id,score,serial,hours,instructor_name)
  values(uid,_course_id,null,average_score,'FZ-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),round(coalesce(c.duration_minutes,0)::numeric/60,1),c.instructor_name)
  on conflict(user_id,course_id) do update set score=greatest(public.certificates.score,excluded.score)
  returning * into cert;
  perform public.write_audit('complete_course','courses',_course_id::text);
  return jsonb_build_object('completed',true,'progress',p,'serial',cert.serial,'student',name,'course',c.title,'instructor',c.instructor_name,'issued_at',cert.issued_at,'hours',cert.hours,'score',cert.score);
end $$;

create or replace function public.grade_assignment(_submission_id uuid,_status text,_score integer,_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if _status not in ('approved','changes_requested') then raise exception 'Invalid grading status'; end if;
  if _score is not null and (_score<0 or _score>100) then raise exception 'Score must be between 0 and 100'; end if;
  select a.course_id into cid from public.assignment_submissions s join public.course_assignments a on a.id=s.assignment_id where s.id=_submission_id;
  if cid is null then raise exception 'Submission not found'; end if;
  if not public.is_course_staff(cid,auth.uid()) then raise exception 'not authorized'; end if;
  update public.assignment_submissions set status=_status,score=_score,feedback=left(coalesce(_feedback,''),2000),graded_at=now() where id=_submission_id;
  perform public.write_audit('grade_assignment','assignment_submissions',_submission_id::text);
end $$;
revoke all on function public.grade_assignment(uuid,text,integer,text) from public,anon;
grant execute on function public.grade_assignment(uuid,text,integer,text) to authenticated;

create policy "academy cover files are readable" on storage.objects for select to anon, authenticated using (bucket_id='academy-media' and (storage.foldername(name))[1]='covers');
create policy "enrolled learners read academy resources" on storage.objects for select to authenticated using (bucket_id='academy-media' and (storage.foldername(name))[1] in ('lessons','assignments') and exists (select 1 from public.course_enrollments e where e.user_id=auth.uid() and e.course_id=((storage.foldername(name))[2])::uuid));
create policy "academy staff upload media" on storage.objects for insert to authenticated with check (bucket_id='academy-media' and (public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=((storage.foldername(name))[2])::uuid and c.instructor_id=auth.uid())));
create policy "academy staff update media" on storage.objects for update to authenticated using (bucket_id='academy-media' and (public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=((storage.foldername(name))[2])::uuid and c.instructor_id=auth.uid()))) with check (bucket_id='academy-media');
create policy "academy staff delete media" on storage.objects for delete to authenticated using (bucket_id='academy-media' and (public.can_manage(auth.uid(),'academy_manager') or exists (select 1 from public.courses c where c.id=((storage.foldername(name))[2])::uuid and c.instructor_id=auth.uid())));
