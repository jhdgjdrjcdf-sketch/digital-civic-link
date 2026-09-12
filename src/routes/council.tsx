import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/States";
import { PollsList } from "@/components/PollsList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useSession } from "@/lib/auth";
import { formatDate, newIdempotencyKey, paragraphs } from "@/lib/format";

export const Route = createFileRoute("/council")({
  head: () => ({
    meta: [
      { title: "مجلس شباب التجمع — Youth Council" },
      {
        name: "description",
        content: "Member debates, surveys and votes: support, oppose or add an intervention.",
      },
      { property: "og:title", content: "مجلس شباب التجمع — Youth Council" },
      {
        property: "og:description",
        content: "Debate, vote and comment on the issues facing the movement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CouncilPage,
});

type Discussion = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  created_at: string;
};

function CouncilPage() {
  return (
    <AppShell
      arabicTitle="مجلس شباب التجمع"
      title="Youth Council"
      subtitle="A small parliament for members: debate a motion, vote for or against, and add your intervention."
    >
      <Tabs defaultValue="debates">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="debates">Debates</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
        </TabsList>
        <TabsContent value="debates">
          <Debates />
        </TabsContent>
        <TabsContent value="surveys">
          <SectionTitle title="Open surveys and consultations" />
          <PollsList />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Debates() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["discussions", "list"],
    queryFn: async (): Promise<Discussion[]> => {
      const { data, error } = await supabase
        .from("discussions")
        .select("id, title, body, category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Discussion[];
    },
  });

  return (
    <div className="space-y-4">
      {session ? (
        <NewDiscussion />
      ) : (
        <div className="card-soft flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Sign in to table a motion, vote and comment.
          </p>
          <Link to="/auth">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      )}

      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          title="No motions yet"
          description="The first motion tabled by a member will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {(query.data ?? []).map((discussion) => (
            <li key={discussion.id}>
              <DiscussionCard discussion={discussion} signedIn={Boolean(session)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewDiscussion() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");

  const create = useMutation({
    mutationFn: async () => {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (cleanTitle.length < 6) throw new Error("Give your motion a clearer title.");
      if (cleanBody.length < 20) throw new Error("Please explain your motion in a little more detail.");
      const { error } = await supabase.from("discussions").insert({
        title: cleanTitle.slice(0, 160),
        body: cleanBody.slice(0, 4000),
        category: category.trim().slice(0, 40) || "General",
        author_id: session!.user.id,
        client_token: newIdempotencyKey(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your motion has been tabled.");
      setTitle("");
      setBody("");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["discussions"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Table a new motion
      </Button>
    );
  }

  return (
    <form
      className="card-soft space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!create.isPending) create.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="motion-title">Title</Label>
        <Input
          id="motion-title"
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motion-category">Category</Label>
        <Input
          id="motion-category"
          value={category}
          maxLength={40}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motion-body">Your proposal</Label>
        <Textarea
          id="motion-body"
          value={body}
          maxLength={4000}
          rows={5}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Submitting…" : "Submit motion"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DiscussionCard({
  discussion,
  signedIn,
}: {
  discussion: Discussion;
  signedIn: boolean;
}) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const stats = useQuery({
    queryKey: ["discussion-stats", discussion.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discussion_stats", {
        _discussion_id: discussion.id,
      });
      if (error) throw error;
      return (data ?? [])[0] ?? { supports: 0, opposes: 0, comments: 0 };
    },
  });

  const myReaction = useQuery({
    queryKey: ["discussion-reaction", discussion.id, signedIn],
    enabled: signedIn,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_reactions")
        .select("reaction")
        .eq("discussion_id", discussion.id)
        .maybeSingle();
      if (error) throw error;
      return data?.reaction ?? null;
    },
  });

  const comments = useQuery({
    queryKey: ["discussion-comments", discussion.id],
    enabled: showComments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_comments")
        .select("id, body, created_at, user_id")
        .eq("discussion_id", discussion.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const react = useMutation({
    mutationFn: async (reaction: "support" | "oppose") => {
      const { error } = await supabase.rpc("react_to_discussion", {
        _discussion_id: discussion.id,
        _reaction: reaction,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["discussion-stats", discussion.id] });
      void queryClient.invalidateQueries({ queryKey: ["discussion-reaction", discussion.id] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const value = comment.trim();
      if (value.length < 2) throw new Error("Please write your intervention first.");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Please sign in to continue.");
      const { error } = await supabase.from("discussion_comments").insert({
        discussion_id: discussion.id,
        user_id: userData.user.id,
        body: value.slice(0, 2000),
        client_token: newIdempotencyKey(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      toast.success("Your intervention has been added.");
      void queryClient.invalidateQueries({ queryKey: ["discussion-comments", discussion.id] });
      void queryClient.invalidateQueries({ queryKey: ["discussion-stats", discussion.id] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const locked = discussion.status !== "open";
  const supports = Number(stats.data?.supports ?? 0);
  const opposes = Number(stats.data?.opposes ?? 0);
  const total = supports + opposes;

  return (
    <article className="card-soft space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">{discussion.category}</Badge>
        <span className="text-xs text-muted-foreground">{formatDate(discussion.created_at)}</span>
      </div>
      <h3 className="text-arabic leading-snug font-bold">{discussion.title}</h3>
      <div className="space-y-2 text-sm text-muted-foreground">
        {paragraphs(discussion.body)
          .slice(0, 3)
          .map((line, index) => (
            <p key={index} className="text-arabic">
              {line}
            </p>
          ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={myReaction.data === "support" ? "default" : "outline"}
          disabled={!signedIn || locked || react.isPending}
          onClick={() => react.mutate("support")}
        >
          <ThumbsUp className="size-4" /> Support {supports}
        </Button>
        <Button
          size="sm"
          variant={myReaction.data === "oppose" ? "destructive" : "outline"}
          disabled={!signedIn || locked || react.isPending}
          onClick={() => react.mutate("oppose")}
        >
          <ThumbsDown className="size-4" /> Oppose {opposes}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowComments((value) => !value)}>
          <MessageSquare className="size-4" /> {Number(stats.data?.comments ?? 0)}
        </Button>
      </div>

      {total > 0 ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.round((supports / total) * 100)}%` }}
          />
        </div>
      ) : null}

      {locked ? (
        <p className="text-xs text-muted-foreground">This motion is closed for new interventions.</p>
      ) : null}

      {showComments ? (
        <div className="space-y-3 border-t border-border pt-3">
          {comments.isPending ? (
            <LoadingList rows={1} />
          ) : (comments.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No interventions yet.</p>
          ) : (
            <ul className="space-y-2">
              {(comments.data ?? []).map((item) => (
                <li key={item.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-arabic text-sm">{item.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(item.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {signedIn && !locked ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!addComment.isPending) addComment.mutate();
              }}
            >
              <Textarea
                value={comment}
                rows={3}
                maxLength={2000}
                placeholder="Write your intervention"
                onChange={(event) => setComment(event.target.value)}
              />
              <Button size="sm" type="submit" disabled={addComment.isPending}>
                {addComment.isPending ? "Sending…" : "Add intervention"}
              </Button>
            </form>
          ) : !signedIn ? (
            <Link to="/auth" className="text-xs font-semibold text-primary">
              Sign in to add your intervention
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
