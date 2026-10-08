import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Radio, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useRoles, useSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/meetings/")({
  head: () => ({
    meta: [
      { title: "الاجتماعات — Live meetings" },
      { name: "description", content: "Internal live meetings for members of تجمع الفاو زاخو." },
      { property: "og:title", content: "الاجتماعات — Live meetings" },
      { property: "og:description", content: "Internal live meetings for members of تجمع الفاو زاخو." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeetingsPage,
});

export const STATUS_LABEL: Record<string, string> = { live: "Live now", scheduled: "Scheduled", ended: "Ended" };

function MeetingsPage() {
  const { data: session, isPending } = useSession();
  const { isStaff } = useRoles();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["meetings"],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, description, status, scheduled_at, started_at, ended_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("meetings-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () =>
        qc.invalidateQueries({ queryKey: ["meetings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, qc]);

  if (!isPending && !session) {
    return (
      <AppShell arabicTitle="الاجتماعات" title="Live meetings">
        <EmptyState
          title="Members only"
          description="Meetings are internal. Sign in with your member account to watch."
          action={
            <Button asChild className="mt-2">
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const order = { live: 0, scheduled: 1, ended: 2 } as Record<string, number>;
  const meetings = [...(query.data ?? [])].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

  return (
    <AppShell arabicTitle="الاجتماعات" title="Live meetings" subtitle="Internal broadcasts for signed-in members.">
      {isStaff ? <CreateMeeting /> : null}
      <SectionTitle title="Meetings" />
      {query.isPending ? (
        <LoadingList />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : meetings.length === 0 ? (
        <EmptyState title="No meetings yet" description="When an administrator schedules a meeting it will appear here." />
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => (
            <li key={m.id}>
              <Link
                to="/meetings/$meetingId"
                params={{ meetingId: m.id }}
                className="card-soft flex items-start gap-3 p-4 transition hover:shadow-md"
              >
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  {m.status === "live" ? <Radio className="size-4 text-destructive" /> : <Video className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Badge variant={m.status === "live" ? "destructive" : m.status === "ended" ? "outline" : "secondary"}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </Badge>
                  </span>
                  <span className="mt-1.5 block font-bold leading-snug">{m.title}</span>
                  {m.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{m.description}</span>
                  ) : null}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {m.status === "live"
                      ? `Started ${formatDateTime(m.started_at)}`
                      : m.status === "ended"
                        ? `Ended ${formatDateTime(m.ended_at)}`
                        : m.scheduled_at
                          ? `Scheduled for ${formatDateTime(m.scheduled_at)}`
                          : "Not started yet"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function CreateMeeting() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_meeting", {
        _title: title,
        _description: description,
        _scheduled_at: when ? new Date(when).toISOString() : (null as unknown as string),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      toast.success("Meeting created");
      navigate({ to: "/meetings/$meetingId", params: { meetingId: id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  if (!open)
    return (
      <Button className="mb-5 w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New meeting
      </Button>
    );

  return (
    <form
      className="card-soft mb-5 space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim().length < 3) return toast.error("Title must be at least 3 characters");
        create.mutate();
      }}
    >
      <h3 className="font-bold">New meeting</h3>
      <Input placeholder="Title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Agenda or description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="block text-xs text-muted-foreground">
        Scheduled time (optional)
        <Input type="datetime-local" className="mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending} className="flex-1">
          {create.isPending ? "Creating…" : "Create meeting"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
