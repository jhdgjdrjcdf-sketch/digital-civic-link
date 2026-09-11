import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, useSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

type Poll = {
  id: string;
  question: string;
  description: string;
  starts_at: string;
  ends_at: string;
  results_public: boolean;
  poll_options: { id: string; label: string; position: number }[];
};

export function PollsList() {
  const { data: session } = useSession();

  const query = useQuery({
    queryKey: ["polls", "list"],
    queryFn: async (): Promise<Poll[]> => {
      const { data, error } = await supabase
        .from("polls")
        .select("id, question, description, starts_at, ends_at, results_public, poll_options(id, label, position)")
        .order("ends_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((poll) => ({
        ...poll,
        poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.position - b.position),
      })) as Poll[];
    },
  });

  const votesQuery = useQuery({
    queryKey: ["polls", "my-votes", session?.user.id ?? "anonymous"],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("poll_id, option_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isPending) return <LoadingList rows={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if ((query.data ?? []).length === 0)
    return (
      <EmptyState
        title="No open consultations"
        description="New polls and surveys appear here as soon as they open."
      />
    );

  return (
    <div className="space-y-3">
      {(query.data ?? []).map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          signedIn={Boolean(session)}
          myOptionId={votesQuery.data?.find((vote) => vote.poll_id === poll.id)?.option_id ?? null}
        />
      ))}
    </div>
  );
}

function PollCard({
  poll,
  signedIn,
  myOptionId,
}: {
  poll: Poll;
  signedIn: boolean;
  myOptionId: string | null;
}) {
  const queryClient = useQueryClient();
  const now = Date.now();
  const open = new Date(poll.starts_at).getTime() <= now && new Date(poll.ends_at).getTime() >= now;
  const closed = new Date(poll.ends_at).getTime() < now;
  const showResults = Boolean(myOptionId) || poll.results_public || closed;

  const results = useQuery({
    queryKey: ["polls", "results", poll.id],
    enabled: showResults,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("poll_results", { _poll_id: poll.id });
      if (error) throw error;
      return data ?? [];
    },
  });

  const vote = useMutation({
    mutationFn: async (optionId: string) => {
      const { data, error } = await supabase.rpc("cast_vote", {
        _poll_id: poll.id,
        _option_id: optionId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (status) => {
      toast.success(status === "already_voted" ? "You have already voted." : "Your vote was recorded.");
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const total = (results.data ?? []).reduce((sum, row) => sum + Number(row.votes), 0);

  return (
    <section className="card-soft space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant={open ? "default" : "secondary"}>
          {open ? "Open" : closed ? "Closed" : "Opens soon"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {closed ? "Closed" : "Closes"} {formatDateTime(poll.ends_at)}
        </span>
      </div>

      <div>
        <h3 className="text-arabic leading-snug font-bold">{poll.question}</h3>
        {poll.description ? (
          <p className="text-arabic mt-1 text-sm text-muted-foreground">{poll.description}</p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {poll.poll_options.map((option) => {
          const row = (results.data ?? []).find((item) => item.option_id === option.id);
          const votes = Number(row?.votes ?? 0);
          const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
          const mine = myOptionId === option.id;
          return (
            <li key={option.id}>
              {myOptionId || !open || !signedIn ? (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-arabic flex items-center gap-1.5 font-medium">
                      {mine ? <CheckCircle2 className="size-4 text-accent" /> : null}
                      {option.label}
                    </span>
                    {showResults && results.data ? (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {percent}% · {votes}
                      </span>
                    ) : null}
                  </div>
                  {showResults && results.data ? (
                    <Progress value={percent} className="mt-2 h-1.5" />
                  ) : null}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="text-arabic h-auto w-full justify-start py-3 text-start whitespace-normal"
                  disabled={vote.isPending}
                  onClick={() => vote.mutate(option.id)}
                >
                  {option.label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {!signedIn && open ? (
        <Button asChild size="sm" variant="secondary" className="w-full">
          <Link to="/auth">Sign in to vote</Link>
        </Button>
      ) : null}
      {showResults && !results.data && !results.isPending ? (
        <p className="text-xs text-muted-foreground">
          Results will be published when this consultation closes.
        </p>
      ) : null}
    </section>
  );
}
