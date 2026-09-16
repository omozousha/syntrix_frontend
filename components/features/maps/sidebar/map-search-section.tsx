"use client";

import * as React from "react";
import { Search, ChevronRight, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNominatimSearch, type NominatimResult } from "@/hooks/use-nominatim-search";
import { cn } from "@/lib/utils";

interface MapSearchSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSearchResult?: (result: NominatimResult) => void;
  onClearSearchResult?: () => void;
}

function parseCoordinateInput(input: string): { lat: number; lng: number } | null {
  const clean = input.trim();
  const parts = clean.split(/[\s,]+/);
  if (parts.length === 2) {
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }
  return null;
}

export function MapSearchSection({
  isOpen,
  onOpenChange,
  onSelectSearchResult,
  onClearSearchResult,
}: MapSearchSectionProps) {
  const { query, setQuery, results, loading, selected, setSelected, clearSelection } =
    useNominatimSearch();
  const [showResults, setShowResults] = React.useState(true);

  const handleSearchResultClick = React.useCallback(
    (res: NominatimResult) => {
      setSelected(res);
      onSelectSearchResult?.(res);
      setQuery(res.short_name);
      setShowResults(false);
    },
    [onSelectSearchResult, setSelected, setQuery],
  );

  const handleResetSearch = React.useCallback(() => {
    clearSelection();
    setShowResults(false);
    onClearSearchResult?.();
  }, [clearSelection, onClearSearchResult]);

  const handleSearchKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const coords = parseCoordinateInput(query);
        if (coords) {
          const customResult: NominatimResult = {
            place_id: Date.now(),
            lat: coords.lat,
            lon: coords.lng,
            display_name: `Koordinat: ${coords.lat}, ${coords.lng}`,
            short_name: `Koordinat (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
            type: "coordinate",
            class: "coordinate",
          };
          handleSearchResultClick(customResult);
        } else if (results.length > 0) {
          handleSearchResultClick(results[0]);
        }
      }
    },
    [handleSearchResultClick, query, results],
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="rounded-xl border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="rounded-[calc(0.75rem-0.125rem)] border border-border/60 bg-card/80 shadow-xs glass-inset">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 hover:no-underline">
            <div className="flex items-center gap-1.5">
              <Search className="size-3.5 text-primary" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Search Lokasi
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-primary/70">
                (Geocoding)
              </span>
            </div>
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isOpen && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-2.5 pb-2.5 space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Cari jalan, kota, atau koordinat (lat,lng)..."
                  className="h-8 rounded-full pl-8 pr-8 font-mono text-[11px]"
                />
                {loading && (
                  <Loader2 className="absolute right-2.5 top-2.5 size-3.5 animate-spin text-primary" />
                )}
              </div>

              {selected && (
                <div className="flex items-center justify-between rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] truncate mr-2">
                    {selected.short_name}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="size-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95 shrink-0"
                    title="Hapus Pencarian"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {showResults && results.length > 0 && (
                <ScrollArea className="max-h-48 rounded-xl border border-border/60 bg-card p-1 shadow-md">
                  <div className="space-y-1 pr-1.5">
                    {results.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSearchResultClick(res)}
                        className="w-full text-left rounded-lg p-2 hover:bg-muted transition-colors text-xs space-y-0.5"
                      >
                        <p className="font-medium text-foreground truncate">{res.short_name}</p>
                        <p className="font-mono text-[9px] text-muted-foreground truncate">
                          {res.display_name}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
