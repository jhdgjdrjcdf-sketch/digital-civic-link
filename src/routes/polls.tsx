import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { PollsList } from "@/components/PollsList";

export const Route = createFileRoute("/polls")({
  head: () => ({
    meta: [
      { title: "Polls — تجمع الفاو زاخو" },
      { name: "description", content: "Vote in open consultations and see the results." },
      { property: "og:title", content: "Polls — تجمع الفاو زاخو" },
      { property: "og:description", content: "Vote in open consultations and see the results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Polls">
      <PollsList />
    </AppShell>
  ),
});
