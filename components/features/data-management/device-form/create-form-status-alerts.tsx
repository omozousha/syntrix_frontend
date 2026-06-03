"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CreateFormStatusAlerts({
  errorMessage,
  successMessage,
}: {
  errorMessage?: string;
  successMessage?: string;
}) {
  return (
    <>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
