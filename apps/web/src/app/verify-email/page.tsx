"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, MailCheck, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { flipScoutApi } from "@/lib/api";
import { safeInternalPath, translatedApiError } from "@/lib/auth-ui";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/account");
  const [status, setStatus] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [developmentVerificationUrl, setDevelopmentVerificationUrl] =
    useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const storedDevelopmentUrl = window.sessionStorage.getItem(
      "flipscout-development-verification-url",
    );

    if (storedDevelopmentUrl) {
      setDevelopmentVerificationUrl(storedDevelopmentUrl);
      window.sessionStorage.removeItem(
        "flipscout-development-verification-url",
      );
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus(user?.emailVerified ? "verified" : "idle");
      return;
    }

    let cancelled = false;
    setStatus("verifying");
    setMessage(null);

    flipScoutApi
      .verifyEmail({ token })
      .then(async () => {
        if (cancelled) return;
        setStatus("verified");
        setMessage(t("auth.verifySuccess"));
        try {
          await refreshUser();
        } catch {
          // Verification succeeded even if the local account refresh fails.
        }
        window.history.replaceState(
          {},
          "",
          next === "/account"
            ? "/verify-email"
            : `/verify-email?next=${encodeURIComponent(next)}`,
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          translatedApiError(cause, t, "auth.verifyFailed"),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [next, refreshUser, t, user?.emailVerified]);

  async function resend() {
    setResending(true);
    setMessage(null);
    setDevelopmentVerificationUrl(null);

    try {
      const result = await flipScoutApi.resendVerification();

      if (result.alreadyVerified) {
        setStatus("verified");
        setMessage(t("auth.alreadyVerified"));
        await refreshUser().catch(() => undefined);
        return;
      }

      setMessage(t("auth.verificationSent"));
      setDevelopmentVerificationUrl(
        result.developmentVerificationUrl ?? null,
      );
    } catch (cause) {
      setMessage(
        translatedApiError(
          cause,
          t,
          "auth.verificationResendFailed",
        ),
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
          {status === "verified" ? (
            <CheckCircle2 size={26} />
          ) : (
            <MailCheck size={26} />
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-emerald-300">
          {t("auth.verifyEmail")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {status === "verified"
            ? t("auth.verifyCompleteTitle")
            : t("auth.verifyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {status === "verified"
            ? t("auth.verifyCompleteSubtitle")
            : t("auth.verifySubtitle")}
        </p>
      </div>

      {message && (
        <div
          className={[
            "mt-7 rounded-xl border px-4 py-3 text-sm leading-6",
            status === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
          ].join(" ")}
        >
          {message}
        </div>
      )}

      {developmentVerificationUrl && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-100">
            {t("auth.devVerificationTitle")}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-200/70">
            {t("auth.devVerificationBody")}
          </p>
          <a
            href={developmentVerificationUrl}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
          >
            {t("auth.openVerificationLink")}
            <ExternalLink size={13} />
          </a>
        </div>
      )}

      <div className="mt-7 space-y-3">
        {status !== "verified" && user && (
          <button
            type="button"
            onClick={() => void resend()}
            disabled={resending || status === "verifying"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={resending ? "animate-spin" : ""}
            />
            {resending
              ? t("auth.resendingVerification")
              : t("auth.resendVerification")}
          </button>
        )}

        <Link
          href={
            user
              ? status === "verified"
                ? next
                : "/account"
              : "/login"
          }
          className="block w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
        >
          {user
            ? status === "verified" && next !== "/account"
              ? t("auth.continue")
              : t("auth.goToAccount")
            : t("auth.backToLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
