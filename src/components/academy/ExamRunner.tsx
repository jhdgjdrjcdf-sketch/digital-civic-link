import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/auth";

type QuizPayload = {
  id: string;
  title: string;
  pass_percent: number;
  questions: {
    id: string;
    prompt: string;
    choices: { id: string; label: string }[];
  }[];
};

type ExamResult = {
  attempt_id?: string;
  score: number;
  passed: boolean;
  pass_percent: number;
  correct_count: number;
  total: number;
  duplicate?: boolean;
};

function createSubmissionKey() {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("A secure random generator is required to submit an exam.");
  }
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function ExamRunner({
  quizId,
  onDone,
}: {
  quizId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [submissionKey] = useState(createSubmissionKey);

  const quiz = useQuery({
    queryKey: ["academy", "exam", quizId],
    queryFn: async (): Promise<QuizPayload> => {
      const { data, error } = await supabase.rpc("get_quiz", { _quiz_id: quizId });
      if (error) throw error;
      if (!data) throw new Error("This exam is not available.");
      return data as unknown as QuizPayload;
    },
  });

  const submit = useMutation({
    mutationFn: async (): Promise<ExamResult> => {
      const { data, error } = await supabase.functions.invoke("exam-submit", {
        body: {
          quiz_id: quizId,
          submission_key: submissionKey,
          answers,
        },
      });
      if (error) throw error;
      if (!data || typeof data.score !== "number") {
        throw new Error("The exam service returned an invalid result.");
      }
      return data as ExamResult;
    },
    onMutate: () => setLocked(true),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["academy"] });
      toast.success(data.passed ? `Passed with ${data.score}%` : `Result saved: ${data.score}%`);
    },
    onError: (error) => {
      toast.error(friendlyError(error));
    },
  });

  if (quiz.isPending) {
    return (
      <div className="card-soft flex items-center gap-2 p-4 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-4 animate-spin" />
        Loading exam…
      </div>
    );
  }

  if (quiz.isError) {
    return (
      <div className="card-soft space-y-3 p-4" role="alert">
        <p className="text-sm text-destructive">{friendlyError(quiz.error)}</p>
        <Button size="sm" variant="outline" onClick={() => quiz.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const questions = quiz.data.questions ?? [];
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  if (result) {
    return (
      <section className="card-soft space-y-4 p-4 sm:p-6" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Exam result</h3>
          <Badge variant={result.passed ? "default" : "secondary"}>
            {result.passed ? "Passed" : "Not passed"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Final score</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{result.score}%</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Correct answers</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {result.correct_count}/{result.total}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Required to pass</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{result.pass_percent}%</p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          {result.passed ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
          )}
          <p>
            {result.passed
              ? "Your result has been saved to your learning record."
              : "Your result has been saved. Review the course material before your next attempt."}
          </p>
        </div>

        <Button className="w-full sm:w-auto" onClick={onDone}>
          Return to exam center
        </Button>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card-soft space-y-2 p-4">
        <h3 className="font-semibold">No questions available</h3>
        <p className="text-sm text-muted-foreground">
          Ask the instructor to review this exam before it is opened.
        </p>
        <Button size="sm" variant="outline" onClick={onDone}>Back</Button>
      </div>
    );
  }

  return (
    <section className="card-soft space-y-5 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{quiz.data.title}</h3>
          <Badge variant="outline">{questions.length} questions</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => (
          <fieldset key={question.id} className="space-y-3 border-b border-border pb-5 last:border-0 last:pb-0">
            <legend className="mb-3 font-semibold leading-relaxed">
              <span className="me-2 text-xs font-bold text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              {question.prompt}
            </legend>

            <div className="grid gap-2">
              {question.choices.map((choice) => {
                const selected = answers[question.id] === choice.id;
                return (
                  <label
                    key={choice.id}
                    className={[
                      "flex min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60",
                      locked ? "cursor-not-allowed opacity-75" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={choice.id}
                      checked={selected}
                      disabled={locked || submit.isPending}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span>{choice.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {submit.isError ? (
        <p className="text-sm text-destructive" role="alert">
          The submission could not be confirmed. Retry below; the same submission ID is reused to prevent duplicate attempts.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Your answers are graded on the server by the DCL C++ Exam Engine.
        </p>
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={!allAnswered || submit.isPending || Boolean(result)}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? "Submitting…" : submit.isError ? "Retry submission" : "Submit exam"}
        </Button>
      </div>
    </section>
  );
}