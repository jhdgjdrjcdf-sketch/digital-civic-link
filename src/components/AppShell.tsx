import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Newspaper,
  Bot,
  CalendarDays,
  MessagesSquare,
  BarChart3,
  MapPin,
  GraduationCap,
  UserRound,
  LogIn,
  Settings2,
  WifiOff,
  Video,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useRoles, useSession } from "@/lib/auth";

const TABS = [
  { to: "/", label: "الرئيسية", sub: "Home", icon: Home },
  { to: "/news", label: "صوت التجمع", sub: "News", icon: Newspaper },
  { to: "/events", label: "Events", sub: "Events", icon: CalendarDays },
  { to: "/council", label: "المجلس", sub: "Council", icon: MessagesSquare },
  { to: "/more", label: "More", sub: "More", icon: BarChart3 },
] as const;

export const MORE_LINKS = [
  { to: "/meetings", title: "الاجتماعات", desc: "Internal live meetings for members", icon: Video },
  { to: "/polls", title: "Polls", desc: "Take part in open consultations", icon: BarChart3 },
  {
    to: "/offices",
    title: "مكاتب التجمع والمرشحين",
    desc: "Find the nearest office on the map",
    icon: MapPin,
  },
  {
    to: "/academy",
    title: "أكاديمية القيادة",
    desc: "Leadership courses and lessons",
    icon: GraduationCap,
  },
  {
    to: "/assistant",
    title: "المساعد الذكي للحزب",
    desc: "معلومات الحزب وخدماته الرسمية",
    icon: Bot,
  },
] as const;

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function AppShell({
  children,
  title,
  arabicTitle,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  arabicTitle?: string;
  subtitle?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = useSession();
  const { isStaff } = useRoles();
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col border-border bg-background sm:border-x">
        <header className="surface-navy sticky top-0 z-30 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.22em] text-primary-foreground/60 uppercase">
                Official platform
              </p>
              <h2 className="text-arabic mt-1 text-lg leading-tight font-bold">تجمع الفاو زاخو</h2>
            </div>
            <div className="flex items-center gap-2">
              {isStaff ? (
                <Link
                  to="/admin"
                  aria-label="Administration"
                  className="rounded-full bg-primary-foreground/10 p-2 text-primary-foreground transition hover:bg-primary-foreground/20"
                >
                  <Settings2 className="size-4" />
                </Link>
              ) : null}
              <Link
                to={session ? "/account" : "/auth"}
                aria-label={session ? "Your account" : "Sign in"}
                className="rounded-full bg-primary-foreground/10 p-2 text-primary-foreground transition hover:bg-primary-foreground/20"
              >
                {session ? <UserRound className="size-4" /> : <LogIn className="size-4" />}
              </Link>
            </div>
          </div>

          {(title || arabicTitle) && (
            <div className="mt-5">
              <div className="gold-rule w-10" />
              <h1
                className={cn(
                  "mt-3 text-2xl leading-tight font-bold",
                  arabicTitle && "text-arabic",
                )}
              >
                {arabicTitle ?? title}
              </h1>
              {arabicTitle && title ? (
                <p className="mt-1 text-sm text-primary-foreground/70">{title}</p>
              ) : null}
              {subtitle ? (
                <p className="mt-2 text-sm text-primary-foreground/70">{subtitle}</p>
              ) : null}
            </div>
          )}
        </header>

        {!online ? (
          <div className="flex items-center gap-2 bg-destructive/10 px-5 py-2 text-xs text-destructive">
            <WifiOff className="size-3.5" />
            You are offline. Showing the last loaded information.
          </div>
        ) : null}

        <main className="flex-1 px-5 pt-5 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-2xl border-t border-border bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-5">
            {TABS.map((tab) => {
              const active =
                tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to.slice(0, 5));
              const Icon = tab.icon;
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-5", active && "text-accent")} />
                    <span className={cn("text-arabic leading-none font-semibold")}>
                      {tab.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </div>
    </div>
  );
}
