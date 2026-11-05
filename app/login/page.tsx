"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Network, Radar, ShieldCheck } from "lucide-react";
import { AppLoading, ButtonLoader } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { apiFetch } from "@/lib/api";
import { clearStoredToken, fetchCurrentUser, loginWithPassword, storeSessionTokens, getStoredToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@/lib/use-locale";

const AUTH_DIALOG_INTERVAL_MS = 5000;
const SYNTRIX_ONE_APP_URL = "io.syntrixone.app://login";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(() => t("login.defaultStatus"));
  const [statusTitle, setStatusTitle] = useState(() => t("login.defaultStatusTitle"));
  const [statusType, setStatusType] = useState<"default" | "destructive" | "success">("default");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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
            setIsCheckingSession(false);
            return;
          }
          router.replace(getNextPath());
        })
        .catch(() => {
          clearStoredToken();
          setIsCheckingSession(false);
        });
    } else {
      setIsCheckingSession(false);
    }
  }, [router, getNextPath]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatusDialogOpen(true);
    setStatusTitle(t("login.processingTitle"));
    setStatus(t("login.processingDesc"));
    setStatusType("default");
    try {
      const session = await loginWithPassword(email, password);
      const profile = await fetchCurrentUser(session.accessToken);
      if (profile.role === "user_region") {
        clearStoredToken();
        setStatusTitle(t("login.validatorRedirectTitle"));
        setStatus(t("login.validatorRedirectDesc"));
        setStatusType("default");
        await delay(800);
        openSyntrixOneApp();
        return;
      }
      storeSessionTokens(session);
      setStatusTitle(t("login.successTitle"));
      setStatus(t("login.successDesc"));
      setStatusType("success");
      await delay(AUTH_DIALOG_INTERVAL_MS);
      router.replace(getNextPath());
    } catch (error) {
      setStatusTitle(t("login.failedTitle"));
      setStatus(t("login.failedDesc", { error: (error as Error).message }));
      setStatusType("destructive");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    if (!email.trim()) {
      setStatusType("destructive");
      setStatusTitle(t("login.emailRequiredTitle"));
      setStatus(t("login.emailRequiredDesc"));
      setStatusDialogOpen(true);
      return;
    }

    setResetLoading(true);
    setStatusDialogOpen(true);
    setStatusTitle(t("login.sendingResetTitle"));
    setStatusType("default");
    setStatus(t("login.sendingResetDesc"));
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatusTitle(t("login.resetSentTitle"));
      setStatusType("success");
      setStatus(t("login.resetSentDesc"));
    } catch (error) {
      setStatusTitle(t("login.resetFailedTitle"));
      setStatusType("destructive");
      setStatus(t("login.resetFailedDesc", { error: (error as Error).message }));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[linear-gradient(135deg,var(--background),var(--muted)_62%)]">
      {isCheckingSession ? (
        <AppLoading fullscreen label={t("login.checkingSession")} />
      ) : (
    <>
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="hidden items-center lg:flex">
          <div className="w-full space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/75 px-3 py-2 shadow-2xs">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Network className="size-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">Syntrix</span>
              <span className="h-4 w-px bg-border" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("login.opsConsole")}</span>
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-balance">
                {t("login.heroTitle")}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                {t("login.heroDesc")}
              </p>
            </div>

            <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
              <div className="rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-background p-3">
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                  <MatrixNode icon={Network} title={t("login.nodeInventoryTitle")} description={t("login.nodeInventoryDesc")} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <MatrixNode icon={Radar} title={t("login.nodeValidationTitle")} description={t("login.nodeValidationDesc")} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <MatrixNode icon={ShieldCheck} title={t("login.nodeApprovalTitle")} description={t("login.nodeApprovalDesc")} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-2xs glass-inset">
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-primary/15 bg-primary/10 p-2 text-primary">
                  <LockKeyhole className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("login.secureRoleTitle")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("login.secureRoleDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-card/80 px-3 py-2 shadow-sm lg:hidden">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Network className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Syntrix</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t("login.heroTitle")}</p>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">Secure</Badge>
            </div>

            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset">
              <CardHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md border border-primary/15 bg-primary/10 p-2 text-primary">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{t("login.cardTitle")}</CardTitle>
                      <CardDescription>{t("login.cardDesc")}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={onSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email">{t("login.emailLabel")}</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder={t("login.emailPlaceholder")}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="password">{t("login.passwordLabel")}</FieldLabel>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete="current-password"
                          placeholder={t("login.passwordPlaceholder")}
                          className="pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </Field>

                    <Button type="submit" disabled={loading} className="w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-sm shadow-primary/20">
                      {loading ? <ButtonLoader className="mr-2" /> : null}
                      {loading ? t("login.submitting") : t("login.submit")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onResetPassword()}
                      disabled={resetLoading}
                      className="w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      {resetLoading ? <ButtonLoader className="mr-2" /> : null}
                      {resetLoading ? t("login.sendingReset") : t("login.resetPassword")}
                    </Button>

                  </FieldGroup>
                </form>

                <div className="rounded-md border bg-muted/35 px-3 py-2">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("login.footerHint")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <ResponseDialog
        open={statusDialogOpen}
        title={statusTitle}
        description={status}
        variant={statusType === "destructive" ? "error" : statusType === "success" ? "success" : "info"}
        loading={loading || resetLoading}
        showAction={!loading && !resetLoading}
        actionLabel={t("login.acknowledge")}
        onOpenChange={(open) => {
          if (loading || resetLoading) return;
          setStatusDialogOpen(open);
        }}
        onAction={() => setStatusDialogOpen(false)}
      />
    </>
      )}
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
    <div className="min-w-0 rounded-xl border border-border/60 bg-card p-3 shadow-2xs glass-inset">
      <Icon className="mb-3 size-5 text-primary" />
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}

