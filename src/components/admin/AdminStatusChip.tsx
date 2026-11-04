import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  published: "border-success/30 bg-success/10 text-success",
  scheduled: "border-primary/20 bg-primary/5 text-primary",
  visible: "border-success/30 bg-success/10 text-success",
  draft: "border-accent/40 bg-accent/15 text-accent-foreground",
  hidden: "border-border bg-muted text-muted-foreground",
  archived: "border-border bg-muted text-muted-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function AdminStatusChip({ value, label }: { value: string; label?: string }) {
  const key = value.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
        TONES[key] ?? "border-border bg-secondary text-secondary-foreground",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {label ?? value}
    </span>
  );
}
