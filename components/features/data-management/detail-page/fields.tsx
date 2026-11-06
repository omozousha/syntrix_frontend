import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateCoordinateFormat } from "./helpers";
import { translateFieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { useTranslate } from "@/lib/use-locale";

export function DisplayField({
  label,
  value,
  className = "",
  compact = false,
  loading = false,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}) {
  const { t } = useTranslate();
  const displayLabel = translateFieldLabel(label, t);
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{displayLabel}</Label>
      {loading ? (
        <Skeleton className={compact ? "h-8 w-full rounded-md" : "h-10 w-full rounded-md"} />
      ) : (
        <Input value={value} disabled className={compact ? "h-8 text-xs" : undefined} />
      )}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className = "",
  compact = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslate();
  const displayLabel = translateFieldLabel(label, t);
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{displayLabel}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
    </div>
  );
}

export function CoordinateField({
  label,
  value,
  onChange,
  disabled,
  compact = false,
  kind,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  kind: "longitude" | "latitude";
}) {
  const { t } = useTranslate();
  const displayLabel = translateFieldLabel(label, t);
  const validation = validateCoordinateFormat(value, kind, t);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center gap-1.5">
        <Label>{displayLabel}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={t("createForm.fieldInfo", { label: displayLabel })}>
                <CircleHelp className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {kind === "latitude"
                ? t("detailPage.coordinate.latitudeHelp")
                : t("detailPage.coordinate.longitudeHelp")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
      {validation.state !== "idle" ? (
        <Badge variant="outline" className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}>
          {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
          {validation.message}
        </Badge>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onValueChange,
  disabled,
  compact = false,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslate();
  const displayLabel = translateFieldLabel(label, t);
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label>{displayLabel}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName={compact ? "h-8 text-xs" : undefined}
        options={options.map((option) => ({ value: option, label: option }))}
      />
    </div>
  );
}