"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  Heart,
  Languages,
  LogIn,
  LogOut,
  MapPinned,
  Radar,
  Tags,
  UserRound,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";

export function Sidebar() {
  const { locale, setLocale, t } = useI18n();
  const { user, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();

    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const nav = [
    { label: t("nav.dashboard"), icon: BarChart3, href: "/" },
    { label: t("nav.deals"), icon: Tags, href: "/#deals" },
    { label: t("nav.stores"), icon: MapPinned, href: "/stores" },
    { label: t("nav.calculator"), icon: Calculator, href: "/calculator" },
    { label: t("nav.watchlist"), icon: Heart, href: "/watchlist" },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-neutral-950 p-5 lg:flex lg:flex-col">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2">
        <div className="rounded-xl bg-white p-2 text-black">
          <Radar size={22} />
        </div>

        <div>
          <div className="text-lg font-bold tracking-tight text-white">
            FlipScout
          </div>
          <div className="text-xs text-neutral-500">
            {t("brand.subtitle")}
          </div>
        </div>
      </Link>

      <nav className="space-y-1">
        {nav.map(({ label, icon: Icon, href }) => {
          const isDealsLink = href === "/#deals";
          const isDashboardLink = href === "/";

          const isActive = isDealsLink
            ? pathname === "/" && hash === "#deals"
            : isDashboardLink
              ? pathname === "/" && hash !== "#deals"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                isActive
                  ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.06)]"
                  : "border-transparent text-neutral-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-emerald-400"
                />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          {authLoading ? (
            <div className="h-9 animate-pulse rounded-lg bg-white/5" />
          ) : user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <UserRound size={16} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white">
                    {user.displayName || user.email}
                  </div>
                  {user.displayName && (
                    <div className="truncate text-[11px] text-neutral-600">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                <LogOut size={14} />
                {t("auth.logout")}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-xs text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                <LogIn size={13} />
                {t("auth.login")}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-white px-2 py-2 text-center text-xs font-semibold text-black transition hover:bg-neutral-200"
              >
                {t("auth.register")}
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
          <Languages size={14} />
          {t("language.label")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={[
              "rounded-lg px-2 py-2 text-xs transition",
              locale === "en"
                ? "bg-white text-black"
                : "bg-black text-neutral-400 hover:text-white",
            ].join(" ")}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("vi")}
            className={[
              "rounded-lg px-2 py-2 text-xs transition",
              locale === "vi"
                ? "bg-white text-black"
                : "bg-black text-neutral-400 hover:text-white",
            ].join(" ")}
          >
            VI
          </button>
        </div>
        </div>
      </div>
    </aside>
  );
}
