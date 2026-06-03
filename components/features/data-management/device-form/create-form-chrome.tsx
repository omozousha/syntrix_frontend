"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CreateKindFlags = {
  isPop: boolean;
  isRoute: boolean;
  isProject: boolean;
  isCustomer: boolean;
};

export function getCreateTitle(flags: CreateKindFlags, deviceTypeKey: string) {
  if (flags.isPop) return "Create POP";
  if (flags.isRoute) return "Create Route";
  if (flags.isProject) return "Create Project";
  if (flags.isCustomer) return "Create Customer";
  return `Create ${deviceTypeKey}`;
}

export function getCreateFormTitle(flags: CreateKindFlags) {
  if (flags.isPop) return "POP Form";
  if (flags.isRoute) return "Route Form";
  if (flags.isProject) return "Project Form";
  if (flags.isCustomer) return "Customer Form";
  return "Device Form";
}

export function getCreateFormDescription(flags: CreateKindFlags) {
  if (flags.isPop) return "Field wajib disesuaikan dengan data POP.";
  if (flags.isRoute) return "Field route untuk baseline topology dan perhitungan panjang jalur.";
  if (flags.isProject) return "Field project untuk konteks delivery dan as-built lifecycle.";
  if (flags.isCustomer) return "Field customer untuk data pelanggan dan lokasi layanan.";
  return "Field wajib disesuaikan dengan data perangkat.";
}

export function CreateFormPageHeader({
  flags,
  deviceTypeKey,
}: {
  flags: CreateKindFlags;
  deviceTypeKey: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {getCreateTitle(flags, deviceTypeKey)}
        </h2>
        <p className="text-sm text-muted-foreground">
          Form menyesuaikan tipe data yang dipilih dari dialog Data Management.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/data-management">
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Link>
      </Button>
    </div>
  );
}

export function CreateFormCardHeader({ flags }: { flags: CreateKindFlags }) {
  return (
    <CardHeader>
      <CardTitle>{getCreateFormTitle(flags)}</CardTitle>
      <CardDescription className="flex items-center gap-2">
        {getCreateFormDescription(flags)}
        <Badge variant="outline" className="font-normal">
          Compact Mode
        </Badge>
      </CardDescription>
    </CardHeader>
  );
}
