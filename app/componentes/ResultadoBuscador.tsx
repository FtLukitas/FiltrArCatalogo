'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Download, ArrowUp, Loader2, RotateCcw, Package, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import TarjetaProducto from './TarjetaProducto';

interface ResultadoBuscadorProps {
  initialSearch?: string;
}

const CATEGORIAS_LISTA = [
  'Filtros de Aceite',
  'Filtros de Aire',
  'Filtros de Combustible',
  'Filtros de Habitáculo',
  'Kits de Filtros',
  'Filtros Varios',
];

const MARCAS_LISTA = [
  'Todas',
  'Pro Filter',
  'Maxfil',
  'MDH',
  'Picborg',
  'Common Rail',
  'Genérico'
];

export default function ResultadoBuscador({ initialSearch = '' }: ResultadoBuscadorProps) {
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de la columna izquierda (Sidebar) - UN SOLO BUSCADOR DE PRODUCTO O CÓDIGO
  const [filtroProducto, setFiltroProducto] = useState(initialSearch);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('Todas');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Escuchar evento si viene desde SmartSearch de la portada
  useEffect(() => {
    const handleBuscar = (e: CustomEvent<string>) => {
      if (typeof e.detail === 'string') {
        setFiltroProducto(e.detail);
      }
    };
    window.addEventListener('filtrar-buscar-catalogo' as any, handleBuscar as any);
    return () => window.removeEventListener('filtrar-buscar-catalogo' as any, handleBuscar as any);
  }, []);

  // Escuchar scroll para botón de ir arriba
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cargar catálogo completo desde Supabase EN BLOQUES (superando el límite de 1000 de Supabase)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        let todosLosProductos: any[] = [];
        let desde = 0;
        const paso = 1000;
        let hayMas = true;

        while (hayMas) {
          let { data, error } = await supabase
            .from('productos_filtrar')
            .select('*')
            .range(desde, desde + paso - 1)
            .order('codigo_filtrar');

          if (error || !data || data.length === 0) {
            hayMas = false;
            break;
          }

          if (data && data.length > 0) {
            todosLosProductos = [...todosLosProductos, ...data];
            if (data.length < paso) {
              hayMas = false;
            } else {
              desde += paso;
            }
          } else {
            hayMas = false;
          }
        }

        if (todosLosProductos.length > 0) {
          const datosNormalizados = todosLosProductos.map((item: any) => {
            const cod = item.codigo_filtrar || String(item.id || '');
            return {
              ...item,
              codigo_filtrar: cod,
              titulo_producto: item.titulo_producto || `Filtro ${cod}`,
              descripcion_aplicacion: item.descripcion_aplicacion || null,
              imagen_url: item.imagen_url
            };
          });

          setProductos(datosNormalizados as Filtro[]);
        }
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Filtrado reactivo multivariable UNIFICADO
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const code = (p.codigo_filtrar || '').toLowerCase();
      const title = (p.titulo_producto || '').toLowerCase();
      const app = (p.descripcion_aplicacion || '').toLowerCase();
      const equiv = (p.equivalencias || '').toLowerCase();
      const cat = p.categoria || '';
      const brand = p.marca_filtro || '';

      // 1. Un solo buscador que analiza Código, Título, Vehículo y Competencia
      if (filtroProducto.trim()) {
        const queryTerm = filtroProducto.trim().toLowerCase().replace(/[-_ ]/g, '');
        const matchCode = code.replace(/[-_ ]/g, '').includes(queryTerm);
        const matchTitle = title.includes(filtroProducto.trim().toLowerCase());
        const matchApp = app.includes(filtroProducto.trim().toLowerCase());
        const matchEquiv = equiv.includes(filtroProducto.trim().toLowerCase());

        if (!matchCode && !matchTitle && !matchApp && !matchEquiv) return false;
      }

      // 2. Filtro Categorías
      if (categoriasSeleccionadas.length > 0) {
        const matchesCat = categoriasSeleccionadas.some(c => cat.toLowerCase().includes(c.toLowerCase()));
        if (!matchesCat) return false;
      }

      // 3. Filtro Marca (con coincidencia limpia)
      if (marcaSeleccionada !== 'Todas') {
        const selClean = marcaSeleccionada.toLowerCase().replace(/[^a-z0-9]/g, '');
        const brandClean = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!brandClean.includes(selClean) && !selClean.includes(brandClean)) return false;
      }

      return true;
    });
  }, [productos, filtroProducto, categoriasSeleccionadas, marcaSeleccionada]);

  // Paginación por lotes de 25 en 25 productos
  const [visibleLimit, setVisibleLimit] = useState(25);

  useEffect(() => {
    setVisibleLimit(25);
  }, [filtroProducto, categoriasSeleccionadas, marcaSeleccionada]);

  const productosVisibles = useMemo(() => {
    return productosFiltrados.slice(0, visibleLimit);
  }, [productosFiltrados, visibleLimit]);

  const toggleCategoria = (catName: string) => {
    setCategoriasSeleccionadas(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const resetSidebar = () => {
    setFiltroProducto('');
    setCategoriasSeleccionadas([]);
    setMarcaSeleccionada('Todas');
    setVisibleLimit(25);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
      
      {/* SECCIÓN PRINCIPAL GRID (FILTROS LATERALES + CATÁLOGO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ============================================================ */}
        {/* SIDEBAR COLUMNA IZQUIERDA - UN SOLO BUSCADOR + FILTROS */}
        {/* ============================================================ */}
        <aside className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6 h-fit sticky top-20 z-10">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              <span>Buscador y Filtros</span>
            </h2>
            
            {(filtroProducto || categoriasSeleccionadas.length > 0 || marcaSeleccionada !== 'Todas') && (
              <button
                onClick={resetSidebar}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* ÚNICO BUSCADOR UNIFICADO: PRODUCTO O CÓDIGO */}
          <div>
            <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2 border-l-2 border-blue-600 pl-2">
              PRODUCTO O CÓDIGO
            </label>
            <div className="relative">
              <input
                type="text"
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                placeholder="Buscar por código, auto o equivalencia..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 pr-8"
              />
              {filtroProducto && (
                <button
                  onClick={() => setFiltroProducto('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* FILTRO POR CATEGORÍAS */}
          <div>
            <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2.5 border-l-2 border-blue-600 pl-2">
              CATEGORÍAS DE FILTRO
            </label>
            <div className="space-y-1.5">
              {CATEGORIAS_LISTA.map((cat) => {
                const isSelected = categoriasSeleccionadas.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategoria(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTRO POR MARCA DE FILTRO */}
          <div>
            <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2 border-l-2 border-blue-600 pl-2">
              MARCA DEL FILTRO
            </label>
            <select
              value={marcaSeleccionada}
              onChange={(e) => setMarcaSeleccionada(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all cursor-pointer"
            >
              {MARCAS_LISTA.map((marca) => (
                <option key={marca} value={marca}>
                  {marca === 'Todas' ? 'Todas las Marcas' : marca}
                </option>
              ))}
            </select>
          </div>

        </aside>

        {/* ============================================================ */}
        {/* GRILLA PRINCIPAL DE RESULTADOS DE PRODUCTOS */}
        {/* ============================================================ */}
        <main className="lg:col-span-9">
          
          {/* HEADER CONTADOR */}
          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200/80 mb-5 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {loading ? 'Cargando catálogo completo...' : `Mostrando ${productosVisibles.length} de ${productosFiltrados.length} productos`}
            </span>
            {filtroProducto && (
              <span className="text-xs font-semibold text-slate-500">
                Búsqueda: <strong className="text-slate-900">"{filtroProducto}"</strong>
              </span>
            )}
          </div>

          {/* GRILLA DE TARJETAS UTILIZANDO TARJETAPRODUCTO UNIFICADA */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="font-bold text-sm">Cargando catálogo...</span>
            </div>
          ) : productosVisibles.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {productosVisibles.map((item) => (
                  <TarjetaProducto key={item.id} filtro={item} />
                ))}
              </div>

              {/* BOTÓN MOSTRAR MÁS DE 25 EN 25 */}
              {visibleLimit < productosFiltrados.length && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3">
                  <div className="text-xs font-extrabold text-slate-600">
                    Mostrando <span className="text-blue-600 font-black">{productosVisibles.length}</span> de <span className="text-slate-900 font-black">{productosFiltrados.length}</span> productos
                  </div>

                  <div className="w-full max-w-xs mx-auto bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(productosVisibles.length / productosFiltrados.length) * 100}%` }}
                    />
                  </div>

                  <button
                    onClick={() => setVisibleLimit((prev) => prev + 25)}
                    className="bg-slate-900 hover:bg-blue-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto active:scale-95"
                  >
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Mostrar más productos (+25)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-10 text-center border border-slate-200 shadow-sm flex flex-col items-center">
              <Package className="w-12 h-12 text-slate-300 stroke-[1.5] mb-3" />
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-1">
                No se encontraron productos
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-5">
                Probá ajustando la búsqueda o seleccionando "(Todas las marcas)" en la columna izquierda.
              </p>
              <button
                onClick={resetSidebar}
                className="bg-slate-900 hover:bg-blue-600 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Filtros</span>
              </button>
            </div>
          )}

        </main>

      </div>

      {/* BOTÓN IR ARRIBA FLOTANTE */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-slate-900 text-white p-3 rounded-full shadow-xl transition-all z-50 animate-bounce active:scale-95"
          title="Ir arriba"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

    </div>
  );
}
