"use client";

import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { Sidebar } from "@/components/layout/Sidebar";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function CalculatorPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm text-neutral-500">{t("calculator.context")}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("calculator.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              {t("calculator.subtitle")}
            </p>
          </header>

          <ProfitCalculator />
        </div>
      </main>
    </div>
  );
}
