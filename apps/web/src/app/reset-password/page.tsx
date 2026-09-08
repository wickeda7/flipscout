"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/components/i18n/I18nProvider";
import { flipScoutApi } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t("auth.resetMissingToken"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);

    try {
      await flipScoutApi.resetPassword({ token, newPassword });
      router.replace("/login?reset=success");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("auth.resetFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <p className="text-sm font-medium text-emerald-300">
          {t("auth.resetPassword")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {t("auth.resetTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {t("auth.resetSubtitle")}
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

        <PasswordField
          label={t("account.newPassword")}
          value={newPassword}
          onChange={setNewPassword}
        />

        <PasswordField
          label={t("auth.confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <button
          type="submit"
          disabled={submitting || !token}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? t("auth.resettingPassword")
            : t("auth.resetPassword")}
        </button>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-neutral-500 transition hover:text-white"
        >
          <ArrowLeft size={15} />
          {t("auth.backToLogin")}
        </Link>
      </form>
    </AuthShell>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-300">
        {label}
      </span>
      <span className="relative block">
        <LockKeyhole
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-500/40 focus:bg-white/[0.04]"
        />
      </span>
    </label>
  );
}
