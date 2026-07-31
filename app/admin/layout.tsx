'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from './componentes/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* SIDEBAR FIXED */}
      <AdminSidebar />

      {/* SPACER FOR FIXED SIDEBAR */}
      <div className="w-64 shrink-0 hidden md:block" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-6 md:p-10 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
