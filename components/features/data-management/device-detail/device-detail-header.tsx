import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeviceDetailHeaderProps = {
  categoryLabel: string;
  title: string;
  backHref: string;
  actions?: ReactNode;
};

export function DeviceDetailHeader({ categoryLabel, title, backHref, actions }: DeviceDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Detail {categoryLabel}</h2>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </div>
  );
}
