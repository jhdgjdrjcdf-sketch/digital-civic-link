import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — تجمع الفاو زاخو" },
      { name: "description", content: "Meetings and activities of تجمع الفاو زاخو." },
      { property: "og:title", content: "Events — تجمع الفاو زاخو" },
      { property: "og:description", content: "Meetings and activities of تجمع الفاو زاخو." },
    ],
  }),
  component: () => (
    <AppShell title="Events">
      <EmptyState title="Coming soon" description="This section is being prepared." />
    </AppShell>
  ),
});
