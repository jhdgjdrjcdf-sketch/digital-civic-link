import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, ChevronLeft, Clock, Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { friendlyError, useSession } from "@/lib/auth";
import {
  categoryLabel,
  formatDuration,
  useAcademyActions,
  useCourse,
  useCourseProgress,
} from "@/lib/academy";

export const Route = createFileRoute("/academy/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — أكاديمية القيادة" },
      { name: "description", content: "Course outline, instructor, lessons and enrolment." },
      { property: "og:title", content: "Course — أكاديمية القيادة" },
      { property: "og:description", content: "Course outline, instructor, lessons and enrolment." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const query = useCourse(courseId);
  const progress = useCourseProgress(courseId);
  const { enroll } = useAcademyActions(courseId);

  const course = query.data?.course;
  const lessons = query.data?.lessons ?? [];
  const quizzes = query.data?.quizzes ?? [];

  return (
    <AppShell arabicTitle="أكاديمية القيادة" title="Course details">
      <Link
        to="/academy"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to all courses
      </Link>

      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !course ? (
        <EmptyState
          title="Course unavailable"
          description="This course may have been removed or is not published yet."
        />
      ) : (
        <div className="space-y-6">
          <section className="card-soft p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{course.level}</Badge>
              <Badge variant="outline">{categoryLabel(course.category)}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> {formatDuration(course.duration_minutes)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="size-3.5" /> {lessons.length} lessons
              </span>
            </div>
            <h2 className="mt-3 text-xl leading-tight font-bold">{course.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>

            {progress.data?.enrolled ? (
              <div className="mt-4 space-y-2">
                <Progress value={progress.data.percent} />
                <p className="text-xs text-muted-foreground">
                  {progress.data.percent}% complete — {progress.data.lessons_done} of{" "}
                  {progress.data.lessons_total} lessons
                </p>
                <Button
                  className="w-full"
                  onClick={() => navigate({ to: "/academy/learn/$courseId", params: { courseId } })}
                >
                  {progress.data.percent > 0 ? "Continue learning" : "Start learning"}
                </Button>
              </div>
            ) : session ? (
              <Button
                className="mt-4 w-full"
                disabled={enroll.isPending}
                onClick={() =>
                  enroll.mutate(undefined, {
                    onSuccess: () => {
                      toast.success("You are enrolled. Good luck!");
                      navigate({ to: "/academy/learn/$courseId", params: { courseId } });
                    },
                    onError: (error) => toast.error(friendlyError(error)),
                  })
                }
              >
                {enroll.isPending ? "Enrolling…" : "Join this course"}
              </Button>
            ) : (
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in to join this course</Link>
              </Button>
            )}
          </section>

          {course.outcomes.length ? (
            <section>
              <SectionTitle title="What you will learn" />
              <ul className="card-soft space-y-2 p-4">
                {course.outcomes.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.requirements.length ? (
            <section>
              <SectionTitle title="Requirements" />
              <ul className="card-soft space-y-2 p-4 text-sm text-muted-foreground">
                {course.requirements.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <SectionTitle title="Course content" />
            <ol className="card-soft divide-y divide-border">
              {lessons.map((lesson, index) => (
                <li key={lesson.id} className="flex items-center gap-3 p-4 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  <span className="flex-1">{lesson.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {lesson.duration_minutes} min
                  </span>
                </li>
              ))}
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="flex items-center gap-3 p-4 text-sm">
                  <Star className="size-4 text-accent" />
                  <span className="flex-1">{quiz.title}</span>
                  <span className="text-xs text-muted-foreground">
                    Pass mark {quiz.pass_percent}%
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle title="Your instructor" />
            <div className="card-soft p-4">
              <p className="font-semibold">{course.instructor_name}</p>
              {course.instructor_title ? (
                <p className="text-xs text-muted-foreground">{course.instructor_title}</p>
              ) : null}
              {course.instructor_bio ? (
                <p className="mt-2 text-sm text-muted-foreground">{course.instructor_bio}</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
