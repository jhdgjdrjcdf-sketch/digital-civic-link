import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — تجمع الفاو زاخو" },
      { name: "description", content: "Manage content according to your role." },
      { property: "og:title", content: "Administration — تجمع الفاو زاخو" },
      { property: "og:description", content: "Manage content according to your role." },
    ],
  }),
  component: () => (
    <AppShell title="Administration">
      <EmptyState title="Coming soon" description="Administration tools are being prepared." />
    </AppShell>
  ),
});
