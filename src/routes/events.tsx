import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, relativeDays } from "@/lib/format";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & schedule — تجمع الفاو زاخو" },
      {
        name: "description",
        content:
          "The full schedule of meetings, conferences and public activities of تجمع الفاو زاخو, with details for every event.",
      },
      { property: "og:title", content: "Events & schedule — تجمع الفاو زاخو" },
      { property: "og:description", content: "Meetings, conferences and public activities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

export type EventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string;
  category: string;
  status: string;
};

function EventsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const query = useQuery({
    queryKey: ["events", "list"],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, starts_at, ends_at, timezone, location, category, status")
        .order("starts_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = query.data ?? [];
    return {
      upcoming: all.filter((event) => new Date(event.starts_at).getTime() >= now),
      past: all
        .filter((event) => new Date(event.starts_at).getTime() < now)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    };
  }, [query.data]);

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <AppShell
      title="Events & schedule"
      subtitle="Meetings, conferences and public activities across the country."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "upcoming" ? "default" : "outline"}
            onClick={() => setTab("upcoming")}
          >
            Upcoming ({upcoming.length})
          </Button>
          <Button
            size="sm"
            variant={tab === "past" ? "default" : "outline"}
            onClick={() => setTab("past")}
          >
            Past ({past.length})
          </Button>
        </div>

        {query.isPending ? (
          <LoadingList rows={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === "upcoming" ? "No upcoming events" : "No past events"}
            description="New activities are announced here as soon as they are scheduled."
          />
        ) : (
          <ol className="relative space-y-3 border-s border-border ps-5">
            {list.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -start-[26px] top-5 size-2.5 rounded-full bg-accent" />
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="card-soft block p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{event.category}</Badge>
                    {event.status === "cancelled" ? (
                      <Badge variant="destructive">Cancelled</Badge>
                    ) : (
                      <span className="text-xs font-semibold text-accent">
                        {relativeDays(event.starts_at)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-arabic mt-2 leading-snug font-bold">{event.title}</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDateTime(event.starts_at, event.timezone)}
                  </p>
                  <p className="text-arabic mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {event.location}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
