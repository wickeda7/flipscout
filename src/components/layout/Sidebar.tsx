import Link from "next/link";
import {
  BarChart3,
  Calculator,
  Heart,
  MapPinned,
  Radar,
  Tags,
} from "lucide-react";

const nav = [
  { label: "Dashboard", icon: BarChart3, href: "/" },
  { label: "Deals", icon: Tags, href: "/#deals" },
  { label: "Stores", icon: MapPinned, href: "/" },
  { label: "Calculator", icon: Calculator, href: "/calculator" },
  { label: "Watchlist", icon: Heart, href: "/watchlist" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-neutral-950 p-5 lg:block">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2">
        <div className="rounded-xl bg-white p-2 text-black">
          <Radar size={22} />
        </div>

        <div>
          <div className="text-lg font-bold tracking-tight text-white">
            FlipScout
          </div>
          <div className="text-xs text-neutral-500">Resale intelligence</div>
        </div>
      </Link>

      <nav className="space-y-1">
        {nav.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
