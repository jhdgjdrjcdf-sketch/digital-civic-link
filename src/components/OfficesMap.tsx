import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type OfficePin = {
  id: string;
  name: string;
  city: string;
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
  const [mapReady, setMapReady] = useState(false);
  selectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [33.2, 43.8],
        zoom: 5,
        minZoom: 4,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      // Force a re-layout once the container has its final size.
      setTimeout(() => map.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
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
        const active = selectedId === office.id;
        const icon = L.divIcon({
          className: "office-marker-shell",
          html: `<span class="office-marker${active ? " office-marker-selected" : ""}"><span></span></span>`,
          iconSize: active ? [40, 48] : [34, 42],
          iconAnchor: active ? [20, 44] : [17, 38],
          tooltipAnchor: [0, -36],
        });
        const marker = L.marker([office.latitude, office.longitude], { icon })
          .addTo(map)
          .bindTooltip(`<strong>${office.name}</strong><br/><small>${office.city}</small>`, {
            direction: "top",
            offset: [0, -8],
          })
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
  }, [offices, userPosition, selectedId, mapReady]);

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
        html: `<span class="office-user-marker"></span>`,
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
  }, [userPosition, mapReady]);

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
  }, [selectedId, offices, mapReady]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="application"
      aria-label="Map of offices"
      className="h-[360px] w-full overflow-hidden border border-border bg-muted sm:h-[520px] lg:h-[620px]"
    />
  );
}

export default OfficesMap;
