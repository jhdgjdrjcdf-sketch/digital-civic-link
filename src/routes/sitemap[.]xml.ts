import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

const BASE_URL = "https://digital-civic-link.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
        const key =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) throw new Error("Public backend configuration is missing");
        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key)
                headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const collections = [
          {
            routeId: "/news/$newsId",
            to: "/news/$newsId",
            param: "newsId",
            query: (from: number, to: number) =>
              supabase
                .from("news_articles")
                .select("id")
                .eq("status", "published")
                .not("published_at", "is", null)
                .order("id")
                .range(from, to),
          },
          {
            routeId: "/events/$eventId",
            to: "/events/$eventId",
            param: "eventId",
            query: (from: number, to: number) =>
              supabase.from("events").select("id").neq("status", "archived").order("id").range(from, to),
          },
          {
            routeId: "/academy/$courseId",
            to: "/academy/$courseId",
            param: "courseId",
            query: (from: number, to: number) =>
              supabase.from("courses").select("id").eq("status", "published").order("id").range(from, to),
          },
        ] as const;

        const pageSize = 1000;
        for (const c of collections) {
          if (!isSitemapRouteIncluded(router.routesById[c.routeId])) continue;
          for (let offset = 0; ; ) {
            const { data, error } = await c.query(offset, offset + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            for (const row of data) {
              const location = router.buildLocation({
                to: c.to,
                params: { [c.param]: row.id } as never,
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, c.routeId);
              if (path) entries.push({ path });
            }
            offset += data.length;
          }
        }

        if (entries.length === 0) {
          return new Response("No pages are included in this sitemap.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
