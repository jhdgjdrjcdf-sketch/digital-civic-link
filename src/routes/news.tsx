import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "صوت التجمع — News" },
      { name: "description", content: "News and announcements from تجمع الفاو زاخو." },
      { property: "og:title", content: "صوت التجمع — News" },
      { property: "og:description", content: "News and announcements from تجمع الفاو زاخو." },
    ],
  }),
  component: () => (
    <AppShell arabicTitle="صوت التجمع" title="News">
      <EmptyState title="Coming soon" description="This section is being prepared." />
    </AppShell>
  ),
});
