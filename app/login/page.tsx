"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, storeToken, getStoredToken } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin.ops@syntrix.local");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Silakan login.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Login...");
    try {
      const token = await loginWithPassword(email, password);
      storeToken(token);
      setStatus("Login sukses.");
      router.replace("/dashboard");
    } catch (error) {
      setStatus(`Login gagal: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-slate-900">Syntrix Login</h1>
        <p className="mt-2 text-sm text-slate-600">Login section admin atau user.</p>

        <div className="mt-4 flex gap-2">
          <button className="rounded bg-slate-200 px-3 py-1 text-sm" onClick={() => setEmail("admin.ops@syntrix.local")}>
            Admin
          </button>
          <button className="rounded bg-slate-200 px-3 py-1 text-sm" onClick={() => setEmail("ops.region@syntrix.local")}>
            User
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-teal-700 px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        <p className="mt-4 rounded bg-slate-100 p-2 text-xs text-slate-700">{status}</p>
      </div>
    </main>
  );
}
