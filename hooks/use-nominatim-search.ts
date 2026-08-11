"use client";

import * as React from "react";

const DEBOUNCE_MS = 400;
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

export type NominatimResult = {
  place_id: number;
  lat: number;
  lon: number;
  display_name: string;
  short_name: string;
  type: string;
  class: string;
};

type NominatimFeature = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
};

const cache = new Map<string, NominatimResult[]>();

function shortDisplayName(full: string): string {
  const parts = full.split(",").map((s) => s.trim());
  return parts.length > 2 ? `${parts[0]}, ${parts[1]}` : full;
}

function mapFeature(feature: NominatimFeature): NominatimResult {
  return {
    place_id: feature.place_id,
    lat: Number(feature.lat),
    lon: Number(feature.lon),
    display_name: feature.display_name,
    short_name: shortDisplayName(feature.display_name),
    type: feature.type,
    class: feature.class,
  };
}

export function useNominatimSearch() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<NominatimResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<NominatimResult | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastFetchRef = React.useRef(0);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }

    const cached = cache.get(trimmed);
    if (cached) {
      setResults(cached);
      return;
    }

    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) {
        const later = setTimeout(() => fetchResults(trimmed), 1100);
        return () => clearTimeout(later);
      }
      void fetchResults(trimmed);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  async function fetchResults(searchQuery: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastFetchRef.current = Date.now();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        limit: "5",
        countrycodes: "id",
        addressdetails: "1",
      });
      const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = (await response.json()) as NominatimFeature[];
      const mapped = raw.map(mapFeature);
      cache.set(searchQuery, mapped);
      setResults(mapped);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError((err as Error).message || "Gagal mencari lokasi.");
    } finally {
      setLoading(false);
    }
  }

  const clearSelection = React.useCallback(() => {
    setSelected(null);
    setResults([]);
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    selected,
    setSelected,
    clearSelection,
  };
}
