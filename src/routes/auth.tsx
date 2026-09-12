import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { friendlyError, useSession } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — تجمع الفاو زاخو" },
      { name: "description", content: "Sign in to take part in discussions and polls." },
      { property: "og:title", content: "Sign in — تجمع الفاو زاخو" },
      { property: "og:description", content: "Sign in to take part in discussions and polls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/account", replace: true });
  }, [session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      toast.error("Your password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim().slice(0, 60) },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        toast.success("Welcome. Your account is ready.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      }
      void navigate({ to: "/account", replace: true });
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  async function handleReset() {
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(friendlyError(error));
    else toast.success("If that address exists, a reset link is on its way.");
  }

  if (checkEmail) {
    return (
      <AppShell title="Check your email">
        <div className="card-soft space-y-3 p-6 text-center">
          <h2 className="text-base font-semibold">Confirm your email address</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to {email.trim()}. Open it to activate your account, then
            come back and sign in.
          </p>
          <Button variant="outline" onClick={() => setCheckEmail(false)}>
            Back to sign in
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={mode === "signin" ? "Sign in" : "Create an account"}
      subtitle="Members can take part in discussions, consultations and the leadership academy."
    >
      <form onSubmit={handleSubmit} className="card-soft space-y-4 p-5">
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Full name</Label>
            <Input
              id="display-name"
              value={displayName}
              maxLength={60}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name as other members will see it"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            className="font-semibold text-primary"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "I already have an account"}
          </button>
          {mode === "signin" ? (
            <button type="button" className="text-muted-foreground" onClick={handleReset}>
              Forgot password?
            </button>
          ) : null}
        </div>
      </form>
    </AppShell>
  );
}
