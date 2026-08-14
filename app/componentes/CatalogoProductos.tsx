'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import TarjetaProducto from './TarjetaProducto';
import {
  PackageCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  Layers,
  X,
} from 'lucide-react';
import { CATEGORIAS_UI } from '@/lib/constants';

const ITEMS_POR_PAGINA = 16;

interface CatalogoProductosProps {
  initialSearch?: string;
  initialCategoria?: string;
}

export default function CatalogoProductos({
  initialSearch = '',
  initialCategoria = 'TODOS',
}: CatalogoProductosProps = {}) {
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de Filtros
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(initialCategoria);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string>('TODAS');
  const [busquedaTexto, setBusquedaTexto] = useState<string>(initialSearch);
  const [orden, setOrden] = useState<'codigo-asc' | 'codigo-desc' | 'precio-asc' | 'precio-desc'>('codigo-asc');
  const [pagina, setPagina] = useState(1);
  const [marcasDinamicas, setMarcasDinamicas] = useState<string[]>(['TODAS']);

  // Actualizar si las props iniciales cambian
  useEffect(() => {
    if (initialSearch !== undefined) setBusquedaTexto(initialSearch);
    if (initialCategoria !== undefined) setCategoriaSeleccionada(initialCategoria);
  }, [initialSearch, initialCategoria]);

  // Conteo global por categoría
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Cargar marcas dinámicamente y conteo inicial
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const { data, count } = await supabase
          .from('productos_filtrar')
          .select('marca_filtro, categoria', { count: 'exact' })
          .eq('activo', true);

        if (data) {
          const distinctMarcas = Array.from(
            new Set(
              data
                .map((p) => p.marca_filtro?.trim())
                .filter((m): m is string => Boolean(m))
            )
          ).sort();
          setMarcasDinamicas(['TODAS', ...distinctMarcas]);

          // Calcular conteos por categoría
          const counts: Record<string, number> = { TODOS: count || data.length };
          data.forEach((p) => {
            const cat = (p.categoria || '').toLowerCase();
            CATEGORIAS_UI.forEach((c) => {
              if (c === 'TODOS') return;
              const sel = c.toLowerCase().replace(/^filtros de\s+/i, '').replace(/^kits de\s+/i, 'kits');
              if (cat.includes(sel) || cat.includes(c.toLowerCase())) {
                counts[c] = (counts[c] || 0) + 1;
              }
            });
          });
          setCategoryCounts(counts);
        }
      } catch (err) {
        console.error('Error al cargar metadatos de filtros:', err);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch de productos con filtros y paginación
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('productos_filtrar')
          .select('*', { count: 'exact' })
          .eq('activo', true);

        // Filtro por Categoría
        if (categoriaSeleccionada !== 'TODOS') {
          const sel = categoriaSeleccionada.toLowerCase().replace(/^filtros de\s+/i, '').replace(/^kits de\s+/i, 'kits');
          query = query.ilike('categoria', `%${sel}%`);
        }

        // Filtro por Marca
        if (marcaSeleccionada !== 'TODAS') {
          query = query.eq('marca_filtro', marcaSeleccionada);
        }

        // Filtro por palabra clave (Búsqueda en código, título, descripción)
        if (busquedaTexto.trim()) {
          const t = busquedaTexto.trim();
          query = query.or(`codigo_filtrar.ilike.%${t}%,titulo_producto.ilike.%${t}%,descripcion_aplicacion.ilike.%${t}%`);
        }

        // Ordenamiento
        if (orden === 'codigo-asc') query = query.order('codigo_filtrar', { ascending: true });
        if (orden === 'codigo-desc') query = query.order('codigo_filtrar', { ascending: false });
        if (orden === 'precio-asc') query = query.order('precio', { ascending: true, nullsFirst: false });
        if (orden === 'precio-desc') query = query.order('precio', { ascending: false, nullsFirst: false });

        // Paginación
        const from = (pagina - 1) * ITEMS_POR_PAGINA;
        const to = from + ITEMS_POR_PAGINA - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;
        setProductos((data as Filtro[]) || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [categoriaSeleccionada, marcaSeleccionada, busquedaTexto, orden, pagina]);

  const totalPaginas = Math.ceil(totalCount / ITEMS_POR_PAGINA) || 1;

  const resetFiltros = () => {
    setCategoriaSeleccionada('TODOS');
    setMarcaSeleccionada('TODAS');
    setBusquedaTexto('');
    setOrden('codigo-asc');
    setPagina(1);
  };

  const hasActiveFilters =
    categoriaSeleccionada !== 'TODOS' ||
    marcaSeleccionada !== 'TODAS' ||
    busquedaTexto.trim() !== '' ||
    orden !== 'codigo-asc';

  return (
    <section id="catalogo-seccion" className="scroll-mt-24 mb-16">
      {/* HEADER DEL EXPLORADOR */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>Catálogo Completo</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Explorador de Repuestos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filtrá entre {totalCount > 0 ? `${totalCount.toLocaleString()} productos disponibles` : 'nuestro inventario'}.
          </p>
        </div>

        {/* ORDENAMIENTO COMPACTO */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Ordenar:
          </label>
          <select
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value as any);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 shadow-sm cursor-pointer"
          >
            <option value="codigo-asc">Código (A - Z)</option>
            <option value="codigo-desc">Código (Z - A)</option>
            <option value="precio-asc">Menor Precio</option>
            <option value="precio-desc">Mayor Precio</option>
          </select>
        </div>
      </div>

      {/* SUITE DE FILTRADO SHARP & SLEEK */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 divide-y divide-slate-100 overflow-hidden">
        {/* ROW 1: TABS CATEGORÍAS */}
        <div className="p-3 bg-slate-50/70 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {CATEGORIAS_UI.map((cat) => {
            const isSelected = categoriaSeleccionada === cat;
            const count = categoryCounts[cat] || 0;
            const label = cat === 'TODOS' ? 'Todas' : cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoriaSeleccionada(cat);
                  setPagina(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ROW 2: CONTROLES SECUNDARIOS */}
        <div className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* SEARCH KEYWORD (7 COLUMNS) */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => {
                setBusquedaTexto(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por código, aplicación o palabra clave..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-600 transition-colors placeholder:text-slate-400"
            />
            {busquedaTexto && (
              <button
                onClick={() => {
                  setBusquedaTexto('');
                  setPagina(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* MARCA DROPDOWN (5 COLUMNS) */}
          <div className="sm:col-span-5">
            <select
              value={marcaSeleccionada}
              onChange={(e) => {
                setMarcaSeleccionada(e.target.value);
                setPagina(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-600 transition-colors cursor-pointer"
            >
              {marcasDinamicas.map((m) => (
                <option key={m} value={m}>
                  {m === 'TODAS' ? 'Marca: Todas' : `Marca: ${m}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS BAR */}
        {hasActiveFilters && (
          <div className="p-2.5 px-3 bg-slate-50/50 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-700">Filtros:</span>
              {categoriaSeleccionada !== 'TODOS' && (
                <span className="bg-white text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200 flex items-center gap-1">
                  Cat: {categoriaSeleccionada}
                  <button onClick={() => setCategoriaSeleccionada('TODOS')} className="hover:text-red-500">✕</button>
                </span>
              )}
              {marcaSeleccionada !== 'TODAS' && (
                <span className="bg-white text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200 flex items-center gap-1">
                  Marca: {marcaSeleccionada}
                  <button onClick={() => setMarcaSeleccionada('TODAS')} className="hover:text-red-500">✕</button>
                </span>
              )}
              {busquedaTexto && (
                <span className="bg-white text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200 flex items-center gap-1">
                  &quot;{busquedaTexto}&quot;
                  <button onClick={() => setBusquedaTexto('')} className="hover:text-red-500">✕</button>
                </span>
              )}
              <span className="text-slate-400 font-mono text-[11px]">
                ({totalCount} resultados)
              </span>
            </div>

            <button
              onClick={resetFiltros}
              className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* GRID DE PRODUCTOS */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium text-slate-500">Cargando productos del catálogo...</span>
        </div>
      ) : productos.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {productos.map((f) => (
              <TarjetaProducto key={f.id} filtro={f} />
            ))}
          </div>

          {/* PAGINACIÓN ELEGANTE */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">
                Mostrando <strong className="text-slate-900">{(pagina - 1) * ITEMS_POR_PAGINA + 1}</strong> -{' '}
                <strong className="text-slate-900">{Math.min(pagina * ITEMS_POR_PAGINA, totalCount)}</strong> de{' '}
                <strong className="text-slate-900">{totalCount}</strong> productos
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors text-slate-700 border border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-mono font-bold text-slate-800 border border-slate-200">
                  {pagina} / {totalPaginas}
                </span>

                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg font-semibold text-xs text-white flex items-center gap-1 transition-colors shadow-sm"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200 shadow-sm my-6 space-y-3">
          <p className="text-sm font-bold text-slate-800">No se encontraron productos con estos criterios</p>
          <p className="text-xs text-slate-500">Intentá modificar la categoría o limpiar los filtros de búsqueda.</p>
          <button
            onClick={resetFiltros}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Filtros</span>
          </button>
        </div>
      )}
    </section>
  );
}
