"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslate, type TFn } from "@/lib/use-locale";

type CreateKindFlags = {
  isPop: boolean;
  isProject: boolean;
  isCustomer: boolean;
};

export function getCreateTitle(flags: CreateKindFlags, deviceTypeKey: string, t: TFn) {
  if (flags.isPop) return t("createForm.titlePop");
  if (flags.isProject) return t("createForm.titleProject");
  if (flags.isCustomer) return t("createForm.titleCustomer");
  return t("createForm.titleDevice", { type: deviceTypeKey });
}

export function getCreateFormTitle(flags: CreateKindFlags, t: TFn) {
  if (flags.isPop) return t("createForm.formTitlePop");
  if (flags.isProject) return t("createForm.formTitleProject");
  if (flags.isCustomer) return t("createForm.formTitleCustomer");
  return t("createForm.formTitleDevice");
}

export function getCreateFormDescription(flags: CreateKindFlags, t: TFn) {
  if (flags.isPop) return t("createForm.descPop");
  if (flags.isProject) return t("createForm.descProject");
  if (flags.isCustomer) return t("createForm.descCustomer");
  return t("createForm.descDevice");
}

export function CreateFormPageHeader({
  flags,
  deviceTypeKey,
}: {
  flags: CreateKindFlags;
  deviceTypeKey: string;
}) {
  const { t } = useTranslate();
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {getCreateTitle(flags, deviceTypeKey, t)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("createForm.headerSub")}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/data-management">
          <ArrowLeft className="mr-2 size-4" />
          {t("createForm.back")}
        </Link>
      </Button>
    </div>
  );
}

export function CreateFormCardHeader({ flags }: { flags: CreateKindFlags }) {
  const { t } = useTranslate();
  return (
    <CardHeader>
      <CardTitle>{getCreateFormTitle(flags, t)}</CardTitle>
      <CardDescription className="flex items-center gap-2">
        {getCreateFormDescription(flags, t)}
        <Badge variant="outline" className="font-normal">
          {t("createForm.compact")}
        </Badge>
      </CardDescription>
    </CardHeader>
  );
}
