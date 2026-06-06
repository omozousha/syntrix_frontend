"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Download, ExternalLink, QrCode, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { buildQrFallbackDisplay } from "@/lib/display-adapters/qr-fallback-display-adapter";

type DeviceQrContext = {
  id: string;
  device_name?: string | null;
  device_type_key?: string | null;
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
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-300/25 bg-blue-500/15 text-blue-200">
              <QrCode className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Syntrix-One</p>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Field Validator</p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">
            QR Device
          </Badge>
        </header>

        <section className="grid flex-1 items-center gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="outline" className="border-blue-300/40 bg-blue-400/10 text-blue-100">
                Validasi resmi
              </Badge>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Validasi hanya melalui Syntrix-One
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                QR ini terdaftar sebagai device Syntrix. Untuk menjaga keamanan, scope region, dan evidence lapangan,
                validasi hanya dapat dilakukan dari aplikasi Syntrix-One.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="lg" onClick={openSyntrixOne} className="h-12 rounded-xl bg-blue-500 px-5 text-white hover:bg-blue-400">
                Buka Syntrix-One
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  window.location.href = APK_DOWNLOAD_URL;
                }}
              >
                <Download className="mr-2 size-4" />
                Download APK
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
              <SafetyPoint title="QR-first" description="Form validasi dibuka dari scanner app." />
              <SafetyPoint title="Region scope" description="Device dicek sesuai akses validator." />
              <SafetyPoint title="Evidence aman" description="Foto dan koordinat dikirim dari app." />
            </div>
          </div>

          <Card className="border-white/10 bg-white/[0.06] text-white shadow-2xl shadow-blue-950/30 backdrop-blur">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-200">
                <ShieldCheck className="size-6" />
              </div>
              <CardTitle>Informasi QR</CardTitle>
              <CardDescription className="text-slate-300">
                {loading ? "Memuat konteks device..." : "Gunakan informasi ini untuk memastikan label QR yang discan."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <InfoRow label="Type Device" value={display.deviceType} />
                <InfoRow label="Nama Device" value={display.deviceName} />
                <InfoRow label="Tenant" value={display.tenant} />
              </div>

              {loadMessage ? (
                <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50">
                  {loadMessage}
                </p>
              ) : null}

              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-3 text-xs leading-5 text-slate-300">
                Jika aplikasi tidak terbuka otomatis, buka Syntrix-One secara manual lalu scan ulang QR dari tombol Scan
                di bottom navigation.
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={openSyntrixOne}
              >
                Coba buka aplikasi
                <ExternalLink className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function SafetyPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
