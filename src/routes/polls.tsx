import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/polls")({
  head: () => ({
    meta: [
      { title: "Polls — تجمع الفاو زاخو" },
      { name: "description", content: "Open consultations and polls." },
      { property: "og:title", content: "Polls — تجمع الفاو زاخو" },
      { property: "og:description", content: "Open consultations and polls." },
    ],
  }),
  component: () => (
    <AppShell title="Polls">
      <EmptyState title="Coming soon" description="This section is being prepared." />
    </AppShell>
  ),
});
