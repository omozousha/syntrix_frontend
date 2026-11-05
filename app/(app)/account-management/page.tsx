"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus } from "lucide-react";
import { AccountFilterBar, AccountSummaryCards, AccountTable, CreateAccountSheet, EditAccountSheet } from "@/components/features/account-management";
import { AccountManagementSkeleton } from "@/components/features/account-management/account-management-skeleton";
import { ResponseDialog } from "@/components/response-dialog";
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
import type { ComboboxOption } from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context";
import { apiFetch, type RegionsListResponse, type UsersListResponse } from "@/lib/api";
import { getVerificationState, ROLE_LABELS } from "@/lib/domain-formatters";
import { useTranslate } from "@/lib/use-locale";

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
  const { t } = useTranslate();
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
        ? [{ value: "user_region", label: t("accountPage.roleValidator") }]
        : [
            { value: "admin", label: t("accountPage.roleSuperadmin") },
            { value: "user_all_region", label: t("accountPage.roleAdminRegion") },
            { value: "user_region", label: t("accountPage.roleValidator") },
          ],
    [isAdminRegion, t],
  );
  const filterRoleOptions = useMemo<ComboboxOption[]>(
    () =>
      isAdminRegion
        ? [{ value: "user_region", label: t("accountPage.roleValidator") }]
        : [
            { value: "__all__", label: t("accountPage.allRoles") },
            { value: "user_all_region", label: t("accountPage.roleAdminRegion") },
            { value: "user_region", label: t("accountPage.roleValidator") },
            { value: "admin", label: t("accountPage.roleSuperadmin") },
          ],
    [isAdminRegion, t],
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

  // Polling & focus revalidation to keep user verification status fresh
  useEffect(() => {
    if (!canManageAccounts) return;

    const intervalId = setInterval(() => {
      refreshUsersAndRegions().catch(() => {});
    }, 30_000);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshUsersAndRegions().catch(() => {});
      }
    }

    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [canManageAccounts, refreshUsersAndRegions]);

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

  function resetFilters() {
    setFilterRegion("__all__");
    setFilterRole(isAdminRegion ? "user_region" : "__all__");
    setSearchTerm("");
  }

  if (!canManageAccounts) return null;

  if (loading) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="px-3 pb-3 md:px-4 md:pb-4">
          <AccountManagementSkeleton />
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
    if (regionId === "__none__") return t("accountPage.errRegionalRequiresDefault");
    if (isAdminRegion && !scopedRegionIds.has(regionId)) return t("accountPage.errRegionOutOfScope");
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
      setErrorMessage(t("accountPage.errRequiredFields"));
      showResponseDialog(t("accountPage.createFailedTitle"), t("accountPage.errRequiredFields"), "error");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateSaving(false);
      setErrorMessage(t("accountPage.errPasswordMin"));
      showResponseDialog(t("accountPage.createFailedTitle"), t("accountPage.errPasswordMin"), "error");
      return;
    }
    if (createForm.password !== createForm.confirm_password) {
      setCreateSaving(false);
      setErrorMessage(t("accountPage.errPasswordMismatch"));
      showResponseDialog(t("accountPage.createFailedTitle"), t("accountPage.errPasswordMismatch"), "error");
      return;
    }
    if (assignmentError) {
      setCreateSaving(false);
      setErrorMessage(assignmentError);
      showResponseDialog(t("accountPage.createFailedTitle"), assignmentError, "error");
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
      setMessage(t("accountPage.createSuccessMsg", { email: createForm.email.trim() }));
      showResponseDialog(
        t("accountPage.createSuccessTitle"),
        t("accountPage.createSuccessDialogDesc", { email: createForm.email.trim() }),
        "success",
      );
    } catch (error) {
      const description = (error as Error).message;
      setErrorMessage(description);
      showResponseDialog(t("accountPage.createFailedTitle"), description, "error");
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
      showResponseDialog(t("accountPage.editFailedTitle"), assignmentError, "error");
      return;
    }
    if (hasPasswordInput) {
      if (editForm.new_password.length < 8) {
        setEditSaving(false);
        setErrorMessage(t("accountPage.errNewPasswordMin"));
        showResponseDialog(t("accountPage.editFailedTitle"), t("accountPage.errNewPasswordMin"), "error");
        return;
      }
      if (editForm.new_password !== editForm.confirm_password) {
        setEditSaving(false);
        setErrorMessage(t("accountPage.errPasswordMismatch"));
        showResponseDialog(t("accountPage.editFailedTitle"), t("accountPage.errPasswordMismatch"), "error");
        return;
      }
      if (editTarget.id !== me.app_user.id) {
        setEditSaving(false);
        setErrorMessage(t("accountPage.errSelfPasswordOnly"));
        showResponseDialog(
          t("accountPage.editFailedTitle"),
          t("accountPage.errSelfPasswordOnly"),
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
      setMessage(t("accountPage.editSuccessMsg", { email: editTarget.email }));
      showResponseDialog(t("accountPage.editSuccessTitle"), t("accountPage.editSuccessMsg", { email: editTarget.email }), "success");
      setEditOpen(false);
      setEditTarget(null);
    } catch (error) {
      const description = (error as Error).message;
      setErrorMessage(description);
      showResponseDialog(t("accountPage.editFailedTitle"), description, "error");
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
      setMessage(t("accountPage.deleteSuccessMsg", { email: deleteTarget.email }));
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
      const res = await apiFetch<{
        data?: { email_sent?: boolean; reason?: string | null; retry_after_seconds?: number };
      }>(`/users/${user.id}/resend-verification`, {
        method: "POST",
        token,
      });
      await refreshUsersAndRegions();
      // apiFetch resolves to the envelope { success, message, data }, not to data itself.
      const result = res?.data;
      if (result?.email_sent) {
        setMessage(t("accountPage.resendSuccessMsg", { email: user.email }));
      } else if (result?.reason === "RESEND_COOLDOWN") {
        const wait = result.retry_after_seconds ?? 0;
        setErrorMessage(t("accountPage.resendCooldownMsg", { email: user.email, wait }));
      } else {
        const detail = result?.reason ? t("accountPage.resendReasonSuffix", { reason: result.reason }) : "";
        setErrorMessage(t("accountPage.resendNotSentMsg", { email: user.email, detail }));
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setResendLoadingId(null);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 px-3 pb-3 md:px-4 md:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{t("accountPage.badge")}</p>
            <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{t("accountPage.title")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isSuperadmin
                ? t("accountPage.descSuperadmin")
                : t("accountPage.descAdminRegion")}
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreateDrawer}
            className="gap-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            {t("accountPage.createButton")}
          </Button>
        </div>

        {message ? (
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>{t("accountPage.successAlertTitle")}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>{t("common.errorTitle")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <AccountSummaryCards stats={stats} />

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle>{t("accountPage.cardTitle")}</CardTitle>
            <CardDescription>{t("accountPage.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountFilterBar
              searchTerm={searchTerm}
              filterRegion={filterRegion}
              filterRole={filterRole}
              regionOptions={[{ value: "__all__", label: t("accountPage.allRegions") }, ...regionOptions]}
              roleOptions={filterRoleOptions}
              roleDisabled={isAdminRegion}
              onSearchTermChange={setSearchTerm}
              onFilterRegionChange={setFilterRegion}
              onFilterRoleChange={setFilterRole}
              onReset={resetFilters}
            />

            <AccountTable
              users={filteredUsers}
              regionMap={regionMap}
              roleLabels={ROLE_LABELS}
              resendLoadingId={resendLoadingId}
              canManageUser={(user) => canManageUser(user as UserRow)}
              onEdit={(user) => openEditDrawer(user as UserRow)}
              onDelete={(user) => openDeleteDialog(user as UserRow)}
              onResendVerification={(user) => void resendVerification(user as UserRow)}
              onResetFilter={resetFilters}
            />
          </CardContent>
        </Card>

        <CreateAccountSheet
          open={createOpen}
          saving={createSaving}
          form={createForm}
          roleOptions={assignableRoleOptions}
          regionOptions={[...(isSuperadmin ? [{ value: "__none__", label: t("accountPage.regionNone") }] : []), ...regionOptions]}
          roleDisabled={isAdminRegion}
          showPassword={showCreatePassword}
          showConfirmPassword={showCreateConfirmPassword}
          onOpenChange={setCreateOpen}
          onFormChange={(nextForm) => setCreateForm(nextForm as CreateFormState)}
          onShowPasswordChange={setShowCreatePassword}
          onShowConfirmPasswordChange={setShowCreateConfirmPassword}
          onSubmit={() => void submitCreate()}
        />

        <EditAccountSheet
          open={editOpen}
          saving={editSaving}
          form={editForm}
          roleOptions={assignableRoleOptions}
          regionOptions={[...(isSuperadmin ? [{ value: "__none__", label: t("accountPage.regionNone") }] : []), ...regionOptions]}
          roleDisabled={isAdminRegion}
          showPassword={showNewPassword}
          showConfirmPassword={showConfirmPassword}
          onOpenChange={setEditOpen}
          onFormChange={(nextForm) => setEditForm(nextForm as EditFormState)}
          onShowPasswordChange={setShowNewPassword}
          onShowConfirmPasswordChange={setShowConfirmPassword}
          onSubmit={() => void submitEdit()}
        />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("accountPage.deleteDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("accountPage.deleteDialogDesc", { email: deleteTarget?.email || "-" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? t("accountPage.deleting") : t("accountPage.deleteConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ResponseDialog
          open={responseDialog.open}
          title={responseDialog.title}
          description={responseDialog.description}
          variant={responseDialog.variant}
          actionLabel={t("common.ok")}
          onOpenChange={(open) => setResponseDialog((prev) => ({ ...prev, open }))}
        />
      </div>
    </ScrollArea>
  );
}
