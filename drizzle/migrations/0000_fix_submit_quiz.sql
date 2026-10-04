CREATE OR REPLACE FUNCTION public.submit_quiz(_quiz_id uuid, _answers jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid(); q record; total integer; correct integer; pct integer; ok boolean; used integer;
begin
  if uid is null then raise exception 'You must be signed in to take a test'; end if;
  select * into q from public.quizzes where id = _quiz_id;
  if q is null then raise exception 'This test is not available'; end if;
  if not exists (select 1 from public.course_enrollments where user_id = uid and course_id = q.course_id) then
    raise exception 'Enroll in the course to take this test'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text || _quiz_id::text));
  select count(*) into used from public.quiz_attempts where quiz_id = _quiz_id and user_id = uid;
  if q.max_attempts is not null and used >= q.max_attempts then
    raise exception 'You have used all attempts for this test'; end if;
  select count(*) into total from public.quiz_questions where quiz_id = _quiz_id;
  if total = 0 then raise exception 'This test has no questions yet'; end if;
  select count(*) into correct from public.quiz_questions qq
  join public.quiz_choices qc on qc.question_id = qq.id and qc.is_correct
  where qq.quiz_id = _quiz_id and (_answers ->> qq.id::text) = qc.id::text;
  pct := round((correct::numeric / total::numeric) * 100);
  ok := pct >= q.pass_percent;
  insert into public.quiz_attempts(quiz_id, user_id, score, passed) values (_quiz_id, uid, pct, ok);
  return jsonb_build_object('score', pct, 'passed', ok, 'pass_percent', q.pass_percent, 'correct', correct, 'total', total);
end;
$function$;