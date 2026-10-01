import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Award, LogOut } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingList, SectionTitle } from "@/components/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useRoles, useSession } from "@/lib/auth";
import { useCertificates, useCourses } from "@/lib/academy";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — تجمع الفاو زاخو" },
      { name: "description", content: "Your profile, roles and academy certificates." },
      { property: "og:title", content: "Your account — تجمع الفاو زاخو" },
      { property: "og:description", content: "Your profile, roles and academy certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const { roles } = useRoles();
  const certificates = useCertificates();
  const courses = useCourses();
  const titleOf = (id: string) => courses.data?.find((c) => c.id === id)?.title ?? "Course";

  if (isPending) return <AppShell title="Your account"><LoadingList rows={2} /></AppShell>;
  if (!session)
    return (
      <AppShell title="Your account">
        <EmptyState
          title="You're not signed in"
          description="Sign in to see your profile and certificates."
          action={<Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>}
        />
      </AppShell>
    );

  return (
    <AppShell title="Your account">
      <div className="space-y-6">
        <section className="card-soft space-y-2 p-4">
          <p className="font-semibold">{(session.user.user_metadata?.display_name as string) || session.user.email}</p>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
          <p className="text-xs text-muted-foreground">
            Roles: {roles.length ? roles.map((r) => ROLE_LABELS[r] ?? r).join(", ") : "Member"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </section>
        <section>
          <SectionTitle title="Your certificates" />
          {certificates.isPending ? (
            <LoadingList rows={1} />
          ) : !certificates.data?.length ? (
            <EmptyState title="No certificates yet" description="Complete a course to earn one." />
          ) : (
            <ul className="space-y-2">
              {certificates.data.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/academy/certificate/$serial"
                    params={{ serial: c.serial }}
                    className="card-soft flex items-center gap-3 p-4 text-sm"
                  >
                    <Award className="size-5 text-accent" />
                    <span className="flex-1 font-medium">{titleOf(c.course_id)}</span>
                    <span className="text-xs text-muted-foreground">{c.serial}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
