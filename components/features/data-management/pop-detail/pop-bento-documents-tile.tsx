"use client";

import React, { useRef, useState } from "react";
import {
  FileText,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  FileArchive,
  File,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadAttachmentFile } from "@/lib/attachment-utils";

export type PopDocumentRef = {
  id: string;
  original_name: string;
  mime_type?: string | null;
  file_category?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
  document_tag?: string | null;
};

export const POP_DOCUMENT_CATEGORIES = [
  { value: "kontrak_sewa", label: "Surat Kontrak Sewa Lahan / Gedung" },
  { value: "pbb_pajak", label: "Bukti Lunas Pajak PBB" },
  { value: "perizinan_imb", label: "Izin PBG / IMB / Izin Warga" },
  { value: "bast_teknis", label: "BAST & Dokumen Fisik Site" },
  { value: "kelistrikan_pln", label: "SOP & Dokumen Kelistrikan PLN" },
  { value: "lainnya", label: "Dokumen Lainnya" },
] as const;

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(name: string, mime?: string | null) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mime?.includes("pdf")) {
    return { icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10", label: "PDF" };
  }
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv") || mime?.includes("sheet") || mime?.includes("excel")) {
    return { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "EXCEL" };
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx") || mime?.includes("word")) {
    return { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", label: "WORD" };
  }
  if (lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z") || mime?.includes("zip") || mime?.includes("archive")) {
    return { icon: FileArchive, color: "text-amber-500", bg: "bg-amber-500/10", label: "ZIP" };
  }
  return { icon: File, color: "text-muted-foreground", bg: "bg-muted/30", label: "FILE" };
}

type PopBentoDocumentsTileProps = {
  documents: PopDocumentRef[];
  token?: string;
  canEdit?: boolean;
  onUploadDocument?: (file: File, categoryTag: string) => Promise<void>;
  onDeleteDocument?: (docId: string) => Promise<void>;
};

export function PopBentoDocumentsTile({
  documents,
  token,
  canEdit = true,
  onUploadDocument,
  onDeleteDocument,
}: PopBentoDocumentsTileProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("kontrak_sewa");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadDocument) return;

    setUploading(true);
    try {
      await onUploadDocument(file, uploadCategory);
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert((err as Error).message || "Gagal mengunggah berkas dokumen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: PopDocumentRef) {
    if (!token) return;
    setDownloadingId(doc.id);
    try {
      await downloadAttachmentFile(doc.id, token);
    } catch (err) {
      alert((err as Error).message || "Gagal mengunduh berkas.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(doc: PopDocumentRef) {
    if (!onDeleteDocument || !confirm(`Hapus berkas "${doc.original_name}"?`)) return;
    setDeletingId(doc.id);
    try {
      await onDeleteDocument(doc.id);
    } catch (err) {
      alert((err as Error).message || "Gagal menghapus berkas.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Paperclip className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Berkas &amp; Dokumen Site POP</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Kontrak Sewa, Surat Izin PBG, Bukti PBB &amp; BAST
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono tabular-nums text-[10px] uppercase">
              {documents.length} Berkas
            </Badge>
            {canEdit && onUploadDocument ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl border-border/60 bg-muted/20 text-xs font-semibold hover:bg-muted/40 active:scale-[0.98]"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <Plus className="mr-1.5 size-3.5" />
                <span>{showUploadForm ? "Tutup Form" : "Upload Berkas"}</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Upload Form (Collapsible) */}
        {showUploadForm ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Unggah Dokumen Site Baru</p>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">PDF / Word / Excel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Kategori Dokumen</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60">
                    {POP_DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Pilih File Berkas</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,image/*"
                  onChange={(e) => void handleFileSelected(e)}
                  disabled={uploading}
                  className="flex h-9 w-full rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs file:border-0 file:bg-transparent file:text-xs file:font-semibold"
                />
              </div>
            </div>

            {uploading ? (
              <div className="flex items-center gap-2 text-xs text-primary font-medium pt-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Mengunggah dokumen ke cloud storage...</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Documents Grid / List */}
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center text-xs text-muted-foreground space-y-2">
            <FileText className="size-8 text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground">Belum Ada Berkas Dokumen Terlampir</p>
            <p className="max-w-md text-[11px] leading-relaxed">
              Unggah salinan dokumen resmi site seperti <strong>Surat Perjanjian Sewa Lahan</strong>, <strong>Tanda Lunas PBB</strong>, dan <strong>Izin PBG/IMB</strong> untuk memudahkan audit fisik.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {documents.map((doc) => {
              const fileInfo = getFileIcon(doc.original_name, doc.mime_type);
              const IconComp = fileInfo.icon;
              const isDownloading = downloadingId === doc.id;
              const isDeleting = deletingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="group flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-3 shadow-2xs hover:border-primary/40 hover:bg-muted/30 transition-all duration-200"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`flex size-9 items-center justify-center rounded-xl shrink-0 ${fileInfo.bg} ${fileInfo.color}`}>
                      <IconComp className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground" title={doc.original_name}>
                        {doc.original_name}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5 font-mono text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="font-mono text-[9px] uppercase px-1 py-0 h-3.5">
                          {fileInfo.label}
                        </Badge>
                        <span>{formatBytes(doc.size_bytes)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                      {POP_DOCUMENT_CATEGORIES.find((c) => c.value === doc.document_tag)?.label || "Dokumen Site"}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] rounded-lg px-2 text-primary hover:bg-primary/10"
                        onClick={() => void handleDownload(doc)}
                        disabled={isDownloading}
                        title="Unduh Berkas"
                      >
                        {isDownloading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <>
                            <Download className="mr-1 size-3" />
                            Unduh
                          </>
                        )}
                      </Button>

                      {canEdit && onDeleteDocument ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => void handleDelete(doc)}
                          disabled={isDeleting}
                          title="Hapus Berkas"
                        >
                          {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
