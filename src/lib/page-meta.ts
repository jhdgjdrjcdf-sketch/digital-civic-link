import { supabase } from "@/integrations/supabase/client";

const SITE = "https://digital-civic-link.lovable.app";

/** Shortens text for meta descriptions. */
export function clip(text: string | null | undefined, max = 160) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function pageUrl(path: string) {
  return `${SITE}${path}`;
}

/**
 * Lightweight public reads used only for page titles and structured data.
 * They never throw so a failed lookup falls back to generic metadata.
 */
export async function loadNewsMeta(id: string) {
  try {
    const { data } = await supabase
      .from("news_articles")
      .select("id, title, summary, published_at, source")
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function loadEventMeta(id: string) {
  try {
    const { data } = await supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, location, status")
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function loadCourseMeta(id: string) {
  try {
    const { data } = await supabase
      .from("courses")
      .select("id, title, description, instructor_name")
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}
