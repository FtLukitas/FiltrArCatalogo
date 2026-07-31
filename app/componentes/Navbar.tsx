'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Filter, ShieldCheck, MessageCircle, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 text-slate-900 shadow-sm overflow-hidden max-w-full">
      {/* LÍNEA DE ACENTO SUPERIOR EN DEGRADÉ CON LOS COLORES DEL LOGO */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 w-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* LOGO & BRAND CON MARCO Y EFECTO GLOW */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group py-1">
            <div className="relative flex items-center justify-center p-1 rounded-2xl transition-all group-hover:scale-105">
              <img
                src="/logo.png"
                alt="FiltrAr Logo"
                className="h-20 sm:h-20 w-auto object-contain transition-all drop-shadow-sm group-hover:drop-shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
              />
            </div>
            <div className="hidden sm:flex flex-col border-l-2 border-slate-200/80 pl-3.5 py-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                Catálogo
              </span>
            </div>
          </Link>

          {/* NAVEGACIÓN PRINCIPAL DESKTOP CON BOTONES ESTILO PILL */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-2 group"
            >
              <Search className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Buscador</span>
            </Link>

            <Link
              href="/#vehiculo-section"
              className="px-3.5 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-2 group"
            >
              <Filter className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Por Vehículo</span>
            </Link>

            <Link
              href="/catalogo"
              className="px-3.5 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-2 group"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Catálogo Completo</span>
            </Link>
          </nav>

          {/* BOTÓN WHATSAPP Y MENÚ HAMBURGUESA MOBILE */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="https://wa.me/5491123456789?text=Hola!%20Quisiera%20hacer%20una%20consulta%20sobre%20el%20cat%C3%A1logo"
              target="_blank"
              rel="noopener noreferrer"
              className="relative group bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 border border-emerald-400/30"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600 group-hover:rotate-12 transition-transform" />
              <span className="hidden xs:inline sm:inline">WhatsApp</span>
            </a>

            {/* BOTÓN MENÚ MOBILE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* MENÚ HAMBURGUESA DESPLEGABLE EN MOBILE */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 animate-fade-in shadow-xl">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-800 font-extrabold text-xs transition-colors"
          >
            <Search className="w-4 h-4 text-blue-600" />
            <span>Inicio / Buscador</span>
          </Link>

          <Link
            href="/#vehiculo-section"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-800 font-extrabold text-xs transition-colors"
          >
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Por Vehículo</span>
          </Link>

          <Link
            href="/catalogo"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-800 font-extrabold text-xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Catálogo Completo</span>
          </Link>
        </div>
      )}
    </header>
  );
}
