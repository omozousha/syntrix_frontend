"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Eye, ImageUp, QrCode, RefreshCw, Save, Upload } from "lucide-react";

import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
  buildQrLabelPngDataUrl,
  clearQrLabelLogoCache,
  loadQrLabelLogoDataUrl,
  loadQrLabelSettings,
  type QrLabelSettings,
} from "@/lib/qr-label";

type UploadResult = {
  id: string;
  attachment_id?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
};

type QrLabelSettingsPanelProps = {
  token?: string | null;
};

export function QrLabelSettingsPanel({ token }: QrLabelSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [setting, setSetting] = useState<QrLabelSettings | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState("");
  const [labelPreviewDataUrl, setLabelPreviewDataUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSourceDataUrl, setCropSourceDataUrl] = useState("");
  const [cropPreviewDataUrl, setCropPreviewDataUrl] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogTitle, setSuccessDialogTitle] = useState("");
  const [successDialogDescription, setSuccessDialogDescription] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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
          projectName: "FTTH Bandung 2026",
          tenantName: "Retail",
          qrDataUrl,
          logoDataUrl: logoPreviewDataUrl || undefined,
          footerText: setting?.footer_text || undefined,
        });
        if (!cancelled) setLabelPreviewDataUrl(dataUrl);
      } catch {
        if (!cancelled) setLabelPreviewDataUrl("");
      }
    }

    if (!loading) void buildPreview();
    return () => {
      cancelled = true;
    };
  }, [loading, logoPreviewDataUrl, setting?.footer_text]);

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

  async function handleFile(file: File | null) {
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
                QR label settings
              </CardTitle>
              <CardDescription>
                Atur logo tengah dan footer QR label untuk download detail ODP dan bulk QR.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              Superadmin
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="min-w-0 space-y-4">
            {loading ? <AppLoading label="Memuat QR label settings..." /> : null}
            {!loading ? (
              <>
                <div className="xl:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-center"
                    onClick={() => setMobilePreviewOpen((value) => !value)}
                  >
                    <Eye className="mr-2 size-4" />
                    {mobilePreviewOpen ? "Tutup preview QR label" : "Lihat preview QR label"}
                  </Button>
                  {mobilePreviewOpen ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview label</p>
                      <div className="overflow-hidden rounded-md border bg-white p-2 shadow-sm">
                        {labelPreviewDataUrl ? (
                          <Image
                            src={labelPreviewDataUrl}
                            alt="QR label preview"
                            width={900}
                            height={450}
                            unoptimized
                            className="h-auto w-full max-w-full rounded-md"
                          />
                        ) : (
                          <div className="flex aspect-[2/1] items-center justify-center text-xs text-muted-foreground">
                            Preview belum tersedia
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    void handleFile(event.dataTransfer.files?.[0] || null);
                  }}
                  className={[
                    "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-4 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 hover:bg-muted/35",
                    saving ? "pointer-events-none opacity-60" : "",
                  ].join(" ")}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleFile(event.target.files?.[0] || null)}
                    disabled={saving}
                  />
                  <div className="rounded-md bg-background p-3 shadow-sm">
                    <ImageUp className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Upload atau drag logo QR</p>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Gunakan logo sederhana dengan kontras jelas. Sistem akan crop square sebelum upload.
                  </p>
                  {selectedFile ? <p className="mt-2 text-xs font-medium text-primary">File siap upload: {selectedFile.name}</p> : null}
                </div>

                {cropSourceDataUrl ? (
                  <div className="grid gap-4 rounded-md border bg-muted/20 p-3 sm:grid-cols-[170px_minmax(0,1fr)]">
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
                      <CropRange id="qr-logo-crop-zoom" label="Zoom" min={1} max={3} step={0.05} value={cropZoom} onChange={setCropZoom} valueLabel={`${cropZoom.toFixed(2)}x`} />
                      <CropRange id="qr-logo-crop-x" label="Geser horizontal" min={-100} max={100} step={1} value={cropOffsetX} onChange={setCropOffsetX} valueLabel={`${cropOffsetX}`} />
                      <CropRange id="qr-logo-crop-y" label="Geser vertikal" min={-100} max={100} step={1} value={cropOffsetY} onChange={setCropOffsetY} valueLabel={`${cropOffsetY}`} />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" className="min-h-11" onClick={() => void handleApplyCrop()} disabled={saving || !cropPreviewDataUrl}>
                          Gunakan crop
                        </Button>
                        <Button type="button" className="min-h-11" variant="outline" onClick={handleCancelCrop} disabled={saving}>
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
                  <Button type="button" className="min-h-11" onClick={() => void handleSave()} disabled={saving || loading || Boolean(cropSourceDataUrl)}>
                    <Save className="mr-2 size-4" />
                    {saving ? "Menyimpan..." : "Simpan settings"}
                  </Button>
                  <Button type="button" className="min-h-11" variant="outline" onClick={() => void handleResetLogo()} disabled={saving || loading}>
                    <RefreshCw className="mr-2 size-4" />
                    Reset logo
                  </Button>
                </div>

                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <Upload className="size-3.5" />
                    Logo aktif
                  </div>
                  <p>{cropSourceDataUrl ? "Logo menunggu crop" : selectedFile?.name || setting?.qr_logo_original_name || "Default Syntrix logo"}</p>
                  <p>Update terakhir: {setting?.updated_at ? new Date(setting.updated_at).toLocaleString("id-ID") : "-"}</p>
                  {cropSourceDataUrl ? <p className="text-amber-600">Klik Gunakan crop sebelum menyimpan logo baru.</p> : null}
                </div>

                {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
                {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">{success}</p> : null}
              </>
            ) : null}
          </div>

          <div className="hidden min-w-0 space-y-2 xl:sticky xl:top-4 xl:block xl:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview label</p>
            <div className="overflow-hidden rounded-md border bg-white p-2 shadow-sm">
              {labelPreviewDataUrl ? (
                <Image src={labelPreviewDataUrl} alt="QR label preview" width={900} height={450} unoptimized className="h-auto w-full max-w-full rounded-md" />
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
