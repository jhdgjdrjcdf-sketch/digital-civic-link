import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AdminMembers } from "@/components/admin/AdminMembers";
import { AdminNavigation, type AdminView } from "@/components/admin/AdminNavigation";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminSectionManager } from "@/components/admin/AdminSectionManager";
import { EmptyState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { sectionsForRoles } from "@/lib/admin-sections";
import { useRoles, useSession } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Administration — تجمع الفاو زاخو" },
      { name: "description", content: "Manage news, events, offices, polls and academy courses." },
      { property: "og:title", content: "Administration — تجمع الفاو زاخو" },
      { property: "og:description", content: "Manage news, events, offices, polls and academy courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { can, roles, isPending, isSignedIn, isStaff } = useRoles();
  const { data: session } = useSession();
  const allowed = sectionsForRoles(can);
  // Member management requires the real database role; the RPCs re-check it server-side.
  const showMembers = roles.includes("super_admin");
  const [view, setView] = useState<AdminView>("overview");

  const section = allowed.find((s) => s.id === view);
  const current: AdminView = section ? view : view === "members" && showMembers ? "members" : "overview";

  const select = (id: AdminView) => {
    setView(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell title="Administration" wide>
      {isPending ? (
        <LoadingList rows={3} />
      ) : !isSignedIn ? (
        <EmptyState
          title="Sign in required"
          description="Sign in with a staff account."
          action={
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      ) : !isStaff || !allowed.length ? (
        <EmptyState title="No access" description="Your account has no administration role. Ask a super administrator." />
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
          <AdminNavigation sections={allowed} showMembers={showMembers} active={current} onSelect={select} />
          <div key={current} className="animate-in fade-in-0 min-w-0 duration-300">
            {section ? (
              <AdminSectionManager key={section.id} section={section} />
            ) : current === "members" ? (
              <AdminMembers currentUserId={session?.user.id} />
            ) : (
              <AdminOverview sections={allowed} roles={roles} onOpen={select} />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
