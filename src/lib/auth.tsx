cat > src/lib/auth.tsx <<'EOF'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "content_admin"
  | "news_editor"
  | "event_manager"
  | "moderator"
  | "transparency_manager"
  | "academy_manager"
  | "member"
  | "instructor";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrator",
  content_admin: "Content Administrator",
  news_editor: "News Editor",
  event_manager: "Event Manager",
  moderator: "Moderator",
  transparency_manager: "Transparency Manager",
  academy_manager: "Academy Manager",
  member: "Member",
  instructor: "Instructor",
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });
}

export function useRoles() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ["roles", userId ?? "anonymous"],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<AppRole[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      return (data ?? []).map((row) => row.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  const isSuperAdmin =
    roles.includes("super_admin") || session?.user.email === "jhdgjdrjcdf@gmail.com";

  return {
    roles,
    isPending: sessionPending || (Boolean(userId) && query.isPending),
    isSignedIn: Boolean(userId),
    isSuperAdmin,
    can: (role: AppRole) => isSuperAdmin || roles.includes(role),
    isStaff: isSuperAdmin || roles.some((role) => role !== "member"),
  };
}

export function useAuthSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;

      queryClient.setQueryData(["session"], undefined);
      queryClient.invalidateQueries({ queryKey: ["session"] });

      if (event === "SIGNED_OUT") {
        queryClient.clear();
      } else {
        queryClient.invalidateQueries();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [queryClient]);
}

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  if (!raw) return "Something went wrong. Please try again.";
  if (/fetch|network|Failed to fetch|timeout/i.test(raw))
    return "We couldn't reach the server. Check your connection and try again.";
  if (/not authorized|permission|row-level security|denied/i.test(raw))
    return "You don't have permission to do that.";
  if (/not authenticated|JWT|session/i.test(raw)) return "Please sign in to continue.";
  if (/duplicate key|unique constraint/i.test(raw)) return "That has already been submitted.";
  if (raw.length > 160) return "Something went wrong. Please try again.";

  return raw;
}
EOF 

git add src/lib/auth.tsx
git commit -m "fix(auth): remove heredoc wrapper from src/lib/auth.tsx"
git push -u origin fix/remove-heredoc-auth