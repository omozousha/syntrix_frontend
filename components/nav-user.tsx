"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/session";
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
const avatarBlobUrlCache = new Map<string, string>();

type ValidationRequestNotificationItem = {
  id: string;
  request_id?: string | null;
  current_status?: string | null;
  region_id?: string | null;
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
  const seenUnreadIdsRef = useRef<Set<string>>(new Set());
  const firstNotificationLoadRef = useRef(true);

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
        const unread = Number(result.data?.unread_count || 0);
        setNotifications(rows);
        setUnreadCount(unread);

        const nextUnreadIds = new Set(rows.filter((row) => row.unread).map((row) => String(row.id)));
        if (firstNotificationLoadRef.current) {
          firstNotificationLoadRef.current = false;
          seenUnreadIdsRef.current = nextUnreadIds;
          return;
        }

        const newlyArrived = rows.filter((row) => row.unread && !seenUnreadIdsRef.current.has(String(row.id)));
        if (newlyArrived.length) {
          const latest = newlyArrived[0];
          const urgentLabel = latest.urgent ? " (URGENT)" : "";
          const showToast = latest.urgent ? toast.warning : toast.success;
          showToast(`Ada request approval baru${urgentLabel}`, {
            description: `${latest.request_id || latest.id} masuk ke ${notificationQueueLabel}.`,
            action: {
              label: "Buka",
              onClick: () => router.push("/validation-requests"),
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
  }, [token, canReviewValidation, router, notificationQueueLabel, selectedRegionId]);

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
      setNotifications((prev) => prev.map((item) => (item.id === requestId ? { ...item, unread: false } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
      setUnreadCount(0);
      toast.success("Semua notifikasi ditandai sudah dibaca.");
    } catch {
      toast.error("Gagal menandai semua notifikasi.");
    }
  }

  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      {canReviewValidation ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative">
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
              <span>Approval Inbox</span>
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
                    <span>Pending: {digest?.pending_total ?? 0}</span>
                    <span>Unread: {digest?.unread_total ?? 0}</span>
                    <span>Urgent: {digest?.urgent_total ?? 0}</span>
                    <span>Update: {digest?.updated_in_window ?? 0}</span>
                  </div>
                )}
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
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        className={`flex cursor-pointer flex-col items-start gap-0.5 ${item.unread ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          void markOneAsRead(item.id);
                          router.push("/validation-requests");
                        }}
                      >
                        <span className="text-xs font-medium">
                          {item.request_id || item.id} {item.unread ? <span className="text-primary">•</span> : null}
                          {item.urgent ? <span className="ml-1 text-amber-600">URGENT</span> : null}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {mappedStatus.label} • {formatDateTime(item.updated_at)}
                          {item.age_minutes ? ` • ${formatAge(item.age_minutes)}` : ""}
                        </span>
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Belum ada request pending.</p>
                )}
              </div>
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/validation-requests")}>
              Buka halaman Validation Requests
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2 sm:w-auto">
            <Avatar className="size-7">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={me.app_user.full_name} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="max-w-[180px] truncate text-left">{me.app_user.full_name}</span>
            <ChevronDown className="size-4" />
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
          <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {darkMode ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
            {darkMode ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
