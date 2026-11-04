import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Section } from "@/lib/admin-sections";
import { type AppRole, ROLE_LABELS } from "@/lib/auth";

/** Counts are per-request head queries, so RLS decides which rows are visible. */
export function AdminOverview({
  sections,
  roles,
  onOpen,
}: {
  sections: Section[];
  roles: AppRole[];
  onOpen: (id: string) => void;
}) {
  const kpis = sections.filter((s) => s.kpi);
  const counts = useQueries({
    queries: kpis.map((s) => ({
      queryKey: ["admin", "count", s.table],
      queryFn: async () => {
        const { count, error } = await supabase
          .from(s.table as "news_articles")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      },
    })),
  });
  const staffRoles = roles.filter((r) => r !== "member");

  return (
    <div className="space-y-5">
      <section className="surface-navy relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="gold-rule w-10" />
        <p className="mt-3 text-[11px] tracking-[0.22em] text-primary-foreground/60 uppercase">Control center</p>
        <h2 className="text-arabic mt-1 text-xl font-bold sm:text-2xl">لوحة الإدارة</h2>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/75">
          Manage the platform's content, offices and academy. Only the areas your role permits are shown.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 text-accent" aria-hidden />
          {staffRoles.length ? (
            staffRoles.map((r) => (
              <span
                key={r}
                className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
              >
                {ROLE_LABELS[r]}
              </span>
            ))
          ) : (
            <span className="text-xs text-primary-foreground/70">No staff role found on this account.</span>
          )}
        </div>
      </section>

      <div>
        <div className="mb-3 flex items-end justify-between gap-2">
          <h3 className="text-sm font-bold">Accessible records</h3>
          <p className="text-[11px] text-muted-foreground">Counts reflect what your account can read, not global totals.</p>
        </div>
        {kpis.length ? (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {kpis.map((s, i) => {
              const q = counts[i];
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className="card-soft group flex h-full w-full flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Icon className="size-4" />
                      </span>
                      <ArrowLeft className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </span>
                    <span>
                      {q?.isPending ? (
                        <Skeleton className="h-7 w-12" />
                      ) : q?.isError ? (
                        <span className="text-xs text-destructive">Count unavailable</span>
                      ) : (
                        <span className="text-2xl font-bold tabular-nums">{q?.data ?? 0}</span>
                      )}
                      <span className="text-arabic mt-1 block text-sm font-semibold">{s.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{s.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card-soft p-4 text-sm text-muted-foreground">No summary metrics are available for your role.</p>
        )}
      </div>
    </div>
  );
}
