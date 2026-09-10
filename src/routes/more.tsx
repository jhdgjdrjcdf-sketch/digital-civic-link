import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { AppShell, MORE_LINKS } from "@/components/AppShell";
import { useRoles, useSession } from "@/lib/auth";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More sections — تجمع الفاو زاخو" },
      {
        name: "description",
        content: "Polls, offices and candidates map, and the leadership academy of تجمع الفاو زاخو.",
      },
      { property: "og:title", content: "More sections — تجمع الفاو زاخو" },
      {
        property: "og:description",
        content: "Polls, offices and candidates, and leadership courses.",
      },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { data: session } = useSession();
  const { isStaff } = useRoles();

  return (
    <AppShell
      title="More sections"
      subtitle="Consultations, offices and candidates, and leadership education."
    >

      <ul className="space-y-3">
        {MORE_LINKS.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="card-soft flex items-center gap-4 p-4 transition hover:shadow-md"
            >
              <link.icon className="size-6 shrink-0 text-accent" />
              <span className="flex-1">
                <span className="text-arabic block leading-tight font-bold">{link.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{link.desc}</span>
              </span>
              <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={session ? "/account" : "/auth"}
            className="card-soft flex items-center gap-4 p-4 transition hover:shadow-md"
          >
            <span className="flex-1">
              <span className="block font-bold">{session ? "Your account" : "Sign in"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {session
                  ? "Profile, participation and sign out"
                  : "Sign in to take part in discussions and polls"}
              </span>
            </span>
            <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
          </Link>
        </li>
        {isStaff ? (
          <li>
            <Link
              to="/admin"
              className="card-soft flex items-center gap-4 p-4 transition hover:shadow-md"
            >
              <span className="flex-1">
                <span className="block font-bold">Administration</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Manage content according to your role
                </span>
              </span>
              <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
            </Link>
          </li>
        ) : null}
      </ul>
    </AppShell>
  );
}
