"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleTable } from "@/components/simple-table";
import { useSession } from "@/components/session-context";
import { apiFetch, type RegionsListResponse, type UsersListResponse } from "@/lib/api";

type UserRow = UsersListResponse["data"][number];

type EditFormState = {
  full_name: string;
  role_name: "admin" | "user_region" | "user_all_region";
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
  role_name: "admin" | "user_region" | "user_all_region";
  default_region_id: string;
};

export default function AccountManagementPage() {
  const router = useRouter();
  const { token, me } = useSession();

  const [users, setUsers] = useState<UsersListResponse["data"]>([]);
  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState("__all__");
  const [filterRole, setFilterRole] = useState("__all__");
  const [searchTerm, setSearchTerm] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role_name: "user_region",
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

  const refreshUsersAndRegions = useCallback(async () => {
    const [usersRes, regionsRes] = await Promise.all([
      apiFetch<UsersListResponse>("/users?page=1&limit=100", { token }),
      apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token }),
    ]);
    setUsers(usersRes.data || []);
    setRegions(regionsRes.data || []);
  }, [token]);

  useEffect(() => {
    if (me.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    Promise.all([
      apiFetch<UsersListResponse>("/users?page=1&limit=100", { token }),
      apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token }),
    ])
      .then(([usersRes, regionsRes]) => {
        if (cancelled) return;
        setUsers(usersRes.data || []);
        setRegions(regionsRes.data || []);
      })
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
  }, [me.role, router, token]);

  const regionMap = useMemo(() => new Map(regions.map((item) => [item.id, item.region_name])), [regions]);
  const regionOptions = useMemo<ComboboxOption[]>(
    () => regions.map((region) => ({ value: region.id, label: region.region_name })),
    [regions],
  );
  const roleOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "admin", label: "admin" },
      { value: "user_region", label: "user_region" },
      { value: "user_all_region", label: "user_all_region" },
    ],
    [],
  );
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

  if (me.role !== "admin") return null;

  if (loading) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <AppLoading label="Sedang memuat data user dan region..." />
        </div>
      </ScrollArea>
    );
  }

  function openCreateDrawer() {
    setMessage("");
    setErrorMessage("");
    setCreateForm({
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      role_name: "user_region",
      default_region_id: "__none__",
    });
    setShowCreatePassword(false);
    setShowCreateConfirmPassword(false);
    setCreateOpen(true);
  }

  async function submitCreate() {
    setCreateSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password) {
      setCreateSaving(false);
      setErrorMessage("Full name, email, dan password wajib diisi.");
      return;
    }

    if (createForm.password.length < 8) {
      setCreateSaving(false);
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (createForm.password !== createForm.confirm_password) {
      setCreateSaving(false);
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    if (createForm.role_name === "user_region" && createForm.default_region_id === "__none__") {
      setCreateSaving(false);
      setErrorMessage("User regional harus memiliki default region.");
      return;
    }

    const regionId = createForm.default_region_id === "__none__" ? null : createForm.default_region_id;

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        token,
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          full_name: createForm.full_name.trim(),
          role_name: createForm.role_name,
          default_region_id: regionId,
          region_ids: createForm.role_name === "user_region" && regionId ? [regionId] : [],
        }),
      });

      await refreshUsersAndRegions();
      setCreateOpen(false);
      setMessage(`User ${createForm.email.trim()} berhasil dibuat. Email verifikasi sudah dikirim.`);
    } catch (error) {
      setErrorMessage((error as Error).message);
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
      role_name: (user.role_name as EditFormState["role_name"]) || "user_region",
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
    const hasPasswordInput = editForm.new_password.trim().length > 0 || editForm.confirm_password.trim().length > 0;

    if (hasPasswordInput) {
      if (editForm.new_password.length < 8) {
        setEditSaving(false);
        setErrorMessage("Password baru minimal 8 karakter.");
        return;
      }

      if (editForm.new_password !== editForm.confirm_password) {
        setEditSaving(false);
        setErrorMessage("Konfirmasi password tidak sama.");
        return;
      }

      if (editTarget.id !== me.app_user.id) {
        setEditSaving(false);
        setErrorMessage("Untuk keamanan, ganti password hanya bisa untuk akun yang sedang login (bukan user lain).");
        return;
      }
    }

    try {
      await apiFetch(`/users/${editTarget.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          full_name: editForm.full_name.trim(),
          role_name: editForm.role_name,
          default_region_id: editForm.default_region_id === "__none__" ? null : editForm.default_region_id,
          is_active: editForm.is_active === "true",
        }),
      });

      if (hasPasswordInput) {
        await apiFetch("/auth/change-password", {
          method: "POST",
          token,
          body: JSON.stringify({
            new_password: editForm.new_password,
          }),
        });
      }

      await refreshUsersAndRegions();
      setMessage(`User ${editTarget.email} berhasil diupdate.`);
      setEditOpen(false);
      setEditTarget(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
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
      await apiFetch(`/users/${deleteTarget.id}`, {
        method: "DELETE",
        token,
      });
      await refreshUsersAndRegions();
      setMessage(`User ${deleteTarget.email} berhasil dihapus.`);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Account Management</h2>
        <p className="text-sm text-muted-foreground">Menu ini hanya tersedia untuk role admin.</p>
      </div>

      {message ? (
        <Alert>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>User Accounts</CardTitle>
            <Button onClick={openCreateDrawer}>Create User</Button>
          </div>
          <CardDescription>List user aplikasi, region, dan aksi manajemen akun.</CardDescription>
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
              <Label>Filter Region</Label>
              <Combobox
                value={filterRegion}
                onValueChange={setFilterRegion}
                placeholder="Semua region"
                searchPlaceholder="Cari region..."
                options={[
                  { value: "__all__", label: "Semua region" },
                  { value: "__none__", label: "Tanpa default region" },
                  ...regionOptions,
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Filter User</Label>
              <Combobox
                value={filterRole}
                onValueChange={setFilterRole}
                placeholder="Semua user"
                searchPlaceholder="Cari role..."
                options={[
                  { value: "__all__", label: "Semua user" },
                  { value: "admin", label: "Admin" },
                  { value: "user_region", label: "User Region" },
                  { value: "user_all_region", label: "User All Region" },
                ]}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterRegion("__all__");
                  setFilterRole("__all__");
                  setSearchTerm("");
                }}
              >
                Reset Filter
              </Button>
            </div>
          </div>

          <SimpleTable
            headers={["Name", "Email", "Role", "Region", "Active", "Actions"]}
            rows={filteredUsers.map((item) => [
              item.full_name,
              item.email,
              item.role_name,
              item.default_region_id ? (regionMap.get(item.default_region_id) || item.default_region_id) : "-",
              item.is_active ? "Yes" : "No",
              <div key={item.id} className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditDrawer(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(item)}>
                  Hapus
                </Button>
              </div>,
            ])}
          />
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create User</SheetTitle>
            <SheetDescription>
              Buat akun user baru untuk Syntrix. User harus verifikasi email sebelum akun aktif.
            </SheetDescription>
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
                  setCreateForm((prev) => ({ ...prev, role_name: value as CreateFormState["role_name"] }))
                }
                options={roleOptions}
                placeholder="Pilih role"
                searchPlaceholder="Cari role..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Default Region</Label>
              <Combobox
                value={createForm.default_region_id}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, default_region_id: value }))}
                options={[{ value: "__none__", label: "None" }, ...regionOptions]}
                placeholder="Pilih region"
                searchPlaceholder="Cari region..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create_password">Password</Label>
              <div className="relative">
                <Input
                  id="create_password"
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                >
                  {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">Toggle password preview</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create_confirm_password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="create_confirm_password"
                  type={showCreateConfirmPassword ? "text" : "password"}
                  value={createForm.confirm_password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => setShowCreateConfirmPassword((prev) => !prev)}
                >
                  {showCreateConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">Toggle password preview</span>
                </Button>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void submitCreate()} disabled={createSaving}>
              {createSaving ? "Membuat..." : "Create User"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>Ubah profile user, role, region, dan status aktif.</SheetDescription>
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
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, role_name: value as EditFormState["role_name"] }))
                }
                options={roleOptions}
                placeholder="Pilih role"
                searchPlaceholder="Cari role..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Default Region</Label>
              <Combobox
                value={editForm.default_region_id}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, default_region_id: value }))}
                options={[{ value: "__none__", label: "None" }, ...regionOptions]}
                placeholder="Pilih region"
                searchPlaceholder="Cari region..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status Aktif</Label>
              <Combobox
                value={editForm.is_active}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, is_active: value as EditFormState["is_active"] }))}
                options={[
                  { value: "true", label: "Aktif" },
                  { value: "false", label: "Nonaktif" },
                ]}
                placeholder="Pilih status"
                searchPlaceholder="Cari status..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={editForm.new_password}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, new_password: event.target.value }))}
                  placeholder="Kosongkan jika tidak diganti"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">Toggle password preview</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={editForm.confirm_password}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                  placeholder="Ulangi password baru"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">Toggle password preview</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password user lain tidak bisa ditampilkan. Admin hanya bisa ubah profil user.
              </p>
            </div>
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
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>
              User <span className="font-medium">{deleteTarget?.email || "-"}</span> akan dihapus permanen.
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
      </div>
    </ScrollArea>
  );
}
