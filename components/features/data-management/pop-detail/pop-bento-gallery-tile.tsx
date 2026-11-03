"use client";

import Image from "next/image";
import { Building2, Images, ImagePlus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useTranslate } from "@/lib/use-locale";

type AttachmentRef = {
  id: string;
  name?: string;
  timestamp?: string;
};

type PopBentoGalleryTileProps = {
  popName?: string;
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

export function PopBentoGalleryTile({
  popName,
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
}: PopBentoGalleryTileProps) {
  const { t } = useTranslate();

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
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-500 shadow-2xs">
              <Images className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">{t("popGallery.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("popGallery.description")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 font-mono text-[10px] tabular-nums">
            {attachments.length} {t("popGallery.photoRegistered")}
          </Badge>
        </div>

        {/* Thumbnail Grid */}
        <div>
          {attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {attachments.map((attachment, index) => {
                const src = imagePreviewUrls[attachment.id];
                const fileName = attachmentNames[attachment.id] || attachment.name || t("popGallery.photoFallback");
                const formattedDate = formatTime(attachment.timestamp);
                return (
                  <div
                    key={attachment.id}
                    className="group relative flex flex-col justify-between gap-1 rounded-xl border border-border/60 bg-card p-1.5 shadow-2xs glass-inset transition-all duration-200 hover:border-sky-500/50 hover:shadow-xs"
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
              <Building2 className="size-8 text-sky-500/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">{t("popGallery.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {popName ? t("popGallery.emptyDescription", { name: popName }) : t("popGallery.emptyDescriptionDefault")}
              </p>
            </div>
          )}
        </div>

        {/* Edit Upload Section */}
        {editing && onNewImageFilesChange ? (
          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{t("popGallery.uploadTitle")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("popGallery.uploadCaption", { max: maxImageAttachments })}
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {newImageFiles.length} {t("popGallery.newFiles")}
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
                  <span className="text-xs font-medium text-foreground">{t("popGallery.preview")}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={onClearNewImages} className="h-7 text-xs text-destructive">
                    <Trash2 className="mr-1 size-3.5" />
                    {t("popGallery.removeNew")}
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
      </CardContent>
    </Card>
  );
}
