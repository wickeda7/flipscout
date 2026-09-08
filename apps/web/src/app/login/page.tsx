"use client";

import { Suspense } from "react";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { safeInternalPath, translatedApiError } from "@/lib/auth-ui";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetSuccessful = searchParams.get("reset") === "success";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      router.replace(safeInternalPath(searchParams.get("next")));
    } catch (cause) {
      setError(translatedApiError(cause, t, "auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <p className="text-sm font-medium text-emerald-300">
          {t("auth.login")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {t("auth.welcomeBack")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {resetSuccessful && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {t("auth.resetSuccess")}
          </div>
        )}

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
              autoComplete="current-password"
              required
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

        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-neutral-500 transition hover:text-white"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("auth.loggingIn") : t("auth.login")}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t("auth.noAccount")}{" "}
        <Link
          href={
            searchParams.get("next")
              ? `/register?next=${encodeURIComponent(
                  safeInternalPath(searchParams.get("next")),
                )}`
              : "/register"
          }
          className="font-semibold text-white transition hover:text-emerald-300"
        >
          {t("auth.register")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageContent /></Suspense>;
}
