"use client";

import * as React from "react";
import type { OverpassPOI } from "@/components/features/maps/google-maps-canvas";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DEBOUNCE_MS = 800;
const MAX_POI = 100;

const POI_QUERIES = [
  'node["man_made"="mast"]',
  'node["communication"="pole"]',
  'node["utility"="pole"]',
  'node["office"="telecommunication"]',
  'node["man_made"="communications_tower"]',
  'node["barrier"="pole"]',
];

type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const cache = new Map<string, OverpassPOI[]>();

function buildBboxString(bbox: BoundingBox): string {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
}

function buildOverpassQuery(bbox: BoundingBox): string {
  const bboxStr = buildBboxString(bbox);
  const unionParts = POI_QUERIES.map((q) => `${q}(${bboxStr});`).join("\n");
  return `[out:json][timeout:15];(\n${unionParts}\n);\nout body ${MAX_POI};`;
}

function mapElements(elements: OverpassRawElement[]): OverpassPOI[] {
  return elements
    .filter((el) => el.type === "node" && Number.isFinite(el.lat) && Number.isFinite(el.lon))
    .map((el, i) => ({
      id: el.id || i,
      lat: el.lat!,
      lng: el.lon!,
      label: el.tags?.name || el.tags?.description || `POI #${el.id}`,
      kind: determineKind(el),
    }));
}

function determineKind(el: OverpassRawElement): "mast" | "pole" | "utility" {
  const tags = el.tags || {};
  if (tags["man_made"] === "mast" || tags["man_made"] === "communications_tower") return "mast";
  if (tags["communication"] === "pole") return "pole";
  if (tags["office"] === "telecommunication") return "mast";
  return "utility";
}

type OverpassRawElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

export function useOverpassPOI() {
  const [poiMarkers, setPoiMarkers] = React.useState<OverpassPOI[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastBoundsRef = React.useRef<string | null>(null);

  const fetchPOI = React.useCallback(async (bounds: BoundingBox) => {
    const bboxKey = buildBboxString(bounds);
    if (bboxKey === lastBoundsRef.current) return;
    lastBoundsRef.current = bboxKey;

    const cached = cache.get(bboxKey);
    if (cached) {
      setPoiMarkers(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const query = buildOverpassQuery(bounds);
      const body = new URLSearchParams({ data: query });
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { elements: OverpassRawElement[] };
      const pois = mapElements(data.elements || []);
      cache.set(bboxKey, pois);
      setPoiMarkers(pois);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError((err as Error).message || "Gagal mengambil data POI.");
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetchPOI = React.useCallback(
    (bounds: BoundingBox) => {
      const timer = setTimeout(() => void fetchPOI(bounds), DEBOUNCE_MS);
      return () => clearTimeout(timer);
    },
    [fetchPOI],
  );

  const clearPOI = React.useCallback(() => {
    setPoiMarkers([]);
    lastBoundsRef.current = null;
  }, []);

  return { poiMarkers, loading, error, fetchPOI: debouncedFetchPOI, clearPOI };
}
