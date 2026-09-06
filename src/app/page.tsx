import { Dashboard } from "@/components/dashboard/Dashboard";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />
      <Dashboard />
    </div>
  );
}
