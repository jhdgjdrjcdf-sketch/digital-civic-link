import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AcademyContentManager } from "@/components/AcademyContentManager";
import { AdminRowForm } from "@/components/admin/AdminRowForm";
import { AdminStatusChip } from "@/components/admin/AdminStatusChip";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { matchesSearch, type Row, type Section } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

export function AdminSectionManager({ section }: { section: Section }) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<string>("all");

  const query = useQuery({
    queryKey: ["admin", section.table],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from(section.table as "news_articles")
        .select(section.select)
        .order(section.order, { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = query.data;
  const statuses = useMemo(() => {
    if (!rows) return [];
    if (section.statusKey) return [...new Set(rows.map((r) => String(r[section.statusKey!] ?? "")))].filter(Boolean);
    if (section.visibilityKey) return ["visible", "hidden"];
    return [];
  }, [rows, section.statusKey, section.visibilityKey]);

  const filtered = useMemo(
    () =>
      (rows ?? []).filter((row) => {
        if (!matchesSearch(section, row, term)) return false;
        if (status === "all") return true;
        if (section.statusKey) return String(row[section.statusKey]) === status;
        if (section.visibilityKey) return (row[section.visibilityKey] ? "visible" : "hidden") === status;
        return true;
      }),
    [rows, section, term, status],
  );

  if (editing) return <AdminRowForm section={section} row={editing === "new" ? null : editing} onDone={() => setEditing(null)} />;

  const Icon = section.icon;
  return (
    <div className="space-y-4">
      <header className="card-soft flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-arabic truncate text-base font-bold">{section.label}</h2>
          <p className="text-xs text-muted-foreground">
            {section.sub}
            {rows ? ` · ${rows.length} accessible record${rows.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="w-full sm:w-auto">
          <Plus className="size-4" /> Add new
        </Button>
      </header>

      {section.id === "courses" && <AcademyContentManager />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`Search ${section.sub}`}
            placeholder="Search in this section…"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        {statuses.length ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Filter by status">
            {["all", ...statuses].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  status === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data.length ? (
        <EmptyState title="Nothing here yet" description="Add the first item." />
      ) : !filtered.length ? (
        <EmptyState
          title="No matching records"
          description="Try a different search or status filter."
          action={
            <Button size="sm" variant="outline" onClick={() => { setTerm(""); setStatus("all"); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {filtered.map((row) => {
            const title = String(row[section.titleKey] ?? "") || "Untitled";
            const meta = (section.searchKeys ?? [])
              .map((k) => row[k])
              .filter((v) => typeof v === "string" && v.trim())
              .slice(0, 2)
              .join(" · ");
            return (
              <li
                key={row.id}
                className="card-soft group flex items-center gap-3 p-3 transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {section.statusKey ? <AdminStatusChip value={String(row[section.statusKey])} /> : null}
                    {section.visibilityKey ? (
                      <AdminStatusChip value={row[section.visibilityKey] ? "visible" : "hidden"} />
                    ) : null}
                  </div>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Edit ${title}`} onClick={() => setEditing(row)}>
                  <Pencil className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
