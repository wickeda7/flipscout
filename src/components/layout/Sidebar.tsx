import { BarChart3, Calculator, Heart, MapPinned, Radar, Tags } from "lucide-react";

const nav = [
  { label: "Dashboard", icon: BarChart3, active: true },
  { label: "Deals", icon: Tags },
  { label: "Stores", icon: MapPinned },
  { label: "Calculator", icon: Calculator },
  { label: "Watchlist", icon: Heart },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><Radar size={22} /></div>
        <div>
          <div className="brand-name">FlipScout</div>
          <div className="brand-subtitle">Resale intelligence</div>
        </div>
      </div>
      <nav className="nav">
        {nav.map(({ label, icon: Icon, active }) => (
          <button key={label} className={`nav-button${active ? " active" : ""}`}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
