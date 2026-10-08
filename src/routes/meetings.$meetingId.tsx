import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Crown,
  Eye,
  Hand,
  Mic,
  MicOff,
  Radio,
  Shield,
  UserMinus,
  UserX,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getMeetingToken, meetingAction } from "@/lib/meetings.functions";

const MeetingStage = lazy(() => import("@/components/MeetingStage"));

export const Route = createFileRoute("/meetings/$meetingId")({
  head: () => ({
    meta: [
      { title: "Meeting room — الاجتماعات" },
      { name: "description", content: "Live internal meeting room for members." },
      { property: "og:title", content: "Meeting room — الاجتماعات" },
      { property: "og:description", content: "Live internal meeting room for members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeetingRoom,
});

type Role = "creator" | "admin" | "speaker" | "viewer";
const ROLE_META: Record<Role, { label: string; icon: typeof Crown; desc: string }> = {
  creator: { label: "Creator", icon: Crown, desc: "Starts and ends the meeting, assigns admins" },
  admin: { label: "Admin", icon: Shield, desc: "Manages requests and speakers" },
  speaker: { label: "Speaker", icon: Mic, desc: "Can talk and share camera" },
  viewer: { label: "Viewer", icon: Eye, desc: "Watches and can request to speak" },
};

function MeetingRoom() {
  const { meetingId } = Route.useParams();
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const runAction = useServerFn(meetingAction);
  const fetchToken = useServerFn(getMeetingToken);

  const meeting = useQuery({
    queryKey: ["meeting", meetingId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").eq("id", meetingId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const join = useQuery({
    queryKey: ["meeting", meetingId, "join", userId],
    enabled: Boolean(userId && meeting.data),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("join_meeting", { _meeting_id: meetingId });
      if (error) throw error;
      return data;
    },
  });

  const participants = useQuery({
    queryKey: ["meeting", meetingId, "participants"],
    enabled: Boolean(userId && join.isSuccess),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_participants")
        .select("user_id, role, is_muted, is_removed, display_name, joined_at")
        .eq("meeting_id", meetingId)
        .order("joined_at");
      if (error) throw error;
      return data;
    },
  });

  const requests = useQuery({
    queryKey: ["meeting", meetingId, "requests"],
    enabled: Boolean(userId && join.isSuccess),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_speak_requests")
        .select("id, user_id, display_name, status, created_at")
        .eq("meeting_id", meetingId)
        .eq("status", "pending")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    const ch = supabase
      .channel(`meeting-${meetingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` }, refresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_participants", filter: `meeting_id=eq.${meetingId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_speak_requests", filter: `meeting_id=eq.${meetingId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, meetingId, qc]);

  const me = participants.data?.find((p) => p.user_id === userId);
  const myRole = (me?.role ?? "viewer") as Role;
  const isManager = myRole === "creator" || myRole === "admin";
  const isCreator = myRole === "creator";
  const live = meeting.data?.status === "live";
  const removed = Boolean(me?.is_removed);

  const token = useQuery({
    queryKey: ["meeting", meetingId, "token", myRole, me?.is_muted, meeting.data?.status],
    enabled: Boolean(live && me && !removed),
    staleTime: 60 * 60_000,
    retry: 1,
    queryFn: () => fetchToken({ data: { meetingId } }),
  });

  const act = useMutation({
    mutationFn: (input: Record<string, unknown>) => runAction({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", meetingId] }),
    onError: (e) => toast.error(friendlyError(e)),
  });

  const requestSpeak = useMutation({
    mutationFn: async (cancel: boolean) => {
      const { error } = cancel
        ? await supabase.rpc("cancel_speak_request", { _meeting_id: meetingId })
        : await supabase.rpc("request_to_speak", { _meeting_id: meetingId });
      if (error) throw error;
    },
    onSuccess: (_d, cancel) => {
      toast.success(cancel ? "Request withdrawn" : "Request sent to the meeting managers");
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  if (!sessionPending && !session) {
    return (
      <AppShell arabicTitle="الاجتماعات" title="Meeting room">
        <EmptyState
          title="Members only"
          description="Sign in with your member account to watch this meeting."
          action={
            <Button asChild className="mt-2">
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  if (meeting.isPending || (meeting.data && join.isPending)) {
    return (
      <AppShell arabicTitle="الاجتماعات">
        <LoadingList rows={2} />
      </AppShell>
    );
  }
  if (meeting.isError) {
    return (
      <AppShell arabicTitle="الاجتماعات">
        <ErrorState error={meeting.error} onRetry={() => meeting.refetch()} />
      </AppShell>
    );
  }
  if (!meeting.data) {
    return (
      <AppShell arabicTitle="الاجتماعات">
        <EmptyState
          title="Meeting not found"
          description="It may have been removed or the link is incorrect."
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link to="/meetings">Back to meetings</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }
  if (join.isError || removed) {
    return (
      <AppShell arabicTitle="الاجتماعات">
        <EmptyState title="You can't join this meeting" description={removed ? "You were removed from this meeting by its managers." : friendlyError(join.error)} />
      </AppShell>
    );
  }

  const m = meeting.data;
  const active = (participants.data ?? []).filter((p) => !p.is_removed);
  const speakers = active.filter((p) => p.role === "speaker");
  const managers = active.filter((p) => p.role === "creator" || p.role === "admin");
  const viewers = active.filter((p) => p.role === "viewer");
  const full = speakers.length >= m.max_speakers;
  const myPending = requests.data?.some((r) => r.user_id === userId);
  const RoleIcon = ROLE_META[myRole].icon;

  return (
    <AppShell arabicTitle="الاجتماعات" title={m.title}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={live ? "destructive" : m.status === "ended" ? "outline" : "secondary"}>
          {live ? (
            <>
              <Radio className="size-3" /> Live
            </>
          ) : m.status === "ended" ? (
            "Ended"
          ) : (
            "Not started"
          )}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <RoleIcon className="size-3 text-accent" /> You are: {ROLE_META[myRole].label}
        </Badge>
        <Badge variant="outline">
          Speakers {speakers.length}/{m.max_speakers}
        </Badge>
      </div>

      {m.description ? <p className="mb-4 text-sm text-muted-foreground">{m.description}</p> : null}

      {/* Stage */}
      {live ? (
        token.isPending ? (
          <Skeleton className="aspect-video w-full rounded-2xl" />
        ) : token.isError ? (
          <ErrorState error={token.error} onRetry={() => token.refetch()} />
        ) : token.data && !token.data.ok ? (
          <div className="surface-navy flex aspect-video w-full items-center justify-center rounded-2xl p-6 text-center text-sm">
            {token.data.reason === "not_configured"
              ? "Live video is not connected yet. An administrator needs to finish the LiveKit setup."
              : "The meeting is not live."}
          </div>
        ) : token.data ? (
          <ClientOnly fallback={<Skeleton className="aspect-video w-full rounded-2xl" />}>
            <Suspense fallback={<Skeleton className="aspect-video w-full rounded-2xl" />}>
              <MeetingStage
                key={token.data.token}
                token={token.data.token}
                serverUrl={token.data.serverUrl}
                canPublish={token.data.canPublish}
              />
            </Suspense>
          </ClientOnly>
        ) : null
      ) : (
        <div className="surface-navy flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center">
          <Radio className="size-8 text-accent" />
          <p className="font-semibold">{m.status === "ended" ? "This meeting has ended" : "Waiting for the meeting to start"}</p>
          <p className="text-xs text-primary-foreground/70">
            {m.status === "ended"
              ? `Ended ${formatDateTime(m.ended_at)}`
              : m.scheduled_at
                ? `Scheduled for ${formatDateTime(m.scheduled_at)}`
                : "The page will update automatically."}
          </p>
        </div>
      )}

      {/* My controls */}
      <div className="mt-4 space-y-2">
        {isManager && m.status !== "ended" ? (
          <div className="flex gap-2">
            {!live ? (
              <Button className="flex-1" disabled={act.isPending} onClick={() => act.mutate({ action: "start", meetingId })}>
                <Radio className="size-4" /> Start meeting
              </Button>
            ) : null}
            <Button
              variant="destructive"
              className="flex-1"
              disabled={act.isPending}
              onClick={() => {
                if (confirm("End this meeting for everyone?")) act.mutate({ action: "end", meetingId });
              }}
            >
              End meeting
            </Button>
          </div>
        ) : null}

        {myRole === "viewer" && live ? (
          myPending ? (
            <Button variant="outline" className="w-full" disabled={requestSpeak.isPending} onClick={() => requestSpeak.mutate(true)}>
              <Hand className="size-4" /> Request pending — tap to withdraw
            </Button>
          ) : full ? (
            <Button variant="outline" className="w-full" disabled>
              <Hand className="size-4" /> Requests paused — {m.max_speakers} speakers reached
            </Button>
          ) : (
            <Button className="w-full" disabled={requestSpeak.isPending} onClick={() => requestSpeak.mutate(false)}>
              <Hand className="size-4" /> Request to speak
            </Button>
          )
        ) : null}

        {myRole === "speaker" && me?.is_muted ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-center text-xs text-destructive">
            You were muted by a meeting manager.
          </p>
        ) : null}
      </div>

      {/* Requests */}
      {isManager && live ? (
        <section className="mt-6">
          <SectionTitle title={`Speak requests (${requests.data?.length ?? 0})`} />
          {full ? (
            <p className="mb-2 text-xs text-muted-foreground">
              The speaker limit is reached. Move a speaker back to viewer to accept new requests.
            </p>
          ) : null}
          {(requests.data ?? []).length === 0 ? (
            <p className="card-soft p-4 text-center text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <ul className="space-y-2">
              {requests.data!.map((r) => (
                <li key={r.id} className="card-soft flex items-center gap-3 p-3">
                  <Hand className="size-4 text-accent" />
                  <span className="flex-1 text-sm font-semibold">{r.display_name || "Member"}</span>
                  <Button
                    size="sm"
                    disabled={act.isPending || full}
                    onClick={() => act.mutate({ action: "respond", meetingId, requestId: r.id, accept: true })}
                  >
                    <Check className="size-4" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => act.mutate({ action: "respond", meetingId, requestId: r.id, accept: false })}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* People */}
      <section className="mt-6">
        <SectionTitle title={`Participants (${active.length})`} />
        {participants.isPending ? (
          <LoadingList rows={2} />
        ) : (
          <div className="space-y-4">
            {[
              { label: "Managers", list: managers },
              { label: `Speakers ${speakers.length}/${m.max_speakers}`, list: speakers },
              { label: "Viewers", list: viewers },
            ].map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</p>
                {group.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nobody yet.</p>
                ) : (
                  <ul className="card-soft divide-y divide-border">
                    {group.list.map((p) => {
                      const role = p.role as Role;
                      const Icon = ROLE_META[role].icon;
                      const canModerate =
                        isManager && p.user_id !== userId && role !== "creator" && (role !== "admin" || isCreator);
                      return (
                        <li key={p.user_id} className="flex flex-wrap items-center gap-2 p-3">
                          <Icon className="size-4 text-accent" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {p.display_name || "Member"}
                            {p.user_id === userId ? <span className="text-muted-foreground"> (you)</span> : null}
                          </span>
                          {p.is_muted ? <MicOff className="size-4 text-destructive" aria-label="Muted" /> : null}
                          {canModerate ? (
                            <span className="flex gap-1">
                              {role === "speaker" || role === "admin" ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={p.is_muted ? "Unmute" : "Mute"}
                                  disabled={act.isPending}
                                  onClick={() =>
                                    act.mutate({ action: p.is_muted ? "unmute" : "mute", meetingId, userId: p.user_id })
                                  }
                                >
                                  {p.is_muted ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                                </Button>
                              ) : null}
                              {role === "speaker" ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Move back to viewers"
                                  disabled={act.isPending}
                                  onClick={() => act.mutate({ action: "to_viewer", meetingId, userId: p.user_id })}
                                >
                                  <UserMinus className="size-4" />
                                </Button>
                              ) : null}
                              {isCreator && role !== "speaker" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={act.isPending}
                                  onClick={() =>
                                    act.mutate({ action: "set_admin", meetingId, userId: p.user_id, isAdmin: role !== "admin" })
                                  }
                                >
                                  <Shield className="size-4" /> {role === "admin" ? "Remove admin" : "Make admin"}
                                </Button>
                              ) : null}
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Remove from meeting"
                                className="text-destructive"
                                disabled={act.isPending}
                                onClick={() => {
                                  if (confirm(`Remove ${p.display_name || "this member"} from the meeting?`))
                                    act.mutate({ action: "remove", meetingId, userId: p.user_id });
                                }}
                              >
                                <UserX className="size-4" />
                              </Button>
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Roles legend */}
      <section className="mt-6">
        <SectionTitle title="Roles in this meeting" />
        <ul className="grid grid-cols-2 gap-2">
          {(Object.keys(ROLE_META) as Role[]).map((r) => {
            const Icon = ROLE_META[r].icon;
            return (
              <li key={r} className="card-soft p-3">
                <Icon className="size-4 text-accent" />
                <p className="mt-1 text-sm font-bold">{ROLE_META[r].label}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{ROLE_META[r].desc}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
