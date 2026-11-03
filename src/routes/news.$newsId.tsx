import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, paragraphs } from "@/lib/format";
import { clip, loadNewsMeta, pageUrl } from "@/lib/page-meta";
import { categoryLabel } from "@/routes/news";

export const Route = createFileRoute("/news/$newsId")({
  staticData: { sitemap: true },
  loader: ({ params }) => loadNewsMeta(params.newsId),
  head: ({ params, loaderData }) => {
    const url = pageUrl(`/news/${params.newsId}`);
    const title = loaderData?.title
      ? `${clip(loaderData.title, 70)} — صوت التجمع`
      : "Article — صوت التجمع";
    const description =
      clip(loaderData?.summary) || "Read a full announcement from تجمع الفاو زاخو.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                headline: loaderData.title,
                description: loaderData.summary ?? undefined,
                datePublished: loaderData.published_at ?? undefined,
                mainEntityOfPage: url,
                publisher: { "@type": "Organization", name: "تجمع الفاو زاخو" },
              }),
            },
          ]
        : [],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { newsId } = Route.useParams();

  const query = useQuery({
    queryKey: ["news", "item", newsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, summary, body, category, source, published_at")
        .eq("id", newsId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const article = query.data;

  return (
    <AppShell arabicTitle="صوت التجمع" title="Article">
      <Link
        to="/news"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to all news
      </Link>

      {query.isPending ? (
        <LoadingList rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !article ? (
        <EmptyState
          title="Article unavailable"
          description="This item may have been removed or is not published yet."
        />
      ) : (
        <article className="card-soft space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">{categoryLabel(article.category)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(article.published_at)}
            </span>
          </div>
          <div>
            <div className="gold-rule w-10" />
            <h1 className="text-arabic mt-3 text-xl leading-snug font-bold">{article.title}</h1>
          </div>
          {article.summary ? (
            <p className="text-arabic text-sm font-medium text-muted-foreground">
              {article.summary}
            </p>
          ) : null}
          <div className="space-y-3">
            {paragraphs(article.body).map((line, index) => (
              <p key={index} className="text-arabic text-sm leading-7">
                {line}
              </p>
            ))}
          </div>
          {article.source ? (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Source: {article.source}
            </p>
          ) : null}
        </article>
      )}
    </AppShell>
  );
}
