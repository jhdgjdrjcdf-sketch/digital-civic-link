import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, Clock, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, paragraphs, relativeDays } from "@/lib/format";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details — تجمع الفاو زاخو" },
      { name: "description", content: "Full details, time and location of a party activity." },
      { property: "og:title", content: "Event details — تجمع الفاو زاخو" },
      { property: "og:description", content: "Time, location and details of a party activity." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventDetailsPage,
});

function EventDetailsPage() {
  const { eventId } = Route.useParams();

  const query = useQuery({
    queryKey: ["events", "item", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, starts_at, ends_at, timezone, location, category, status")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const event = query.data;
  const mapsUrl = event
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : "";

  return (
    <AppShell title="Event details">
      <Link
        to="/events"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to the schedule
      </Link>

      {query.isPending ? (
        <LoadingList rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !event ? (
        <EmptyState
          title="Event unavailable"
          description="This activity may have been removed from the schedule."
        />
      ) : (
        <article className="card-soft space-y-4 p-5">
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

          <div>
            <div className="gold-rule w-10" />
            <h1 className="text-arabic mt-3 text-xl leading-snug font-bold">{event.title}</h1>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-accent" />
              <span>{formatDateTime(event.starts_at, event.timezone)}</span>
            </li>
            {event.ends_at ? (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-accent" />
                <span>Ends {formatDateTime(event.ends_at, event.timezone)}</span>
              </li>
            ) : null}
            <li className="text-arabic flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{event.location}</span>
            </li>
          </ul>

          <div className="space-y-3">
            {paragraphs(event.description).map((line, index) => (
              <p key={index} className="text-arabic text-sm leading-7">
                {line}
              </p>
            ))}
          </div>

          <Button asChild className="w-full">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="size-4" /> View location on the map
            </a>
          </Button>
        </article>
      )}
    </AppShell>
  );
}
