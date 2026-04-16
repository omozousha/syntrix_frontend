"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";

type MenuItem = { href: string; label: string };

export function AppShell({
  me,
  onLogout,
  children,
}: {
  me: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = me.role === "admin";
  const menus: MenuItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/data-management", label: "Data Management/Database" },
    { href: "/maps", label: "Maps" },
    ...(isAdmin ? [{ href: "/account-management", label: "Account Management" }] : []),
  ];

  const scopeCount = me.app_user.user_region_scopes?.length || 0;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Syntrix App</h1>
            <p className="text-xs text-slate-600">
              {me.app_user.full_name} ({me.role}) {scopeCount ? `- region scope: ${scopeCount}` : ""}
            </p>
          </div>
          <button onClick={onLogout} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-xl bg-white p-3 shadow-sm">
          <nav className="space-y-2">
            {menus.map((menu) => {
              const active = pathname === menu.href;
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`block w-full rounded px-3 py-2 text-left text-sm ${
                    active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {menu.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-xl bg-white p-4 shadow-sm">{children}</section>
      </div>
    </main>
  );
}
