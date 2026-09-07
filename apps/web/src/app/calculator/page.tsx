import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { Sidebar } from "@/components/layout/Sidebar";

export default function CalculatorPage() {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm text-neutral-500">Phase 2</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Profit & BUY score calculator
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Model a clearance purchase before you commit cash to inventory.
            </p>
          </header>

          <ProfitCalculator />
        </div>
      </main>
    </div>
  );
}
