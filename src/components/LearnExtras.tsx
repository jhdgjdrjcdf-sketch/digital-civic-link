import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useSession } from "@/lib/auth";

type QuizData = {
  id: string;
  title: string;
  pass_percent: number;
  questions: { id: string; prompt: string; choices: { id: string; label: string }[] }[];
};

function Tabs({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {[
        ["notes", "Notes"],
        ["questions", "Discussion"],
        ["quizzes", "Tests"],
        ["assignments", "Assignments"],
      ].map(([k, l]) => (
        <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k!)} className="shrink-0">
          {l}
        </Button>
      ))}
    </div>
  );
}

export function LearnExtras({ courseId, lessonId }: { courseId: string; lessonId?: string | undefined }) {
  const [tab, setTab] = useState("notes");
  return (
    <section className="space-y-3">
      <Tabs tab={tab} setTab={setTab} />
      {tab === "notes" && lessonId ? <Notes lessonId={lessonId} /> : null}
      {tab === "questions" ? <Questions courseId={courseId} lessonId={lessonId} /> : null}
      {tab === "quizzes" ? <Quizzes courseId={courseId} /> : null}
      {tab === "assignments" ? <Assignments courseId={courseId} /> : null}
    </section>
  );
}

function Notes({ lessonId }: { lessonId: string }) {
  const { data: session } = useSession();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["academy", "note", lessonId, uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_notes").select("body").eq("lesson_id", lessonId).maybeSingle();
      if (error) throw error;
      return data?.body ?? "";
    },
  });
  const [body, setBody] = useState("");
  useEffect(() => setBody(q.data ?? ""), [q.data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lesson_notes")
        .upsert({ user_id: uid!, lesson_id: lessonId, body: body.slice(0, 5000), updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Note saved"),
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <div className="card-soft space-y-2 p-3">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your private notes for this lesson" rows={4} maxLength={5000} />
      <Button size="sm" disabled={save.isPending || q.isPending} onClick={() => save.mutate()}>Save note</Button>
    </div>
  );
}

function Questions({ courseId, lessonId }: { courseId: string; lessonId?: string | undefined }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["academy", "questions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_questions")
        .select("id, body, created_at, is_resolved, profiles(display_name), course_question_replies(id, body, created_at, profiles(display_name))")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ask = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (text.length < 3) throw new Error("Write at least 3 characters.");
      const { error } = await supabase.from("course_questions").insert({ course_id: courseId, lesson_id: lessonId ?? null, user_id: session!.user.id, body: text.slice(0, 2000) });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["academy", "questions", courseId] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const send = useMutation({
    mutationFn: async (questionId: string) => {
      const text = (reply[questionId] ?? "").trim();
      if (!text) throw new Error("Write a reply first.");
      const { error } = await supabase.from("course_question_replies").insert({ question_id: questionId, user_id: session!.user.id, body: text.slice(0, 2000) });
      if (error) throw error;
    },
    onSuccess: (_d, id) => { setReply((r) => ({ ...r, [id]: "" })); qc.invalidateQueries({ queryKey: ["academy", "questions", courseId] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <div className="space-y-3">
      <div className="card-soft space-y-2 p-3">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask a question about this course" rows={3} maxLength={2000} />
        <Button size="sm" disabled={ask.isPending} onClick={() => ask.mutate()}>Post question</Button>
      </div>
      {q.isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : q.isError ? <p className="text-sm text-destructive">{friendlyError(q.error)}</p> : !q.data.length ? (
        <p className="text-sm text-muted-foreground">No questions yet. Be the first to ask.</p>
      ) : (
        q.data.map((item) => (
          <div key={item.id} className="card-soft space-y-2 p-3 text-sm">
            <p className="font-semibold">{(item.profiles as { display_name?: string } | null)?.display_name ?? "Member"}</p>
            <p className="whitespace-pre-line">{item.body}</p>
            {(item.course_question_replies ?? []).map((r) => (
              <div key={r.id} className="rounded-md bg-muted p-2">
                <p className="text-xs font-semibold">{(r.profiles as { display_name?: string } | null)?.display_name ?? "Member"}</p>
                <p className="whitespace-pre-line">{r.body}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="flex-1 rounded-md border border-input bg-background px-2 text-sm" value={reply[item.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [item.id]: e.target.value }))} placeholder="Reply…" maxLength={2000} />
              <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => send.mutate(item.id)}>Reply</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Quizzes({ courseId }: { courseId: string }) {
  const q = useQuery({
    queryKey: ["academy", "quizzes", courseId],
    queryFn: async () => {
      const [quizzes, attempts] = await Promise.all([
        supabase.from("quizzes").select("id, title, pass_percent, max_attempts").eq("course_id", courseId),
        supabase.from("quiz_attempts").select("quiz_id, score, passed"),
      ]);
      if (quizzes.error) throw quizzes.error;
      return { quizzes: quizzes.data ?? [], attempts: attempts.data ?? [] };
    },
  });
  const [open, setOpen] = useState<string | null>(null);
  if (q.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{friendlyError(q.error)}</p>;
  if (!q.data.quizzes.length) return <p className="text-sm text-muted-foreground">This course has no tests.</p>;
  return (
    <div className="space-y-3">
      {q.data.quizzes.map((quiz) => {
        const mine = q.data.attempts.filter((a) => a.quiz_id === quiz.id);
        const best = Math.max(0, ...mine.map((a) => a.score));
        const passed = mine.some((a) => a.passed);
        const left = quiz.max_attempts ? quiz.max_attempts - mine.length : null;
        return (
          <div key={quiz.id} className="card-soft space-y-2 p-3 text-sm">
            <p className="font-semibold">{quiz.title}</p>
            <p className="text-xs text-muted-foreground">
              Pass mark {quiz.pass_percent}% · {passed ? `Passed (best ${best}%)` : mine.length ? `Not passed yet (best ${best}%)` : "Not attempted"}
              {left !== null ? ` · ${Math.max(0, left)} attempts left` : ""}
            </p>
            {open === quiz.id ? (
              <QuizRunner quizId={quiz.id} onDone={() => { setOpen(null); q.refetch(); }} />
            ) : (
              <Button size="sm" disabled={left !== null && left <= 0} onClick={() => setOpen(quiz.id)}>
                {mine.length ? "Retake test" : "Start test"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuizRunner({ quizId, onDone }: { quizId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["academy", "quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quiz", { _quiz_id: quizId });
      if (error) throw error;
      return data as unknown as QuizData;
    },
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("submit_quiz", { _quiz_id: quizId, _answers: answers });
      if (error) throw error;
      return data as { score: number; passed: boolean; pass_percent: number };
    },
    onSuccess: (r) => {
      if (r.passed) toast.success(`Passed with ${r.score}%`);
      else toast.error(`Score ${r.score}%. You need ${r.pass_percent}% — try again.`);
      qc.invalidateQueries({ queryKey: ["academy"] });
      onDone();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  if (q.isPending) return <p className="text-sm text-muted-foreground">Loading test…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{friendlyError(q.error)}</p>;
  const all = q.data.questions.every((x) => answers[x.id]);
  return (
    <div className="space-y-3">
      {q.data.questions.map((question, i) => (
        <fieldset key={question.id} className="space-y-1">
          <legend className="font-medium">{i + 1}. {question.prompt}</legend>
          {question.choices.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="radio" name={question.id} checked={answers[question.id] === c.id} onChange={() => setAnswers((a) => ({ ...a, [question.id]: c.id }))} />
              {c.label}
            </label>
          ))}
        </fieldset>
      ))}
      <Button className="w-full" disabled={!all || submit.isPending} onClick={() => submit.mutate()}>
        {submit.isPending ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}

function Assignments({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [text, setText] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["academy", "assignments", courseId],
    queryFn: async () => {
      const [a, s] = await Promise.all([
        supabase.from("course_assignments").select("id, title, instructions, is_required").eq("course_id", courseId).order("position"),
        supabase.from("assignment_submissions").select("assignment_id, body, status, score, feedback"),
      ]);
      if (a.error) throw a.error;
      return { items: a.data ?? [], subs: s.data ?? [] };
    },
  });
  const submit = useMutation({
    mutationFn: async (assignmentId: string) => {
      const body = (text[assignmentId] ?? "").trim();
      if (body.length < 3) throw new Error("Write your answer first.");
      const { error } = await supabase.from("assignment_submissions").upsert(
        { assignment_id: assignmentId, user_id: session!.user.id, body: body.slice(0, 10000), status: "submitted" },
        { onConflict: "assignment_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment submitted"); qc.invalidateQueries({ queryKey: ["academy"] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  if (q.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{friendlyError(q.error)}</p>;
  if (!q.data.items.length) return <p className="text-sm text-muted-foreground">This course has no assignments.</p>;
  return (
    <div className="space-y-3">
      {q.data.items.map((a) => {
        const sub = q.data.subs.find((s) => s.assignment_id === a.id);
        return (
          <div key={a.id} className="card-soft space-y-2 p-3 text-sm">
            <p className="font-semibold">{a.title}{a.is_required ? " · Required" : ""}</p>
            <p className="whitespace-pre-line text-muted-foreground">{a.instructions}</p>
            {sub ? (
              <p className="text-xs">
                Status: <b>{sub.status === "approved" ? "Approved" : sub.status === "changes_requested" ? "Changes requested" : "Pending review"}</b>
                {sub.score != null ? ` · ${sub.score}/100` : ""}{sub.feedback ? ` · ${sub.feedback}` : ""}
              </p>
            ) : null}
            {sub?.status !== "approved" ? (
              <>
                <Textarea rows={4} defaultValue={sub?.body ?? ""} onChange={(e) => setText((t) => ({ ...t, [a.id]: e.target.value }))} placeholder="Write your answer" maxLength={10000} />
                <Button size="sm" disabled={submit.isPending} onClick={() => submit.mutate(a.id)}>{sub ? "Resubmit" : "Submit"}</Button>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
