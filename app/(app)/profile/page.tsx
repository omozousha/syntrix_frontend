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
  const [defaultRegionLabel, setDefaultRegionLabel] = useState<string>(RELATION_LABEL_FALLBACK.empty);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const { first, last } = splitName(me.app_user.full_name || "");
    setFirstName(first);
    setLastName(last);
  }, [me.app_user.full_name]);

  useEffect(() => {
    const regionId = me.app_user.default_region_id;
    if (!regionId) {
      setDefaultRegionLabel(RELATION_LABEL_FALLBACK.empty);
      return;
    }

    let cancelled = false;
    async function loadDefaultRegion() {
      setDefaultRegionLabel(RELATION_LABEL_FALLBACK.loading);
      try {
        const payload = await apiFetch<{ data?: Record<string, unknown> }>(`/regions/${regionId}`, { token });
        if (!cancelled) setDefaultRegionLabel(getRegionLabel({ relation: payload.data, fallback: RELATION_LABEL_FALLBACK.missing }));
      } catch {
        if (!cancelled) setDefaultRegionLabel(RELATION_LABEL_FALLBACK.missing);
      }
    }

    void loadDefaultRegion();
    return () => {
      cancelled = true;
    };
  }, [me.app_user.default_region_id, token]);

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
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <AppLoading label="Sedang memuat data profile..." />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
          <p className="text-sm text-muted-foreground">Atur identitas akun, avatar, keamanan, dan informasi akun.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="group relative"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                aria-label="Ubah avatar"
              >
                <Avatar className="size-20 border">
                  {displayedAvatarUrl ? <AvatarImage src={displayedAvatarUrl} alt={me.app_user.full_name} /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-4" />
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
              <div className="space-y-1">
                <CardTitle>{me.app_user.full_name}</CardTitle>
                <CardDescription>{me.app_user.email}</CardDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatRoleLabel(me.role)}</Badge>
                  <span className="text-xs text-muted-foreground">Klik avatar untuk mengganti foto</span>
                </div>
                {selectedFile ? (
                  <p className="text-xs text-muted-foreground">
                    File dipilih: {selectedFile.name}. Klik <span className="font-medium">Simpan Perubahan</span> untuk menerapkan.
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">Nama Depan</Label>
                    <Input
                      id="first_name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Nama Belakang</Label>
                    <Input
                      id="last_name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleSaveProfile()} disabled={busy}>
                    {savingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Simpan Perubahan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={
                      busy
                      || !(
                        me.app_user.avatar_attachment_id
                        || (me.app_user as { metadata?: { avatar_attachment_id?: string | null } }).metadata?.avatar_attachment_id
                      )
                    }
                  >
                    Hapus Avatar
                  </Button>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informasi Akun</CardTitle>
                    <CardDescription>
                      Data akun inti. Perubahan data sensitif dilakukan oleh admin sistem.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={me.app_user.email} disabled />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Role</Label>
                        <Input value={me.app_user.role_name} disabled />
                      </div>
                      <div className="space-y-1.5">
                        <Label>User Code</Label>
                        <Input value={(me.app_user as { user_code?: string }).user_code || "-"} disabled />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Default Region</Label>
                        <Input value={defaultRegionLabel} disabled />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Region Scope Count</Label>
                        <Input value={String(me.app_user.user_region_scopes?.length || 0)} disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ganti Password</CardTitle>
                    <CardDescription>
                      Gunakan password yang kuat minimal 8 karakter.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="new_password">Password Baru</Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="Minimal 8 karakter"
                          disabled={busy}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          disabled={busy}
                        />
                      </div>
                    </div>
                    <Button onClick={() => void handleChangePassword()} disabled={busy}>
                      {savingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Simpan Password Baru
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pemulihan Akun</CardTitle>
                    <CardDescription>
                      Jika lupa password, kirim link reset ke email akun kamu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Email Pemulihan</Label>
                      <Input value={me.app_user.email} disabled />
                    </div>
                    <Button variant="outline" onClick={() => void handleSendResetEmail()} disabled={busy}>
                      {sendingReset ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Kirim Link Reset Password
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>

            {message ? <p className="mt-4 text-sm text-green-600">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
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
