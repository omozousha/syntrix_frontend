"use client";

import { MapPinned, RadioTower, Route, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAP_FEATURES = [
  {
    title: "Asset Coverage",
    description: "Visualisasi region, POP, ODP, dan perangkat jaringan pada peta operasional.",
    icon: RadioTower,
  },
  {
    title: "Route Context",
    description: "Konteks jalur, koneksi, dan area layanan untuk membantu inspeksi lapangan.",
    icon: Route,
  },
  {
    title: "Role Scope",
    description: "Tampilan peta akan mengikuti akses region dan role masing-masing user.",
    icon: ShieldCheck,
  },
];

export default function MapsPage() {
  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="flex min-h-full items-center justify-center pr-3">
        <div className="w-full max-w-4xl space-y-4">
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPinned className="size-6" />
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="mx-auto w-fit">
                  Coming Soon
                </Badge>
                <CardTitle className="text-xl">Operational Map Preview</CardTitle>
                <CardDescription className="mx-auto max-w-2xl">
                  Halaman peta sedang disiapkan sebagai workspace visual untuk membaca sebaran asset, coverage region, dan konteks lapangan.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-4 pt-0 md:grid-cols-3">
              {MAP_FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-lg border bg-background p-3">
                  <feature.icon className="mb-3 size-5 text-primary" />
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
