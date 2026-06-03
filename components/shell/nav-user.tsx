"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/session";
import { ResponseDialog } from "@/components/response-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { mapValidationStatus } from "@/lib/validation-status";
import { useSession } from "@/components/session-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_KEY = "syntrix_theme";
const AVATAR_CACHE_PREFIX = "syntrix_avatar_cache";
const NOTIFICATION_POLL_INTERVAL_MS = 20_000;
const LOGOUT_DIALOG_INTERVAL_MS = 5000;
const REQUESTS_PATH = "/requests";
const avatarBlobUrlCache = new Map<string, string>();

type ValidationRequestNotificationItem = {
  id: string;
  request_id?: string | null;
  current_status?: string | null;
  region_id?: string | null;
  payload_snapshot?: {
    source?: string | null;
    operation?: string | null;
    resource_label?: string | null;
    device?: Record<string, unknown> | null;
    resource?: Record<string, unknown> | null;
  } | null;
  updated_at?: string | null;
  unread?: boolean;
  urgent?: boolean;
  age_minutes?: number;
};

type ValidationNotificationResponse = {
  data?: {
    unread_count?: number;
    items?: ValidationRequestNotificationItem[];
  };
};

type NotificationDigestResponse = {
  data?: {
    window?: "daily" | "weekly";
    pending_total?: number;
    unread_total?: number;
    urgent_total?: number;
    new_in_window?: number;
    updated_in_window?: number;
  };
};

type RegionOption = {
  id: string;
  label: string;
};

export function NavUser({ me, onLogout }: { me: SessionUser; onLogout: () => void }) {
  const router = useRouter();
  const { token } = useSession();
  const normalizedRole = normalizeRole(me.role);
  const canReviewValidation = normalizedRole === "adminregion" || normalizedRole === "superadmin";
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState<ValidationRequestNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestWindow, setDigestWindow] = useState<"daily" | "weekly">("daily");
  const [digest, setDigest] = useState<NotificationDigestResponse["data"] | null>(null);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const seenUnreadIdsRef = useRef<Set<string>>(new Set());
  const firstNotificationLoadRef = useRef(true);
  const logoutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      const localCache = getCachedAvatarDataUrl(me.app_user.id);
      if (localCache) {
        setAvatarUrl(localCache);
      }

      const attachmentId =
        me.app_user.avatar_attachment_id ||
        (me.app_user as { metadata?: { avatar_attachment_id?: string | null } }).metadata?.avatar_attachment_id;
      if (!attachmentId) {
        if (!localCache) setAvatarUrl("");
        return;
      }

      const cached = avatarBlobUrlCache.get(attachmentId);
      if (cached) {
        setAvatarUrl(cached);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/preview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (!cancelled) setAvatarUrl("");
          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        avatarBlobUrlCache.set(attachmentId, objectUrl);
        if (!cancelled) setAvatarUrl(objectUrl);
      } catch {
        if (!cancelled) setAvatarUrl("");
      }
    }

    void loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [me.app_user, token]);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  function handleLogout() {
    if (logoutLoading) return;
    setLogoutDialogOpen(true);
    setLogoutLoading(true);
    logoutTimerRef.current = window.setTimeout(() => {
      onLogout();
    }, LOGOUT_DIALOG_INTERVAL_MS);
  }

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  const initials = getInitials(me.app_user.full_name);
  const notificationCount = unreadCount;
  const notificationQueueLabel = useMemo(() => {
    if (normalizedRole === "superadmin") return "Queue Superadmin";
    if (normalizedRole === "adminregion") return "Queue Admin Region";
    return "Notifikasi";
  }, [normalizedRole]);
  const scopedRegionIds = useMemo(() => me.app_user.user_region_scopes?.map((item) => item.region_id).filter(Boolean) || [], [me.app_user.user_region_scopes]);

  useEffect(() => {
    if (!canReviewValidation) return;
    let cancelled = false;
    async function loadRegions() {
      try {
        const payload = await apiFetch<{ data?: Array<{ id: string; region_name?: string | null; region_id?: string | null }> }>("/regions?page=1&limit=200", { token });
        if (cancelled) return;
        const options = (payload.data || [])
          .filter((row) => normalizedRole === "superadmin" || scopedRegionIds.includes(row.id))
          .map((row) => ({
            id: row.id,
            label: row.region_name || row.region_id || row.id,
          }));
        setRegionOptions(options);
      } catch {
        if (!cancelled) setRegionOptions([]);
      }
    }
    void loadRegions();
    return () => {
      cancelled = true;
    };
  }, [canReviewValidation, token, normalizedRole, scopedRegionIds]);

  useEffect(() => {
    if (!canReviewValidation) return;
    let cancelled = false;

    async function loadNotifications() {
      if (!cancelled) setNotificationLoading(true);
      try {
        const query = new URLSearchParams({ limit: "10" });
        if (selectedRegionId) query.set("region_id", selectedRegionId);
        const result = await apiFetch<ValidationNotificationResponse>(`/validation-requests/notifications?${query.toString()}`, { token });
        if (cancelled) return;

        const rows = result.data?.items || [];
        const unreadRows = rows.filter((row) => row.unread);
        const unread = Number(result.data?.unread_count || 0);
        setNotifications(unreadRows);
        setUnreadCount(unread);

        const nextUnreadIds = new Set(unreadRows.map((row) => String(row.id)));
        if (firstNotificationLoadRef.current) {
          firstNotificationLoadRef.current = false;
          seenUnreadIdsRef.current = nextUnreadIds;
          return;
        }

        const newlyArrived = unreadRows.filter((row) => !seenUnreadIdsRef.current.has(String(row.id)));
        if (newlyArrived.length) {
          const latest = newlyArrived[0];
          const urgentLabel = latest.urgent ? " (URGENT)" : "";
          const copy = getNotificationCopy(latest, normalizedRole);
          const showToast = copy.variant === "warning" || latest.urgent ? toast.warning : toast.success;
          showToast(`${copy.toastTitle}${urgentLabel}`, {
            description: [copy.targetName, copy.stageLabel].filter(Boolean).join(" - "),
            action: {
              label: "Buka",
              onClick: () => router.push(REQUESTS_PATH),
            },
          });
        }
        seenUnreadIdsRef.current = new Set([...seenUnreadIdsRef.current, ...nextUnreadIds]);
      } catch {
        // keep header stable
      } finally {
        if (!cancelled) setNotificationLoading(false);
      }
    }

    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, canReviewValidation, router, normalizedRole, selectedRegionId]);

  useEffect(() => {
    if (!canReviewValidation) return;
    let cancelled = false;
    async function loadDigest() {
      if (!cancelled) setDigestLoading(true);
      try {
        const query = new URLSearchParams({ window: digestWindow });
        if (selectedRegionId) query.set("region_id", selectedRegionId);
        const result = await apiFetch<NotificationDigestResponse>(`/validation-requests/notifications/digest?${query.toString()}`, { token });
        if (cancelled) return;
        setDigest(result.data || null);
      } catch {
        if (!cancelled) setDigest(null);
      } finally {
        if (!cancelled) setDigestLoading(false);
      }
    }
    void loadDigest();
    return () => {
      cancelled = true;
    };
  }, [canReviewValidation, token, digestWindow, selectedRegionId]);

  async function markOneAsRead(requestId: string) {
    try {
      await apiFetch(`/validation-requests/notifications/${requestId}/read`, { method: "POST", token });
      setNotifications((prev) => prev.filter((item) => item.id !== requestId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      seenUnreadIdsRef.current.delete(requestId);
    } catch {
      // noop
    }
  }

  async function markAllAsRead() {
    try {
      await apiFetch("/validation-requests/notifications/read-all", {
        method: "POST",
        token,
        body: selectedRegionId ? { region_id: selectedRegionId } : {},
      });
      setNotifications([]);
      setUnreadCount(0);
      seenUnreadIdsRef.current.clear();
      toast.success("Semua notifikasi ditandai sudah dibaca.");
    } catch {
      toast.error("Gagal menandai semua notifikasi.");
    }
  }

  return (
    <div className="flex w-auto shrink-0 items-center justify-end gap-1.5 sm:gap-2">
      {canReviewValidation ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative size-9">
              <Bell className="size-4" />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Request Inbox</span>
              <Badge variant="outline">{notificationQueueLabel}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 px-2 pb-1">
              <div className="flex items-center gap-1">
                <Button type="button" variant={digestWindow === "daily" ? "default" : "outline"} size="sm" className="h-7 text-[11px]" onClick={() => setDigestWindow("daily")}>
                  24 Jam
                </Button>
                <Button type="button" variant={digestWindow === "weekly" ? "default" : "outline"} size="sm" className="h-7 text-[11px]" onClick={() => setDigestWindow("weekly")}>
                  7 Hari
                </Button>
              </div>
              {regionOptions.length ? (
                <select
                  value={selectedRegionId}
                  onChange={(event) => setSelectedRegionId(event.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                >
                  <option value="">Semua Region</option>
                  {regionOptions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="rounded-md border bg-muted/20 p-2 text-[11px]">
                {digestLoading ? (
                  <span className="text-muted-foreground">Memuat ringkasan...</span>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span>Inbox: {digest?.pending_total ?? 0}</span>
                    <span>Unread: {digest?.unread_total ?? 0}</span>
                    <span>Urgent: {digest?.urgent_total ?? 0}</span>
                    <span>Update: {digest?.updated_in_window ?? 0}</span>
                  </div>
                )}
              </div>
              <div className="rounded-md border border-dashed bg-background/80 p-2 text-[11px] text-muted-foreground">
                Broadcast Announcement siap ditempatkan di sini saat endpoint event notification aktif.
              </div>
            </div>
            {notificationCount > 0 ? (
              <div className="px-2 pb-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void markAllAsRead()}>
                  Mark all as read
                </Button>
              </div>
            ) : null}
            <ScrollArea className="max-h-80">
              <div className="space-y-1 p-1">
                {notificationLoading ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Memuat notifikasi...</p>
                ) : notifications.length ? (
                  notifications.map((item) => {
                    const mappedStatus = mapValidationStatus(item.current_status);
                    const copy = getNotificationCopy(item, normalizedRole);
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        className={`flex cursor-pointer flex-col items-start gap-0.5 ${item.unread ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          void markOneAsRead(item.id);
                          router.push(REQUESTS_PATH);
                        }}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <Badge variant="outline" className="h-4 max-w-[150px] px-1 text-[10px] font-normal">
                            <span className="truncate">{copy.requestType}</span>
                          </Badge>
                          <Badge variant="outline" className={mappedStatus.className}>
                            {mappedStatus.label}
                          </Badge>
                        </div>
                        <span className="line-clamp-1 text-xs font-medium">
                          {copy.title} {item.unread ? <span className="text-primary">*</span> : null}
                          {item.urgent ? <span className="ml-1 text-amber-600">URGENT</span> : null}
                        </span>
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">
                          {copy.targetName || "Asset terkait"} - {copy.stageLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(item.updated_at)}
                          {item.age_minutes ? ` - ${formatAge(item.age_minutes)}` : ""}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 px-2 text-[11px]"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void markOneAsRead(item.id);
                          }}
                        >
                          <Check className="mr-1 size-3" />
                          Mark read
                        </Button>
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Tidak ada notifikasi baru.</p>
                )}
              </div>
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(REQUESTS_PATH)}>
              Buka halaman Requests
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <NavUserAccountMenu
        me={me}
        avatarUrl={avatarUrl}
        initials={initials}
        darkMode={darkMode}
        onProfile={() => router.push("/profile")}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <ResponseDialog
        open={logoutDialogOpen}
        title="Mengakhiri Sesi"
        description="Syntrix sedang menutup workspace dan membersihkan sesi akun. Anda akan diarahkan ke login dalam 5 detik."
        variant="info"
        loading={logoutLoading}
        showAction={false}
        onOpenChange={(open) => {
          if (logoutLoading) return;
          setLogoutDialogOpen(open);
        }}
      />
    </div>
  );
}

function NavUserAccountMenu({
  me,
  avatarUrl,
  initials,
  darkMode,
  onProfile,
  onToggleTheme,
  onLogout,
}: {
  me: SessionUser;
  avatarUrl: string;
  initials: string;
  darkMode: boolean;
  onProfile: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="size-9 justify-center p-0 sm:h-9 sm:w-auto sm:justify-between sm:gap-2 sm:px-3">
          <Avatar className="size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={me.app_user.full_name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[180px] truncate text-left sm:inline">{me.app_user.full_name}</span>
          <ChevronDown className="hidden size-4 sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={me.app_user.full_name} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium">{me.app_user.full_name}</p>
          </div>
          <p className="truncate text-xs text-muted-foreground">{me.app_user.email}</p>
          <Badge variant="outline" className="mt-1">
            {me.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile} className="cursor-pointer">
          <User className="mr-2 size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleTheme} className="cursor-pointer">
          {darkMode ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
          {darkMode ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function normalizeRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAge(ageMinutes: number) {
  if (ageMinutes < 60) return `${ageMinutes}m`;
  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  if (hours < 24) return `${hours}j ${minutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}h ${remHours}j`;
}

function getNotificationCopy(item: ValidationRequestNotificationItem, role: string) {
  const requestType = getNotificationRequestType(item);
  const targetName = getNotificationTargetName(item);
  const stageLabel = getNotificationStageLabel(item.current_status, role);
  const title = targetName ? `${requestType}: ${targetName}` : requestType;
  const isWarning = String(item.current_status || "").startsWith("rejected");

  return {
    requestType,
    targetName,
    title,
    stageLabel,
    toastTitle: isWarning ? `${requestType} perlu tindak lanjut` : `${requestType} masuk inbox`,
    variant: isWarning ? ("warning" as const) : ("success" as const),
  };
}

function getNotificationRequestType(item: ValidationRequestNotificationItem) {
  const source = String(item.payload_snapshot?.source || "").trim();
  if (source === "adminregion-create-device") return "Create Device Request";
  if (
    source === "adminregion-create-resource" ||
    source === "adminregion-update-resource" ||
    source === "adminregion-archive-resource"
  ) {
    return `${getOperationLabel(item.payload_snapshot?.operation)} ${item.payload_snapshot?.resource_label || "Asset"} Request`;
  }
  return "Field Validation Request";
}

function getNotificationTargetName(item: ValidationRequestNotificationItem) {
  const payload = item.payload_snapshot || {};
  const device = payload.device || {};
  const resource = payload.resource || {};
  const fieldValidation = (payload as { field_validation?: Record<string, unknown> | null }).field_validation || {};
  return pickText(
    device.device_name,
    device.new_device_name,
    device.device_id,
    fieldValidation.new_device_name,
    fieldValidation.old_device_name,
    fieldValidation.inventory_id,
    resource.device_name,
    resource.pop_name,
    resource.route_name,
    resource.project_name,
    resource.name,
    payload.resource_label,
  );
}

function getNotificationStageLabel(status: string | null | undefined, role: string) {
  if (status === "ongoing_validated") return role === "adminregion" ? "Menunggu review Admin Region" : "Dalam review Admin Region";
  if (status === "pending_async") return role === "superadmin" ? "Menunggu approval Superadmin" : "Dalam review Superadmin";
  if (status === "rejected_by_adminregion") return "Ditolak Admin Region";
  if (status === "rejected_by_superadmin") return "Ditolak Superadmin, perlu resubmit Admin Region";
  if (status === "validated") return "Selesai disetujui Superadmin";
  return "Menunggu review";
}

function getOperationLabel(operation?: string | null) {
  if (operation === "update") return "Update";
  if (operation === "archive") return "Archive";
  if (operation === "delete") return "Delete";
  return "Create";
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAvatarCacheKey(userId: string) {
  return `${AVATAR_CACHE_PREFIX}:${userId}`;
}

function getCachedAvatarDataUrl(userId: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(getAvatarCacheKey(userId)) || "";
}
