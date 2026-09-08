"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { translatedApiError } from "@/lib/auth-ui";

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    logout,
    logoutAll,
    updateProfile,
    changePassword,
  } = useAuth();
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleLogoutAll() {
    await logoutAll();
    router.replace("/login");
  }

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      await updateProfile({
        displayName: displayName.trim() || null,
      });
      setProfileMessage(t("account.profileSaved"));
    } catch (cause) {
      setProfileMessage(
        translatedApiError(cause, t, "account.profileSaveFailed"),
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordMismatch"));
      return;
    }

    setPasswordSaving(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      router.replace("/login");
    } catch (cause) {
      setPasswordError(
        translatedApiError(cause, t, "account.passwordChangeFailed"),
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
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

            <div className="grid gap-6 lg:grid-cols-2">
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

                <form onSubmit={handleProfile} className="mt-6 border-t border-white/10 pt-6">
                  <h2 className="text-base font-semibold text-white">
                    {t("account.profile")}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t("account.profileHelp")}
                  </p>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm text-neutral-300">
                      {t("account.name")}
                    </span>
                    <input
                      value={displayName}
                      maxLength={80}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/40"
                    />
                  </label>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-neutral-600">
                      {t("account.email")}
                    </div>
                    <div className="mt-2 break-words text-sm font-medium text-neutral-200">
                      {user?.email}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-neutral-600">
                      {t("account.emailStatus")}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          user?.emailVerified
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-amber-500/10 text-amber-300",
                        ].join(" ")}
                      >
                        {user?.emailVerified
                          ? t("account.verified")
                          : t("account.unverified")}
                      </span>

                      {!user?.emailVerified && (
                        <Link
                          href="/verify-email"
                          className="text-xs font-semibold text-white transition hover:text-emerald-300"
                        >
                          {t("account.verifyNow")}
                        </Link>
                      )}
                    </div>
                  </div>

                  {profileMessage && (
                    <p className="mt-4 text-sm text-neutral-400">
                      {profileMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
                  >
                    <Save size={15} />
                    {profileSaving
                      ? t("account.saving")
                      : t("account.saveProfile")}
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                    <KeyRound size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-white">
                      {t("account.security")}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t("account.securityHelp")}
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePassword} className="mt-6 space-y-4">
                  <PasswordField
                    label={t("account.currentPassword")}
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                    showLabel={t("auth.showPassword")}
                    hideLabel={t("auth.hidePassword")}
                  />
                  <PasswordField
                    label={t("account.newPassword")}
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    showLabel={t("auth.showPassword")}
                    hideLabel={t("auth.hidePassword")}
                  />
                  <PasswordField
                    label={t("auth.confirmPassword")}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    showLabel={t("auth.showPassword")}
                    hideLabel={t("auth.hidePassword")}
                  />

                  {passwordError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {passwordError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/5 disabled:opacity-60"
                  >
                    <ShieldCheck size={16} />
                    {passwordSaving
                      ? t("account.changingPassword")
                      : t("account.changePassword")}
                  </button>
                </form>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="text-sm font-semibold text-white">
                    {t("account.sessions")}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {t("account.sessionsHelp")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-white/5"
                    >
                      <LogOut size={16} />
                      {t("auth.logout")}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleLogoutAll()}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
                    >
                      <ShieldCheck size={16} />
                      {t("account.logoutAll")}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-neutral-300">
        {label}
      </span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          required
          minLength={8}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-11 text-sm text-white outline-none transition focus:border-emerald-500/40"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 transition hover:text-white"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
