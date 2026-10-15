import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  GraduationCap,
  MessagesSquare,
  Newspaper,
  MapPin,
  Megaphone,
} from "lucide-react";

import heroImage from "@/assets/hero.jpg";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateTime, relativeDays } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تجمع الفاو زاخو — Official Digital Platform" },
      {
        name: "description",
        content:
          "Announcements, news, events, public consultations, transparency reports and leadership courses from تجمع الفاو زاخو.",
      },
      { property: "og:title", content: "تجمع الفاو زاخو — Official Digital Platform" },
      {
        property: "og:description",
        content: "One trusted channel for party news, events, consultations and transparency.",
      },
    ],
  }),
  component: HomePage,
});

const QUICK_LINKS = [
  { to: "/news", label: "صوت التجمع", sub: "News", icon: Newspaper },
  { to: "/events", label: "Events", sub: "Meetings & activities", icon: CalendarDays },
  { to: "/council", label: "مجلس شباب التجمع", sub: "Discussions", icon: MessagesSquare },
  { to: "/polls", label: "Polls", sub: "Consultations", icon: BarChart3 },
  { to: "/offices", label: "مكاتب التجمع والمرشحين", sub: "Offices & candidates", icon: MapPin },
  { to: "/academy", label: "أكاديمية القيادة", sub: "Leadership academy", icon: GraduationCap },
  {
    to: "/assistant",
    label: "المساعد الذكي",
    sub: "اسأل عن الحزب",
    icon: Bot,
  },

] as const;

function useHomeData() {
  const news = useQuery({
    queryKey: ["home", "news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id,title,summary,category,source,published_at")
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = useQuery({
    queryKey: ["home", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,starts_at,location,category,status,timezone")
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const polls = useQuery({
    queryKey: ["home", "polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("id,question,ends_at")
        .eq("status", "published")
        .gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
  });

  return { news, events, polls };
}

function HomePage() {
  const { news, events, polls } = useHomeData();
  const lead = news.data?.[0];
  const rest = (news.data ?? []).slice(1, 4);
  const openPoll = polls.data?.[0];

  return (
    <AppShell>
      <section className="-mx-5 -mt-5 mb-6">
        <div className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="The party's civic assembly hall at dusk"
            width={1536}
            height={1024}
            className="h-52 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep via-primary-deep/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-primary-foreground">
            <div className="gold-rule w-10" />
            <h1 className="text-arabic mt-3 text-2xl leading-snug font-extrabold">
              معاً من أجل مجتمع أقوى
            </h1>
            <p className="mt-1.5 text-sm text-primary-foreground/80">
              Together for a stronger community — the official platform of تجمع الفاو زاخو.
            </p>
          </div>
        </div>
      </section>

      {lead ? (
        <Link
          to="/news/$newsId"
          params={{ newsId: lead.id }}
          className="card-soft mb-6 block overflow-hidden p-4 transition hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
            <Megaphone className="size-4 text-accent" />
            Latest announcement
          </div>
          <h2 className="mt-2 text-lg leading-snug font-bold">{lead.title}</h2>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{lead.summary}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {lead.source} · {formatDate(lead.published_at)}
          </p>
        </Link>
      ) : null}

      <section className="mb-8">
        <SectionTitle title="Quick access" />
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="card-soft flex flex-col gap-2 p-3.5 transition hover:shadow-md"
            >
              <item.icon className="size-5 text-accent" />
              <span className="text-arabic text-sm leading-tight font-bold">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle
          title="Featured news"
          action={
            <Link to="/news" className="flex items-center gap-1 text-xs font-semibold text-primary">
              See all <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {news.isPending ? (
          <LoadingList rows={2} />
        ) : news.isError ? (
          <ErrorState error={news.error} onRetry={() => void news.refetch()} />
        ) : rest.length === 0 ? (
          <EmptyState
            title="No further news yet"
            description="New official items appear here as soon as they are published."
          />
        ) : (
          <ul className="space-y-3">
            {rest.map((item) => (
              <li key={item.id}>
                <Link
                  to="/news/$newsId"
                  params={{ newsId: item.id }}
                  className="card-soft block p-4 transition hover:shadow-md"
                >
                  <Badge variant="secondary" className="text-[10px]">
                    {item.category}
                  </Badge>
                  <h3 className="mt-2 leading-snug font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.published_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle
          title="Upcoming events"
          action={
            <Link
              to="/events"
              className="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              See all <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {events.isPending ? (
          <LoadingList rows={2} />
        ) : events.isError ? (
          <ErrorState error={events.error} onRetry={() => void events.refetch()} />
        ) : (events.data ?? []).length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="When a meeting or activity is scheduled it will be listed here."
          />
        ) : (
          <ul className="space-y-3">
            {events.data.map((item) => (
              <li key={item.id} className="card-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="leading-snug font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.starts_at, item.timezone)} · {item.location}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-accent text-accent-foreground">
                    {relativeDays(item.starts_at)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openPoll ? (
        <section className="mb-8">
          <SectionTitle title="Open consultation" />
          <Link to="/polls" className="card-soft block p-4 transition hover:shadow-md">
            <h3 className="leading-snug font-semibold">{openPoll.question}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Closes {formatDate(openPoll.ends_at)} · one vote per member
            </p>
          </Link>
        </section>
      ) : null}

      <section className="surface-navy mb-2 rounded-xl p-5">
        <div className="gold-rule w-8" />
        <h2 className="text-arabic mt-3 text-base font-bold">رسالتنا</h2>
        <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
          Our message: public trust is earned through honesty, service and open accounts. Everything
          published on this platform carries a date, a source and a responsible office.
        </p>
      </section>
    </AppShell>
  );
}
