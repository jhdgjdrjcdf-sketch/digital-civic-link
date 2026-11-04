import { LayoutDashboard, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ADMIN_GROUPS, type Section } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

export type AdminView = "overview" | "members" | string;

type Item = { id: string; label: string; sub: string; icon: LucideIcon };

export function AdminNavigation({
  sections,
  showMembers,
  active,
  onSelect,
}: {
  sections: Section[];
  showMembers: boolean;
  active: AdminView;
  onSelect: (id: AdminView) => void;
}) {
  const groups: { id: string; label: string; sub: string; items: Item[] }[] = [
    { id: "home", label: "عام", sub: "General", items: [{ id: "overview", label: "نظرة عامة", sub: "Overview", icon: LayoutDashboard }] },
    ...ADMIN_GROUPS.map((g) => ({ ...g, items: sections.filter((s) => s.group === g.id) })).filter((g) => g.items.length),
    ...(showMembers
      ? [{ id: "access", label: "الصلاحيات", sub: "Access", items: [{ id: "members", label: "الأعضاء والأدوار", sub: "Members & roles", icon: ShieldCheck }] }]
      : []),
  ];

  return (
    <nav aria-label="Administration sections">
      {/* Mobile: one horizontally scrolling rail, grouped with subtle dividers. */}
      <div className="-mx-5 overflow-x-auto px-5 pb-1 lg:hidden">
        <ul className="flex w-max items-center gap-1.5">
          {groups.map((g, gi) => (
            <li key={g.id} className="flex items-center gap-1.5">
              {gi > 0 ? <span aria-hidden className="mx-1 h-5 w-px bg-border" /> : null}
              {g.items.map((item) => {
                const Icon = item.icon;
                const on = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={on ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "text-arabic flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop: grouped sidebar. */}
      <div className="card-soft sticky top-28 hidden space-y-4 p-3 lg:block">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              <span className="text-arabic normal-case tracking-normal">{g.label}</span> · {g.sub}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const on = item.id === active;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={on ? "page" : undefined}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                        on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
                      )}
                    >
                      {on ? <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" /> : null}
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="text-arabic block truncate text-sm font-semibold">{item.label}</span>
                        <span className={cn("block truncate text-[11px]", on ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {item.sub}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
