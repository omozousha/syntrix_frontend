"use client";

import Image from "next/image";
import { Images, ImagePlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedImage } from "@/components/ui/optimized-image";

type AttachmentRef = {
  id: string;
  name?: string;
  timestamp?: string;
};

type DeviceBentoGalleryTileProps = {
  deviceTypeLabel?: string;
  attachments: AttachmentRef[];
  imagePreviewUrls: Record<string, string>;
  attachmentNames: Record<string, string>;
  loadingImagePreviews?: boolean;
  editing?: boolean;
  maxImageAttachments?: number;
  newImageFiles?: File[];
  newImagePreviewUrls?: string[];
  onOpenGallery: (index: number) => void;
  onNewImageFilesChange?: (files: FileList | null) => void;
  onClearNewImages?: () => void;
  onRemoveNewImage?: (index: number) => void;
};

export function DeviceBentoGalleryTile({
  deviceTypeLabel = "Perangkat",
  attachments = [],
  imagePreviewUrls = {},
  attachmentNames = {},
  loadingImagePreviews = false,
  editing = false,
  maxImageAttachments = 10,
  newImageFiles = [],
  newImagePreviewUrls = [],
  onOpenGallery,
  onNewImageFilesChange,
  onClearNewImages,
  onRemoveNewImage,
}: DeviceBentoGalleryTileProps) {
  function formatTime(val?: string) {
    if (!val) return null;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-2xs">
              <Images className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Galeri &amp; Bukti Validasi Lapangan</h2>
              <p className="text-xs text-muted-foreground">
                Foto fisik perangkat dan evidence validasi approved dari validator mobile.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 font-mono text-[10px] tabular-nums">
            {attachments.length} foto terdaftar
          </Badge>
        </div>

        {/* Thumbnail Grid */}
        <div>
          {attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {attachments.map((attachment, index) => {
                const src = imagePreviewUrls[attachment.id];
                const fileName = attachmentNames[attachment.id] || attachment.name || "Foto Perangkat";
                const formattedDate = formatTime(attachment.timestamp);
                return (
                  <div
                    key={attachment.id}
                    className="group relative flex flex-col justify-between gap-1 rounded-xl border border-border/60 bg-card p-1.5 shadow-2xs glass-inset transition-all duration-200 hover:border-primary/50 hover:shadow-xs"
                  >
                    <OptimizedImage
                      src={src}
                      alt={fileName}
                      aspectRatio="square"
                      size="thumb"
                      allowLightbox={false}
                      className="h-20 sm:h-24 w-full rounded-lg cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                      onClick={() => onOpenGallery(index)}
                    />
                    <div className="px-1 pt-0.5 space-y-0.5">
                      <p className="truncate text-[10px] font-mono text-foreground font-medium" title={fileName}>
                        {fileName}
                      </p>
                      {formattedDate ? (
                        <p className="truncate text-[9px] font-mono tabular-nums text-muted-foreground">
                          {formattedDate}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
              <Images className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">Belum ada foto evidence</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                Foto fisik perangkat atau bukti inspeksi lapangan akan muncul di sini setelah divalidasi.
              </p>
            </div>
          )}
        </div>

        {/* Edit Upload Section */}
        {editing && onNewImageFilesChange ? (
          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Unggah Foto Baru</p>
                <p className="text-[11px] text-muted-foreground">Maksimal {maxImageAttachments} file total, masing-masing maks. 5MB.</p>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {newImageFiles.length} file baru
              </Badge>
            </div>

            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onNewImageFilesChange(e.target.files)}
              className="h-10 text-xs rounded-xl bg-background"
            />

            {newImageFiles.length > 0 && onClearNewImages ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Preview foto baru:</span>
                  <Button type="button" variant="ghost" size="sm" onClick={onClearNewImages} className="h-7 text-xs text-destructive">
                    <Trash2 className="mr-1 size-3.5" />
                    Hapus Semua
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {newImageFiles.map((file, idx) => (
                    <div key={file.name + idx} className="relative rounded-lg border overflow-hidden bg-background">
                      {newImagePreviewUrls[idx] ? (
                        <Image
                          src={newImagePreviewUrls[idx]}
                          alt={file.name}
                          width={120}
                          height={90}
                          className="h-16 w-full object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
