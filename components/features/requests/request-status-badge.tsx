"use client";

import { Badge } from "@/components/ui/badge";
import { mapValidationStatus } from "@/lib/validation-status";

export function RequestStatusBadge({
  status,
  className = "",
}: {
  status?: string | null;
  className?: string;
}) {
  const mapped = mapValidationStatus(status);

  return (
    <Badge variant="outline" className={`${mapped.className} ${className}`.trim()}>
      {mapped.label}
    </Badge>
  );
}
