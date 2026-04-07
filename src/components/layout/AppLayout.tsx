import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AppSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuToggle={() => setSidebarOpen(o => !o)} />
      <main className="lg:ml-60 mt-16 p-4 sm:p-7">
        {children}
      </main>
    </div>
  );
}
