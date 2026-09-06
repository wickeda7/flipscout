import { Dashboard } from "@/components/dashboard/Dashboard";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <Dashboard />
    </div>
  );
}
