import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

export type MapPin = {
  id: string;
  kind: "office" | "candidate";
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  initials?: string;
};

/** @deprecated kept for backwards compatibility with older imports */
export type OfficePin = { id: string; name: string; city: string; latitude: number; longitude: number };

type Props = {
  pins: MapPin[];
  userPosition?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

const CLUSTER_RADIUS = 46;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Leaflet + OpenStreetMap map with lightweight pixel clustering.
 * Leaflet is imported inside effects so the module never evaluates during SSR.
 */
export function OfficesMap({ pins, userPosition, selectedId, onSelect, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const state = useRef({ pins, selectedId, onSelect });
  state.current = { pins, selectedId, onSelect };
  const [ready, setReady] = useState(false);

  const render = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    const { pins: list, selectedId: sel } = state.current;

    const groups: { members: MapPin[]; x: number; y: number }[] = [];
    for (const pin of list) {
      const p = map.latLngToLayerPoint([pin.lat, pin.lng]);
      if (pin.id === sel) {
        groups.push({ members: [pin], x: p.x, y: p.y });
        continue;
      }
      const hit = groups.find(
        (g) => g.members[0]!.id !== sel && Math.hypot(g.x - p.x, g.y - p.y) < CLUSTER_RADIUS,
      );
      if (hit) hit.members.push(pin);
      else groups.push({ members: [pin], x: p.x, y: p.y });
    }

    for (const g of groups) {
      if (g.members.length === 1) {
        const pin = g.members[0]!;
        const active = pin.id === sel;
        const html =
          pin.kind === "office"
            ? `<span class="atlas-pin atlas-pin-office${active ? " is-active" : ""}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5"/></svg></span>`
            : `<span class="atlas-pin atlas-pin-candidate${active ? " is-active" : ""}">${esc(pin.initials ?? "•")}</span>`;
        const size = pin.kind === "office" ? 38 : 32;
        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: "atlas-pin-shell",
            html,
            iconSize: [size, size],
            iconAnchor: pin.kind === "office" ? [size / 2, size] : [size / 2, size / 2],
          }),
          zIndexOffset: active ? 1000 : pin.kind === "office" ? 100 : 0,
          keyboard: true,
          title: pin.label,
        })
          .bindTooltip(`<strong>${esc(pin.label)}</strong>${pin.sub ? `<br/><small>${esc(pin.sub)}</small>` : ""}`, {
            direction: "top",
            offset: [0, pin.kind === "office" ? -size : -size / 2],
          })
          .on("click", () => state.current.onSelect?.(pin.id));
        layer.addLayer(marker);
      } else {
        const latlngs = g.members.map((m) => L.latLng(m.lat, m.lng));
        const center = L.latLngBounds(latlngs).getCenter();
        const offices = g.members.filter((m) => m.kind === "office").length;
        const n = g.members.length;
        const marker = L.marker(center, {
          icon: L.divIcon({
            className: "atlas-pin-shell",
            html: `<span class="atlas-cluster"><b>${n}</b><small>${offices ? `${offices} office${offices > 1 ? "s" : ""}` : "people"}</small></span>`,
            iconSize: [52, 52],
            iconAnchor: [26, 26],
          }),
          title: `${n} places`,
          keyboard: true,
        }).on("click", () => {
          const bounds = L.latLngBounds(latlngs);
          const target = map.getBoundsZoom(bounds.pad(0.4));
          if (target <= map.getZoom()) map.flyTo(center, Math.min(map.getZoom() + 2, 18), { duration: 0.5 });
          else map.flyToBounds(bounds.pad(0.4), { duration: 0.6, maxZoom: 16 });
        });
        layer.addLayer(marker);
      }
    }
  };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = (mod.default ?? mod) as typeof import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: [33.2, 43.8],
        zoom: 6,
        minZoom: 5,
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);
      map.on("zoomend", render);
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    })();
    const ro =
      typeof ResizeObserver !== "undefined" && containerRef.current
        ? new ResizeObserver(() => mapRef.current?.invalidateSize())
        : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      userLayerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit to the visible pins whenever the set of pins changes.
  const pinKey = pins.map((p) => p.id).join(",");
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const pts: [number, number][] = pins.map((p) => [p.lat, p.lng]);
    if (userPosition) pts.push([userPosition.lat, userPosition.lng]);
    if (!state.current.selectedId) {
      if (pts.length > 1) map.flyToBounds(L.latLngBounds(pts).pad(0.25), { duration: 0.6, maxZoom: 13 });
      else if (pts.length === 1) map.flyTo(pts[0]!, 13, { duration: 0.6 });
    }
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, ready, userPosition]);

  // Re-render markers and focus the selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    render();
    const pin = pins.find((p) => p.id === selectedId);
    if (pin) map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  // User location marker.
  useEffect(() => {
    const L = LRef.current;
    const layer = userLayerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    if (!userPosition) return;
    L.marker([userPosition.lat, userPosition.lng], {
      icon: L.divIcon({ className: "", html: `<span class="office-user-marker"></span>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
      zIndexOffset: 2000,
    })
      .bindTooltip("Your location", { direction: "top", offset: [0, -10] })
      .addTo(layer);
  }, [userPosition, ready]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="application"
      aria-label="Map of offices and candidates"
      className={className ?? "h-[360px] w-full"}
    />
  );
}

export default OfficesMap;
