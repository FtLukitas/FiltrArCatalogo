'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Mail, MapPin, Shield, ChevronRight } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/constants';

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* COL 1: MARCA */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 inline-flex items-center shadow-md">
                <img
                  src="/logo.png"
                  alt="FiltrAr Logo"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </div>
              <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
                Catálogo Profesional
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Catálogo industrial y profesional de filtros para líneas livianas, pesadas, maquinaria agrícola e industrial.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Garantía de Calidad y Calce Directo</span>
            </div>
          </div>

          {/* COL 2: NAVEGACIÓN RÁPIDA */}
          <div className="md:justify-self-center">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-blue-500 pl-2">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-blue-500" />
                  Inicio / Buscador
                </Link>
              </li>
              <li>
                <a href="#vehiculo-section" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-blue-500" />
                  Búsqueda por Vehículo
                </a>
              </li>
              <li>
                <a href="#catalogo-seccion" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-blue-500" />
                  Catálogo Completo
                </a>
              </li>
            </ul>
          </div>

          {/* COL 3: CONTACTO */}
          <div className="md:justify-self-end">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-blue-500 pl-2">
              Contacto & Soporte
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Distribución a todo el país. Buenos Aires, Argentina.</span>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola!%20Quisiera%20hacer%20una%20consulta%20comercial%20desde%20el%20cat%C3%A1logo%20FiltrAr`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-blue-400 transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Atención Comercial: +54 9 11 3288-1901</span>
              </a>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>ventas@filtrar.com.ar</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className="border-t border-slate-800/60 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} FiltrAr Catalogo Profesional. Todos los derechos reservados.</p>
          <p className="text-[11px]">Sistema de consulta y especificaciones técnicas industriales.</p>
        </div>
      </div>
    </footer>
  );
}
