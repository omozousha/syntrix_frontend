"use client";

export function RequestActorLine({
  label = "Submitted By",
  value,
}: {
  label?: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{label}</p>
      <p className="break-words text-sm leading-5">{value || "-"}</p>
    </div>
  );
}
