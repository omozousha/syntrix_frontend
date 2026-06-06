"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FieldAccessDeniedPage() {
  const searchParams = useSearchParams();
  const reason = String(searchParams.get("reason") || "access_denied");
  const hasDeviceContext = Boolean(String(searchParams.get("device_id") || "").trim());
  const reasonLabel = formatReason(reason);

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              <CardTitle className="text-base">Akses Ditolak</CardTitle>
            </div>
            <CardDescription>
              Device hasil scan QR berada di region yang tidak termasuk scope user ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Reason: {reasonLabel}</Badge>
              <Badge variant="outline">Device: {hasDeviceContext ? "QR terdeteksi" : "Data tidak tersedia"}</Badge>
              <Badge variant="outline">Region: Di luar scope akun</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Minta akses region ke admin jika device ini memang perlu divalidasi oleh akun kamu.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 size-4" />
                  Kembali ke Dashboard
                </Link>
              </Button>
              <Button asChild>
                <Link href="/data-management/list/odp">Buka List ODP</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatReason(reason: string) {
  if (reason === "region_mismatch") return "Region tidak sesuai";
  if (reason === "device_not_found") return "Device tidak tersedia";
  if (reason === "role_not_allowed") return "Role tidak diizinkan";
  return "Akses ditolak";
}
