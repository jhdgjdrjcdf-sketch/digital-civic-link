import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Bot,
  CalendarDays,
  GraduationCap,
  MessagesSquare,
  Newspaper,
  MapPin,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";

import heroImage from "@/assets/hero-new.jpg";
import "@/Styles.css";
import "@/home-glass.css";

import { AppShell } from "@/components/AppShell";
import {
  EmptyState,
  ErrorState,
  LoadingList,
} from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate,
  formatDateTime,
  relativeDays,
} from "@/lib/format";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "تجمع الفاو زاخو — Official Digital Platform" },
      {
        name: "description",
        content:
          "Announcements, news, events, public consultations, transparency reports and leadership courses from تجمع الفاو زاخو.",
      },
      {
        property: "og:title",
        content: "تجمع الفاو زاخو — Official Digital Platform",
      },
      {
        property: "og:description",
        content:
          "One trusted channel for party news, events, consultations and transparency.",
      },
    ],
  }),
  component: HomePage,
});

const QUICK_LINKS = [
  {
    to: "/news",
    label: "صوت التجمع",
    sub: "الأخبار والإعلانات",
    icon: Newspaper,
    number: "01",
  },
  {
    to: "/academy",
    label: "أكاديمية القيادة",
    sub: "التعلم والتطوير",
    icon: GraduationCap,
    number: "02",
  },
  {
    to: "/polls",
    label: "استطلاعات الرأي",
    sub: "شارك في صناعة القرار",
    icon: BarChart3,
    number: "03",
  },
  {
    to: "/offices",
    label: "المكاتب والمرشحون",
    sub: "المكاتب والانتشار",
    icon: MapPin,
    number: "04",
  },
  {
    to: "/council",
    label: "مجلس الشباب",
    sub: "الحوار والمبادرات",
    icon: MessagesSquare,
    number: "05",
  },
  {
    to: "/events",
    label: "الاجتماعات والفعاليات",
    sub: "مواعيد وأنشطة التجمع",
    icon: CalendarDays,
    number: "06",
  },
  {
    to: "/assistant",
    label: "المساعد الذكي",
    sub: "اسأل عن التجمع",
    icon: Bot,
    number: "07",
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

function SectionHeading({
  eyebrow,
  title,
  description,
  to,
  linkLabel = "عرض الكل",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="home-section-heading">
      <div>
        <span className="home-eyebrow">{eyebrow}</span>
        <h2 className="home-section-title">{title}</h2>
        {description && (
          <p className="home-section-description">{description}</p>
        )}
      </div>

      {to && (
        <Link to={to} className="home-view-all">
          {linkLabel}
          <ArrowUpLeft size={16} />
        </Link>
      )}
    </div>
  );
}

function HomePage() {
  const { news, events, polls } = useHomeData();

  const lead = news.data?.[0];
  const rest = (news.data ?? []).slice(1, 4);
  const openPoll = polls.data?.[0];

  return (
    <AppShell>
      <main className="home-glass" dir="rtl">
        <section className="home-hero">
          <img
            src={heroImage}
            alt="تجمع الفاو زاخو"
            className="home-hero-image"
          />

          <div className="home-hero-overlay" />
          <div className="home-hero-glow" />

          <div className="home-hero-content">
            <div className="home-hero-label">
              <span className="home-status-dot" />
              المنصة الرقمية الرسمية
            </div>

            <div className="home-hero-copy">
              <span className="home-hero-kicker">
                تجمع الفاو زاخو
              </span>

              <h1>
                ثورة فكر
                <br />
                <span>ثورة تصحيح</span>
              </h1>

              <p>
                منصة تجمع المعرفة والحوار والمشاركة المجتمعية،
                وتفتح مساحة للتواصل والتطوير والعمل المؤسسي.
              </p>

              <div className="home-hero-actions">
                <Link to="/academy" className="home-primary-button">
                  اكتشف الأكاديمية
                  <ArrowLeft size={17} />
                </Link>

                <Link to="/news" className="home-glass-button">
                  آخر الأخبار
                </Link>
              </div>
            </div>

            <div className="home-hero-footer">
              <span>فكر مستقل · مشاركة فاعلة · مجتمع أقوى</span>
              <Sparkles size={17} />
            </div>
          </div>
        </section>

        <section className="home-section">
          <SectionHeading
            eyebrow="EXPLORE THE PLATFORM"
            title="اكتشف المنصة"
            description="كل ما تحتاج إليه من أخبار ومعرفة ومشاركة في مكان واحد."
          />

          <div className="home-links-grid">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="home-glass-card home-quick-card"
              >
                <div className="home-card-topline">
                  <span className="home-card-number">
                    {item.number}
                  </span>

                  <span className="home-icon-wrap">
                    <item.icon size={21} strokeWidth={1.8} />
                  </span>
                </div>

                <div className="home-card-copy">
                  <h3>{item.label}</h3>
                  <p>{item.sub}</p>
                </div>

                <div className="home-card-arrow">
                  <ArrowUpLeft size={17} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-section">
          <SectionHeading
            eyebrow="LATEST UPDATES"
            title="آخر الأخبار"
            description="تابع أحدث البيانات والإعلانات والمستجدات."
            to="/news"
          />

          {news.isPending ? (
            <LoadingList rows={2} />
          ) : news.isError ? (
            <ErrorState
              error={news.error}
              onRetry={() => void news.refetch()}
            />
          ) : !lead ? (
            <EmptyState
              title="لا توجد أخبار منشورة حالياً"
              description="ستظهر الأخبار الرسمية هنا عند نشرها."
            />
          ) : (
            <div className="home-news-layout">
              <Link
                to="/news/$newsId"
                params={{ newsId: lead.id }}
                className="home-glass-card home-featured-news"
              >
                <div className="home-featured-news-top">
                  <Badge variant="secondary">
                    {lead.category || "أخبار التجمع"}
                  </Badge>

                  <span className="home-featured-tag">
                    <Megaphone size={14} />
                    الخبر الأبرز
                  </span>
                </div>

                <div className="home-featured-news-content">
                  <h3>{lead.title}</h3>
                  <p>{lead.summary}</p>

                  <div className="home-news-meta">
                    <span>{lead.source}</span>
                    <span>{formatDate(lead.published_at)}</span>
                  </div>
                </div>

                <div className="home-news-read">
                  اقرأ الخبر
                  <ArrowLeft size={16} />
                </div>
              </Link>

              <div className="home-news-list">
                {rest.length === 0 ? (
                  <div className="home-glass-card home-news-empty">
                    لا توجد أخبار إضافية حالياً.
                  </div>
                ) : (
                  rest.map((item) => (
                    <Link
                      key={item.id}
                      to="/news/$newsId"
                      params={{ newsId: item.id }}
                      className="home-glass-card home-news-item"
                    >
                      <div className="home-news-item-icon">
                        <Newspaper size={18} />
                      </div>

                      <div>
                        <span className="home-news-category">
                          {item.category || "أخبار"}
                        </span>

                        <h3>{item.title}</h3>
                        <p>{formatDate(item.published_at)}</p>
                      </div>

                      <ArrowUpLeft
                        className="home-news-item-arrow"
                        size={17}
                      />
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        <section className="home-section">
          <SectionHeading
            eyebrow="UPCOMING ACTIVITIES"
            title="الفعاليات القادمة"
            description="الاجتماعات والأنشطة المدرجة على جدول التجمع."
            to="/events"
          />

          {events.isPending ? (
            <LoadingList rows={2} />
          ) : events.isError ? (
            <ErrorState
              error={events.error}
              onRetry={() => void events.refetch()}
            />
          ) : (events.data ?? []).length === 0 ? (
            <EmptyState
              title="لا توجد فعاليات قادمة"
              description="ستظهر الاجتماعات والأنشطة هنا عند جدولتها."
            />
          ) : (
            <div className="home-events-grid">
              {events.data.map((item) => (
                <article
                  key={item.id}
                  className="home-glass-card home-event-card"
                >
                  <div className="home-event-icon">
                    <CalendarDays size={21} />
                  </div>

                  <Badge className="home-event-badge">
                    {relativeDays(item.starts_at)}
                  </Badge>

                  <h3>{item.title}</h3>

                  <p>
                    <CalendarDays size={14} />
                    {formatDateTime(item.starts_at, item.timezone)}
                  </p>

                  {item.location && (
                    <p>
                      <MapPin size={14} />
                      {item.location}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {openPoll && (
          <section className="home-section">
            <SectionHeading
              eyebrow="COMMUNITY VOICE"
              title="شارك برأيك"
              description="المشاركة المجتمعية تبدأ من إبداء الرأي."
              to="/polls"
            />

            <Link
              to="/polls"
              className="home-glass-card home-poll-card"
            >
              <div className="home-poll-icon">
                <BarChart3 size={24} />
              </div>

              <div className="home-poll-content">
                <span>استطلاع مفتوح</span>
                <h3>{openPoll.question}</h3>
                <p>
                  ينتهي في {formatDate(openPoll.ends_at)}
                </p>
              </div>

              <div className="home-poll-action">
                <ArrowUpLeft size={20} />
              </div>
            </Link>
          </section>
        )}

        <section className="home-mission">
          <div className="home-mission-decoration">
            <Users size={86} strokeWidth={0.8} />
          </div>

          <div className="home-mission-content">
            <span className="home-eyebrow">OUR PRINCIPLES</span>
            <h2>رسالتنا</h2>

            <p>
              نؤمن بأن الثقة العامة تُبنى بالصدق والخدمة والشفافية،
              وأن المشاركة الواعية والمعرفة أساس مجتمع أكثر قوة
              وتماسكاً.
            </p>

            <span className="home-mission-slogan">
              ثورة فكر · ثورة تصحيح
            </span>
          </div>
        </section>

        <footer className="home-footer">
          <span>تجمع الفاو زاخو</span>
          <span>المنصة الرقمية الرسمية</span>
        </footer>
      </main>
    </AppShell>
  );
}