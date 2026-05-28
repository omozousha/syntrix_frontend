"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Network, Radar, ShieldCheck } from "lucide-react";
import { ResponseDialog } from "@/components/response-dialog";
import { apiFetch } from "@/lib/api";
import { clearStoredToken, fetchCurrentUser, loginWithPassword, storeSessionTokens, getStoredToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const AUTH_DIALOG_INTERVAL_MS = 5000;
const SYNTRIX_ONE_APP_URL = "io.syntrixone.app://login";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Masukkan akun Anda untuk melanjutkan.");
  const [statusTitle, setStatusTitle] = useState("Status Login");
  const [statusType, setStatusType] = useState<"default" | "destructive" | "success">("default");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      void fetchCurrentUser(token)
        .then((profile) => {
          if (profile.role === "user_region") {
            clearStoredToken();
            openSyntrixOneApp();
            return;
          }
          router.replace(getNextPath());
        })
        .catch(() => {
          clearStoredToken();
        });
    }
  }, [router, getNextPath]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatusDialogOpen(true);
    setStatusTitle("Memproses Login");
    setStatus("Sedang memproses login...");
    setStatusType("default");
    try {
      const session = await loginWithPassword(email, password);
      const profile = await fetchCurrentUser(session.accessToken);
      if (profile.role === "user_region") {
        clearStoredToken();
        setStatusTitle("Akses Validator Dialihkan");
        setStatus("Akun validator hanya dapat digunakan melalui aplikasi Syntrix-One. Membuka aplikasi sekarang...");
        setStatusType("default");
        await delay(800);
        openSyntrixOneApp();
        return;
      }
      storeSessionTokens(session);
      setStatusTitle("Login Berhasil");
      setStatus("Login sukses.");
      setStatusType("success");
      await delay(AUTH_DIALOG_INTERVAL_MS);
      router.replace(getNextPath());
    } catch (error) {
      setStatusTitle("Login Gagal");
      setStatus(`Login gagal: ${(error as Error).message}`);
      setStatusType("destructive");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    if (!email.trim()) {
      setStatusType("destructive");
      setStatusTitle("Email Wajib Diisi");
      setStatus("Isi email terlebih dahulu untuk reset password.");
      setStatusDialogOpen(true);
      return;
    }

    setResetLoading(true);
    setStatusDialogOpen(true);
    setStatusTitle("Mengirim Reset Password");
    setStatusType("default");
    setStatus("Mengirim email reset password...");
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatusTitle("Reset Password Dikirim");
      setStatusType("success");
      setStatus("Email reset password berhasil dikirim. Silakan cek inbox/spam.");
    } catch (error) {
      setStatusTitle("Reset Password Gagal");
      setStatusType("destructive");
      setStatus(`Gagal mengirim reset password: ${(error as Error).message}`);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-[radial-gradient(circle_at_top_left,var(--accent),transparent_34%),linear-gradient(135deg,var(--background),var(--muted))] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="hidden border-r bg-card/45 lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-2xl space-y-7 px-10">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit rounded-md bg-background/70">
              Network Assurance Console
            </Badge>
            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-tight text-balance">Syntrix</h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Synchronization & Validation Matrix untuk inventory region, POP, device, validasi ODP, dan approval chain dalam satu alur kerja yang terukur.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/85 p-4 shadow-sm">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
              <MatrixNode icon={Network} title="Inventory" description="Region, POP, Device" />
              <ArrowRight className="size-4 text-muted-foreground" />
              <MatrixNode icon={Radar} title="Validation" description="Field evidence" />
              <ArrowRight className="size-4 text-muted-foreground" />
              <MatrixNode icon={ShieldCheck} title="Approval" description="Role based" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SignalCard label="Scope" value="Region-aware" />
            <SignalCard label="Workflow" value="Validator chain" />
            <SignalCard label="Control" value="Audit ready" />
          </div>

          <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-primary/15 bg-primary/10 p-2 text-primary shadow-inner">
                <LockKeyhole className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Secure role workspace</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Setelah login, Syntrix membuka dashboard, queue, dan data sesuai role serta scope region akun.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md border border-primary/15 bg-primary/10 p-2 text-primary shadow-inner">
                  <Network className="size-4" />
                </div>
                <div>
                  <CardTitle>Login Syntrix</CardTitle>
                  <CardDescription>Synchronization & Validation Matrix</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Secure</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/35 px-3 py-2">
              <p className="text-xs text-muted-foreground">Tujuan setelah login</p>
              <p className="truncate text-sm font-medium">{getNextPath()}</p>
            </div>

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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </Field>

                <Button type="submit" disabled={loading} className="w-full shadow-sm shadow-primary/20">
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

          </CardContent>
        </Card>
      </section>

      <ResponseDialog
        open={statusDialogOpen}
        title={statusTitle}
        description={status}
        variant={statusType === "destructive" ? "error" : statusType === "success" ? "success" : "info"}
        loading={loading || resetLoading}
        showAction={!loading && !resetLoading}
        actionLabel="Mengerti"
        onOpenChange={(open) => {
          if (loading || resetLoading) return;
          setStatusDialogOpen(open);
        }}
        onAction={() => setStatusDialogOpen(false)}
      />
    </main>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function openSyntrixOneApp() {
  if (typeof window === "undefined") return;
  window.location.href = SYNTRIX_ONE_APP_URL;
}

function MatrixNode({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Network;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/80 p-3 shadow-sm">
      <Icon className="mb-3 size-5 text-primary" />
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card/80 p-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
