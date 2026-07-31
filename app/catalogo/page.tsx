'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, Layers } from 'lucide-react';
import ResultadoBuscador from '../componentes/ResultadoBuscador';

function CatalogoContenido() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* CABECERA MINIMALISTA DE CATÁLOGO */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          
          {/* BREADCRUMB */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Catálogo de Productos
            </span>
          </div>

        </div>

        {/* COMPONENTE PRINCIPAL CON UN SOLO BUSCADOR UNIFICADO Y MARCAS */}
        <ResultadoBuscador initialSearch={query} />

      </div>
    </main>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <p className="text-slate-500 font-bold text-sm">Cargando catálogo de productos...</p>
      </div>
    }>
      <CatalogoContenido />
    </Suspense>
  );
}
