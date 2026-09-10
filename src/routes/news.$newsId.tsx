import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/news/$newsId")({
  head: () => ({
    meta: [
      { title: "Article — صوت التجمع" },
      { name: "description", content: "Read a full announcement from تجمع الفاو زاخو." },
      { property: "og:title", content: "Article — صوت التجمع" },
      { property: "og:description", content: "Read a full announcement from تجمع الفاو زاخو." },
    ],
  }),
  component: () => (
    <AppShell arabicTitle="صوت التجمع" title="Article">
      <EmptyState title="Coming soon" description="This article view is being prepared." />
    </AppShell>
  ),
});
