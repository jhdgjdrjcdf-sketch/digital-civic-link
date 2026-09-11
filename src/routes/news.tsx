import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "صوت التجمع — News & statements" },
      {
        name: "description",
        content:
          "News, updates, statements and messages from تجمع الفاو زاخو, published by the official party newsroom.",
      },
      { property: "og:title", content: "صوت التجمع — News & statements" },
      {
        property: "og:description",
        content: "Official news, updates, statements and party messages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

export const NEWS_CATEGORIES = [
  { value: "news", label: "News" },
  { value: "update", label: "Updates" },
  { value: "statement", label: "Statements" },
  { value: "message", label: "Party messages" },
] as const;

export function categoryLabel(value: string) {
  return NEWS_CATEGORIES.find((c) => c.value === value)?.label ?? "News";
}

type Article = {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  published_at: string | null;
};

function NewsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const query = useQuery({
    queryKey: ["news", "list"],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, summary, category, published_at")
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const articles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((article) => {
      const matchesCategory = category === "all" || article.category === category;
      const matchesTerm =
        !term || `${article.title} ${article.summary ?? ""}`.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [query.data, search, category]);

  return (
    <AppShell
      arabicTitle="صوت التجمع"
      title="News & statements"
      subtitle="Official news, updates, statements and messages from the party."
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search news and statements"
            aria-label="Search news"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ value: "all", label: "All" }, ...NEWS_CATEGORIES].map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {query.isPending ? (
          <LoadingList rows={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : articles.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            description="No item matches this filter. Try another category or search term."
          />
        ) : (
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  to="/news/$newsId"
                  params={{ newsId: article.id }}
                  className="card-soft block p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{categoryLabel(article.category)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.published_at)}
                    </span>
                  </div>
                  <h2 className="text-arabic mt-2 leading-snug font-bold">{article.title}</h2>
                  {article.summary ? (
                    <p className="text-arabic mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {article.summary}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
