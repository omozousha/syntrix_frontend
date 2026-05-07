"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { loginWithPassword, storeSessionTokens, getStoredToken } from "@/lib/session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin.ops@syntrix.local");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Masukkan akun Anda untuk melanjutkan.");
  const [statusType, setStatusType] = useState<"default" | "destructive">("default");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const nextParam = searchParams.get("next");
  const getNextPath = useCallback(() => {
    if (!nextParam) return "/dashboard";
    const nextValue = nextParam.trim();
    if (!nextValue.startsWith("/") || nextValue.startsWith("//")) {
      return "/dashboard";
    }
    return nextValue;
  }, [nextParam]);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace(getNextPath());
    }
  }, [router, getNextPath]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Sedang memproses login...");
    setStatusType("default");
    try {
      const session = await loginWithPassword(email, password);
      storeSessionTokens(session);
      setStatus("Login sukses.");
      setStatusType("default");
      router.replace(getNextPath());
    } catch (error) {
      setStatus(`Login gagal: ${(error as Error).message}`);
      setStatusType("destructive");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    if (!email.trim()) {
      setStatusType("destructive");
      setStatus("Isi email terlebih dahulu untuk reset password.");
      return;
    }

    setResetLoading(true);
    setStatusType("default");
    setStatus("Mengirim email reset password...");
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatusType("default");
      setStatus("Email reset password berhasil dikirim. Silakan cek inbox/spam.");
    } catch (error) {
      setStatusType("destructive");
      setStatus(`Gagal mengirim reset password: ${(error as Error).message}`);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden border-r bg-muted/30 lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md space-y-4 px-8">
          <Badge variant="outline">Syntrix Asset Inventory</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Monitoring jaringan fiber lebih rapi dan terstruktur</h1>
          <p className="text-sm text-muted-foreground">
            Kelola POP, perangkat aktif/pasif, project, dan customer dari satu dashboard dengan scope region yang aman.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Syntrix</CardTitle>
            <CardDescription>Masuk menggunakan akun yang sudah terdaftar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline">Single Login Form</Badge>

            <form onSubmit={onSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="nama@domain.com"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    required
                  />
                </Field>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  {loading ? "Memproses..." : "Login"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onResetPassword()}
                  disabled={resetLoading}
                  className="w-full"
                >
                  {resetLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  {resetLoading ? "Mengirim..." : "Reset Password"}
                </Button>

              </FieldGroup>
            </form>

            <Alert variant={statusType}>
              <AlertTitle>Status</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
