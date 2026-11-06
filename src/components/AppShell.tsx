
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Newspaper,
  Bot,
  CalendarDays,
  Users,
  MessagesSquare,
  MessageSquareText,
  BarChart3,
  MapPin,
  GraduationCap,
  UserRound,
  LogIn,
  Settings2,
  WifiOff,
  Video,
} from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useRoles, useSession } from "@/lib/auth";

let sectionAudio: AudioContext | undefined;

function playSectionClick(event: MouseEvent<HTMLDivElement>) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return;
  const url = new URL(link.href);
  if (url.origin !== window.location.origin || url.hash) return;

  try {
    // Create audio only inside a user gesture; never autoplay on page load.
    sectionAudio ??= new AudioContext();
    const context = sectionAudio;
    if (context.state === "suspended") void context.resume().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.035);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + 0.045);
  } catch {
    // Unsupported or blocked audio must never prevent navigation.
  }
}

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
  {
    to: "/membership",
    title: "الانتماء",
    desc: "التعريف ببرنامج الانتماء وشروطه",
    icon: Users,
  },
  {
    to: "/forum",
    title: "المنتدى الفكري والثقافي",
    desc: "ناقش الأفكار وتبادل المعرفة مع الأعضاء",
    icon: MessageSquareText,
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
  themeClassName,
  wide,
  flush,
}: {
  children: ReactNode;
  title?: string;
  arabicTitle?: string;
  subtitle?: string;
  /** Optional scoped theme class applied to this page only. */
  themeClassName?: string;
  /** Allow a wider desktop layout (used by split map views). */
  wide?: boolean;
  /** Remove the main content padding so a page can render edge-to-edge. */
  flush?: boolean;
}) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const { data: session } = useSession();
  const { isStaff } = useRoles();
  const online = useOnlineStatus();

  return (
    <div
      className={cn("min-h-screen bg-background", themeClassName)}
      onClickCapture={playSectionClick}
    >
      <div
        className={cn(
          "flex min-h-screen w-full flex-col bg-background",
          wide && "lg:w-full",
        )}
      >
        <header className="surface-navy sticky top-0 z-30 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.22em] text-primary-foreground/60 uppercase">
                Official platform
              </p>

              <h2 className="text-arabic mt-1 text-lg leading-tight font-bold">
                تجمع الفاو زاخو
              </h2>
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
                {session ? (
                  <UserRound className="size-4" />
                ) : (
                  <LogIn className="size-4" />
                )}
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
                <p className="mt-1 text-sm text-primary-foreground/70">
                  {title}
                </p>
              ) : null}

              {subtitle ? (
                <p className="mt-2 text-sm text-primary-foreground/70">
                  {subtitle}
                </p>
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

        <main
          className={cn(
            "min-w-0 w-full flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))]",
            flush ? "px-0 pt-0" : "px-5 pt-5",
          )}
        >
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-border bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-5">
            {TABS.map((tab) => {
              const active =
                tab.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.to.slice(0, 5));

              const Icon = tab.icon;

              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("size-5", active && "text-accent")}
                    />

                    <span className="text-arabic block max-w-full truncate leading-tight font-semibold">
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
 