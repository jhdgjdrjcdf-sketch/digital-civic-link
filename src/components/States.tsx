import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyError } from "@/lib/auth";

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card-soft space-y-3 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-soft flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="card-soft flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <h3 className="text-base font-semibold">This didn't load</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{friendlyError(error)}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="gold-rule w-8" />
        <h2 className="mt-2 text-base font-bold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
