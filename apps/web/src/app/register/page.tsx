"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { safeInternalPath, translatedApiError } from "@/lib/auth-ui";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);

    try {
      const result = await register({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });

      if (result.developmentVerificationUrl) {
        window.sessionStorage.setItem(
          "flipscout-development-verification-url",
          result.developmentVerificationUrl,
        );
      }

      const next = safeInternalPath(searchParams.get("next"));
      router.replace(
        next === "/"
          ? "/verify-email"
          : `/verify-email?next=${encodeURIComponent(next)}`,
      );
    } catch (cause) {
      setError(translatedApiError(cause, t, "auth.registerFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <p className="text-sm font-medium text-emerald-300">
          {t("auth.register")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {t("auth.createTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {t("auth.createSubtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-300">
            {t("auth.name")}
          </span>
          <span className="relative block">
            <UserRound
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"
            />
            <input
              type="text"
              autoComplete="name"
              maxLength={80}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("auth.namePlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-emerald-500/40 focus:bg-white/[0.04]"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-300">
            {t("auth.email")}
          </span>
          <span className="relative block">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"
            />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-emerald-500/40 focus:bg-white/[0.04]"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-300">
            {t("auth.password")}
          </span>
          <span className="relative block">
            <LockKeyhole
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-emerald-500/40 focus:bg-white/[0.04]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 transition hover:text-white"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-300">
            {t("auth.confirmPassword")}
          </span>
          <span className="relative block">
            <LockKeyhole
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"
            />
            <input
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-emerald-500/40 focus:bg-white/[0.04]"
            />
            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((value) => !value)
              }
              aria-label={
                showConfirmPassword
                  ? t("auth.hidePassword")
                  : t("auth.showPassword")
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 transition hover:text-white"
            >
              {showConfirmPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </span>
        </label>

        <p className="text-xs leading-5 text-neutral-600">
          {t("auth.secureNote")}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("auth.creating") : t("auth.register")}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t("auth.hasAccount")}{" "}
        <Link
          href={
            searchParams.get("next")
              ? `/login?next=${encodeURIComponent(
                  safeInternalPath(searchParams.get("next")),
                )}`
              : "/login"
          }
          className="font-semibold text-white transition hover:text-emerald-300"
        >
          {t("auth.login")}
        </Link>
      </p>
    </AuthShell>
  );
}
