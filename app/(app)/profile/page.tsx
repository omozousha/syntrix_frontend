"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session-context";
import { useReferenceData } from "@/hooks/use-reference-data";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { formatRoleLabel } from "@/lib/domain-formatters";
import { getRegionLabel, RELATION_LABEL_FALLBACK } from "@/lib/relation-labels";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_CACHE_PREFIX = "syntrix_avatar_cache";

export default function ProfilePage() {
  const { me, token } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const referenceDataQuery = useReferenceData({
    token,
    groups: ["regions"],
    limit: 200,
    enabled: Boolean(me.app_user.default_region_id),
  });

  useEffect(() => {
    const { first, last } = splitName(me.app_user.full_name || "");
    setFirstName(first);
    setLastName(last);
  }, [me.app_user.full_name]);

  const defaultRegionLabel = useMemo(() => {
    const regionId = me.app_user.default_region_id;
    if (!regionId) return RELATION_LABEL_FALLBACK.empty;

    const regions = referenceDataQuery.data?.data.regions || [];
    const relation = regions.find((region) => String(region.id) === String(regionId));
    return getRegionLabel({
      relation,
      fallback: regionId,
      loading: referenceDataQuery.isLoading,
    });
  }, [me.app_user.default_region_id, referenceDataQuery.data?.data.regions, referenceDataQuery.isLoading]);

  const initials = useMemo(() => {
    const full = `${firstName} ${lastName}`.trim() || me.app_user.full_name || "";
    return buildInitials(full);
  }, [firstName, lastName, me.app_user.full_name]);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl = "";

    async function loadAvatar() {
      setAvatarLoading(true);
      const localCache = getCachedAvatarDataUrl(me.app_user.id);
      if (localCache) {
        setAvatarUrl(localCache);
      }

      const attachmentId =
        me.app_user.avatar_attachment_id ||
        (me.app_user as { metadata?: { avatar_attachment_id?: string | null } }).metadata?.avatar_attachment_id;
      if (!attachmentId) {
        if (!localCache) setAvatarUrl("");
        if (!isCancelled) setAvatarLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/preview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setAvatarUrl("");
          if (!isCancelled) setAvatarLoading(false);
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!isCancelled) {
          setAvatarUrl(objectUrl);
          setAvatarLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setAvatarUrl("");
          setAvatarLoading(false);
        }
      }
    }

    void loadAvatar();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [me.app_user, token]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function handleSelectAvatarFile(file: File | null) {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedFile(file);
    if (!file) {
      setAvatarPreviewUrl("");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreviewUrl(preview);
  }

  async function handleSaveProfile() {
    setMessage("");
    setError("");
    setSavingProfile(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      if (!fullName) {
        throw new Error("Nama depan / belakang tidak boleh kosong.");
      }

      const payload: { full_name: string; avatar_attachment_id?: string | null } = {
        full_name: fullName,
      };

      if (selectedFile) {
        if (!selectedFile.type.startsWith("image/")) {
          throw new Error("File avatar harus berupa gambar.");
        }
        if (selectedFile.size > MAX_AVATAR_SIZE_BYTES) {
          throw new Error("Ukuran avatar maksimal 5MB.");
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("file_category", "image");
        formData.append("entity_type", "user_profile");

        const uploadRes = await apiFetch<{ data: { id: string } }>("/attachments/upload", {
          method: "POST",
          token,
          body: formData,
          retryCount: 0,
          timeoutMs: 90_000,
        });
        payload.avatar_attachment_id = uploadRes.data.id;

        const localDataUrl = await fileToDataUrl(selectedFile);
        cacheAvatarDataUrl(me.app_user.id, localDataUrl);
        setAvatarUrl(localDataUrl);
      }

      await apiFetch("/auth/me", {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
        timeoutMs: 20_000,
        retryCount: 0,
      });

      setMessage("Profile berhasil diperbarui. Halaman akan dimuat ulang.");
      setSelectedFile(null);
      setAvatarPreviewUrl("");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRemoveAvatar() {
    setMessage("");
    setError("");
    setSavingProfile(true);
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ avatar_attachment_id: null }),
        timeoutMs: 20_000,
        retryCount: 0,
      });
      clearCachedAvatarDataUrl(me.app_user.id);
      setMessage("Avatar berhasil dihapus. Halaman akan dimuat ulang.");
      setAvatarPreviewUrl("");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message || "Gagal menghapus avatar.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setMessage("");
    setError("");
    setSavingPassword(true);
    try {
      if (newPassword.length < 8) {
        throw new Error("Password baru minimal 8 karakter.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Konfirmasi password tidak sama.");
      }

      await apiFetch("/auth/change-password", {
        method: "POST",
        token,
        body: JSON.stringify({ new_password: newPassword }),
        timeoutMs: 20_000,
        retryCount: 0,
      });

      setMessage("Password berhasil diganti.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError((err as Error).message || "Gagal mengganti password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSendResetEmail() {
    setMessage("");
    setError("");
    setSendingReset(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: me.app_user.email,
        }),
        timeoutMs: 20_000,
        retryCount: 0,
      });
      setMessage("Email reset password berhasil dikirim.");
    } catch (err) {
      setError((err as Error).message || "Gagal mengirim email reset.");
    } finally {
      setSendingReset(false);
    }
  }

  const busy = savingProfile || savingPassword || sendingReset;
  const displayedAvatarUrl = avatarPreviewUrl || avatarUrl;

  if (avatarLoading) {
    return (
      <div className="h-full min-h-0 w-full pr-3">
        <AppLoading label="Sedang memuat data profile..." />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.18em]">
              Account & Security
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Profile Settings</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Atur identitas akun, avatar, keamanan, dan informasi scope wilayah kamu.
          </p>
        </div>
      </div>

      {/* Main Grid Layout - Utilizes full width on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Side: Avatar & Summary Card (4 cols on lg+) */}
        <Card className="min-w-0 rounded-2xl border-border/60 shadow-xs glass-inset overflow-hidden lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/20 text-center flex flex-col items-center">
            <button
              type="button"
              className="group relative shrink-0 active:scale-[0.97] transition-transform duration-200"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              aria-label="Ubah avatar"
            >
              <Avatar className="size-24 sm:size-28 border-4 border-background shadow-md transition-colors group-hover:border-primary/40 ring-2 ring-border/60">
                {displayedAvatarUrl ? <AvatarImage src={displayedAvatarUrl} alt={me.app_user.full_name} className="object-cover" /> : null}
                <AvatarFallback className="font-mono font-bold text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100">
                <Camera className="size-6" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) => handleSelectAvatarFile(event.target.files?.[0] || null)}
              disabled={busy}
            />

            <div className="mt-3 space-y-1 w-full">
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight truncate">{me.app_user.full_name}</CardTitle>
              <CardDescription className="font-mono text-xs text-muted-foreground truncate">{me.app_user.email}</CardDescription>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.18em] rounded-md">
                  {formatRoleLabel(me.role)}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.18em] rounded-md">
                  {(me.app_user as { user_code?: string }).user_code || "USER"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground text-center">
                Klik pada foto avatar di atas untuk mengunggah atau memperbarui foto profil kamu.
              </p>

              {selectedFile ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
                  <Badge variant="secondary" className="font-mono text-[10px] tabular-nums rounded-md mb-1">
                    File Terpilih
                  </Badge>
                  <p className="font-mono text-xs font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Klik "Simpan Profile" untuk menerapkan.</p>
                </div>
              ) : null}

              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">Default Region</span>
                  <span className="font-medium text-foreground truncate max-w-[150px]">{defaultRegionLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">Scope Access</span>
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {me.app_user.user_region_scopes?.length || 0} Wilayah
                  </span>
                </div>
              </div>
            </div>

            {me.app_user.avatar_attachment_id || (me.app_user as { metadata?: { avatar_attachment_id?: string | null } }).metadata?.avatar_attachment_id ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleRemoveAvatar()}
                disabled={busy}
                className="w-full h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium transition-all active:scale-[0.98]"
              >
                Hapus Foto Profil
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Right Side: Detailed Tabs Forms (8 cols on lg+) */}
        <Card className="min-w-0 rounded-2xl border-border/60 shadow-xs glass-inset overflow-hidden lg:col-span-8">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1">
                <TabsTrigger value="profile" className="h-9 rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                  Informasi & Identitas
                </TabsTrigger>
                <TabsTrigger value="security" className="h-9 rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                  Keamanan & Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 pt-2 outline-none">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="font-mono text-xs text-muted-foreground">Nama Depan</Label>
                      <Input
                        id="first_name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        disabled={busy}
                        className="rounded-xl border-border/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="font-mono text-xs text-muted-foreground">Nama Belakang</Label>
                      <Input
                        id="last_name"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        disabled={busy}
                        className="rounded-xl border-border/60"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={busy}
                      className="h-9 rounded-xl px-5 text-xs font-medium transition-all active:scale-[0.98]"
                    >
                      {savingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Simpan Profile
                    </Button>
                  </div>
                </div>

                {/* Detail Scope & Informasi Sistem - Utilizes 3 columns on larger screens */}
                <Card className="rounded-xl border-border/60 bg-background/50 shadow-2xs glass-inset">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold tracking-tight">Scope & Meta Sistem</CardTitle>
                    <CardDescription className="text-xs">Data identifikasi akses regional dan otorisasi dari admin sistem.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Alamat Email</Label>
                        <Input value={me.app_user.email} disabled className="font-mono text-xs bg-muted/30 rounded-xl truncate" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Nama Role</Label>
                        <Input value={me.app_user.role_name} disabled className="font-mono text-xs bg-muted/30 rounded-xl" />
                      </div>
                      <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">User Code</Label>
                        <Input value={(me.app_user as { user_code?: string }).user_code || "-"} disabled className="font-mono text-xs bg-muted/30 rounded-xl" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Default Region</Label>
                        <Input value={defaultRegionLabel} disabled className="font-mono text-xs bg-muted/30 rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Jumlah Scope Region</Label>
                        <Input value={String(me.app_user.user_region_scopes?.length || 0)} disabled className="font-mono text-xs tabular-nums bg-muted/30 rounded-xl" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 pt-2 outline-none">
                <Card className="rounded-xl border-border/60 bg-background/50 shadow-2xs glass-inset">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold tracking-tight">Perbarui Password</CardTitle>
                    <CardDescription className="text-xs">
                      Kombinasi password aman minimal 8 karakter.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="new_password" className="font-mono text-xs text-muted-foreground">Password Baru</Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="Minimal 8 karakter"
                          disabled={busy}
                          className="rounded-xl border-border/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm_password" className="font-mono text-xs text-muted-foreground">Konfirmasi Password Baru</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          disabled={busy}
                          className="rounded-xl border-border/60"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={() => void handleChangePassword()}
                        disabled={busy}
                        className="h-9 rounded-xl px-5 text-xs font-medium transition-all active:scale-[0.98]"
                      >
                        {savingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Simpan Password Baru
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border/60 bg-background/50 shadow-2xs glass-inset">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold tracking-tight">Kirim Link Pemulihan Password</CardTitle>
                    <CardDescription className="text-xs">
                      Kirim pesan konfirmasi reset password ke email terdaftar kamu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Email Pemulihan</Label>
                      <Input value={me.app_user.email} disabled className="font-mono text-xs bg-muted/30 rounded-xl" />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSendResetEmail()}
                        disabled={busy}
                        className="h-9 rounded-xl border-border/60 text-xs font-medium transition-all active:scale-[0.98]"
                      >
                        {sendingReset ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Kirim Link Reset Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {message ? (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}

function buildInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getAvatarCacheKey(userId: string) {
  return `${AVATAR_CACHE_PREFIX}:${userId}`;
}

function getCachedAvatarDataUrl(userId: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(getAvatarCacheKey(userId)) || "";
}

function cacheAvatarDataUrl(userId: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getAvatarCacheKey(userId), dataUrl);
}

function clearCachedAvatarDataUrl(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getAvatarCacheKey(userId));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file avatar."));
    reader.readAsDataURL(file);
  });
}
