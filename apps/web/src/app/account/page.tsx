"use client";

import { useRouter } from "next/navigation";
import { LogOut, Mail, UserRound } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <header className="mb-8">
              <p className="text-sm text-neutral-500">
                {t("account.context")}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("account.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                {t("account.subtitle")}
              </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <UserRound size={24} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">
                    {user?.displayName || t("account.noName")}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                    <Mail size={14} />
                    <span className="truncate">{user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info
                    label={t("account.name")}
                    value={user?.displayName || t("account.notSet")}
                  />
                  <Info
                    label={t("account.email")}
                    value={user?.email || ""}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                >
                  <LogOut size={16} />
                  {t("auth.logout")}
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-600">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-neutral-200">
        {value}
      </div>
    </div>
  );
}
