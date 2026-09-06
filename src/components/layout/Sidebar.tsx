import {
  BarChart3,
  Calculator,
  Heart,
  MapPinned,
  Radar,
  Tags,
} from "lucide-react";

const nav = [
  { label: "Dashboard", icon: BarChart3, active: true },
  { label: "Deals", icon: Tags },
  { label: "Stores", icon: MapPinned },
  { label: "Calculator", icon: Calculator },
  { label: "Watchlist", icon: Heart },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-neutral-950 p-5 lg:block">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="rounded-xl bg-white p-2 text-black">
          <Radar size={22} />
        </div>

        <div>
          <div className="text-lg font-bold tracking-tight text-white">
            FlipScout
          </div>
          <div className="text-xs text-neutral-500">Resale intelligence</div>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map(({ label, icon: Icon, active }) => (
          <button
            type="button"
            key={label}
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              active
                ? "bg-white font-medium text-black"
                : "text-neutral-400 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-5 left-5 right-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xs font-medium text-neutral-300">
          N
        </div>
      </div>
    </aside>
  );
}
