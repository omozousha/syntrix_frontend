"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck, MailWarning, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SimpleTable } from "@/components/simple-table";
import { useSession } from "@/components/session-context";
import { apiFetch, type RegionsListResponse, type UsersListResponse } from "@/lib/api";

type RoleName = "admin" | "user_region" | "user_all_region";
type UserRow = UsersListResponse["data"][number];

type EditFormState = {
  full_name: string;
  role_name: RoleName;
  default_region_id: string;
  is_active: "true" | "false";
  new_password: string;
  confirm_password: string;
};

type CreateFormState = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role_name: RoleName;
  default_region_id: string;
};

type ResponseDialogState = {
  open: boolean;
  title: string;
  description: string;
  variant: "success" | "error";
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Superadmin",
  user_all_region: "Admin Region",
  user_region: "Validator",
};

async function fetchAllRegions(token: string) {
  const limit = 100;
  const allRegions: RegionsListResponse["data"] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await apiFetch<RegionsListResponse>(`/regions?page=${page}&limit=${limit}`, { token });
    const rows = response.data || [];
    allRegions.push(...rows);
    total = response.meta?.total ?? allRegions.length;
    page += 1;
    if (!rows.length) break;
  } while (allRegions.length < total);

  return allRegions;
}

export default function AccountManagementPage() {
  const router = useRouter();
  const { token, me } = useSession();
  const isSuperadmin = me.role === "admin";
  const isAdminRegion = me.role === "user_all_region";
  const canManageAccounts = isSuperadmin || isAdminRegion;

  const [users, setUsers] = useState<UsersListResponse["data"]>([]);
  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState("__all__");
  const [filterRole, setFilterRole] = useState(isAdminRegion ? "user_region" : "__all__");
  const [searchTerm, setSearchTerm] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [responseDialog, setResponseDialog] = useState<ResponseDialogState>({
    open: false,
    title: "",
    description: "",
    variant: "success",
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role_name: isAdminRegion ? "user_region" : "user_all_region",
    default_region_id: "__none__",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    full_name: "",
    role_name: "user_region",
    default_region_id: "__none__",
    is_active: "true",
    new_password: "",
    confirm_password: "",
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);

  const scopedRegionIds = useMemo(
    () => new Set((me.app_user.user_region_scopes || []).map((scope) => scope.region_id)),
    [me.app_user.user_region_scopes],
  );

  const visibleRegions = useMemo(
    () => (isAdminRegion ? regions.filter((region) => scopedRegionIds.has(region.id)) : regions),
    [isAdminRegion, regions, scopedRegionIds],
  );

  const regionMap = useMemo(() => new Map(regions.map((item) => [item.id, item.region_name])), [regions]);
  const regionOptions = useMemo<ComboboxOption[]>(
    () => visibleRegions.map((region) => ({ value: region.id, label: region.region_name })),
    [visibleRegions],
  );
  const assignableRoleOptions = useMemo<ComboboxOption[]>(
    () =>
      isAdminRegion
        ? [{ value: "user_region", label: "Validator" }]
        : [
            { value: "user_all_region", label: "Admin Region" },
            { value: "user_region", label: "Validator" },
          ],
    [isAdminRegion],
  );
  const filterRoleOptions = useMemo<ComboboxOption[]>(
    () =>
      isAdminRegion
        ? [{ value: "user_region", label: "Validator" }]
        : [
            { value: "__all__", label: "Semua role" },
            { value: "user_all_region", label: "Admin Region" },
            { value: "user_region", label: "Validator" },
            { value: "admin", label: "Superadmin" },
          ],
    [isAdminRegion],
  );

  const refreshUsersAndRegions = useCallback(async () => {
    const [usersRes, regionsData] = await Promise.all([
      apiFetch<UsersListResponse>("/users?page=1&limit=100", { token }),
      fetchAllRegions(token),
    ]);
    setUsers(usersRes.data || []);
    setRegions(regionsData);
  }, [token]);

  useEffect(() => {
    if (!canManageAccounts) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;
    refreshUsersAndRegions()
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage((error as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canManageAccounts, refreshUsersAndRegions, router]);

  useEffect(() => {
    if (!isAdminRegion || !regionOptions.length) return;
    setFilterRole("user_region");
    setCreateForm((prev) => ({
      ...prev,
      role_name: "user_region",
      default_region_id: prev.default_region_id === "__none__" ? regionOptions[0].value : prev.default_region_id,
    }));
  }, [isAdminRegion, regionOptions]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const passRegion = filterRegion === "__all__" || (user.default_region_id || "__none__") === filterRegion;
      const passRole = filterRole === "__all__" || user.role_name === filterRole;
      const passSearch =
        !keyword ||
        user.user_code?.toLowerCase().includes(keyword) ||
        user.full_name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword);

      return passRegion && passRole && passSearch;
    });
  }, [users, filterRegion, filterRole, searchTerm]);

  const stats = useMemo(() => {
    const total = users.length;
    const verified = users.filter((user) => getVerificationState(user) === "verified").length;
    const active = users.filter((user) => user.is_active).length;
    const pending = users.filter((user) => getVerificationState(user) === "pending").length;
    return { total, verified, active, pending };
  }, [users]);

  if (!canManageAccounts) return null;

  if (loading) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <AppLoading label="Sedang memuat data akun dan region..." />
        </div>
      </ScrollArea>
    );
  }

  function openCreateDrawer() {
    const defaultRegion = isAdminRegion && regionOptions.length ? regionOptions[0].value : "__none__";
    setMessage("");
    setErrorMessage("");
    setCreateForm({
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      role_name: isAdminRegion ? "user_region" : "user_all_region",
      default_region_id: defaultRegion,
    });
    setShowCreatePassword(false);
    setShowCreateConfirmPassword(false);
    setCreateOpen(true);
  }

  function canManageUser(user: UserRow) {
    if (isSuperadmin) return user.role_name !== "admin";
    return user.role_name === "user_region" && Boolean(user.default_region_id && scopedRegionIds.has(user.default_region_id));
  }

  function validateRegionalAssignment(roleName: RoleName, regionId: string) {
    if (roleName === "admin") return "";
    if (regionId === "__none__") return "Akun regional harus memiliki default region.";
    if (isAdminRegion && !scopedRegionIds.has(regionId)) return "Region harus sesuai scope adminregion.";
    return "";
  }

  function showResponseDialog(title: string, description: string, variant: ResponseDialogState["variant"]) {
    setResponseDialog({
      open: true,
      title,
      description,
      variant,
    });
  }

  async function submitCreate() {
    setCreateSaving(true);
    setMessage("");
    setErrorMessage("");

    const nextRole = isAdminRegion ? "user_region" : createForm.role_name;
    const assignmentError = validateRegionalAssignment(nextRole, createForm.default_region_id);

    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password) {
      setCreateSaving(false);
      setErrorMessage("Full name, email, dan password wajib diisi.");
      showResponseDialog("Create Account Gagal", "Full name, email, dan password wajib diisi.", "error");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateSaving(false);
      setErrorMessage("Password minimal 8 karakter.");
      showResponseDialog("Create Account Gagal", "Password minimal 8 karakter.", "error");
      return;
    }
    if (createForm.password !== createForm.confirm_password) {
      setCreateSaving(false);
      setErrorMessage("Konfirmasi password tidak sama.");
      showResponseDialog("Create Account Gagal", "Konfirmasi password tidak sama.", "error");
      return;
    }
    if (assignmentError) {
      setCreateSaving(false);
      setErrorMessage(assignmentError);
      showResponseDialog("Create Account Gagal", assignmentError, "error");
      return;
    }

    const regionId = createForm.default_region_id === "__none__" ? null : createForm.default_region_id;

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        token,
        body: {
          email: createForm.email.trim(),
          password: createForm.password,
          full_name: createForm.full_name.trim(),
          role_name: nextRole,
          default_region_id: regionId,
          region_ids: regionId ? [regionId] : [],
        },
      });

      await refreshUsersAndRegions();
      setCreateOpen(false);
      setMessage(`Akun ${createForm.email.trim()} berhasil dibuat. Email verifikasi sudah dikirim.`);
      showResponseDialog(
        "Create Account Berhasil",
        `Akun ${createForm.email.trim()} berhasil dibuat. Email verifikasi sudah dikirim.`,
        "success",
      );
    } catch (error) {
      const description = (error as Error).message;
      setErrorMessage(description);
      showResponseDialog("Create Account Gagal", description, "error");
    } finally {
      setCreateSaving(false);
    }
  }

  function openEditDrawer(user: UserRow) {
    setMessage("");
    setErrorMessage("");
    setEditTarget(user);
    setEditForm({
      full_name: user.full_name || "",
      role_name: (user.role_name as RoleName) || "user_region",
      default_region_id: user.default_region_id || "__none__",
      is_active: user.is_active ? "true" : "false",
      new_password: "",
      confirm_password: "",
    });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    setMessage("");
    setErrorMessage("");

    const nextRole = isAdminRegion ? "user_region" : editForm.role_name;
    const assignmentError = validateRegionalAssignment(nextRole, editForm.default_region_id);
    const hasPasswordInput = editForm.new_password.trim().length > 0 || editForm.confirm_password.trim().length > 0;

    if (assignmentError) {
      setEditSaving(false);
      setErrorMessage(assignmentError);
      showResponseDialog("Edit Account Gagal", assignmentError, "error");
      return;
    }
    if (hasPasswordInput) {
      if (editForm.new_password.length < 8) {
        setEditSaving(false);
        setErrorMessage("Password baru minimal 8 karakter.");
        showResponseDialog("Edit Account Gagal", "Password baru minimal 8 karakter.", "error");
        return;
      }
      if (editForm.new_password !== editForm.confirm_password) {
        setEditSaving(false);
        setErrorMessage("Konfirmasi password tidak sama.");
        showResponseDialog("Edit Account Gagal", "Konfirmasi password tidak sama.", "error");
        return;
      }
      if (editTarget.id !== me.app_user.id) {
        setEditSaving(false);
        setErrorMessage("Untuk keamanan, ganti password hanya bisa untuk akun yang sedang login.");
        showResponseDialog(
          "Edit Account Gagal",
          "Untuk keamanan, ganti password hanya bisa untuk akun yang sedang login.",
          "error",
        );
        return;
      }
    }

    try {
      await apiFetch(`/users/${editTarget.id}`, {
        method: "PATCH",
        token,
        body: {
          full_name: editForm.full_name.trim(),
          role_name: nextRole,
          default_region_id: editForm.default_region_id === "__none__" ? null : editForm.default_region_id,
          is_active: editForm.is_active === "true",
        },
      });

      if (hasPasswordInput) {
        await apiFetch("/auth/change-password", {
          method: "POST",
          token,
          body: { new_password: editForm.new_password },
        });
      }

      await refreshUsersAndRegions();
      setMessage(`Akun ${editTarget.email} berhasil diupdate.`);
      showResponseDialog("Edit Account Berhasil", `Akun ${editTarget.email} berhasil diupdate.`, "success");
      setEditOpen(false);
      setEditTarget(null);
    } catch (error) {
      const description = (error as Error).message;
      setErrorMessage(description);
      showResponseDialog("Edit Account Gagal", description, "error");
    } finally {
      setEditSaving(false);
    }
  }

  function openDeleteDialog(user: UserRow) {
    setMessage("");
    setErrorMessage("");
    setDeleteTarget(user);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      await apiFetch(`/users/${deleteTarget.id}`, { method: "DELETE", token });
      await refreshUsersAndRegions();
      setMessage(`Akun ${deleteTarget.email} berhasil dihapus.`);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function resendVerification(user: UserRow) {
    setResendLoadingId(user.id);
    setMessage("");
    setErrorMessage("");

    try {
      await apiFetch(`/users/${user.id}/resend-verification`, {
        method: "POST",
        token,
      });
      await refreshUsersAndRegions();
      setMessage(`Email verifikasi untuk ${user.email} berhasil dikirim ulang.`);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setResendLoadingId(null);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Account Management</h2>
            <p className="text-sm text-muted-foreground">
              {isSuperadmin
                ? "Kelola akun adminregion dan validator."
                : "Kelola akun validator di region yang menjadi tanggung jawab Anda."}
            </p>
          </div>
          <Button onClick={openCreateDrawer} className="gap-2">
            <UserPlus className="size-4" />
            Create Account
          </Button>
        </div>

        {message ? (
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users className="size-4" />} label="Total Account" value={stats.total} />
          <MetricCard icon={<MailCheck className="size-4" />} label="Verified Email" value={stats.verified} />
          <MetricCard icon={<ShieldCheck className="size-4" />} label="Active" value={stats.active} />
          <MetricCard icon={<MailWarning className="size-4" />} label="Pending Verify" value={stats.pending} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>List user aplikasi, scope region, status aktif, dan status verifikasi email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="search_user">Search</Label>
                <Input
                  id="search_user"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari nama, email, atau user code..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Region</Label>
                <Combobox
                  value={filterRegion}
                  onValueChange={setFilterRegion}
                  placeholder="Semua region"
                  searchPlaceholder="Cari region..."
                  options={[{ value: "__all__", label: "Semua region" }, ...regionOptions]}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Combobox
                  value={filterRole}
                  onValueChange={setFilterRole}
                  placeholder="Semua role"
                  searchPlaceholder="Cari role..."
                  options={filterRoleOptions}
                  disabled={isAdminRegion}
                />
                <p className="text-xs text-muted-foreground">
                  Region mengikuti Master Data Regions dan otomatis ter-refresh saat halaman dimuat.
                </p>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterRegion("__all__");
                    setFilterRole(isAdminRegion ? "user_region" : "__all__");
                    setSearchTerm("");
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            </div>

            <SimpleTable
              headers={["Name", "Email", "Verified", "Role", "Region", "Active", "Actions"]}
              rows={filteredUsers.map((item) => [
                <div key={`${item.id}-name`}>
                  <p className="font-medium">{item.full_name || "-"}</p>
                  <p className="text-xs text-muted-foreground">{item.user_code || "-"}</p>
                </div>,
                item.email,
                <VerificationBadge key={`${item.id}-verified`} user={item} />,
                ROLE_LABELS[item.role_name] || item.role_name,
                item.default_region_id ? regionMap.get(item.default_region_id) || item.default_region_id : "-",
                item.is_active ? <Badge key="active">Active</Badge> : <Badge key="inactive" variant="secondary">Inactive</Badge>,
                <div key={item.id} className="flex flex-wrap gap-2">
                  {getVerificationState(item) !== "verified" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => void resendVerification(item)}
                      disabled={!canManageUser(item) || resendLoadingId === item.id}
                    >
                      <Send className="size-3.5" />
                      {resendLoadingId === item.id ? "Sending..." : "Resend"}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => openEditDrawer(item)} disabled={!canManageUser(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(item)} disabled={!canManageUser(item)}>
                    Hapus
                  </Button>
                </div>,
              ])}
            />
          </CardContent>
        </Card>

        <Alert>
          <MailCheck className="size-4" />
          <AlertTitle>Form verifikasi email</AlertTitle>
          <AlertDescription>
            Template email verifikasi diedit dari Nhost Dashboard di menu Auth / Email Templates. Di aplikasi ini kita hanya
            mengirim email verifikasi dan menampilkan status verified dari data auth.
          </AlertDescription>
        </Alert>

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Create Account</SheetTitle>
              <SheetDescription>Akun baru wajib verifikasi email sebelum bisa aktif digunakan.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="create_full_name">Full Name</Label>
                <Input
                  id="create_full_name"
                  value={createForm.full_name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create_email">Email</Label>
                <Input
                  id="create_email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="user@syntrix.local"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Combobox
                  value={createForm.role_name}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, role_name: value as RoleName }))
                  }
                  options={assignableRoleOptions}
                  placeholder="Pilih role"
                  searchPlaceholder="Cari role..."
                  disabled={isAdminRegion}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Default Region</Label>
                <Combobox
                  value={createForm.default_region_id}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, default_region_id: value }))}
                  options={[...(isSuperadmin ? [{ value: "__none__", label: "None" }] : []), ...regionOptions]}
                  placeholder="Pilih region"
                  searchPlaceholder="Cari region..."
                />
                <p className="text-xs text-muted-foreground">
                  Daftar region diambil dari Master Data Regions. Adminregion hanya melihat region yang menjadi scope-nya.
                </p>
              </div>

              <PasswordField
                id="create_password"
                label="Password"
                value={createForm.password}
                visible={showCreatePassword}
                onVisibleChange={setShowCreatePassword}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, password: value }))}
                placeholder="Minimal 8 karakter"
              />

              <PasswordField
                id="create_confirm_password"
                label="Confirm Password"
                value={createForm.confirm_password}
                visible={showCreateConfirmPassword}
                onVisibleChange={setShowCreateConfirmPassword}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, confirm_password: value }))}
                placeholder="Ulangi password"
              />
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button onClick={() => void submitCreate()} disabled={createSaving}>
                {createSaving ? "Membuat..." : "Create Account"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit Account</SheetTitle>
              <SheetDescription>Ubah profil, role, region, dan status aktif akun.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="user_full_name">Full Name</Label>
                <Input
                  id="user_full_name"
                  value={editForm.full_name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Combobox
                  value={editForm.role_name}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, role_name: value as RoleName }))}
                  options={assignableRoleOptions}
                  placeholder="Pilih role"
                  searchPlaceholder="Cari role..."
                  disabled={isAdminRegion}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Default Region</Label>
                <Combobox
                  value={editForm.default_region_id}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, default_region_id: value }))}
                  options={[...(isSuperadmin ? [{ value: "__none__", label: "None" }] : []), ...regionOptions]}
                  placeholder="Pilih region"
                  searchPlaceholder="Cari region..."
                />
                <p className="text-xs text-muted-foreground">
                  Daftar region diambil dari Master Data Regions. Adminregion hanya melihat region yang menjadi scope-nya.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Status Aktif</Label>
                <Combobox
                  value={editForm.is_active}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, is_active: value as EditFormState["is_active"] }))
                  }
                  options={[
                    { value: "true", label: "Aktif" },
                    { value: "false", label: "Nonaktif" },
                  ]}
                  placeholder="Pilih status"
                  searchPlaceholder="Cari status..."
                />
              </div>

              <PasswordField
                id="new_password"
                label="Password Baru"
                value={editForm.new_password}
                visible={showNewPassword}
                onVisibleChange={setShowNewPassword}
                onChange={(value) => setEditForm((prev) => ({ ...prev, new_password: value }))}
                placeholder="Kosongkan jika tidak diganti"
              />

              <PasswordField
                id="confirm_password"
                label="Konfirmasi Password"
                value={editForm.confirm_password}
                visible={showConfirmPassword}
                onVisibleChange={setShowConfirmPassword}
                onChange={(value) => setEditForm((prev) => ({ ...prev, confirm_password: value }))}
                placeholder="Ulangi password baru"
              />

              <p className="text-xs text-muted-foreground">
                Password user lain tidak bisa ditampilkan. Ganti password hanya tersedia untuk akun yang sedang login.
              </p>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button onClick={() => void submitEdit()} disabled={editSaving}>
                {editSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Account?</AlertDialogTitle>
              <AlertDialogDescription>
                Akun <span className="font-medium">{deleteTarget?.email || "-"}</span> akan dihapus dari app user Syntrix.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={responseDialog.open}
          onOpenChange={(open) => setResponseDialog((prev) => ({ ...prev, open }))}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{responseDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{responseDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                className={
                  responseDialog.variant === "error"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined
                }
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md border bg-muted p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function VerificationBadge({ user }: { user: UserRow }) {
  const state = getVerificationState(user);
  if (state === "verified") {
    return (
      <Badge className="gap-1">
        <MailCheck className="size-3" />
        Verified
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <MailWarning className="size-3" />
      {state === "unknown" ? "Unknown" : state === "pending" ? "Pending" : "Unverified"}
    </Badge>
  );
}

function getVerificationState(user: UserRow) {
  if (user.email_verified === true) return "verified";
  if (user.email_verified === false) {
    return user.verification_status === "pending" ? "pending" : "unverified";
  }
  if (user.verification_status === "verified") return "verified";
  if (user.verification_status === "pending") return "pending";
  if (user.verification_status === "unverified") return "unverified";
  return "unknown";
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onVisibleChange,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onVisibleChange: (value: boolean) => void;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => onVisibleChange(!visible)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          <span className="sr-only">Toggle password preview</span>
        </Button>
      </div>
    </div>
  );
}
