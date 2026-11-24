"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Network, Radar, ShieldCheck } from "lucide-react";
import { AppLoading, ButtonLoader } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { apiFetch } from "@/lib/api";
import { clearStoredToken, fetchCurrentUser, loginWithPassword, storeSessionTokens, getStoredToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { useTranslate } from "@/lib/use-locale";

const AUTH_DIALOG_INTERVAL_MS = 5000;
const SYNTRIX_ONE_APP_URL = "io.syntrixone.app://login";

const LABEL_CLASS = "font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground";
const INPUT_CLASS =
  "h-10 rounded-lg border-border/60 bg-background/60 transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:border-primary/60 focus-visible:ring-primary/20";

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
      <LoginBackdrop />
      {isCheckingSession ? (
        <AppLoading fullscreen label={t("login.checkingSession")} />
      ) : (
    <>
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-10 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-8">
        <section className="hidden items-center lg:col-span-7 lg:flex motion-reduce:animate-none animate-smooth-reveal">
          <div className="w-full space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 py-1.5 pl-1.5 pr-3 shadow-2xs glass-inset backdrop-blur-md">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Network className="size-3.5" />
              </span>
              <span className="text-sm font-semibold text-foreground">Syntrix</span>
              <span className="h-4 w-px bg-border" />
              <span className={LABEL_CLASS}>{t("login.opsConsole")}</span>
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/55 bg-clip-text text-5xl font-semibold leading-[1.02] tracking-tight text-balance text-transparent xl:text-6xl">
                {t("login.heroTitle")}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                {t("login.heroDesc")}
              </p>
            </div>

            <div className="rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-xs backdrop-blur-sm dark:bg-white/[0.02]">
              <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-4 glass-inset">
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                  <MatrixNode step="01" icon={Network} title={t("login.nodeInventoryTitle")} description={t("login.nodeInventoryDesc")} />
                  <FiberConnector />
                  <MatrixNode step="02" icon={Radar} title={t("login.nodeValidationTitle")} description={t("login.nodeValidationDesc")} />
                  <FiberConnector delayed />
                  <MatrixNode step="03" icon={ShieldCheck} title={t("login.nodeApprovalTitle")} description={t("login.nodeApprovalDesc")} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-2xs glass-inset backdrop-blur-md">
              <div className="rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary">
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
        </section>

        <section className="flex items-center justify-center lg:col-span-5 motion-reduce:animate-none animate-smooth-reveal-delayed">
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-3 py-2 shadow-2xs glass-inset backdrop-blur-md lg:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Network className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Syntrix</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t("login.heroTitle")}</p>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">Secure</Badge>
            </div>

            <div className="rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-sm backdrop-blur-sm dark:bg-white/[0.02]">
              <Card className="gap-5 rounded-[calc(2rem-0.5rem)] border border-border/60 bg-card/95 py-6 shadow-none glass-inset">
                <CardHeader className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-primary/15 bg-primary/10 p-2.5 text-primary">
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
                        <FieldLabel htmlFor="email" className={LABEL_CLASS}>{t("login.emailLabel")}</FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          placeholder={t("login.emailPlaceholder")}
                          className={INPUT_CLASS}
                          required
                        />
                      </Field>

                      <Field className="gap-2">
                        <FieldLabel htmlFor="password" className={LABEL_CLASS}>{t("login.passwordLabel")}</FieldLabel>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            placeholder={t("login.passwordPlaceholder")}
                            className={`${INPUT_CLASS} pr-11`}
                            required
                          />
                          <Toggle
                            pressed={showPassword}
                            onPressedChange={setShowPassword}
                            size="sm"
                            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md text-muted-foreground data-[state=on]:text-foreground"
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
                          className="h-10 w-full rounded-full shadow-sm shadow-primary/20 transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md hover:shadow-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
                        >
                          {loading ? <ButtonLoader className="mr-2" /> : null}
                          {loading ? t("login.submitting") : t("login.submit")}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void onResetPassword()}
                          disabled={resetLoading}
                          className="h-9 w-full rounded-full text-xs text-muted-foreground transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
                        >
                          {resetLoading ? <ButtonLoader className="mr-2" /> : null}
                          {resetLoading ? t("login.sendingReset") : t("login.resetPassword")}
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>

                  <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 glass-inset">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {t("login.footerHint")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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

// Static dot grid + two slow ambient orbs (video-shotcraft glow-orb-ambient, CSS-only).
// ponytail: orbs drift on a fixed CSS loop; switch to pointer-reactive spotlight only if the page needs interactivity.
function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden animate-[fade-in_0.9s_ease-out_both]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--background),var(--muted)_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)] opacity-60" />
      <div className="animate-ambient-float absolute -left-32 top-1/4 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="animate-ambient-float absolute -right-24 bottom-0 size-[28rem] rounded-full bg-chart-2/15 blur-3xl [animation-delay:-7s]" />
    </div>
  );
}

// Fiber link between pipeline nodes (video-shotcraft glow-flyline-moves, CSS-only).
function FiberConnector({ delayed = false }: { delayed?: boolean }) {
  return (
    <div aria-hidden className="relative h-px w-10 overflow-hidden rounded-full bg-border">
      <span
        className={`animate-fiber-beam absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent ${delayed ? "[animation-delay:1.4s]" : ""}`}
      />
    </div>
  );
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
    <div className="group min-w-0 rounded-2xl border border-border/60 bg-card p-3.5 shadow-2xs glass-inset transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/45 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transform-none">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="font-mono text-[9px] tabular-nums tracking-[0.15em] text-muted-foreground">{step}</span>
      </div>
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}
