import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { CourseCover } from "@/components/CourseCover";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth";
import { useCertificates, useCourseProgress, useCourses, useEnrollments, type Course } from "@/lib/academy";

export const Route = createFileRoute("/academy/my")({
  head: () => ({
    meta: [
      { title: "My courses — أكاديمية القيادة" },
      { name: "description", content: "Your enrolled courses, progress and certificates." },
      { property: "og:title", content: "My courses — أكاديمية القيادة" },
      { property: "og:description", content: "Your enrolled courses, progress and certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyCoursesPage,
});

const TABS = [
  { key: "enrolled", label: "Not started" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
] as const;

function MyCoursesPage() {
  const { data: session, isPending } = useSession();
  const enrollments = useEnrollments();
  const courses = useCourses();
  const certificates = useCertificates();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("in_progress");

  const rows = useMemo(
    () =>
      (enrollments.data ?? [])
        .map((e) => ({ ...e, course: courses.data?.find((c) => c.id === e.course_id) }))
        .filter((r): r is typeof r & { course: Course } => Boolean(r.course)),
    [enrollments.data, courses.data],
  );

  if (!isPending && !session)
    return (
      <AppShell arabicTitle="أكاديمية القيادة" title="My courses">
        <EmptyState
          title="Sign in to see your courses"
          description="Your progress and certificates are saved to your account."
          action={<Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>}
        />
      </AppShell>
    );

  const visible = rows.filter((r) => r.status === tab);

  return (
    <AppShell arabicTitle="أكاديمية القيادة" title="My courses">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-2 py-2 text-xs font-semibold ${tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label} ({rows.filter((r) => r.status === t.key).length})
          </button>
        ))}
      </div>
      {enrollments.isPending || courses.isPending ? (
        <LoadingList rows={2} />
      ) : enrollments.isError ? (
        <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />
      ) : !visible.length ? (
        <EmptyState
          title="Nothing here yet"
          description="Browse the academy to find a course."
          action={<Button asChild size="sm"><Link to="/academy">Browse courses</Link></Button>}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <MyCourseCard
              key={r.course_id}
              course={r.course}
              serial={certificates.data?.find((c) => c.course_id === r.course_id)?.serial}
            />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function MyCourseCard({ course, serial }: { course: Course; serial?: string }) {
  const progress = useCourseProgress(course.id);
  const p = progress.data;
  return (
    <li className="card-soft space-y-3 p-3">
      <div className="flex gap-3">
        <CourseCover path={course.cover_url} title={course.title} className="w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold">{course.title}</p>
          <p className="text-xs text-muted-foreground">{course.instructor_name}</p>
        </div>
      </div>
      <Progress value={p?.percent ?? 0} />
      <p className="text-xs text-muted-foreground">
        {p?.percent ?? 0}% · {p?.lessons_done ?? 0}/{p?.lessons_total ?? 0} lessons
      </p>
      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link to="/academy/learn/$courseId" params={{ courseId: course.id }}>
            {p?.status === "completed" ? "Review" : p?.percent ? "Continue" : "Start"}
          </Link>
        </Button>
        {serial ? (
          <Button asChild size="sm" variant="secondary" className="flex-1">
            <Link to="/academy/certificate/$serial" params={{ serial }}>Certificate</Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}
