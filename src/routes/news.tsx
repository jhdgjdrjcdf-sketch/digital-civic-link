
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Filter,
  Newspaper,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import "./news-page.css";

export const Route = createFileRoute("/news")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "صوت التجمع — أخبار وبيانات تجمع الفاو زاخو" },
      {
        name: "description",
        content:
          "تابع آخر أخبار وبيانات وإعلانات تجمع الفاو زاخو عبر المنصة الرقمية الرسمية.",
      },
      { property: "og:title", content: "صوت التجمع — أخبار وبيانات" },
      {
        property: "og:description",
        content: "الأخبار والبيانات الرسمية لتجمع الفاو زاخو.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

export const NEWS_CATEGORIES = [
  { value: "news", label: "أخبار التجمع" },
  { value: "update", label: "التحديثات" },
  { value: "statement", label: "البيانات الرسمية" },
  { value: "message", label: "رسائل التجمع" },
] as const;

const FILTERS = [
  { value: "all", label: "جميع الأخبار" },
  ...NEWS_CATEGORIES,
];

export function categoryLabel(value: string) {
  return (
    NEWS_CATEGORIES.find((category) => category.value === value)?.label ??
    "أخبار التجمع"
  );
}

type Article = {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  published_at: string | null;
  cover_url: string | null;
};

function formatNewsDate(value: string | null) {
  if (!value) return "تاريخ النشر غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "تاريخ النشر غير محدد";
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Baghdad",
  }).format(date);
}

function NewsImage({
  article,
  className = "",
}: {
  article: Article;
  className?: string;
}) {
  if (article.cover_url) {
    return (
      <img
        className={`news-image ${className}`}
        src={article.cover_url}
        alt={article.title}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`news-image news-image-fallback ${className}`}
      aria-hidden="true"
    >
      <span className="news-fallback-orbit news-fallback-orbit-one" />
      <span className="news-fallback-orbit news-fallback-orbit-two" />

      <span className="news-fallback-mark">
        <Newspaper size={42} strokeWidth={1.25} />
      </span>

      <span className="news-fallback-caption">صوت التجمع</span>
    </div>
  );
}

function NewsMeta({ article }: { article: Article }) {
  return (
    <div className="news-meta">
      <span className="news-category">
        {categoryLabel(article.category)}
      </span>

      <span className="news-date">
        <CalendarDays size={14} aria-hidden="true" />
        {formatNewsDate(article.published_at)}
      </span>
    </div>
  );
}

function FeaturedArticle({ article }: { article: Article }) {
  return (
    <Link
      to="/news/$newsId"
      params={{ newsId: article.id }}
      className="news-featured"
      aria-label={`قراءة الخبر: ${article.title}`}
    >
      <NewsImage article={article} />

      <div className="news-featured-shade" />

      <div className="news-featured-top">
        <span className="news-featured-label">
          <Sparkles size={14} />
          الخبر الأبرز
        </span>

        <span className="news-featured-category">
          {categoryLabel(article.category)}
        </span>
      </div>

      <div className="news-featured-content">
        <NewsMeta article={article} />

        <h2>{article.title}</h2>

        {article.summary ? <p>{article.summary}</p> : null}

        <span className="news-read-link">
          اقرأ الخبر كاملاً
          <ArrowLeft size={17} />
        </span>
      </div>
    </Link>
  );
}

function NewsCard({ article }: { article: Article }) {
  return (
    <Link
      to="/news/$newsId"
      params={{ newsId: article.id }}
      className="news-card"
      aria-label={`قراءة الخبر: ${article.title}`}
    >
      <div className="news-card-media">
        <NewsImage article={article} />

        <span className="news-card-category">
          {categoryLabel(article.category)}
        </span>
      </div>

      <div className="news-card-content">
        <span className="news-card-date">
          <CalendarDays size={13} />
          {formatNewsDate(article.published_at)}
        </span>

        <h3>{article.title}</h3>

        {article.summary ? <p>{article.summary}</p> : null}

        <span className="news-card-read">
          متابعة الخبر
          <ArrowLeft size={15} />
        </span>
      </div>
    </Link>
  );
}

function NewsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const query = useQuery({
    queryKey: ["news", "list"],

    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await supabase
        .from("news_articles")
        .select(
          "id, title, summary, category, published_at, cover_url"
        )
        .order("published_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []) as Article[];
    },
  });

  const articles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");

    return (query.data ?? []).filter((article) => {
      const matchesCategory =
        category === "all" || article.category === category;

      const searchableText =
        `${article.title} ${article.summary ?? ""}`.toLocaleLowerCase("ar");

      return (
        matchesCategory &&
        (!term || searchableText.includes(term))
      );
    });
  }, [query.data, search, category]);

  const featured = articles[0];
  const remaining = articles.slice(1);

  return (
    <AppShell
      arabicTitle="صوت التجمع"
      title="News & statements"
      subtitle="الأخبار والبيانات الرسمية لتجمع الفاو زاخو"
    >
      <main className="news-page" dir="rtl">

        {/* INTRODUCTION */}
        <section className="news-intro">
          <div className="news-intro-copy">
            <span className="news-eyebrow">
              <span className="news-eyebrow-dot" />
              المركز الإعلامي الرسمي
            </span>

            <h1>
              صوت <span>التجمع</span>
            </h1>

            <p>
              نافذتك إلى أخبار التجمع وبياناته ومبادراته.
              نضع بين يديك آخر المستجدات بمصداقية ووضوح.
            </p>
          </div>

          <div
            className="news-intro-symbol"
            aria-hidden="true"
          >
            <Newspaper size={76} strokeWidth={0.85} />
            <span>NEWSROOM</span>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <section
          className="news-toolbar"
          aria-label="البحث وتصنيف الأخبار"
        >
          <div className="news-search">
            <Search size={19} aria-hidden="true" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الأخبار والبيانات..."
              aria-label="ابحث في الأخبار والبيانات"
            />

            {search ? (
              <button
                type="button"
                className="news-clear-search"
                onClick={() => setSearch("")}
                aria-label="مسح البحث"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="news-filter-label">
            <Filter size={16} />
            تصنيف الأخبار
          </div>

          <div
            className="news-filters"
            role="group"
            aria-label="تصفية حسب التصنيف"
          >
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`news-filter ${
                  category === item.value ? "is-active" : ""
                }`}
                onClick={() => setCategory(item.value)}
                aria-pressed={category === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* NEWS LIST */}
        <section className="news-listing">
          <div className="news-section-heading">
            <div>
              <span className="news-section-kicker">
                LATEST STORIES
              </span>

              <h2>أحدث الأخبار</h2>

              <p>
                آخر ما نشره المركز الإعلامي للتجمع
              </p>
            </div>

            <span className="news-count">
              {articles.length.toLocaleString("ar-IQ")} خبر
            </span>
          </div>

          {query.isPending ? (
            <div className="news-loading">
              <LoadingList rows={4} />
            </div>
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : articles.length === 0 ? (
            <div className="news-empty">
              <EmptyState
                title="لا توجد أخبار مطابقة"
                description="جرّب تغيير كلمات البحث أو اختيار تصنيف آخر."
              />

              {(search || category !== "all") && (
                <button
                  type="button"
                  className="news-reset-button"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                  }}
                >
                  عرض جميع الأخبار
                  <X size={15} />
                </button>
              )}
            </div>
          ) : (
            <>
              {featured ? (
                <div className="news-editorial-grid">
                  <FeaturedArticle article={featured} />

                  <div className="news-secondary-grid">
                    {remaining.slice(0, 4).map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {remaining.length > 4 ? (
                <div className="news-more">
                  <div className="news-more-heading">
                    <div>
                      <span className="news-section-kicker">
                        MORE FROM THE NEWSROOM
                      </span>

                      <h2>المزيد من الأخبار</h2>
                    </div>

                    <span>
                      {(remaining.length - 4).toLocaleString("ar-IQ")} خبر
                    </span>
                  </div>

                  <div className="news-more-grid">
                    {remaining.slice(4).map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* FOOTER BANNER */}
        <section className="news-bottom-banner">
          <div className="news-banner-icon">
            <Clock3 size={25} />
          </div>

          <div>
            <span>تجمع الفاو زاخو</span>

            <h2>
              فكرٌ يتجدد.. وعملٌ يصنع المستقبل
            </h2>

            <p>
              تابع المنصة الرسمية لتبقَ على اطلاع بآخر المستجدات.
            </p>
          </div>

          <Link to="/" className="news-banner-link">
            العودة إلى الرئيسية
            <ArrowLeft size={17} />
          </Link>
        </section>

      </main>
    </AppShell>
  );
}
