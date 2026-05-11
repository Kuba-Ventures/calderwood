import { AuthGate } from "@/components/app/auth-gate";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-canvas-tint">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
