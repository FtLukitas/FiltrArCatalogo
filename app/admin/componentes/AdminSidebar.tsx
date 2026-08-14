'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Car,
  LogOut,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useState } from 'react';

const MENU_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/importar', label: 'Importar Excel', icon: FileSpreadsheet },
  { href: '/admin/equivalencias', label: 'Equivalencias', icon: ArrowLeftRight },
  { href: '/admin/vehiculos', label: 'Vehículos', icon: Car },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* ASIDE SIDEBAR */}
      <aside
        className={`w-64 bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col justify-between shrink-0 fixed top-0 left-0 h-screen z-50 overflow-y-auto shadow-2xl transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* BRAND HEADER */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <Link href="/admin" onClick={handleLinkClick} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="font-black text-white text-lg tracking-tight block">
                  Filtr<span className="text-blue-500">Ar</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block -mt-1">
                  Panel Admin
                </span>
              </div>
            </Link>

            {/* CLOSE BUTTON ON MOBILE */}
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              MENÚ PRINCIPAL
            </div>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href) ||
                    (item.href === '/admin/productos' && pathname.startsWith('/admin/producto'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all border border-slate-800/50"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Ver Sitio Público</span>
            </span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
