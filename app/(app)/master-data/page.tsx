"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { BookMarked, Boxes, Building2, ChevronRight, MapPinned, Network, QrCode, RefreshCw, Save, Upload, Workflow } from "lucide-react";
import { AddDataMenu } from "@/components/add-data-menu";
import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";
import {
  buildQrLabelPngDataUrl,
  clearQrLabelLogoCache,
  loadQrLabelLogoDataUrl,
  loadQrLabelSettings,
  type QrLabelSettings,
} from "@/lib/qr-label";

type GenericItem = { id: string };

type SummaryBySlug = Record<string, number>;
type FailedCatalog = { slug: string; label: string; reason: string };
type UploadResult = {
  id: string;
  attachment_id?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
};

const MASTER_SECTIONS: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  slugs: string[];
}> = [
  {
    title: "Referensi Topologi",
    description: "Standardisasi struktur region, klasifikasi POP, tipe route, dan layanan customer.",
    icon: Network,
    slugs: ["master-regions", "master-pop-types", "master-route-types", "master-service-types"],
  },
  {
    title: "Referensi Perangkat",
    description: "Referensi tipe perangkat, ODP, instalasi, model, dan splitter sebagai fondasi inventaris.",
    icon: Boxes,
    slugs: ["master-device-types", "master-odp-types", "master-installation-types", "master-models", "master-splitter-profiles"],
  },
  {
    title: "Referensi Vendor & Tenant",
    description: "Master tenant, manufacturer, dan brand untuk memastikan naming kepemilikan serta vendor konsisten.",
    icon: Building2,
    slugs: ["master-tenants", "master-manufacturers", "master-brands"],
  },
  {
    title: "Referensi Lokasi",
    description: "Master provinsi dan kota/kabupaten untuk normalisasi data lokasi.",
    icon: MapPinned,
    slugs: ["master-provinces", "master-cities"],
  },
];

export default function MasterDataPage() {
  const { token, me } = useSession();
  const [summaryBySlug, setSummaryBySlug] = useState<SummaryBySlug>({});
  const [failedCatalogs, setFailedCatalogs] = useState<FailedCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.allSettled(
          MASTER_DATA_CATEGORIES.map((category) =>
            apiFetch<PaginatedResponse<GenericItem>>(`/${category.resource}?page=1&limit=1`, { token }),
          ),
        );
        if (cancelled) return;

        const nextSummary: SummaryBySlug = {};
        const nextFailed: FailedCatalog[] = [];
        MASTER_DATA_CATEGORIES.forEach((category, index) => {
          const result = responses[index];
          if (result.status === "fulfilled") {
            nextSummary[category.slug] = result.value.meta?.total ?? result.value.data?.length ?? 0;
            return;
          }
          nextSummary[category.slug] = 0;
          nextFailed.push({
            slug: category.slug,
            label: category.label,
            reason: result.reason instanceof Error ? result.reason.message : "Unknown error",
          });
        });
        setSummaryBySlug(nextSummary);
        setFailedCatalogs(nextFailed);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat ringkasan master data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const totalCatalogItems = useMemo(
    () => MASTER_DATA_CATEGORIES.reduce((acc, category) => acc + (summaryBySlug[category.slug] || 0), 0),
    [summaryBySlug],
  );

  if (me.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Akses Terbatas</CardTitle>
            <CardDescription>
              Halaman Master Data hanya tersedia untuk role admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/data-management">Kembali ke Data Management</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-5 pr-3">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="w-fit gap-1">
                  <BookMarked className="size-3.5" />
                  Pusat Master Data
                </Badge>
                <Badge variant="outline" className="w-fit">
                  Admin Only
                </Badge>
              </div>
              <AddDataMenu canCreatePop={false} canCreateDevice={false} canManageMaster />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard
                label="Total Master Data"
                value={String(MASTER_DATA_CATEGORIES.length)}
                hint="Jenis referensi"
                icon={<Workflow className="size-4" />}
              />
              <StatCard
                label="Total Data"
                value={String(totalCatalogItems)}
                hint="Seluruh item master"
                icon={<Boxes className="size-4" />}
              />
              <StatCard
                label="Kelompok Data"
                value="4"
                hint="Topologi, Perangkat, Vendor, Lokasi"
                icon={<Network className="size-4" />}
              />
              <StatCard
                label="Akses Kelola"
                value="Admin"
                hint="Hak perubahan data"
                icon={<BookMarked className="size-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? <AppLoading label="Memuat ringkasan master data..." /> : null}
        {!loading && error ? <AppLoading label={error} variant="error" /> : null}

        {!loading && !error ? (
          <>
            <QrLabelSettingsCard token={token} />

            {failedCatalogs.length ? (
              <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Beberapa Data Master Belum Tersedia</CardTitle>
                  <CardDescription>
                    Terjadi error saat membaca sebagian resource master data. Biasanya karena migrasi/metadata backend belum sinkron.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {failedCatalogs.map((item) => (
                    <div key={item.slug} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.reason}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {MASTER_SECTIONS.map((section) => {
                const categories = MASTER_DATA_CATEGORIES.filter((item) => section.slugs.includes(item.slug));
                return (
                  <Card key={section.title} className="border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-2">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                          <section.icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base">{section.title}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {categories.map((category) => {
                        const failedItem = failedCatalogs.find((item) => item.slug === category.slug);
                        return (
                          <div key={category.slug} className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{category.label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {failedItem ? `Error: ${failedItem.reason}` : category.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={failedItem ? "outline" : "secondary"}>
                                {failedItem ? "N/A" : summaryBySlug[category.slug] ?? 0}
                              </Badge>
                              <Button asChild size="sm" variant="outline" disabled={Boolean(failedItem)}>
                                <Link href={`/data-management/list/${category.slug}`}>
                                  Open
                                  <ChevronRight className="ml-1 size-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}
function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-background/80 shadow-none">
      <CardContent className="px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QrLabelSettingsCard({ token }: { token?: string | null }) {
  const [setting, setSetting] = useState<QrLabelSettings | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState("");
  const [labelPreviewDataUrl, setLabelPreviewDataUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSourceDataUrl, setCropSourceDataUrl] = useState("");
  const [cropPreviewDataUrl, setCropPreviewDataUrl] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogTitle, setSuccessDialogTitle] = useState("");
  const [successDialogDescription, setSuccessDialogDescription] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const [nextSetting, logoDataUrl] = await Promise.all([
          loadQrLabelSettings(token),
          loadQrLabelLogoDataUrl(token).catch(() => ""),
        ]);
        if (cancelled) return;
        setSetting(nextSetting);
        setLogoPreviewDataUrl(logoDataUrl);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat QR label settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function buildPreview() {
      try {
        const qrDataUrl = await QRCode.toDataURL("https://syntrix-one.vercel.app/field/odp/sample", {
          width: 360,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        const dataUrl = await buildQrLabelPngDataUrl({
          deviceName: "AGD-ODP-01.01",
          deviceCode: "INV-2019/07/010/0003",
          deviceType: "ODP",
          popName: "DIPATIUKUR | DPU",
          qrDataUrl,
          logoDataUrl: logoPreviewDataUrl || undefined,
          footerText: setting?.footer_text || undefined,
        });
        if (!cancelled) setLabelPreviewDataUrl(dataUrl);
      } catch {
        if (!cancelled) setLabelPreviewDataUrl("");
      }
    }

    void buildPreview();
    return () => {
      cancelled = true;
    };
  }, [logoPreviewDataUrl, setting?.footer_text]);

  useEffect(() => {
    if (!cropSourceDataUrl) {
      setCropPreviewDataUrl("");
      return;
    }

    let cancelled = false;
    cropImageDataUrl(cropSourceDataUrl, cropZoom, cropOffsetX, cropOffsetY)
      .then((dataUrl) => {
        if (!cancelled) setCropPreviewDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setCropPreviewDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [cropOffsetX, cropOffsetY, cropSourceDataUrl, cropZoom]);

  async function reloadSettings() {
    clearQrLabelLogoCache();
    const [nextSetting, logoDataUrl] = await Promise.all([
      loadQrLabelSettings(token),
      loadQrLabelLogoDataUrl(token).catch(() => ""),
    ]);
    setSetting(nextSetting);
    setLogoPreviewDataUrl(logoDataUrl);
  }

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings().catch(() => undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setError("Logo QR harus berupa file image.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setSelectedFile(null);
    setCropSourceDataUrl(dataUrl);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setLogoPreviewDataUrl(dataUrl);
  }

  async function handleApplyCrop() {
    if (!cropSourceDataUrl) return;
    setError("");
    setSuccess("");
    try {
      const croppedDataUrl = await cropImageDataUrl(cropSourceDataUrl, cropZoom, cropOffsetX, cropOffsetY);
      const croppedFile = await dataUrlToFile(croppedDataUrl, "qr-label-logo.png");
      setSelectedFile(croppedFile);
      setLogoPreviewDataUrl(croppedDataUrl);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
    } catch (err) {
      setError((err as Error).message || "Gagal crop logo QR.");
    }
  }

  function handleCancelCrop() {
    setSelectedFile(null);
    setCropSourceDataUrl("");
    setCropPreviewDataUrl("");
    void reloadSettings().catch(() => undefined);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let logoAttachmentId = normalizeNullableSettingValue(setting?.qr_logo_attachment_id);
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("file_category", "image");
        formData.append("entity_type", "qr_label_setting");
        formData.append("is_public", "false");

        const upload = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
          method: "POST",
          token: token || undefined,
          body: formData,
        });
        logoAttachmentId = upload.data.id;
      }

      const response = await apiFetch<{ data: QrLabelSettings }>("/qr-label-settings", {
        method: "PATCH",
        token: token || undefined,
        body: {
          qr_logo_attachment_id: logoAttachmentId,
          footer_text: setting?.footer_text || "Scan QR untuk membuka detail/validasi Device",
          is_active: true,
        },
      });

      clearQrLabelLogoCache();
      setSetting(response.data);
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings();
      const message = selectedFile
        ? "Logo QR label berhasil diupload dan diterapkan ke detail ODP serta bulk QR."
        : "QR label settings berhasil disimpan.";
      setSuccess(message);
      setSuccessDialogTitle("QR Label Berhasil Disimpan");
      setSuccessDialogDescription(message);
      setSuccessDialogOpen(true);
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan QR label settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetLogo() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch<{ data: QrLabelSettings }>("/qr-label-settings", {
        method: "PATCH",
        token: token || undefined,
        body: {
          reset_logo: true,
          footer_text: setting?.footer_text || "Scan QR untuk membuka detail/validasi Device",
          is_active: true,
        },
      });
      clearQrLabelLogoCache();
      setSetting(response.data);
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings();
      const message = "Logo QR dikembalikan ke default.";
      setSuccess(message);
      setSuccessDialogTitle("Logo QR Berhasil Direset");
      setSuccessDialogDescription(message);
      setSuccessDialogOpen(true);
    } catch (err) {
      setError((err as Error).message || "Gagal reset logo QR.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="size-4 text-primary" />
              QR Label Settings
            </CardTitle>
            <CardDescription>
              Atur logo tengah QR label untuk download detail ODP dan bulk QR.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            Superadmin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {loading ? <AppLoading label="Memuat QR label settings..." /> : null}
          {!loading ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="qr-logo-upload">Logo QR</Label>
                <Input
                  id="qr-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleFileChange(event.target.files)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Gunakan logo sederhana dengan kontras jelas. Sistem tetap memakai fallback default jika logo gagal dimuat.
                </p>
              </div>

              {cropSourceDataUrl ? (
                <div className="grid gap-4 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview crop</p>
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-white p-2">
                      {cropPreviewDataUrl ? (
                        <Image
                          src={cropPreviewDataUrl}
                          alt="Preview crop logo QR"
                          width={512}
                          height={512}
                          unoptimized
                          className="h-full w-full rounded object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Memproses...</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Crop logo sebelum upload</p>
                      <p className="text-xs text-muted-foreground">
                        Hasil crop dibuat square agar logo tetap rapi di tengah QR label.
                      </p>
                    </div>
                    <CropRange
                      id="qr-logo-crop-zoom"
                      label="Zoom"
                      min={1}
                      max={3}
                      step={0.05}
                      value={cropZoom}
                      onChange={setCropZoom}
                      valueLabel={`${cropZoom.toFixed(2)}x`}
                    />
                    <CropRange
                      id="qr-logo-crop-x"
                      label="Geser horizontal"
                      min={-100}
                      max={100}
                      step={1}
                      value={cropOffsetX}
                      onChange={setCropOffsetX}
                      valueLabel={`${cropOffsetX}`}
                    />
                    <CropRange
                      id="qr-logo-crop-y"
                      label="Geser vertikal"
                      min={-100}
                      max={100}
                      step={1}
                      value={cropOffsetY}
                      onChange={setCropOffsetY}
                      valueLabel={`${cropOffsetY}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => void handleApplyCrop()} disabled={saving || !cropPreviewDataUrl}>
                        Gunakan Crop
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handleCancelCrop} disabled={saving}>
                        Batal
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="qr-footer-text">Footer label</Label>
                <Input
                  id="qr-footer-text"
                  value={setting?.footer_text || ""}
                  onChange={(event) => setSetting((prev) => ({ ...(prev || {}), footer_text: event.target.value }))}
                  placeholder="Scan QR untuk membuka detail/validasi Device"
                  disabled={saving}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={saving || loading || Boolean(cropSourceDataUrl)}>
                  <Save className="mr-2 size-4" />
                  {saving ? "Menyimpan..." : "Simpan Settings"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleResetLogo()} disabled={saving || loading}>
                  <RefreshCw className="mr-2 size-4" />
                  Reset Logo
                </Button>
              </div>

              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Upload className="size-3.5" />
                  Logo aktif
                </div>
                <p>{cropSourceDataUrl ? "Logo menunggu crop" : selectedFile?.name || setting?.qr_logo_original_name || "Default Syntrix logo"}</p>
                <p>Update terakhir: {setting?.updated_at ? new Date(setting.updated_at).toLocaleString("id-ID") : "-"}</p>
                {cropSourceDataUrl ? <p className="text-amber-600">Klik Gunakan Crop sebelum menyimpan logo baru.</p> : null}
              </div>

              {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">{success}</p> : null}
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview label</p>
          <div className="rounded-lg border bg-white p-2">
            {labelPreviewDataUrl ? (
              <Image src={labelPreviewDataUrl} alt="QR label preview" width={900} height={450} unoptimized className="w-full rounded-md" />
            ) : (
              <div className="flex aspect-[2/1] items-center justify-center text-xs text-muted-foreground">
                Preview belum tersedia
              </div>
            )}
          </div>
        </div>
      </CardContent>
      </Card>
      <ResponseDialog
        open={successDialogOpen}
        title={successDialogTitle}
        description={successDialogDescription}
        variant="success"
        actionLabel="OK"
        onOpenChange={setSuccessDialogOpen}
        onAction={() => setSuccessDialogOpen(false)}
      />
    </>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file logo."));
    reader.readAsDataURL(file);
  });
}

function CropRange({
  id,
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <span className="text-xs font-medium">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat preview logo."));
    image.src = src;
  });
}

async function cropImageDataUrl(src: string, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImageElement(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error("Ukuran logo tidak valid.");

  const outputSize = 512;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung crop logo.");

  const normalizedZoom = Math.max(1, zoom);
  const cropSize = Math.max(1, Math.min(naturalWidth, naturalHeight) / normalizedZoom);
  const maxShiftX = Math.max(0, (naturalWidth - cropSize) / 2);
  const maxShiftY = Math.max(0, (naturalHeight - cropSize) / 2);
  const centerX = naturalWidth / 2 + (clamp(offsetX, -100, 100) / 100) * maxShiftX;
  const centerY = naturalHeight / 2 + (clamp(offsetY, -100, 100) / 100) * maxShiftY;
  const sourceX = clamp(centerX - cropSize / 2, 0, naturalWidth - cropSize);
  const sourceY = clamp(centerY - cropSize / 2, 0, naturalHeight - cropSize);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  return canvas.toDataURL("image/png");
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: "image/png" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNullableSettingValue(value?: string | null) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return null;
  return text;
}
