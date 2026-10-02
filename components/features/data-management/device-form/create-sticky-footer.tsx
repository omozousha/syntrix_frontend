"use client";

import { AlertCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslate, type TFn } from "@/lib/use-locale";

export type StickyFooterFlags = {
  isDevice: boolean;
  isPop: boolean;
  isProject: boolean;
  isCustomer: boolean;
};

export function CreateStickyFooter({
  flags,
  saving,
  canSave,
  missingCount,
  onSave,
  onCancel,
}: {
  flags: StickyFooterFlags;
  saving: boolean;
  canSave: boolean;
  missingCount: number;
  onSave: () => void;
  onCancel?: () => void;
}) {
  if (!flags.isDevice) return null;

  const { t } = useTranslate();
  const label = getSaveLabel(flags, t);
  const hasWarning = missingCount > 0;

  return (
    <div className="sticky bottom-0 z-40 -mx-3 -mb-3 mt-4">
      {/* Backdrop blur + glass */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-t border-border/50" />

      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        {/* Left: warning badge */}
        <div className="flex items-center gap-2 min-w-0">
          {hasWarning ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-amber-300 bg-amber-50/80 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    <AlertCircle className="size-3" />
                    {t("createForm.missingFields", { count: missingCount })}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {t("createForm.completeFieldsTip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("createForm.allRequiredFilled")}
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              {t("createForm.cancel")}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saving || !canSave}
          >
            <Save className="mr-1.5 size-3.5" />
            {saving ? t("createForm.saving") : label}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getSaveLabel(flags: StickyFooterFlags, t: TFn): string {
  if (flags.isPop) return t("createForm.savePop");
  if (flags.isProject) return t("createForm.saveProject");
  if (flags.isCustomer) return t("createForm.saveCustomer");
  return t("createForm.saveDevice");
}
