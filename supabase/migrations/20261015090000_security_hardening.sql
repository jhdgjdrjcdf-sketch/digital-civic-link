-- Security hardening for Digital Civic Link.
-- اختبر هذا التعديل على قاعدة تجريبية أولًا.

begin;

-- إصلاح صلاحيات دوال التحقق التي تستخدمها سياسات RLS
grant execute on function public.has_role(uuid, public.app_role)
to authenticated;

grant execute on function public.can_manage(uuid, public.app_role)
to authenticated;

-- منع المستخدمين العاديين من طلب الترقية إلى مدير عام
revoke execute on function public.bootstrap_super_admin()
from public, anon, authenticated;

-- إظهار خيارات الاستطلاعات المنشورة فقط
drop policy if exists "public reads options"
on public.poll_options;

create policy "public reads published poll options"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_options.poll_id
      and p.status = 'published'
  )
);

-- السماح بقراءة تقدم المستخدم نفسه فقط
drop policy if exists "own progress"
on public.lesson_progress;

create policy "learners read own progress"
on public.lesson_progress
for select
to authenticated
using (user_id = auth.uid());

revoke insert, update, delete
on public.lesson_progress
from authenticated;

grant select
on public.lesson_progress
to authenticated;

-- منع تعديل التسجيل بالدورات مباشرة
drop policy if exists "own enrollment insert"
on public.course_enrollments;

drop policy if exists "own enrollment update"
on public.course_enrollments;

revoke insert, update
on public.course_enrollments
from authenticated;

grant select
on public.course_enrollments
to authenticated;

-- السماح بتسليم واجبات غير مصححة فقط
drop policy if exists "students submit assignments"
on public.assignment_submissions;

create policy "students submit ungraded assignments"
on public.assignment_submissions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'submitted'
  and score is null
  and graded_at is null
  and exists (
    select 1
    from public.course_assignments a
    join public.course_enrollments e
      on e.course_id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and e.user_id = auth.uid()
  )
);

-- منع الطالب من تعديل واجب بعد تصحيحه
drop policy if exists "students revise or staff grade submissions"
on public.assignment_submissions;

create policy "students revise own ungraded submissions"
on public.assignment_submissions
for update
to authenticated
using (
  user_id = auth.uid()
  and status = 'submitted'
  and graded_at is null
)
with check (
  user_id = auth.uid()
  and status = 'submitted'
  and score is null
  and graded_at is null
);

-- السماح للمدير الأكاديمي أو مدرس المقرر بتحديث الواجبات
create policy "course staff update submissions"
on public.assignment_submissions
for update
to authenticated
using (
  public.can_manage(auth.uid(), 'academy_manager')
  or exists (
    select 1
    from public.course_assignments a
    join public.courses c
      on c.id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and c.instructor_id = auth.uid()
  )
)
with check (
  public.can_manage(auth.uid(), 'academy_manager')
  or exists (
    select 1
    from public.course_assignments a
    join public.courses c
      on c.id = a.course_id
    where a.id = assignment_submissions.assignment_id
      and c.instructor_id = auth.uid()
  )
);

commit;