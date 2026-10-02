"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Maximize2,
  Minimize2,
  Camera,
  Keyboard,
  SlidersHorizontal,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslate } from "@/lib/use-locale";

type MapFloatingMenuProps = {
  fullscreenRef: React.RefObject<HTMLDivElement | null>;
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  className?: string;
};

export function MapFloatingMenu({
  fullscreenRef,
  screenshotRef,
  isZenMode = false,
  onToggleZenMode,
  className,
}: MapFloatingMenuProps) {
  const { t } = useTranslate();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [shortcutOpen, setShortcutOpen] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);

  // Sync fullscreen state via event listener
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Global hotkeys (Z for Zen mode, Alt+F for Fullscreen, Alt+S for Screenshot, ? for Shortcuts)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.altKey && e.key.toLowerCase() === "f") || e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        captureScreenshot();
      } else if (
        (e.key.toLowerCase() === "z" && !e.ctrlKey && !e.metaKey) ||
        (e.altKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        onToggleZenMode?.();
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleZenMode]);

  const toggleFullscreen = React.useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const target = fullscreenRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      toast.error(t("mapFloatingMenu.fullscreenUnsupported"));
    }
  }, [fullscreenRef]);

  /**
   * Captures path (cables/connections) and placemarks overlay onto a clean slate canvas
   * without the tile map background layer.
   */
  const captureScreenshot = React.useCallback(async () => {
    setIsCapturing(true);
    try {
      const container = screenshotRef.current || document.body;
      const width = container.clientWidth || 1280;
      const height = container.clientHeight || 720;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext("2d");

      if (!ctx) {
        toast.error(t("mapFloatingMenu.snapshotFail"));
        return;
      }

      // 1. Draw elegant dark background slate
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      // 2. Extract and draw only vector canvas layers (polylines, paths, placemarks)
      const canvases = container.querySelectorAll("canvas");
      let overlayDrawn = false;

      canvases.forEach((c) => {
        try {
          // Drawing path/placemark overlay canvas on top of slate background
          ctx.drawImage(c, 0, 0, width, height);
          overlayDrawn = true;
        } catch {
          // Ignore tile CORS restrictions
        }
      });

      if (!overlayDrawn && canvases.length > 0) {
        // Direct export if canvas element supports toDataURL
        const dataUrl = canvases[0].toDataURL("image/png");
        downloadImage(dataUrl);
      } else {
        const dataUrl = tempCanvas.toDataURL("image/png");
        downloadImage(dataUrl);
      }

      toast.success(t("mapFloatingMenu.snapshotSuccess"));
    } catch {
      toast.error(t("mapFloatingMenu.screenshotFail"));
    } finally {
      setIsCapturing(false);
    }
  }, [screenshotRef]);

  return (
    <>
      <div className={className}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-2xs backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground active:scale-[0.95] glass-inset"
              title={t("mapFloatingMenu.menuTitle")}
              aria-label={t("mapFloatingMenu.menuTitle")}
            >
              <SlidersHorizontal className="size-4 text-primary" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            container={fullscreenRef.current}
            className="w-56 rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lg backdrop-blur-md glass-inset"
          >
            <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground px-2 py-1">
              {t("mapFloatingMenu.actionsLabel")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border/40" />

            <DropdownMenuItem
              onClick={onToggleZenMode}
              className="flex items-center justify-between cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2 font-medium">
                {isZenMode ? (
                  <Eye className="size-4 text-primary" />
                ) : (
                  <EyeOff className="size-4 text-primary" />
                )}
                <span>{isZenMode ? t("mapFloatingMenu.showHud") : t("mapFloatingMenu.zenMode")}</span>
              </div>
              <Kbd>Z</Kbd>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={toggleFullscreen}
              className="flex items-center justify-between cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2 font-medium">
                {isFullscreen ? (
                  <Minimize2 className="size-4 text-primary" />
                ) : (
                  <Maximize2 className="size-4 text-primary" />
                )}
                <span>{isFullscreen ? t("mapFloatingMenu.exitFullscreen") : t("mapFloatingMenu.fullscreen")}</span>
              </div>
              <Kbd>Alt+F</Kbd>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={captureScreenshot}
              disabled={isCapturing}
              className="flex items-center justify-between cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2 font-medium">
                <Camera className="size-4 text-primary" />
                <span>{isCapturing ? t("mapFloatingMenu.processing") : t("mapFloatingMenu.captureOverlay")}</span>
              </div>
              <Kbd>Alt+S</Kbd>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 bg-border/40" />

            <DropdownMenuItem
              onClick={() => setShortcutOpen(true)}
              className="flex items-center justify-between cursor-pointer rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2 font-medium">
                <Keyboard className="size-4 text-primary" />
                <span>{t("mapFloatingMenu.shortcuts")}</span>
              </div>
              <Kbd>?</Kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutOpen} onOpenChange={setShortcutOpen}>
        <DialogContent
          container={fullscreenRef.current}
          className="max-w-md rounded-2xl border border-border/40 bg-card/95 p-5 shadow-xl backdrop-blur-md glass-inset"
        >
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Keyboard className="size-4 text-primary" />
              </div>
              <DialogTitle className="font-mono text-sm uppercase tracking-wider">
                {t("mapFloatingMenu.shortcutsTitle")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("mapFloatingMenu.shortcutsDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-2 text-xs">
            <ShortcutRow label={t("mapShortcuts.zenMode")} keys={["Z"]} />
            <ShortcutRow label={t("mapShortcuts.multiInspect")} keys={["Shift", t("mapShortcuts.clickMarker")]} />
            <ShortcutRow label={t("mapShortcuts.singleInspect")} keys={[t("mapShortcuts.clickMarker")]} />
            <ShortcutRow label={t("mapShortcuts.toggleFullscreen")} keys={["Alt", "F"]} />
            <ShortcutRow label={t("mapShortcuts.captureOverlay")} keys={["Alt", "S"]} />
            <ShortcutRow label={t("mapShortcuts.closeReset")} keys={["Esc"]} />
            <ShortcutRow label={t("mapShortcuts.showGuide")} keys={["Shift", "/"]} />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
            <Info className="size-4 shrink-0 text-primary" />
            <span>
              {t("mapShortcuts.multiInspectNote")}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/80 px-3 py-2">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold text-foreground shadow-2xs tabular-nums">
      {children}
    </kbd>
  );
}

function downloadImage(dataUrl: string) {
  const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `syntrix-topology-overlay-${dateStr}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
