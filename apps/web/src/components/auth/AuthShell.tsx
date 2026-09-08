"use client";

import Link from "next/link";
import { Check, Radar } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-white/10 bg-white/[0.02] p-10 lg:flex lg:flex-col xl:p-14">
          <Link href="/" className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-2 text-black">
              <Radar size={22} />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-white">
                FlipScout
              </span>
              <span className="block text-xs text-neutral-500">
                {t("brand.subtitle")}
              </span>
            </span>
          </Link>

          <div className="my-auto max-w-xl">
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {t("auth.account")}
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white xl:text-5xl">
              {t("auth.syncTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-400">
              {t("auth.syncBody")}
            </p>

            <div className="mt-8 space-y-4">
              {[
                t("auth.featureWatchlist"),
                t("auth.featureTrips"),
                t("auth.featureMobile"),
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 text-sm text-neutral-300"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    <Check size={14} />
                  </span>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white lg:hidden"
            >
              <Radar size={18} />
              FlipScout
            </Link>

            <div className="ml-auto flex rounded-lg border border-white/10 bg-white/[0.025] p-1">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  locale === "en"
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-white",
                ].join(" ")}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("vi")}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  locale === "vi"
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-white",
                ].join(" ")}
              >
                VI
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
