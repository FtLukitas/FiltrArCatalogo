'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import SmartSearch from '../componentes/SmartSearch';
import CatalogoProductos from '../componentes/CatalogoProductos';

function BuscarContenido() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const cat = searchParams.get('cat') || 'TODOS';

  return (
    <main className="min-h-screen bg-slate-50">
      
      {/* CABECERA DE BÚSQUEDA */}
      <section className="bg-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative z-30">
        <div className="max-w-7xl mx-auto">
          
          {/* BREADCRUMB */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
            <Link href="/" className="hover:text-white flex items-center gap-1 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-blue-400 font-bold">Resultados de Búsqueda</span>
          </div>

          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-3">
              {query ? (
                <>
                  Resultados para <span className="text-blue-400">"{query}"</span>
                </>
              ) : (
                'Catálogo Completo de Filtros'
              )}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Filtrá por categoría, marca, código o aplicación de vehículo.
            </p>
          </div>

          {/* BARRA DE BÚSQUEDA INTELIGENTE RE-USABLE */}
          <SmartSearch />

        </div>
      </section>

      {/* CONTENIDO CATÁLOGO CON FILTROS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CatalogoProductos initialSearch={query} initialCategoria={cat} />
      </div>

    </main>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400 font-bold">Cargando resultados del catálogo...</p>
      </div>
    }>
      <BuscarContenido />
    </Suspense>
  );
}
