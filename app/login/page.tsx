"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Network, Radar, ShieldCheck } from "lucide-react";
import { AppLoading, ButtonLoader } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { apiFetch } from "@/lib/api";
import { clearStoredToken, fetchCurrentUser, getStoredToken, loginWithPassword, storeSessionTokens } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
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
    <main className="relative isolate min-h-dvh overflow-hidden bg-background">
      {isCheckingSession ? (
        <AppLoading fullscreen label={t("login.checkingSession")} />
      ) : (
        <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:px-8">
          <section className="hidden items-center lg:col-span-7 lg:flex">
            <div className="w-full space-y-8">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2 shadow-2xs">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Network className="size-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">Syntrix</span>
              </div>

              <div className="max-w-2xl space-y-4">
                <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-foreground text-balance xl:text-6xl">
                  {t("login.heroTitle")}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  {t("login.heroDesc")}
                </p>
              </div>

                                                        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xs">
                <ol className="flex items-start justify-between">
                  <MatrixNode step="01" icon={Network} title={t("login.nodeInventoryTitle")} description={t("login.nodeInventoryDesc")} />
                  <span aria-hidden className="mt-7 h-px flex-1 bg-border" />
                  <MatrixNode step="02" icon={Radar} title={t("login.nodeValidationTitle")} description={t("login.nodeValidationDesc")} />
                  <span aria-hidden className="mt-7 h-px flex-1 bg-border" />
                  <MatrixNode step="03" icon={ShieldCheck} title={t("login.nodeApprovalTitle")} description={t("login.nodeApprovalDesc")} />
                </ol>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-2xs">
                <div className="rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary">
                  <LockKeyhole className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{t("login.secureRoleTitle")}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("login.secureRoleDesc")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center lg:col-span-5">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 shadow-2xs lg:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Network className="size-4" />
                  </span>
                  <p className="truncate text-sm font-medium text-foreground">Syntrix</p>
                </div>
              </div>

              <Card className="rounded-2xl border border-border/60 bg-card py-6 shadow-xs">
                <CardHeader className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-primary/15 bg-primary/10 p-2.5 text-primary">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-2xl tracking-tight">{t("login.cardTitle")}</CardTitle>
                      <CardDescription>{t("login.cardDesc")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 px-6">
                  <form onSubmit={onSubmit}>
                    <FieldGroup className="gap-5">
                      <Field className="gap-2">
                                                <FieldLabel htmlFor="email" className="text-sm font-medium text-foreground">{t("login.emailLabel")}</FieldLabel>
                                                <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          placeholder={t("login.emailPlaceholder")}
                          className="h-11 rounded-lg border-border/60 bg-background/80 text-base transition-[border-color,box-shadow,color,background-color] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        />
                      </Field>

                      <Field className="gap-2">
                                                <FieldLabel htmlFor="password" className="text-sm font-medium text-foreground">{t("login.passwordLabel")}</FieldLabel>
                        <div className="relative">
                                                    <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            placeholder={t("login.passwordPlaceholder")}
                            className="h-11 rounded-lg border-border/60 bg-background/80 text-base transition-[border-color,box-shadow,color,background-color] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground pr-11 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          />
                          <Toggle
                            pressed={showPassword}
                            onPressedChange={setShowPassword}
                            size="sm"
                            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md text-muted-foreground transition-[color,background-color] duration-200 data-[state=on]:text-foreground"
                            aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </Toggle>
                        </div>
                      </Field>

                      <div className="space-y-2 pt-1">
                                                <Button
                          type="submit"
                          disabled={loading}
                          className="h-11 w-full rounded-lg shadow-sm shadow-primary/20 transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out hover:shadow-md hover:shadow-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
                        >
                          {loading ? <ButtonLoader className="mr-2" /> : null}
                          {loading ? t("login.submitting") : t("login.submit")}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void onResetPassword()}
                          disabled={resetLoading}
                          className="h-10 w-full rounded-lg text-xs text-muted-foreground transition-[color,background-color] duration-200 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
                        >
                          {resetLoading ? <ButtonLoader className="mr-2" /> : null}
                          {resetLoading ? t("login.sendingReset") : t("login.resetPassword")}
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>

                  <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("login.footerHint")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}

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
  step,
  icon: Icon,
  title,
  description,
}: {
  step: string;
  icon: typeof Network;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center space-y-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-2xs">
        <Icon className="size-6" />
      </div>
      <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{step}</span>
      <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
