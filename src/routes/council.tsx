import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PollsList } from "@/components/PollsList";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useRoles, useSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/council")({
  head: () => ({
    meta: [
      { title: "مجلس شباب التجمع — Youth Council" },
      { name: "description", content: "A mini youth parliament: motions, support/oppose votes, interventions and surveys." },
      { property: "og:title", content: "مجلس شباب التجمع — Youth Council" },
      { property: "og:description", content: "A mini youth parliament: motions, support/oppose votes, interventions and surveys." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CouncilPage,
});

type Motion = { id: string; title: string; body: string; category: string; status: string; created_at: string };

function CouncilPage() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["council", "motions"],
    queryFn: async (): Promise<Motion[]> => {
      const { data, error } = await supabase
        .from("discussions")
        .select("id, title, body, category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell arabicTitle="مجلس شباب التجمع" title="Youth Council">
      <Tabs defaultValue="motions">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="motions">Parliament</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
        </TabsList>
        <TabsContent value="motions" className="space-y-3">
          {session ? (
            <NewMotion />
          ) : (
            <div className="card-soft flex items-center justify-between p-3 text-sm">
              <span>Sign in to propose motions and vote.</span>
              <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
            </div>
          )}
          {query.isPending ? (
            <LoadingList rows={3} />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : !query.data?.length ? (
            <EmptyState title="No motions yet" description="Be the first to propose a motion to the council." />
          ) : (
            query.data.map((m) => <MotionCard key={m.id} motion={m} signedIn={Boolean(session)} />)
          )}
        </TabsContent>
        <TabsContent value="surveys">
          <PollsList />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function NewMotion() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const token = useRef(crypto.randomUUID());
  const create = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const { error } = await supabase.from("discussions").insert({
        title: title.trim(),
        body: body.trim(),
        author_id: s.session!.user.id,
        client_token: token.current,
      });
      if (error && !/duplicate/i.test(error.message)) throw error;
    },
    onSuccess: () => {
      token.current = crypto.randomUUID();
      setTitle("");
      setBody("");
      setOpen(false);
      toast.success("Motion submitted.");
      qc.invalidateQueries({ queryKey: ["council"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  if (!open) return <Button className="w-full" onClick={() => setOpen(true)}>Propose a motion</Button>;
  const valid = title.trim().length >= 5 && title.length <= 150 && body.trim().length >= 10 && body.length <= 3000;
  return (
    <div className="card-soft space-y-2 p-3">
      <Input placeholder="Motion title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Describe the motion" value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button className="flex-1" disabled={!valid || create.isPending} onClick={() => create.mutate()}>Submit</Button>
      </div>
    </div>
  );
}

function MotionCard({ motion, signedIn }: { motion: Motion; signedIn: boolean }) {
  const qc = useQueryClient();
  const { can } = useRoles();
  const [showComments, setShowComments] = useState(false);
  const stats = useQuery({
    queryKey: ["council", "stats", motion.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discussion_stats", { _discussion_id: motion.id });
      if (error) throw error;
      return data?.[0] ?? { supports: 0, opposes: 0, comments: 0 };
    },
  });
  const react = useMutation({
    mutationFn: async (reaction: "support" | "oppose") => {
      const { error } = await supabase.rpc("react_to_discussion", { _discussion_id: motion.id, _reaction: reaction });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["council", "stats", motion.id] }),
    onError: (e) => toast.error(friendlyError(e)),
  });
  const lock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("discussions")
        .update({ status: motion.status === "open" ? "locked" : "open" })
        .eq("id", motion.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["council", "motions"] }),
    onError: (e) => toast.error(friendlyError(e)),
  });
  const s = stats.data;
  const locked = motion.status !== "open";
  return (
    <article className="card-soft space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{motion.category}</Badge>
        <span className="text-xs text-muted-foreground">{formatDateTime(motion.created_at)}</span>
      </div>
      <h3 className="font-bold">{motion.title}</h3>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{motion.body}</p>
      {locked ? <Badge variant="outline">Voting closed</Badge> : null}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" disabled={!signedIn || locked || react.isPending} onClick={() => react.mutate("support")}>
          <ThumbsUp className="size-4" /> Support {s ? `(${s.supports})` : ""}
        </Button>
        <Button size="sm" variant="outline" className="flex-1" disabled={!signedIn || locked || react.isPending} onClick={() => react.mutate("oppose")}>
          <ThumbsDown className="size-4" /> Oppose {s ? `(${s.opposes})` : ""}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="flex-1" onClick={() => setShowComments((v) => !v)}>
          <MessageSquare className="size-4" /> Interventions {s ? `(${s.comments})` : ""}
        </Button>
        {can("moderator") ? (
          <Button size="sm" variant="ghost" disabled={lock.isPending} onClick={() => lock.mutate()}>
            {locked ? "Reopen" : "Close voting"}
          </Button>
        ) : null}
      </div>
      {showComments ? <Comments discussionId={motion.id} signedIn={signedIn} locked={locked} /> : null}
    </article>
  );
}

function Comments({ discussionId, signedIn, locked }: { discussionId: string; signedIn: boolean; locked: boolean }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const token = useRef(crypto.randomUUID());
  const query = useQuery({
    queryKey: ["council", "comments", discussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_comments")
        .select("id, body, created_at")
        .eq("discussion_id", discussionId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const { error } = await supabase.from("discussion_comments").insert({
        discussion_id: discussionId,
        body: body.trim(),
        user_id: s.session!.user.id,
        client_token: token.current,
      });
      if (error && !/duplicate/i.test(error.message)) throw error;
    },
    onSuccess: () => {
      token.current = crypto.randomUUID();
      setBody("");
      qc.invalidateQueries({ queryKey: ["council"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <div className="space-y-2 border-t border-border pt-2">
      {query.isPending ? (
        <LoadingList rows={1} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <p className="text-xs text-muted-foreground">No interventions yet.</p>
      ) : (
        query.data.map((c) => (
          <div key={c.id} className="rounded-lg bg-muted p-2 text-sm">
            <p className="whitespace-pre-line">{c.body}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(c.created_at)}</p>
          </div>
        ))
      )}
      {signedIn && !locked ? (
        <div className="flex gap-2">
          <Textarea rows={2} maxLength={1000} placeholder="Write an intervention…" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button disabled={body.trim().length < 2 || add.isPending} onClick={() => add.mutate()}>Post</Button>
        </div>
      ) : null}
    </div>
  );
}
