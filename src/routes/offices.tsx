import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock,
  Compass,
  Globe,
  List,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { IRAQ_GOVERNORATES, governorateLabel } from "@/lib/governorates";
import { useSignedUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { MapPin as Pin } from "@/components/OfficesMap";

const OfficesMap = lazy(() =>
  import("@/components/OfficesMap").then((m) => ({ default: m.OfficesMap })),
);

export const Route = createFileRoute("/offices")({
  head: () => ({
    meta: [
      { title: "دليل الفاو زاخو — Offices & Candidates Directory" },
      {
        name: "description",
        content:
          "Explore every office and candidate of تجمع الفاو زاخو on an interactive map: addresses, working hours, contacts, profiles and directions.",
      },
      { property: "og:title", content: "دليل الفاو زاخو — Offices & Candidates Directory" },
      {
        property: "og:description",
        content: "Interactive map directory of party offices and candidates with directions and profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DirectoryPage,
});

type Office = {
  id: string;
  name: string;
  candidate_name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  governorate: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  working_hours: string;
  services: string[];
  latitude: number;
  longitude: number;
  category: string;
  image_url: string | null;
  updated_at: string;
};

type Candidate = {
  id: string;
  office_id: string;
  full_name: string;
  political_role: string;
  city: string;
  district: string;
  portrait_url: string | null;
  summary: string;
  cv_summary: string;
  education: string[];
  experience: string[];
  previous_positions: string[];
  achievements: string[];
  responsibilities: string[];
  phone: string | null;
  email: string | null;
  website_url: string | null;
  updated_at: string;
};

type Official = {
  id: string;
  office_id: string;
  full_name: string;
  responsibility: string;
  phone: string | null;
  email: string | null;
};

type Coords = { lat: number; lng: number };
type Filter = "all" | "office" | "candidate";

const CATEGORY_LABEL: Record<string, string> = {
  headquarters: "Headquarters",
  office: "Party office",
  candidate: "Candidate office",
};

function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const directionsUrl = (o: Office) =>
  `https://www.google.com/maps/dir/?api=1&destination=${o.latitude},${o.longitude}`;

function useGeolocation() {
  const [position, setPosition] = useState<Coords | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setMessage("Location is not supported on this device.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        setStatus("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. You can still browse the full directory."
            : "We couldn't determine your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return { position, status, message, request };
}

function useDirectory() {
  return useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const [o, c, f] = await Promise.all([
        supabase
          .from("offices")
          .select(
            "id,name,candidate_name,description,address,city,district,governorate,phone,email,whatsapp,working_hours,services,latitude,longitude,category,image_url,updated_at",
          )
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("office_candidates")
          .select(
            "id,office_id,full_name,political_role,city,district,portrait_url,summary,cv_summary,education,experience,previous_positions,achievements,responsibilities,phone,email,website_url,updated_at",
          )
          .eq("is_visible", true)
          .order("display_order"),
        supabase
          .from("office_officials")
          .select("id,office_id,full_name,responsibility,phone,email")
          .eq("is_visible", true)
          .order("display_order"),
      ]);
      if (o.error) throw o.error;
      if (c.error) throw c.error;
      if (f.error) throw f.error;
      return {
        offices: (o.data ?? []) as Office[],
        candidates: (c.data ?? []) as Candidate[],
        officials: (f.data ?? []) as Official[],
      };
    },
  });
}

function DirectoryPage() {
  const query = useDirectory();
  const geo = useGeolocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [governorate, setGovernorate] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [sheetOpen, setSheetOpen] = useState(false);
  const wantNearest = useRef(false);
  const govListRef = useRef<HTMLDivElement | null>(null);

  const data = query.data;
  const officeById = useMemo(() => new Map((data?.offices ?? []).map((o) => [o.id, o])), [data]);

  const term = search.trim().toLowerCase();
  const has = (...parts: (string | null | undefined)[]) =>
    !term || parts.filter(Boolean).join(" ").toLowerCase().includes(term);

  const offices = useMemo(() => {
    if (!data || filter === "candidate") return [];
    const list = data.offices
      .filter((o) => !governorate || o.governorate === governorate)
      .filter((o) =>
        has(
          o.name,
          o.candidate_name,
          o.city,
          o.district,
          o.address,
          governorateLabel(o.governorate),
          ...data.officials.filter((f) => f.office_id === o.id).map((f) => f.full_name),
          ...data.candidates.filter((c) => c.office_id === o.id).map((c) => c.full_name),
        ),
      )
      .map((o) => ({
        ...o,
        distance: geo.position ? distanceKm(geo.position, { lat: o.latitude, lng: o.longitude }) : null,
      }));
    return geo.position ? list.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, governorate, term, geo.position]);

  const candidates = useMemo(() => {
    if (!data || filter === "office") return [];
    return data.candidates.filter((c) => {
      const office = officeById.get(c.office_id);
      if (!office) return false;
      if (governorate && office.governorate !== governorate) return false;
      return has(c.full_name, c.political_role, c.city, c.district, office.name, governorateLabel(office.governorate));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, governorate, term, officeById]);

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = offices.map((o) => ({
      id: `o:${o.id}`,
      kind: "office",
      lat: o.latitude,
      lng: o.longitude,
      label: o.name,
      sub: governorateLabel(o.governorate),
    }));
    const byOffice = new Map<string, Candidate[]>();
    candidates.forEach((c) => byOffice.set(c.office_id, [...(byOffice.get(c.office_id) ?? []), c]));
    byOffice.forEach((list, officeId) => {
      const office = officeById.get(officeId)!;
      list.forEach((c, i) => {
        const angle = (i / list.length) * Math.PI * 2 + Math.PI / 4;
        out.push({
          id: `c:${c.id}`,
          kind: "candidate",
          lat: office.latitude + Math.sin(angle) * 0.0032,
          lng: office.longitude + Math.cos(angle) * 0.0042,
          label: c.full_name,
          sub: c.political_role,
          initials: initials(c.full_name),
        });
      });
    });
    return out;
  }, [offices, candidates, officeById]);

  // When "Nearest office" was requested, select it once the location arrives.
  useEffect(() => {
    if (!wantNearest.current || !geo.position || !data) return;
    wantNearest.current = false;
    const nearest = [...data.offices].sort(
      (a, b) =>
        distanceKm(geo.position!, { lat: a.latitude, lng: a.longitude }) -
        distanceKm(geo.position!, { lat: b.latitude, lng: b.longitude }),
    )[0];
    if (nearest) {
      setFilter((f) => (f === "candidate" ? "all" : f));
      setGovernorate("");
      setSelected(`o:${nearest.id}`);
      setView("map");
    }
  }, [geo.position, data]);

  const findNearest = () => {
    wantNearest.current = true;
    if (geo.position) {
      // Re-run the effect with the cached position.
      const p = geo.position;
      geo.request();
      void p;
    } else geo.request();
  };

  const selectedOffice = selected?.startsWith("o:") ? officeById.get(selected.slice(2)) ?? null : null;
  const selectedCandidate = selected?.startsWith("c:")
    ? data?.candidates.find((c) => c.id === selected.slice(2)) ?? null
    : null;

  // Governorate whose candidates are listed: the selected office's, or the
  // selected candidate's office governorate, or the governorate filter.
  const activeGov =
    selectedOffice?.governorate ??
    (selectedCandidate ? officeById.get(selectedCandidate.office_id)?.governorate : undefined) ??
    governorate;
  const govCandidates = useMemo(
    () =>
      !data || !activeGov
        ? []
        : data.candidates.filter((c) => officeById.get(c.office_id)?.governorate === activeGov),
    [data, activeGov, officeById],
  );

  const pick = (id: string) => {
    setSelected(id);
    setView("map");
  };

  const openCandidate = (id: string) => {
    setSelected(`c:${id}`);
    setSheetOpen(true);
  };

  const nearestDistance =
    selectedOffice && geo.position
      ? distanceKm(geo.position, { lat: selectedOffice.latitude, lng: selectedOffice.longitude })
      : null;

  const detail =
    data && selectedOffice ? (
      <OfficeDetail
        office={selectedOffice}
        distance={nearestDistance}
        candidates={govCandidates}
        officeById={officeById}
        officials={data.officials.filter((f) => f.office_id === selectedOffice.id)}
        onCandidate={(id) => setSelected(`c:${id}`)}
      />
    ) : data && selectedCandidate ? (
      <CandidateDetail
        candidate={selectedCandidate}
        office={officeById.get(selectedCandidate.office_id) ?? null}
        onOffice={(id) => setSelected(`o:${id}`)}
      />
    ) : null;

  const total = offices.length + candidates.length;

  return (
    <AppShell themeClassName="atlas" wide arabicTitle="دليل الفاو زاخو" title="Directory · Offices & Candidates">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, governorate, district or office"
              aria-label="Search the directory"
              className="h-12 rounded-2xl border-border bg-card ps-10 pe-10 shadow-[var(--shadow-soft)]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            <div className="flex shrink-0 rounded-full border border-border bg-card p-1 lg:hidden" role="tablist" aria-label="View">
              {(["map", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {v === "map" ? <MapIcon className="size-3.5" /> : <List className="size-3.5" />}
                  {v === "map" ? "Map" : "List"}
                </button>
              ))}
            </div>
            {(
              [
                ["all", "All"],
                ["office", "Offices"],
                ["candidate", "Candidates"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  filter === v
                    ? "border-accent bg-accent/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
            <select
              aria-label="Filter by governorate"
              value={governorate}
              onChange={(e) => {
                const g = e.target.value;
                setGovernorate(g);
                const first = data?.offices.find((o) => o.governorate === g);
                setSelected(first ? `o:${first.id}` : null);
              }}
              className="text-arabic h-9 shrink-0 rounded-full border border-border bg-card px-3 text-xs font-semibold"
            >
              <option value="">All governorates</option>
              {IRAQ_GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={findNearest}
              disabled={geo.status === "loading"}
              className="h-9 shrink-0 rounded-full"
            >
              <Compass className={cn("size-4", geo.status === "loading" && "animate-spin")} />
              {geo.status === "loading" ? "Locating…" : "Nearest office"}
            </Button>
          </div>
          {geo.message ? <p className="text-xs text-destructive">{geo.message}</p> : null}
        </div>

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-5">
            {/* Directory panel */}
            <aside className={cn("space-y-3", view === "map" && "hidden", "lg:block")}>
              {query.isPending ? (
                <LoadingList rows={4} />
              ) : detail ? (
                <div className="hidden animate-atlas-rise lg:block">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" /> Back to directory
                  </button>
                  <div className="card-soft p-5">{detail}</div>
                </div>
              ) : null}
              {!query.isPending ? (
                <div className={cn("space-y-3", detail && "lg:hidden")}>
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {total} result{total === 1 ? "" : "s"}
                  </p>
                  {total === 0 ? (
                    <EmptyState title="Nothing matches" description="Try a different name, governorate or filter." />
                  ) : (
                    <ul className="space-y-2.5">
                      {offices.map((o) => (
                        <li key={o.id}>
                          <OfficeCard
                            office={o}
                            distance={o.distance}
                            count={data!.candidates.filter((c) => c.office_id === o.id).length}
                            active={selected === `o:${o.id}`}
                            onClick={() => pick(`o:${o.id}`)}
                          />
                        </li>
                      ))}
                      {candidates.map((c) => (
                        <li key={c.id}>
                          <CandidateCard
                            candidate={c}
                            office={officeById.get(c.office_id) ?? null}
                            active={selected === `c:${c.id}`}
                            onClick={() => pick(`c:${c.id}`)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </aside>

            {/* Map */}
            <section className={cn(view === "list" && "hidden", "lg:block")}>
              <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-muted shadow-[var(--shadow-raised)] lg:sticky lg:top-44">
                <Suspense fallback={<Skeleton className="h-[calc(100dvh-20rem)] min-h-[380px] w-full lg:h-[calc(100dvh-14rem)]" />}>
                  <OfficesMap
                    pins={pins}
                    userPosition={geo.position}
                    selectedId={selected}
                    onSelect={setSelected}
                    className="h-[calc(100dvh-20rem)] min-h-[380px] w-full lg:h-[calc(100dvh-14rem)] lg:min-h-[560px]"
                  />
                </Suspense>

                <div className="pointer-events-none absolute top-3 left-3 z-[500] flex gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[10px] font-semibold shadow-[var(--shadow-soft)]">
                    <span className="size-2.5 rounded-sm bg-primary ring-2 ring-accent" /> Office
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[10px] font-semibold shadow-[var(--shadow-soft)]">
                    <span className="size-2.5 rounded-full bg-accent ring-2 ring-primary" /> Candidate
                  </span>
                </div>

                {query.isPending ? (
                  <div className="absolute inset-0 z-[500] grid place-items-center bg-background/40 backdrop-blur-[1px]">
                    <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">Loading directory…</span>
                  </div>
                ) : total === 0 ? (
                  <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-card/95 p-3 text-center text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
                    No places match your search.
                  </div>
                ) : null}

                {/* Mobile peek card */}
                {data && (selectedOffice || selectedCandidate) ? (
                  <div className="absolute inset-x-3 bottom-3 z-[500] animate-atlas-rise lg:hidden">
                    <PeekCard
                      office={selectedOffice}
                      candidate={selectedCandidate}
                      parentOffice={selectedCandidate ? officeById.get(selectedCandidate.office_id) ?? null : null}
                      distance={nearestDistance}
                      candidateCount={selectedOffice ? govCandidates.length : 0}
                      onCandidates={() =>
                        govListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      onOpen={() => setSheetOpen(true)}
                      onClose={() => setSelected(null)}
                    />
                  </div>
                ) : null}
              </div>

              {/* Governorate candidates under the map (phones) */}
              {data && activeGov ? (
                <div ref={govListRef} className="mt-4 scroll-mt-40 space-y-2.5 lg:hidden">
                  <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    <span className="gold-rule w-4" />
                    <span className="text-arabic normal-case">
                      Candidates in {governorateLabel(activeGov)} ({govCandidates.length})
                    </span>
                  </h2>
                  {govCandidates.length ? (
                    <ul className="space-y-2.5">
                      {govCandidates.map((c) => (
                        <li key={c.id}>
                          <CandidateCard
                            candidate={c}
                            office={officeById.get(c.office_id) ?? null}
                            active={selected === `c:${c.id}`}
                            onClick={() => openCandidate(c.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No candidates published for this governorate yet.</p>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen && !!detail} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="atlas max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t-0 bg-background px-5 pt-3 pb-8 lg:hidden">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <SheetTitle className="sr-only">{selectedOffice?.name ?? selectedCandidate?.full_name ?? "Details"}</SheetTitle>
          <SheetDescription className="sr-only">Directory details</SheetDescription>
          {detail}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

/* ---------------- Cards ---------------- */

function Thumb({ path, alt, round, icon }: { path: string | null; alt: string; round?: boolean; icon: ReactNode }) {
  const url = useSignedUrl(path);
  const shape = round ? "rounded-full" : "rounded-xl";
  return url.data ? (
    <img src={url.data} alt={alt} loading="lazy" className={cn("size-14 shrink-0 object-cover", shape, round && "ring-2 ring-accent ring-offset-2 ring-offset-card")} />
  ) : (
    <span className={cn("grid size-14 shrink-0 place-items-center bg-secondary text-primary", shape, round && "ring-2 ring-accent/60 ring-offset-2 ring-offset-card")}>
      {icon}
    </span>
  );
}

function OfficeCard({
  office,
  distance,
  count,
  active,
  onClick,
}: {
  office: Office;
  distance: number | null;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "card-soft flex w-full items-start gap-3 p-3 text-start transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]",
        active && "ring-2 ring-accent",
      )}
    >
      <Thumb path={office.image_url} alt={office.name} icon={<Building2 className="size-6" />} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-arabic truncate leading-tight font-bold">{office.name}</h3>
          {distance != null ? (
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {formatDistance(distance)}
            </span>
          ) : null}
        </div>
        <p className="text-arabic mt-0.5 truncate text-xs text-muted-foreground">
          {[governorateLabel(office.governorate), office.district].filter(Boolean).join(" · ")}
        </p>
        <p className="text-arabic mt-1.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0 text-accent" />
          <span className="truncate">{[office.address, office.city].filter(Boolean).join("، ")}</span>
        </p>
        {count ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Users className="size-3" /> {count} candidate{count > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function CandidateCard({
  candidate,
  office,
  active,
  onClick,
}: {
  candidate: Candidate;
  office: Office | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "card-soft flex w-full items-center gap-3 p-3 text-start transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]",
        active && "ring-2 ring-accent",
      )}
    >
      <Thumb path={candidate.portrait_url} alt={candidate.full_name} round icon={<UserRound className="size-6" />} />
      <div className="min-w-0 flex-1">
        <h3 className="text-arabic truncate leading-tight font-bold">{candidate.full_name}</h3>
        <p className="truncate text-xs text-muted-foreground">{candidate.political_role}</p>
        <p className="text-arabic mt-1 truncate text-[11px] font-semibold text-primary">
          {[office ? governorateLabel(office.governorate) : "", candidate.district].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-[10px]">Candidate</Badge>
    </button>
  );
}

function PeekCard({
  office,
  candidate,
  parentOffice,
  distance,
  candidateCount,
  onCandidates,
  onOpen,
  onClose,
}: {
  office: Office | null;
  candidate: Candidate | null;
  parentOffice: Office | null;
  distance: number | null;
  candidateCount: number;
  onCandidates: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const target = office ?? parentOffice;
  return (
    <div className="rounded-2xl border border-border bg-card/97 p-3 shadow-[var(--shadow-raised)] backdrop-blur">
      <div className="flex items-start gap-3">
        {office ? (
          <Thumb path={office.image_url} alt={office.name} icon={<Building2 className="size-6" />} />
        ) : candidate ? (
          <Thumb path={candidate.portrait_url} alt={candidate.full_name} round icon={<UserRound className="size-6" />} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-wider text-accent uppercase">
            {office ? CATEGORY_LABEL[office.category] ?? "Office" : "Candidate"}
          </p>
          <h3 className="text-arabic truncate leading-tight font-bold">{office?.name ?? candidate?.full_name}</h3>
          <p className="text-arabic truncate text-xs text-muted-foreground">
            {office
              ? [governorateLabel(office.governorate), distance != null ? formatDistance(distance) : ""].filter(Boolean).join(" · ")
              : candidate?.political_role}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-m-1 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={onOpen} className="rounded-xl">
          {office ? "Office details" : "View profile"}
        </Button>
        {target ? (
          <Button size="sm" asChild className="rounded-xl">
            <a href={directionsUrl(target)} target="_blank" rel="noopener noreferrer">
              <Navigation className="size-4" /> Directions
            </a>
          </Button>
        ) : null}
      </div>
      {office ? (
        <Button size="sm" variant="secondary" onClick={onCandidates} className="mt-2 w-full rounded-xl">
          <Users className="size-4" /> Candidates in this governorate ({candidateCount})
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- Details ---------------- */

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
        <span className="gold-rule w-4" /> {title}
      </h3>
      {children}
    </section>
  );
}

function ContactButtons({ phone, email, whatsapp, website }: { phone?: string | null; email?: string | null; whatsapp?: string | null; website?: string | null }) {
  if (!phone && !email && !whatsapp && !website) {
    return <p className="text-xs text-muted-foreground">Contact details have not been published yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href={`tel:${phone}`} dir="ltr"><Phone className="size-4" />{phone}</a>
        </Button>
      ) : null}
      {whatsapp ? (
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" />WhatsApp</a>
        </Button>
      ) : null}
      {email ? (
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href={`mailto:${email}`}><Mail className="size-4" />Email</a>
        </Button>
      ) : null}
      {website ? (
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href={website} target="_blank" rel="noopener noreferrer"><Globe className="size-4" />Website</a>
        </Button>
      ) : null}
    </div>
  );
}

function OfficeDetail({
  office,
  distance,
  candidates,
  officeById,
  officials,
  onCandidate,
}: {
  office: Office;
  distance: number | null;
  candidates: Candidate[];
  officeById: Map<string, Office>;
  officials: Official[];
  onCandidate: (id: string) => void;
}) {
  const img = useSignedUrl(office.image_url);
  return (
    <div className="space-y-5">
      {img.data ? (
        <img src={img.data} alt={office.name} className="aspect-[16/9] w-full rounded-2xl object-cover" />
      ) : (
        <div className="surface-navy grid aspect-[16/7] w-full place-items-center rounded-2xl">
          <Building2 className="size-10 text-accent" />
        </div>
      )}
      <div>
        <Badge variant="secondary">{CATEGORY_LABEL[office.category] ?? "Office"}</Badge>
        <h2 className="text-arabic-display mt-2 text-2xl leading-tight">{office.name}</h2>
        <p className="text-arabic mt-1 text-sm text-muted-foreground">
          {[governorateLabel(office.governorate), office.district, office.city].filter(Boolean).join(" · ")}
        </p>
        {office.description ? <p className="mt-3 text-sm leading-relaxed">{office.description}</p> : null}
      </div>

      <ul className="space-y-2.5">
        <Row icon={<MapPin className="size-4" />}>
          <span className="text-arabic">{[office.address, office.city].filter(Boolean).join("، ")}</span>
          <p className="text-[11px] text-muted-foreground" dir="ltr">
            {office.latitude.toFixed(5)}, {office.longitude.toFixed(5)}
            {distance != null ? ` · ${formatDistance(distance)} away` : ""}
          </p>
        </Row>
        <Row icon={<Clock className="size-4" />}>
          {office.working_hours ? (
            <span>{office.working_hours}</span>
          ) : (
            <span className="text-muted-foreground">Working hours not published yet</span>
          )}
        </Row>
      </ul>

      <Button asChild className="h-11 w-full rounded-xl">
        <a href={directionsUrl(office)} target="_blank" rel="noopener noreferrer">
          <Navigation className="size-4" /> Navigate to this office
        </a>
      </Button>

      <Section title="Contact">
        <ContactButtons phone={office.phone} email={office.email} whatsapp={office.whatsapp} />
      </Section>

      <Section title="Services">
        {office.services?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {office.services.map((s) => (
              <span key={s} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Services have not been listed yet.</p>
        )}
      </Section>

      <Section title="Office team">
        {officials.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {officials.map((f) => (
              <li key={f.id} className="p-3">
                <p className="text-arabic text-sm font-semibold">{f.full_name}</p>
                <p className="text-xs text-muted-foreground">{f.responsibility}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {f.phone ? <a href={`tel:${f.phone}`} dir="ltr" className="flex items-center gap-1 font-semibold text-primary"><Phone className="size-3" />{f.phone}</a> : null}
                  {f.email ? <a href={`mailto:${f.email}`} className="flex items-center gap-1 font-semibold text-primary"><Mail className="size-3" />{f.email}</a> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No office team members published yet.</p>
        )}
      </Section>

      <Section title={`Candidates in ${governorateLabel(office.governorate)} (${candidates.length})`}>
        {candidates.length ? (
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id}>
                <CandidateCard
                  candidate={c}
                  office={officeById.get(c.office_id) ?? office}
                  active={false}
                  onClick={() => onCandidate(c.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No candidates published for this governorate yet.</p>
        )}
      </Section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarClock className="size-3.5" /> Last updated {formatDate(office.updated_at)}
      </p>
    </div>
  );
}

function CandidateDetail({
  candidate: c,
  office,
  onOffice,
}: {
  candidate: Candidate;
  office: Office | null;
  onOffice: (id: string) => void;
}) {
  const img = useSignedUrl(c.portrait_url);
  const lists: [string, string[]][] = [
    ["Education", c.education],
    ["Experience", c.experience],
    ["Previous positions", c.previous_positions],
    ["Achievements", c.achievements],
    ["Responsibilities", c.responsibilities],
  ];
  const hasCv = c.summary || c.cv_summary || lists.some(([, xs]) => xs?.length);
  return (
    <div className="space-y-5">
      <div className="surface-navy relative overflow-hidden rounded-2xl px-5 pt-6 pb-5 text-center">
        <div className="mx-auto size-28 overflow-hidden rounded-full ring-4 ring-accent ring-offset-4 ring-offset-primary">
          {img.data ? (
            <img src={img.data} alt={c.full_name} className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center bg-primary-deep text-accent">
              <UserRound className="size-12" />
            </span>
          )}
        </div>
        <h2 className="text-arabic-display mt-4 text-2xl leading-tight">{c.full_name}</h2>
        <p className="mt-1 text-sm opacity-80">{c.political_role}</p>
        <p className="text-arabic mt-2 text-xs font-semibold text-accent">
          {[office ? governorateLabel(office.governorate) : "", c.district ? `District: ${c.district}` : "", c.city].filter(Boolean).join(" · ")}
        </p>
      </div>

      {c.summary ? <p className="text-sm leading-relaxed">{c.summary}</p> : null}

      <Section title="Contact">
        <ContactButtons phone={c.phone} email={c.email} website={c.website_url} />
      </Section>

      {c.cv_summary ? (
        <Section title="CV">
          <p className="text-sm leading-relaxed text-muted-foreground">{c.cv_summary}</p>
        </Section>
      ) : null}

      {lists
        .filter(([, xs]) => xs?.length)
        .map(([title, xs]) => (
          <Section key={title} title={title}>
            <ul className="space-y-1.5 border-s-2 border-accent/50 ps-4 text-sm">
              {xs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Section>
        ))}

      {!hasCv ? (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          The biography and CV for this candidate have not been published yet.
        </p>
      ) : null}

      {office ? (
        <Section title="Related office">
          <OfficeCard office={office} distance={null} count={0} active={false} onClick={() => onOffice(office.id)} />
        </Section>
      ) : null}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarClock className="size-3.5" /> Last updated {formatDate(c.updated_at)}
      </p>
    </div>
  );
}
