import { InfoField } from "@/components/shared";

type GenericDeviceRawSectionProps = {
  item: Record<string, unknown>;
};

export function GenericDeviceRawSection({ item }: GenericDeviceRawSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Object.entries(item).map(([key, value]) => (
        <InfoField key={key} label={key} value={stringifyValue(value)} />
      ))}
    </div>
  );
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
