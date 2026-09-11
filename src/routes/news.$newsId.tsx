import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, paragraphs } from "@/lib/format";
import { categoryLabel } from "@/routes/news";

export const Route = createFileRoute("/news/$newsId")({
  head: () => ({
    meta: [
      { title: "Article — صوت التجمع" },
      { name: "description", content: "Read a full announcement from تجمع الفاو زاخو." },
      { property: "og:title", content: "Article — صوت التجمع" },
      { property: "og:description", content: "Read a full announcement from تجمع الفاو زاخو." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
