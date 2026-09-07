"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  Heart,
  Languages,
  MapPinned,
  Radar,
  Tags,
} from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function Sidebar() {
  const { locale, setLocale, t } = useI18n();
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

      <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
          <Languages size={14} />
          Language
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
    </aside>
  );
}
