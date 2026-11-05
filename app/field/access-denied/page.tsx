"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslate, type TFn } from "@/lib/use-locale";

export default function FieldAccessDeniedPage() {
  const searchParams = useSearchParams();
  const { t } = useTranslate();
  const reason = String(searchParams.get("reason") || "access_denied");
  const hasDeviceContext = Boolean(String(searchParams.get("device_id") || "").trim());
  const reasonLabel = formatReason(reason, t);

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              <CardTitle className="text-base">{t("fieldDenied.title")}</CardTitle>
            </div>
            <CardDescription>
              {t("fieldDenied.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t("fieldDenied.badgeReason", { reason: reasonLabel })}</Badge>
              <Badge variant="outline">{hasDeviceContext ? t("fieldDenied.badgeDeviceDetected") : t("fieldDenied.badgeDeviceUnavailable")}</Badge>
              <Badge variant="outline">{t("fieldDenied.badgeRegionOut")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("fieldDenied.helpText")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 size-4" />
                  {t("fieldDenied.backDashboard")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/data-management/list/odp">{t("fieldDenied.openOdpList")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatReason(reason: string, t: TFn) {
  if (reason === "region_mismatch") return t("fieldDenied.reasonRegionMismatch");
  if (reason === "device_not_found") return t("fieldDenied.reasonDeviceNotFound");
  if (reason === "role_not_allowed") return t("fieldDenied.reasonRoleNotAllowed");
  return t("fieldDenied.title");
}
