import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/States";

export const Route = createFileRoute("/council")({
  head: () => ({
    meta: [
      { title: "مجلس اعضاء الحزب — Council" },
      { name: "description", content: "Member discussions and consultations." },
      { property: "og:title", content: "مجلس اعضاء الحزب — Council" },
      { property: "og:description", content: "Member discussions and consultations." },
    ],
  }),
  component: () => (
    <AppShell arabicTitle="مجلس اعضاء الحزب" title="Council">
      <EmptyState title="Coming soon" description="This section is being prepared." />
    </AppShell>
  ),
});
