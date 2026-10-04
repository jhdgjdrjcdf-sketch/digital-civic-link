import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useRoles } from "@/lib/auth";

export const Route = createFileRoute("/academy/instructor")({
  head: () => ({
    meta: [
      { title: "Instructor dashboard — أكاديمية القيادة" },
      { name: "description", content: "Manage your students, grade assignments and track course results." },
      { property: "og:title", content: "Instructor dashboard — أكاديمية القيادة" },
      { property: "og:description", content: "Manage your students, grade assignments and track course results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstructorPage,
});

function InstructorPage() {
  const { can, isPending, isSignedIn } = useRoles();
  const allowed = can("instructor") || can("academy_manager");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["academy", "instructor"],
    enabled: allowed,
    queryFn: async () => {
      const [enr, subs, attempts] = await Promise.all([
        supabase.from("course_enrollments").select("course_id, status, courses(title)"),
        supabase.from("assignment_submissions").select("id, body, status, score, submitted_at, profiles(display_name), course_assignments(title)").eq("status", "submitted").order("submitted_at"),
        supabase.from("quiz_attempts").select("score, passed"),
      ]);
      if (enr.error) throw enr.error;
      if (subs.error) throw subs.error;
      return { enr: enr.data ?? [], subs: subs.data ?? [], attempts: attempts.data ?? [] };
    },
  });
  const [scores, setScores] = useState<Record<string, string>>({});
  const grade = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const score = Math.max(0, Math.min(100, Number(scores[id] ?? 0)));
      const { error } = await supabase.rpc("grade_assignment", { _submission_id: id, _status: status, _score: score, _feedback: "" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["academy"] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const byCourse = new Map<string, { title: string; total: number; done: number }>();
  for (const e of q.data?.enr ?? []) {
    const row = byCourse.get(e.course_id) ?? { title: (e.courses as { title?: string } | null)?.title ?? "Course", total: 0, done: 0 };
    row.total++;
    if (e.status === "completed") row.done++;
    byCourse.set(e.course_id, row);
  }

  return (
    <AppShell arabicTitle="أكاديمية القيادة" title="Instructor dashboard">
      {isPending ? <LoadingList rows={3} /> : !isSignedIn ? (
        <EmptyState title="Sign in required" description="Sign in with an instructor account." action={<Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>} />
      ) : !allowed ? (
        <EmptyState title="No access" description="This dashboard is for instructors and academy managers." />
      ) : q.isPending ? <LoadingList rows={3} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Students" value={q.data.enr.length} />
            <Stat label="Completed" value={q.data.enr.filter((e) => e.status === "completed").length} />
            <Stat label="Pass rate" value={`${q.data.attempts.length ? Math.round((q.data.attempts.filter((a) => a.passed).length / q.data.attempts.length) * 100) : 0}%`} />
          </div>
          <section className="card-soft divide-y divide-border">
            {[...byCourse.entries()].map(([id, c]) => (
              <div key={id} className="flex justify-between p-3 text-sm"><span>{c.title}</span><span className="text-muted-foreground">{c.done}/{c.total} completed</span></div>
            ))}
            {!byCourse.size ? <p className="p-3 text-sm text-muted-foreground">No students yet.</p> : null}
          </section>
          <h2 className="font-bold">Assignments to review</h2>
          {!q.data.subs.length ? <p className="text-sm text-muted-foreground">Nothing waiting for review.</p> : q.data.subs.map((s) => (
            <div key={s.id} className="card-soft space-y-2 p-3 text-sm">
              <p className="font-semibold">{(s.course_assignments as { title?: string } | null)?.title} · {(s.profiles as { display_name?: string } | null)?.display_name ?? "Member"}</p>
              <p className="whitespace-pre-line">{s.body}</p>
              <div className="flex gap-2">
                <input type="number" min={0} max={100} placeholder="Score" className="w-20 rounded-md border border-input bg-background px-2" value={scores[s.id] ?? ""} onChange={(e) => setScores((x) => ({ ...x, [s.id]: e.target.value }))} />
                <Button size="sm" disabled={grade.isPending} onClick={() => grade.mutate({ id: s.id, status: "approved" })}>Approve</Button>
                <Button size="sm" variant="outline" disabled={grade.isPending} onClick={() => grade.mutate({ id: s.id, status: "changes_requested" })}>Request changes</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="card-soft p-3"><p className="text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
