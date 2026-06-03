"use client";

import { ChevronDown, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function OdpOperationsShell({
  open,
  editing,
  provisioning,
  children,
  onOpenChange,
  onStartEdit,
  onProvisionPorts,
  onArchiveDevice,
}: {
  open: boolean;
  editing: boolean;
  provisioning: boolean;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  onStartEdit: () => void;
  onProvisionPorts: () => void;
  onArchiveDevice: () => void;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-sm">ODP Operations</CardTitle>
              <CardDescription>Port, splitter, QR label, dan validasi lapangan.</CardDescription>
            </div>
            <Collapsible open={open} onOpenChange={onOpenChange}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8">
                  <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            ) : null}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="sm" onClick={onProvisionPorts} disabled={provisioning || !editing}>
                    <RefreshCw className="mr-2 size-4" />
                    {provisioning ? "Generating..." : "Generate Ports"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72 text-xs">
                  Generate port detail awal sesuai total port ODP. Tombol ini tidak dipakai untuk menaikkan kapasitas port.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button type="button" variant="destructive" size="sm" onClick={onArchiveDevice} disabled={!editing}>
              <Trash2 className="mr-2 size-4" />
              Archive ODP
            </Button>
          </div>
        </div>
      </CardHeader>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleContent>
          <CardContent className="space-y-4 px-3 pb-3 pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
