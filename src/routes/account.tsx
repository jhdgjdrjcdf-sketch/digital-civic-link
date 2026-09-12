import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Award, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingList, SectionTitle } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, friendlyError, useRoles, useSession, type AppRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — تجمع الفاو زاخو" },
      { name: "description", content: "Your profile, roles, certificates and participation." },
      { property: "og:title", content: "Your account — تجمع الفاو زاخو" },
      { property: "og:description", content: "Your profile, roles and certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = useSession();
  const { roles, isStaff } = useRoles();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: "/auth", replace: true });
  }, [isPending, session, navigate]);

  const profile = useQuery({
    queryKey: ["profile", session?.user.id ?? "anonymous"],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data?.display_name) setDisplayName(profile.data.display_name);
  }, [profile.data?.display_name]);

  const certificates = useQuery({
    queryKey: ["certificates", session?.user.id ?? "anonymous"],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, score, serial, issued_at, courses(title)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveName = useMutation({
    mutationFn: async () => {
      const value = displayName.trim().slice(0, 60);
      if (value.length < 2) throw new Error("Please enter at least 2 characters.");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: value })
        .eq("id", session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your name has been updated.");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const bootstrap = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("bootstrap_super_admin");
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (claimed) => {
      toast[claimed ? "success" : "info"](
        claimed
          ? "You are now the administrator of this platform."
          : "An administrator already exists for this platform.",
      );
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  if (isPending || !session) {
    return (
      <AppShell title="Your account">
        <LoadingList rows={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Your account" subtitle={session.user.email ?? undefined}>
      <section className="card-soft mb-6 space-y-3 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={displayName}
            maxLength={60}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <Button onClick={() => saveName.mutate()} disabled={saveName.isPending}>
          {saveName.isPending ? "Saving…" : "Save changes"}
        </Button>
        {profile.data?.created_at ? (
          <p className="text-xs text-muted-foreground">
            Member since {formatDate(profile.data.created_at)}
          </p>
        ) : null}
      </section>

      <section className="mb-6">
        <SectionTitle title="Your roles" />
        <div className="card-soft flex flex-wrap gap-2 p-4">
          {roles.length === 0 ? (
            <span className="text-sm text-muted-foreground">Member</span>
          ) : (
            roles.map((role) => (
              <Badge key={role} variant="secondary">
                {ROLE_LABELS[role as AppRole] ?? role}
              </Badge>
            ))
          )}
        </div>
        {isStaff ? (
          <Link
            to="/admin"
            className="card-soft mt-3 flex items-center gap-3 p-4 text-sm font-semibold"
          >
            <ShieldCheck className="size-5 text-accent" /> Open content management
          </Link>
        ) : (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => bootstrap.mutate()}
            disabled={bootstrap.isPending}
          >
            Claim administrator access (first user only)
          </Button>
        )}
      </section>

      <section className="mb-6">
        <SectionTitle title="Your certificates" />
        {certificates.isPending ? (
          <LoadingList rows={1} />
        ) : (certificates.data ?? []).length === 0 ? (
          <EmptyState
            title="No certificates yet"
            description="Complete a course test in the leadership academy to earn your first certificate."
          />
        ) : (
          <ul className="space-y-3">
            {(certificates.data ?? []).map((certificate) => (
              <li key={certificate.id} className="card-soft flex items-center gap-3 p-4">
                <Award className="size-6 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-semibold">
                    {(certificate as { courses?: { title?: string } }).courses?.title ?? "Course"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score {certificate.score}% · Serial {certificate.serial} ·{" "}
                    {formatDate(certificate.issued_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </AppShell>
  );
}
