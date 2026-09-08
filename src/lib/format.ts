export function formatDate(value?: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value?: string | null, timeZone?: string | null): string {
  if (!value) return "Time to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time to be announced";
  try {
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return date.toLocaleString("en-GB");
  }
}

export function relativeDays(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`;
}

/** Plain-text rendering: user and editor content is never injected as HTML. */
export function paragraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 400);
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
