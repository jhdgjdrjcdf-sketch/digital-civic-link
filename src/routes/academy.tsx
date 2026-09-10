import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "أكاديمية القيادة — Leadership Academy" },
      { name: "description", content: "Leadership courses and lessons." },
      { property: "og:title", content: "أكاديمية القيادة — Leadership Academy" },
      { property: "og:description", content: "Leadership courses and lessons." },
    ],
  }),
  component: () => (
    <AppShell arabicTitle="أكاديمية القيادة" title="Leadership Academy">
      <EmptyState title="Coming soon" description="This section is being prepared." />
    </AppShell>
  ),
});
