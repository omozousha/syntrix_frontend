"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowRight, Download, ExternalLink, Globe, Info, MapPin, Navigation, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function OdpPublicGuestPortalPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();
  const [device, setDevice] = useState<DeviceQrContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");

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
          setLoadMessage("Informasi rinci perangkat tidak ditemukan atau telah diarsipkan.");
        }
      } catch {
        if (!cancelled) {
          setLoadMessage("Gagal memuat detail perangkat dari server public.");
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

  function scrollToDetails() {
    const el = document.getElementById("device-details-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      setActiveTab("details");
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20 pb-16 lg:pb-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Header Bar - Guest Public Portal */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 p-3.5 sm:px-6 shadow-xs backdrop-blur-md glass-inset sticky top-2 z-20">
          <div className="flex items-center gap-3">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-2xs">
              <Globe className="size-4 sm:size-5" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold tracking-tight text-foreground">Syntrix Public Portal</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Guest Device Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.18em] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Tanpa Login / Guest Access
            </Badge>
          </div>
        </header>

        {/* SPA Mobile View Tab Navigation Bar (Visible on mobile/tablet) */}
        <div className="block lg:hidden">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "overview" | "details")} className="w-full">
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/40 p-1 border border-border/50">
              <TabsTrigger value="overview" className="rounded-lg font-mono text-[11px] uppercase tracking-wider font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs flex items-center justify-center gap-1.5">
                <Globe className="size-3.5" />
                <span>Ringkasan</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg font-mono text-[11px] uppercase tracking-wider font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs flex items-center justify-center gap-1.5 relative">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                </span>
                <Info className="size-3.5 text-primary" />
                <span>Detail Aset QR</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Layout Grid (SPA Tabbed on mobile, Side-by-side 12-col on Desktop) */}
        <div className="grid flex-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
          {/* Left Column: Hero & Actions (7 cols on Desktop) */}
          <div className={`space-y-4 sm:space-y-6 lg:col-span-7 ${activeTab === "overview" ? "block" : "hidden lg:block"}`}>
            <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8 shadow-xs glass-inset space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.18em]">
                  Asset Identification
                </Badge>
                <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.18em]">
                  Public QR Reader
                </Badge>
              </div>

              <h1 className="text-xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Informasi Aset Perangkat Fiber Optik
              </h1>

              <p className="text-xs sm:text-base leading-relaxed text-muted-foreground">
                Anda melakukan pemindaian QR Code perangkat infrastruktur telko Syntrix sebagai <strong>Tamu / Guest</strong>. Halaman ini menyajikan informasi dasar lokasi dan aset tanpa memerlukan akun login.
              </p>

              {/* Mobile Quick Link Button to Scroll/Switch to Details */}
              <div className="block lg:hidden pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={scrollToDetails}
                  className="w-full h-9 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 border border-border/60 active:scale-[0.98]"
                >
                  <span>Lihat Detail Aset QR</span>
                  <ArrowDown className="size-3.5 text-primary" />
                </Button>
              </div>

              {/* Primary Call To Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={openSyntrixOne}
                  className="h-11 rounded-full bg-primary px-6 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-primary/90"
                >
                  <Smartphone className="mr-2 size-4" />
                  Buka di Aplikasi Syntrix-One
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
                  Download Aplikasi (APK)
                </Button>
              </div>
            </div>

            {/* Navigation Card if coordinates are present */}
            {device?.latitude != null && device?.longitude != null ? (
              <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                  <Navigation className="size-4 text-primary" />
                  <span>Lokasi & Navigasi Peta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    Buka Waze
                  </a>
                </div>
              </Card>
            ) : null}

            {/* Guest Portal Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <SafetyPoint title="Akses Publik" description="Dapat diakses oleh siapa saja tanpa login." />
              <SafetyPoint title="Verifikasi QR" description="Memastikan identitas fisik label perangkat." />
              <SafetyPoint title="Integrasi App" description="Dapat dibuka langsung ke app Syntrix-One." />
            </div>
          </div>

          {/* Right Column: Device QR Info Panel (5 cols on Desktop) */}
          <div id="device-details-panel" className={`lg:col-span-5 scroll-mt-16 ${activeTab === "details" ? "block" : "hidden lg:block"}`}>
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset">
              <CardHeader className="border-b border-border/40 bg-muted/10 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-2xs">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Detail Aset QR</CardTitle>
                    <CardDescription className="text-xs">
                      {loading ? "Memuat data perangkat..." : "Informasi terdaftar pada server Syntrix."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="space-y-2.5">
                  <InfoRow label="Tipe Perangkat" value={display.deviceType} loading={loading} />
                  <InfoRow label="Nama Perangkat" value={display.deviceName} loading={loading} />
                  <InfoRow label="POP Terhubung" value={display.pop} loading={loading} />
                  <InfoRow label="Tenant / Pengelola" value={display.tenant} loading={loading} />
                </div>

                {loadMessage ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed font-medium text-amber-600 dark:text-amber-400">
                    {loadMessage}
                  </div>
                ) : null}

                <div className="rounded-xl border border-border/50 bg-muted/30 p-3.5 text-xs leading-relaxed text-muted-foreground">
                  Ingin melakukan perubahan data atau validasi foto presisi? Buka aplikasi <strong>Syntrix-One</strong> melalui tombol di bawah.
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    className="w-full justify-between h-10 rounded-xl bg-primary text-primary-foreground px-4 text-xs font-semibold shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-primary/90"
                    onClick={openSyntrixOne}
                  >
                    <span>Buka di Syntrix-One App</span>
                    <ExternalLink className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 rounded-xl border-border/60 bg-background/50 px-4 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-muted/20"
                    onClick={() => {
                      window.location.href = APK_DOWNLOAD_URL;
                    }}
                  >
                    <span>Download App (APK Android)</span>
                    <Download className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function SafetyPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-2xs glass-inset space-y-1">
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
