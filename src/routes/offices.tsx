import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { Building2, Compass, MapPin, Navigation, Phone, Search, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const OfficesMap = lazy(() =>
  import("@/components/OfficesMap").then((m) => ({ default: m.OfficesMap })),
);

export const Route = createFileRoute("/offices")({
  head: () => ({
    meta: [
      { title: "مكاتب التجمع والمرشحين — Offices & Candidates" },
      {
        name: "description",
        content:
          "Find the offices of تجمع الفاو زاخو and its candidates on an interactive map, see the nearest office to you and get directions.",
      },
      { property: "og:title", content: "مكاتب التجمع والمرشحين — Offices & Candidates" },
      {
        property: "og:description",
        content: "Interactive map of party and candidate offices with directions and contacts.",
      },
    ],
  }),
  component: OfficesPage,
});

type Office = {
  id: string;
  name: string;
  candidate_name: string;
  description: string;
  address: string;
  city: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  category: string;
};

type Coords = { lat: number; lng: number };

function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

const CATEGORY_LABEL: Record<string, string> = {
  headquarters: "Headquarters",
  office: "Party office",
  candidate: "Candidate office",
};

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
            ? "Location permission was denied. You can still browse all offices below."
            : "We couldn't determine your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const clear = () => {
    setPosition(null);
    setStatus("idle");
    setMessage(null);
  };

  return { position, status, message, request, clear };
}

function OfficesPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const geo = useGeolocation();

  const query = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offices")
        .select(
          "id,name,candidate_name,description,address,city,phone,latitude,longitude,category",
        )
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Office[];
    },
  });

  const offices = useMemo(() => {
    const list = (query.data ?? []).map((office) => ({
      ...office,
      distance: geo.position
        ? distanceKm(geo.position, { lat: office.latitude, lng: office.longitude })
        : null,
    }));
    const term = search.trim().toLowerCase();
    const filtered = term
      ? list.filter((o) =>
          [o.name, o.candidate_name, o.city, o.address].join(" ").toLowerCase().includes(term),
        )
      : list;
    return geo.position
      ? [...filtered].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      : filtered;
  }, [query.data, geo.position, search]);

  const selected = offices.find((o) => o.id === selectedId) ?? null;
  const nearest = geo.position ? offices[0] : null;

  return (
    <AppShell
      arabicTitle="مكاتب التجمع والمرشحين"
      title="Offices & Candidates"
      subtitle="Find your nearest office on the map, view contact details and get directions."
    >
      <div className="space-y-4">
        <div className="card-soft overflow-hidden p-3">
          <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-xl sm:h-[340px]" />}>
            <OfficesMap
              offices={offices}
              userPosition={geo.position}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={geo.position ? geo.clear : geo.request}
              disabled={geo.status === "loading"}
            >
              <Compass className="size-4" />
              {geo.status === "loading"
                ? "Locating…"
                : geo.position
                  ? "Clear my location"
                  : "Find offices near me"}
            </Button>
            {nearest ? (
              <span className="text-xs text-muted-foreground">
                Nearest: <span className="text-arabic font-semibold">{nearest.name}</span>
                {nearest.distance != null ? ` · ${formatDistance(nearest.distance)}` : ""}
              </span>
            ) : null}
          </div>
          {geo.message ? (
            <p className="mt-2 text-xs text-destructive">{geo.message}</p>
          ) : null}
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by office, candidate or city"
            aria-label="Search offices"
            className="pl-9"
          />
        </div>

        {selected ? (
          <OfficeDetails office={selected} onClose={() => setSelectedId(null)} />
        ) : null}

        {query.isPending ? (
          <LoadingList rows={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : offices.length === 0 ? (
          <EmptyState
            title="No offices found"
            description="No office matches your search. Try a different name or city."
          />
        ) : (
          <ul className="space-y-3">
            {offices.map((office) => (
              <li key={office.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(office.id)}
                  className="card-soft w-full p-4 text-start transition hover:shadow-md"
                  aria-pressed={selectedId === office.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-arabic leading-tight font-bold">{office.name}</h3>
                      <p className="text-arabic mt-0.5 text-sm text-muted-foreground">
                        {office.candidate_name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {CATEGORY_LABEL[office.category] ?? "Office"}
                    </Badge>
                  </div>
                  <p className="text-arabic mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    {[office.address, office.city].filter(Boolean).join("، ")}
                  </p>
                  {office.distance != null ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Navigation className="size-3.5" />
                      {formatDistance(office.distance)}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function OfficeDetails({
  office,
  onClose,
}: {
  office: Office & { distance: number | null };
  onClose: () => void;
}) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${office.latitude},${office.longitude}`;

  return (
    <section className="card-soft space-y-3 border-accent/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="gold-rule w-8" />
          <h2 className="text-arabic mt-2 text-lg leading-tight font-bold">{office.name}</h2>
          <p className="text-arabic mt-0.5 text-sm text-muted-foreground">
            {office.candidate_name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close office details"
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {office.description ? (
        <p className="text-sm text-muted-foreground">{office.description}</p>
      ) : null}

      <ul className="space-y-2 text-sm">
        <li className="text-arabic flex items-start gap-2">
          <Building2 className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>{[office.address, office.city].filter(Boolean).join("، ")}</span>
        </li>
        {office.phone ? (
          <li className="flex items-center gap-2">
            <Phone className="size-4 shrink-0 text-accent" />
            <a href={`tel:${office.phone}`} className="font-medium hover:underline" dir="ltr">
              {office.phone}
            </a>
          </li>
        ) : null}
        {office.distance != null ? (
          <li className="flex items-center gap-2">
            <Navigation className="size-4 shrink-0 text-accent" />
            <span className="font-semibold">{formatDistance(office.distance)}</span>
          </li>
        ) : null}
      </ul>

      <Button asChild className="w-full">
        <a href={directions} target="_blank" rel="noopener noreferrer">
          <Navigation className="size-4" /> Get directions
        </a>
      </Button>
    </section>
  );
}
