import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { ExamRunner } from "@/components/academy/ExamRunner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

type ExamCard = {
  id: string;
  title: string;
  description: string;
  pass_percent: number;
  max_attempts: number | null;
  course_id: string;
  courses: { title: string } | null;
};

type Attempt = {
  id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  created_at: string;
};

export const Route = createFileRoute("/academy/exams")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "DCL Exam Engine — محرك الاختبارات الذكي" },
      {
        name: "description",
        content: "Secure course assessments with server-side grading and progress tracking.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamCenterPage,
});

function ExamCenterPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user.id;
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const enrollments = useQuery({
    queryKey: ["academy", "exam-enrollments", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const courseIds = useMemo(
    () => [...new Set((enrollments.data ?? []).map((item) => item.course_id))],
    [enrollments.data],
  );

  const exams = useQuery({
    queryKey: ["academy", "exam-list", courseIds],
    enabled: Boolean(userId) && !enrollments.isPending && courseIds.length > 0,
    queryFn: async (): Promise<ExamCard[]> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, pass_percent, max_attempts, course_id, courses(title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExamCard[];
    },
  });

  const attempts = useQuery({
    queryKey: ["academy", "exam-attempts", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, passed, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const attemptsByQuiz = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const attempt of attempts.data ?? []) {
      const current = map.get(attempt.quiz_id) ?? [];
      current.push(attempt);
      map.set(attempt.quiz_id, current);
    }
    return map;
  }, [attempts.data]);

  const activeExam = exams.data?.find((exam) => exam.id === activeQuizId);

  return (
    <AppShell
      arabicTitle="محرك الاختبارات الذكي"
      title="DCL Exam Engine"
      subtitle="A secure assessment space for courses, with verified server-side grading and saved results."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button asChild size="sm" variant="outline">
          <Link to="/academy">
            <ArrowLeft className="me-2 size-4" />
            Back to academy
          </Link>
        </Button>
        <Badge variant="secondary" className="gap-1">
          <BookOpenCheck className="size-3.5" />
          C++ grading engine
        </Badge>
      </div>

      {sessionPending ? (
        <LoadingList rows={3} />
      ) : !userId ? (
        <EmptyState
          title="Sign in to access exams"
          description="Your exam list and results are connected to your learning account."
          action={
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      ) : activeQuizId && activeExam ? (
        <div className="space-y-4">
          <Button size="sm" variant="ghost" onClick={() => setActiveQuizId(null)}>
            <ArrowLeft className="me-2 size-4" />
            All exams
          </Button>
          <ExamRunner quizId={activeQuizId} onDone={() => setActiveQuizId(null)} />
        </div>
      ) : enrollments.isPending || exams.isPending || attempts.isPending ? (
        <LoadingList rows={4} />
      ) : enrollments.isError ? (
        <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />
      ) : exams.isError ? (
        <ErrorState error={exams.error} onRetry={() => exams.refetch()} />
      ) : attempts.isError ? (
        <ErrorState error={attempts.error} onRetry={() => attempts.refetch()} />
      ) : courseIds.length === 0 ? (
        <EmptyState
          title="No enrolled courses yet"
          description="Join a course first. Its available assessments will appear here automatically."
          action={
            <Button asChild size="sm">
              <Link to="/academy">Explore courses</Link>
            </Button>
          }
        />
      ) : !exams.data?.length ? (
        <EmptyState
          title="No exams available"
          description="There are no published course assessments for your enrolled courses yet."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="size-4" />
            <span>{exams.data.length} available assessments</span>
          </div>

          <div className="divide-y divide-border rounded-xl border bg-card">
            {exams.data.map((exam) => {
              const history = attemptsByQuiz.get(exam.id) ?? [];
              const best = Math.max(0, ...history.map((item) => item.score));
              const passed = history.some((item) => item.passed);
              const remaining =
                exam.max_attempts === null ? null : Math.max(0, exam.max_attempts - history.length);
              const courseTitle = exam.courses?.title ?? "Academy course";

              return (
                <article key={exam.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{exam.title}</h2>
                      <Badge variant={passed ? "default" : "outline"}>
                        {passed ? "Passed" : history.length ? "Attempted" : "Not started"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{courseTitle}</p>
                    {exam.description ? (
                      <p className="text-sm text-muted-foreground">{exam.description}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Pass mark: {exam.pass_percent}%
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" />
                        {remaining === null ? "Unlimited attempts" : `${remaining} attempts left`}
                      </span>
                      {history.length ? <span>Best score: {best}%</span> : null}
                    </div>
                  </div>

                  <Button
                    className="min-h-11 w-full shrink-0 sm:w-auto"
                    disabled={remaining !== null && remaining <= 0}
                    onClick={() => setActiveQuizId(exam.id)}
                  >
                    {history.length ? "Retake exam" : "Start exam"}
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}