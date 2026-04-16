"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SimpleTable } from "@/components/simple-table";
import { useSession } from "@/components/session-context";
import { apiFetch, type UsersListResponse } from "@/lib/api";

export default function AccountManagementPage() {
  const router = useRouter();
  const { token, me } = useSession();
  const [users, setUsers] = useState<UsersListResponse["data"]>([]);

  useEffect(() => {
    if (me.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    async function run() {
      const result = await apiFetch<UsersListResponse>("/users?page=1&limit=20", { token });
      setUsers(result.data || []);
    }

    void run();
  }, [me.role, router, token]);

  if (me.role !== "admin") return null;

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Account Management</h2>
      <SimpleTable
        headers={["User Code", "Name", "Email", "Role", "Active"]}
        rows={users.map((item) => [
          item.user_code,
          item.full_name,
          item.email,
          item.role_name,
          item.is_active ? "Yes" : "No",
        ])}
      />
    </div>
  );
}
