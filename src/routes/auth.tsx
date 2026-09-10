import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — تجمع الفاو زاخو" },
      { name: "description", content: "Sign in to take part in discussions and polls." },
      { property: "og:title", content: "Sign in — تجمع الفاو زاخو" },
      { property: "og:description", content: "Sign in to take part in discussions and polls." },
    ],
  }),
  component: () => (
    <AppShell title="Sign in">
      <EmptyState title="Coming soon" description="Sign in is being prepared." />
    </AppShell>
  ),
});
