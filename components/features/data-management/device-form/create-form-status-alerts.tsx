"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslate } from "@/lib/use-locale";

export function CreateFormStatusAlerts({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  const { t } = useTranslate();
  return (
    <>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>{t("common.errorTitle")}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertTitle>{t("detailPage.ui.successTitle")}</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
