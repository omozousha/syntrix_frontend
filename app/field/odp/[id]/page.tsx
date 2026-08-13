"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Download, ExternalLink, MapPin, Navigation, QrCode, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { buildQrFallbackDisplay } from "@/lib/display-adapters/qr-fallback-display-adapter";

type DeviceQrContext = {
  id: string;
  device_name?: string | null;
  device_type_key?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pop?: {
    id?: string | null;
    pop_id?: string | null;
    pop_code?: string | null;
    pop_name?: string | null;
  } | null;
  tenant?: {
    id?: string | null;
    tenant_code?: string | null;
    tenant_name?: string | null;
  } | null;
  old_device_name?: string | null;
};

const SYNTRIX_ONE_SCHEME = "io.syntrixone.app://field/odp";
const APK_DOWNLOAD_URL = "https://od.lk/fl/OTRfMTcyOTg2MDBf";

export default function OdpQrBrowserFallbackPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();
  const [device, setDevice] = useState<DeviceQrContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");

  const appOpenHref = useMemo(
    () => `${SYNTRIX_ONE_SCHEME}/${encodeURIComponent(id)}`,
    [id],
  );
  const display = useMemo(() => buildQrFallbackDisplay(device, loading), [device, loading]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    async function loadDeviceContext() {
      setLoading(true);
      setLoadMessage("");
      try {
        const result = await apiFetch<{ data?: DeviceQrContext }>(`/public/qr/devices/${encodeURIComponent(id)}`);
        if (cancelled) return;
        setDevice(result.data || null);
        if (!result.data) {
          setLoadMessage("Nama device belum tersedia. Buka Syntrix-One lalu scan ulang QR.");
        }
      } catch {
        if (!cancelled) {
          setLoadMessage("Nama device belum tersedia. Buka Syntrix-One lalu scan ulang QR.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDeviceContext();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function openSyntrixOne() {
    window.location.href = appOpenHref;
  }

  return (
    <main className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 p-3.5 sm:px-6 shadow-xs backdrop-blur-md glass-inset">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-2xs">
              <QrCode className="size-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-foreground">Syntrix-One</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Field Validator Portal</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.18em] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            QR Device Verified
          </Badge>
        </header>

        {/* Main Section */}
        <section className="grid flex-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Hero Callout & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs glass-inset space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.18em]">
                  Validasi Resmi
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Validasi Lapangan Hanya Melalui Syntrix-One
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                QR Code ini terdaftar resmi dalam jaringan Syntrix. Untuk menjamin otentisitas data, audit trail, serta verifikasi koordinat & evidence presisi, proses validasi hanya dapat diproses via aplikasi seluler Syntrix-One.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={openSyntrixOne}
                  className="h-11 rounded-full bg-primary px-6 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-primary/90"
                >
                  Buka Aplikasi Syntrix-One
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-full border-border/60 bg-background/50 px-6 text-xs sm:text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-muted/20"
                  onClick={() => {
                    window.location.href = APK_DOWNLOAD_URL;
                  }}
                >
                  <Download className="mr-2 size-4 text-primary" />
                  Download APK Syntrix-One
                </Button>
              </div>
            </div>

            {/* Navigation Card if coordinates are present */}
            {device?.latitude != null && device?.longitude != null ? (
              <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Navigation className="size-4 text-primary" />
                  <span>Petunjuk Arah Navigasi Lapangan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${device.latitude},${device.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 text-xs font-mono font-medium text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <MapPin className="size-3.5 text-primary" />
                    Google Maps (<span className="tabular-nums">{device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}</span>)
                  </a>
                  <a
                    href={`https://waze.com/ul?ll=${device.latitude},${device.longitude}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 text-xs font-mono font-medium text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <Navigation className="size-3.5 text-sky-500" />
                    Navigasi Waze
                  </a>
                </div>
              </Card>
            ) : null}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SafetyPoint title="QR-First Scanner" description="Form validasi dibuka langsung melalui scanner bawaan aplikasi." />
              <SafetyPoint title="Otorisasi Region" description="Data dicek berdasarkan hak akses & scope validator." />
              <SafetyPoint title="Evidence Presisi" description="Foto fisik & koordinat GPS terverifikasi otomatis." />
            </div>
          </div>

          {/* Right Column: Device QR Context (5 cols) */}
          <div className="lg:col-span-5">
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset">
              <CardHeader className="border-b border-border/40 bg-muted/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-2xs">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">Konteks QR Device</CardTitle>
                    <CardDescription className="text-xs">
                      {loading ? "Memuat identitas perangkat..." : "Informasi terdaftar untuk perangkat ini."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="space-y-2.5">
                  <InfoRow label="Type Device" value={display.deviceType} loading={loading} />
                  <InfoRow label="Nama Device" value={display.deviceName} loading={loading} />
                  <InfoRow label="POP Terhubung" value={display.pop} loading={loading} />
                  <InfoRow label="Tenant Owner" value={display.tenant} loading={loading} />
                </div>

                {loadMessage ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed font-medium text-amber-600 dark:text-amber-400">
                    {loadMessage}
                  </div>
                ) : null}

                <div className="rounded-xl border border-border/50 bg-muted/30 p-3.5 text-xs leading-relaxed text-muted-foreground">
                  Jika aplikasi tidak terbuka secara otomatis, buka aplikasi Syntrix-One secara manual lalu tekan ikon <strong>Scan QR</strong> di menu navigasi utama.
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-10 rounded-xl border-border/60 bg-background/50 px-4 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-muted/20"
                  onClick={openSyntrixOne}
                >
                  Buka Syntrix-One Sekarang
                  <ExternalLink className="size-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function SafetyPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs glass-inset space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function InfoRow({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/15 p-3 space-y-1">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="h-4 w-32 rounded-md bg-muted/40" />
      ) : (
        <p className="text-xs font-semibold font-mono tabular-nums text-foreground break-words">{value}</p>
      )}
    </div>
  );
}
