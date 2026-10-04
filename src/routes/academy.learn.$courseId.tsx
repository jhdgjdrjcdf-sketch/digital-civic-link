import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LearnExtras } from "@/components/LearnExtras";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { friendlyError } from "@/lib/auth";
import { useAcademyActions, useCourse, useCourseProgress } from "@/lib/academy";

export const Route = createFileRoute("/academy/learn/$courseId")({
  head: () => ({
    meta: [
      { title: "Learning — أكاديمية القيادة" },
      { name: "description", content: "Follow lessons and track your course progress." },
      { property: "og:title", content: "Learning — أكاديمية القيادة" },
      { property: "og:description", content: "Follow lessons and track your course progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const query = useCourse(courseId);
  const progress = useCourseProgress(courseId);
  const { completeLesson, finalize } = useAcademyActions(courseId);
  const lessons = query.data?.lessons ?? [];
  const done = new Set(progress.data?.completed_lesson_ids ?? []);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const current =
    lessons.find((l) => l.id === (currentId ?? progress.data?.last_lesson_id)) ?? lessons[0];

  return (
    <AppShell arabicTitle="أكاديمية القيادة" title={query.data?.course?.title ?? "Learning"}>
      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !progress.data?.enrolled ? (
        <EmptyState
          title="You're not enrolled"
          description="Join the course to start learning."
          action={<Button asChild size="sm"><Link to="/academy/$courseId" params={{ courseId }}>View course</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <Progress value={progress.data.percent} />
            <p className="text-xs text-muted-foreground">
              {progress.data.percent}% · {progress.data.lessons_done}/{progress.data.lessons_total} lessons
            </p>
          </div>
          {current ? (
            <article className="card-soft space-y-3 p-4">
              <h2 className="text-lg font-bold">{current.title}</h2>
              {current.video_url ? (
                <video src={current.video_url} controls className="w-full rounded-lg" />
              ) : null}
              <p className="text-sm whitespace-pre-line">{current.content}</p>
              <Button
                className="w-full"
                disabled={done.has(current.id) || completeLesson.isPending}
                onClick={() =>
                  completeLesson.mutate(current.id, { onError: (e) => toast.error(friendlyError(e)) })
                }
              >
                {done.has(current.id) ? "Completed" : "Mark lesson complete"}
              </Button>
            </article>
          ) : null}
          <ol className="card-soft divide-y divide-border">
            {lessons.map((l) => (
              <li key={l.id}>
                <button className="flex w-full items-center gap-3 p-3 text-left text-sm" onClick={() => setCurrentId(l.id)}>
                  {done.has(l.id) ? <CheckCircle2 className="size-4 text-accent" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={l.id === current?.id ? "font-semibold" : ""}>{l.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <LearnExtras courseId={courseId} lessonId={current?.id} />
          {progress.data.percent >= 100 ? (
            <Button
              className="w-full"
              disabled={finalize.isPending}
              onClick={() =>
                finalize.mutate(undefined, {
                  onSuccess: (r) =>
                    r.serial
                      ? navigate({ to: "/academy/certificate/$serial", params: { serial: r.serial } })
                      : toast.error("Some requirements are still incomplete."),
                  onError: (e) => toast.error(friendlyError(e)),
                })
              }
            >
              Get my certificate
            </Button>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
