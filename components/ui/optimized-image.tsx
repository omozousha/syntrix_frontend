"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DownloadIcon, Maximize2Icon, ImageIcon } from "lucide-react"

export interface OptimizedImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  thumbUrl?: string | null
  blurDataUrl?: string | null
  alt?: string
  aspectRatio?: "square" | "video" | "auto" | string
  size?: "thumb" | "full" | "auto"
  allowLightbox?: boolean
  width?: number
  height?: number
  sizeBytes?: number
  originalSizeBytes?: number
  fallbackIconClass?: string
}

export function OptimizedImage({
  src,
  thumbUrl,
  blurDataUrl,
  alt = "Attachment image",
  aspectRatio = "auto",
  size = "auto",
  allowLightbox = true,
  width,
  height,
  sizeBytes,
  originalSizeBytes,
  className,
  fallbackIconClass,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  // Determine actual image source to load (prefer thumb for thumb size, or fallback to src)
  const primarySrc = size === "thumb" ? (thumbUrl || src) : (src || thumbUrl)

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "video"
        ? "aspect-video"
        : ""

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const targetUrl = src || thumbUrl
    if (!targetUrl) return
    const a = document.createElement("a")
    a.href = targetUrl
    a.download = alt.replace(/\s+/g, "_") + ".webp"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-2xs glass-inset transition-all duration-300",
          aspectClass,
          allowLightbox && primarySrc && !hasError && "cursor-pointer hover:border-primary/50",
          className
        )}
        onClick={() => {
          if (allowLightbox && primarySrc && !hasError) {
            setLightboxOpen(true)
          }
        }}
        {...props}
      >
        {/* 1. Instant LQIP Blur Placeholder */}
        {blurDataUrl && !isLoaded && !hasError && (
          <img
            src={blurDataUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover filter blur-md scale-105 transform transition-opacity duration-300"
          />
        )}

        {/* 2. Primary Image Layer */}
        {primarySrc && !hasError ? (
          <img
            src={primarySrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        ) : (
          <div className="flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-1.5 p-3 text-muted-foreground">
            <ImageIcon className={cn("size-6 opacity-40", fallbackIconClass)} />
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-60">
              {hasError ? "Gambar gagal dimuat" : "Tidak ada foto"}
            </span>
          </div>
        )}

        {/* Hover Lightbox Indicator Overlay */}
        {allowLightbox && primarySrc && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-xs">
              <Maximize2Icon className="size-3.5" />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em]">Buka Preview</span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal Dialog */}
      {allowLightbox && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl p-2 sm:p-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl">
            <DialogHeader className="px-2 pt-1 pb-2 flex flex-row items-center justify-between border-b border-border/40">
              <div>
                <DialogTitle className="font-heading text-sm font-medium flex items-center gap-2">
                  <span>{alt}</span>
                  <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
                    WebP Optimized
                  </Badge>
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] tabular-nums text-muted-foreground mt-0.5">
                  {width && height ? `${width} × ${height} px` : null}
                  {sizeBytes ? ` • ${formatFileSize(sizeBytes)}` : null}
                  {originalSizeBytes && sizeBytes ? ` (hemat ${Math.round(((originalSizeBytes - sizeBytes) / originalSizeBytes) * 100)}%)` : null}
                </DialogDescription>
              </div>

              {primarySrc && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="rounded-full font-mono text-[10px] uppercase tracking-[0.12em] gap-1.5 mr-6"
                >
                  <DownloadIcon className="size-3.5" />
                  Unduh
                </Button>
              )}
            </DialogHeader>

            <div className="relative flex max-h-[75vh] w-full items-center justify-center overflow-hidden rounded-xl bg-black/5 p-2">
              <img
                src={src || primarySrc || ""}
                alt={alt}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
