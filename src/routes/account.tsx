import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — تجمع الفاو زاخو" },
      { name: "description", content: "Your profile and participation." },
      { property: "og:title", content: "Your account — تجمع الفاو زاخو" },
      { property: "og:description", content: "Your profile and participation." },
    ],
  }),
  component: () => (
    <AppShell title="Your account">
      <EmptyState title="Coming soon" description="This page is being prepared." />
    </AppShell>
  ),
});
