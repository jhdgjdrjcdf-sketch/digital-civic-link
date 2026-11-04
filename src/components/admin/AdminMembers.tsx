import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { type AppRole, friendlyError, ROLE_LABELS } from "@/lib/auth";
import { formatDate } from "@/lib/format";

type Member = { user_id: string; display_name: string; joined_at: string; roles: string[] };
type Pending = { kind: "grant" | "revoke"; member: Member; role: AppRole };

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

/**
 * Super-admin only. list_members/grant_role/revoke_role are security-definer RPCs that
 * re-check super_admin and reject changes to the caller's own roles on the server.
 */
export function AdminMembers({ currentUserId }: { currentUserId: string | undefined }) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [draftRole, setDraftRole] = useState<Record<string, AppRole | "">>({});
  const [pending, setPending] = useState<Pending | null>(null);

  const query = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase.rpc("list_members");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const change = useMutation({
    mutationFn: async (p: Pending) => {
      if (p.member.user_id === currentUserId) throw new Error("You can't change your own roles.");
      const { error } =
        p.kind === "grant"
          ? await supabase.rpc("grant_role", { _user_id: p.member.user_id, _role: p.role })
          : await supabase.rpc("revoke_role", { _user_id: p.member.user_id, _role: p.role });
      if (error) throw error;
    },
    onSuccess: (_d, p) => {
      toast.success(p.kind === "grant" ? "Role granted." : "Role removed.");
      setDraftRole((d) => ({ ...d, [p.member.user_id]: "" }));
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
    onSettled: () => setPending(null),
  });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (query.data ?? []).filter(
      (m) => !q || m.display_name.toLowerCase().includes(q) || m.roles.some((r) => r.includes(q)),
    );
  }, [query.data, term]);

  return (
    <div className="space-y-4">
      <header className="card-soft p-4">
        <h2 className="text-arabic text-base font-bold">الأعضاء والأدوار</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Grant or remove roles. Every change is confirmed, checked on the server and recorded in the audit log. You can't change your own roles.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search members" placeholder="Search by name or role…" className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>

      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !filtered.length ? (
        <EmptyState title="No members found" description={term ? "Try a different search." : "No member profiles are available."} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {filtered.map((m) => {
            const self = m.user_id === currentUserId;
            const available = ALL_ROLES.filter((r) => !m.roles.includes(r));
            const choice = draftRole[m.user_id] ?? "";
            return (
              <li key={m.user_id} className="card-soft space-y-3 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.display_name || "Unnamed member"}</p>
                    <p className="text-[11px] text-muted-foreground">Joined {formatDate(m.joined_at)}</p>
                  </div>
                  {self ? <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold">You</span> : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.roles.length ? (
                    m.roles.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium">
                        {ROLE_LABELS[r as AppRole] ?? r}
                        {!self ? (
                          <button
                            type="button"
                            aria-label={`Remove ${ROLE_LABELS[r as AppRole] ?? r} from ${m.display_name}`}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setPending({ kind: "revoke", member: m, role: r as AppRole })}
                          >
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No roles</span>
                  )}
                </div>
                {!self && available.length ? (
                  <div className="flex gap-2">
                    <select
                      aria-label={`Role to grant to ${m.display_name}`}
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                      value={choice}
                      onChange={(e) => setDraftRole((d) => ({ ...d, [m.user_id]: e.target.value as AppRole }))}
                    >
                      <option value="">Add a role…</option>
                      {available.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!choice}
                      onClick={() => choice && setPending({ kind: "grant", member: m, role: choice })}
                    >
                      <Plus className="size-4" /> Grant
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && !change.isPending && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.kind === "grant" ? "Grant this role?" : "Remove this role?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.kind === "grant" ? "Give" : "Remove"} "${ROLE_LABELS[pending.role] ?? pending.role}" ${pending.kind === "grant" ? "to" : "from"} ${pending.member.display_name || "this member"}. This changes what they can access immediately.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={change.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={change.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) change.mutate(pending);
              }}
            >
              {change.isPending ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
