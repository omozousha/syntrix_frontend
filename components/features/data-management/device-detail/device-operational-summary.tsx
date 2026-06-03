import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InfoField } from "@/components/shared";
import { mapValidationStatus } from "@/lib/validation-status";

type DeviceRecord = Record<string, unknown>;

type DeviceOperationalSummaryProps = {
  item: DeviceRecord;
  relationLabels: {
    region?: string;
    pop?: string;
  };
  effectiveValidationStatus: string;
};

export function DeviceOperationalSummary({
  item,
  relationLabels,
  effectiveValidationStatus,
}: DeviceOperationalSummaryProps) {
  const validationUi = mapValidationStatus(effectiveValidationStatus);

  return (
    <Card className="border-primary/10 bg-muted/20">
      <CardContent className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-6">
        <InfoField label="Device Name" value={valueOf(item.device_name, "-")} />
        <InfoField label="Inventory ID" value={valueOf(item.device_id || item.device_code, "-")} />
        <InfoField label="Type" value={valueOf(item.device_type_key, "-")} />
        <InfoField label="Region" value={relationLabels.region || valueOf(item.region_id, "-")} />
        <InfoField label="POP" value={relationLabels.pop || valueOf(item.pop_id, "-")} />
        <InfoField label="Installation Date" value={formatDate(valueOf(item.installation_date))} />
        <div className="rounded-xl border bg-card p-3 text-card-foreground shadow-xs xl:col-span-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Validation Status</p>
          <Badge variant="outline" className={`mt-1 ${validationUi.className}`}>
            {validationUi.label}
          </Badge>
        </div>
        <InfoField className="xl:col-span-2" label="Updated" value={formatDateTime(valueOf(item.updated_at || item.created_at))} />
      </CardContent>
    </Card>
  );
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}
