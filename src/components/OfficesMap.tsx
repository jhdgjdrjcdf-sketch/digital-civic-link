import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type OfficePin = {
  id: string;
  name: string;
  candidate_name: string;
  latitude: number;
  longitude: number;
};

type Props = {
  offices: OfficePin[];
  userPosition?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

/**
 * Interactive map built on Leaflet + OpenStreetMap tiles.
 * Leaflet is imported inside an effect so the module never evaluates during SSR.
 */
export function OfficesMap({ offices, userPosition, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, LeafletMarker>>({});
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [33.3, 44.4],
        zoom: 6,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
      // Force a re-layout once the container has its final size.
      setTimeout(() => map.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    };
  }, []);

  // Sync office markers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;

      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      const points: [number, number][] = [];
      offices.forEach((office) => {
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#0B1F3A;border:2px solid #C8A24A;color:#fff;font-size:12px;font-weight:700;box-shadow:0 4px 10px rgba(0,0,0,.25)">&#9679;</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([office.latitude, office.longitude], { icon })
          .addTo(map)
          .bindTooltip(office.name, { direction: "top", offset: [0, -12] })
          .on("click", () => selectRef.current?.(office.id));
        markersRef.current[office.id] = marker;
        points.push([office.latitude, office.longitude]);
      });

      if (userPosition) points.push([userPosition.lat, userPosition.lng]);
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points).pad(0.2));
      } else if (points.length === 1) {
        map.setView(points[0]!, 13);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offices, userPosition]);

  // User location marker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (!userPosition) return;
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25)"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], { icon })
        .addTo(map)
        .bindTooltip("Your location", { direction: "top", offset: [0, -10] });
    })();
    return () => {
      cancelled = true;
    };
  }, [userPosition]);

  // Pan to the selected office.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const office = offices.find((o) => o.id === selectedId);
    if (!office) return;
    map.setView([office.latitude, office.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
    });
    markersRef.current[selectedId]?.openTooltip();
  }, [selectedId, offices]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="application"
      aria-label="Map of offices"
      className="h-[260px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[340px]"
    />
  );
}

export default OfficesMap;
