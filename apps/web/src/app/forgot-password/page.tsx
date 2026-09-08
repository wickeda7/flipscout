"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ExternalLink } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/components/i18n/I18nProvider";
import { flipScoutApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [developmentResetUrl, setDevelopmentResetUrl] =
    useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setDevelopmentResetUrl(null);

    try {
      const result = await flipScoutApi.forgotPassword({ email });
      setSent(true);
      setDevelopmentResetUrl(result.developmentResetUrl ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("auth.recoveryRequestFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <p className="text-sm font-medium text-emerald-300">
          {t("auth.forgotPassword")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {t("auth.recoverTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {t("auth.recoverSubtitle")}
        </p>
      </div>

      {sent ? (
        <div className="mt-8 space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {t("auth.recoverySent")}
          </div>

          {developmentResetUrl && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-100">
                {t("auth.devResetTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-200/70">
                {t("auth.devResetBody")}
              </p>
              <a
                href={developmentResetUrl}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                {t("auth.openResetLink")}
                <ExternalLink size={13} />
              </a>
            </div>
          )}

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
          >
            {submitting
              ? t("auth.sendingRecovery")
              : t("auth.sendRecovery")}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-neutral-500 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            {t("auth.backToLogin")}
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
