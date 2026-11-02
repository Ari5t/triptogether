"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import type { DayView } from "@triptogether/doc";
import { dayColor } from "@/components/avatar";
import type { Editor } from "./itinerary/stop-card";

// Worker files are copied to /public/maplibre by scripts/copy-maplibre.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const UKRAINE: [number, number] = [31.17, 48.38];

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const isDark = () => document.documentElement.classList.contains("dark") || (!document.documentElement.classList.contains("light") && matchMedia("(prefers-color-scheme: dark)").matches);

/** MapTiler tiles when a key is set; otherwise a plain land-coloured background, pins still work. */
function mapStyle(dark: boolean): StyleSpecification | string {
  if (MAPTILER_KEY) return `https://api.maptiler.com/maps/${dark ? "streets-v2-dark" : "streets-v2"}/style.json?key=${MAPTILER_KEY}`;
  return { version: 8, sources: {}, layers: [{ id: "land", type: "background", paint: { "background-color": cssVar("--map-land") || "#EEF1EA" } }] };
}

interface Pin {
  id: string;
  title: string;
  lat: number;
  lng: number;
  dayIndex: number;
  dayId: string;
  number: number;
}

interface Props {
  days: DayView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  editors: Map<string, Editor>;
}

export default function TripMap({ days, selectedId, onSelect, editors }: Props) {
  const t = useTranslations("map");
  const mapRef = useRef<MapRef>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [style] = useState(() => mapStyle(isDark()));
  const [ready, setReady] = useState(false);

  const pins = useMemo<Pin[]>(
    () =>
      days.flatMap((d, dayIndex) =>
        d.items.flatMap((item, i) => (item.lat != null && item.lng != null ? [{ id: item.id, title: item.title, lat: item.lat, lng: item.lng, dayIndex, dayId: d.id, number: i + 1 }] : [])),
      ),
    [days],
  );
  const visible = useMemo(() => pins.filter((p) => !hidden.has(p.dayId)), [pins, hidden]);

  // Fit once when the map is ready and again when the day filter changes. Adding a stop flies to it instead.
  const fitKey = `${ready}|${[...hidden].sort().join(",")}`;
  const lastFit = useRef("");
  useEffect(() => {
    // Only mark the fit as done once there are pins to fit: the doc may still be syncing when the map loads.
    if (!ready || lastFit.current === fitKey || visible.length === 0) return;
    lastFit.current = fitKey;
    const lngs = visible.map((p) => p.lng);
    const lats = visible.map((p) => p.lat);
    mapRef.current?.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 80, maxZoom: 14, duration: 0 });
  }, [fitKey, ready, visible]);

  useEffect(() => {
    const pin = pins.find((p) => p.id === selectedId);
    if (pin && ready) mapRef.current?.easeTo({ center: [pin.lng, pin.lat], duration: 400 });
  }, [selectedId, ready, pins]);

  const routes = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: days.flatMap((d, dayIndex) => {
        const coords = visible.filter((p) => p.dayId === d.id).map((p) => [p.lng, p.lat]);
        return coords.length < 2 ? [] : [{ type: "Feature" as const, properties: { color: cssVar(`--day-${(dayIndex % 5) + 1}`) || "#2C6248" }, geometry: { type: "LineString" as const, coordinates: coords } }];
      }),
    }),
    [days, visible],
  );

  return (
    <div className="relative size-full">
      <Map
        ref={mapRef}
        mapStyle={style}
        initialViewState={{ longitude: UKRAINE[0], latitude: UKRAINE[1], zoom: 5 }}
        attributionControl={{ compact: true }}
        onLoad={() => setReady(true)}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="routes" type="geojson" data={routes}>
          <Layer id="routes-line" type="line" paint={{ "line-color": ["get", "color"], "line-width": 2, "line-dasharray": [5, 4] }} />
        </Source>
        {visible.map((p) => {
          const editor = editors.get(p.id);
          const selected = p.id === selectedId;
          const ring = editor ? `, 0 0 0 5px ${editor.color}` : selected ? ", 0 0 0 5px color-mix(in srgb, var(--primary) 45%, transparent)" : "";
          return (
            <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="center">
              <button
                type="button"
                data-testid="map-pin"
                aria-label={t("pin", { title: p.title, day: p.dayIndex + 1, n: p.number })}
                aria-pressed={selected}
                onClick={() => onSelect(p.id)}
                className="grid size-[26px] place-items-center rounded-[7px] text-[12px] font-bold text-day-foreground"
                style={{ backgroundColor: dayColor(p.dayIndex), boxShadow: `0 0 0 2px #FFF, 0 2px 6px rgba(24,33,28,.2)${ring}`, zIndex: selected ? 1 : 0 }}
              >
                {p.number}
              </button>
            </Marker>
          );
        })}
      </Map>

      <div role="group" aria-label={t("legend")} className="absolute left-4 top-4 flex flex-wrap gap-2">
        {days.map((d, i) => {
          const off = hidden.has(d.id);
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((h) => { const n = new Set(h); if (off) n.delete(d.id); else n.add(d.id); return n; })}
              className={`flex h-8 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-[12px] font-medium shadow-[0_1px_2px_rgba(24,33,28,.06)] ${off ? "text-fg-muted" : ""}`}
            >
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: dayColor(i), opacity: off ? 0.35 : 1 }} aria-hidden />
              {t("dayShort", { n: i + 1 })}
            </button>
          );
        })}
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button type="button" aria-label={t("zoomIn")} onClick={() => mapRef.current?.zoomIn()} className="grid size-10 place-items-center rounded-[10px] border bg-surface text-fg-secondary shadow-[0_1px_2px_rgba(24,33,28,.06)]">
          <Plus size={16} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" aria-label={t("zoomOut")} onClick={() => mapRef.current?.zoomOut()} className="grid size-10 place-items-center rounded-[10px] border bg-surface text-fg-secondary shadow-[0_1px_2px_rgba(24,33,28,.06)]">
          <Minus size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
