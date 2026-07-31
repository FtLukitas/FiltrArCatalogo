'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, Loader2, Grid, RotateCcw, ChevronLeft, ChevronRight, PackageCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import TarjetaProducto from './TarjetaProducto';

const CATEGORIAS = [
  'TODOS',
  'Filtros de Aceite',
  'Filtros de Aire',
  'Filtros de Combustible',
  'Filtros de Habitáculo',
  'Kits de Filtros',
  'Filtros Varios',
];

const MARCAS_FILTRO = ['TODAS', 'Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Common Rail', 'Genérico'];

const ITEMS_POR_PAGINA = 25;

interface CatalogoProductosProps {
  initialSearch?: string;
  initialCategoria?: string;
}

export default function CatalogoProductos({ initialSearch = '', initialCategoria = 'TODOS' }: CatalogoProductosProps) {
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(initialCategoria);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('TODAS');
  const [busquedaTexto, setBusquedaTexto] = useState(initialSearch);
  const [orden, setOrden] = useState<'codigo-asc' | 'codigo-desc' | 'precio-asc' | 'precio-desc'>('codigo-asc');
  const [marcasDinamicas, setMarcasDinamicas] = useState<string[]>(['TODAS', 'Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Common Rail']);

  // Cargar marcas de filtros existentes dinámicamente desde la base de datos
  useEffect(() => {
    async function fetchMarcas() {
      try {
        const { data } = await supabase
          .from('productos_filtrar')
          .select('marca_filtro')
          .not('marca_filtro', 'is', null);

        if (data) {
          const distinct = Array.from(
            new Set(
              data
                .map((item) => item.marca_filtro?.trim())
                .filter((m): m is string => Boolean(m))
            )
          ).sort();

          if (distinct.length > 0) {
            setMarcasDinamicas(['TODAS', ...distinct]);
          }
        }
      } catch (err) {
        console.error('Error al cargar marcas dinámicas:', err);
      }
    }
    fetchMarcas();
  }, []);

  // Escuchar búsquedas lanzadas desde SmartSearch (Enter o Clic en ver resultados completos)
  useEffect(() => {
    const handleBuscarExtenso = (e: CustomEvent<string>) => {
      if (typeof e.detail === 'string') {
        setBusquedaTexto(e.detail);
        setPagina(1);
        setTimeout(() => {
          document.getElementById('catalogo-seccion')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    window.addEventListener('filtrar-buscar-catalogo' as any, handleBuscarExtenso as any);
    return () => window.removeEventListener('filtrar-buscar-catalogo' as any, handleBuscarExtenso as any);
  }, []);

  // Fetch productos cuando cambian filtros, página u orden
  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const construirQuery = (tableName: string) => {
          let q = supabase.from(tableName).select('*', { count: 'exact' });
          if (categoriaSeleccionada !== 'TODOS') {
            q = q.eq('categoria', categoriaSeleccionada);
          }
          if (marcaSeleccionada !== 'TODAS') {
            q = q.ilike('marca_filtro', `%${marcaSeleccionada}%`);
          }
          if (busquedaTexto.trim().length >= 2) {
            q = q.ilike('buscador_unificado', `%${busquedaTexto.trim().toLowerCase()}%`);
          }
          if (orden === 'codigo-asc') {
            q = q.order('codigo_filtrar', { ascending: true });
          } else if (orden === 'codigo-desc') {
            q = q.order('codigo_filtrar', { ascending: false });
          } else if (orden === 'precio-asc') {
            q = q.order('precio', { ascending: true });
          } else if (orden === 'precio-desc') {
            q = q.order('precio', { ascending: false });
          }
          const desde = (pagina - 1) * ITEMS_POR_PAGINA;
          const hasta = desde + ITEMS_POR_PAGINA - 1;
          return q.range(desde, hasta);
        };

        const res = await construirQuery('productos_filtrar');

        if (!res.error && res.data) {
          const datosNormalizados = res.data.map((item: any) => {
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
          setTotalCount(res.count || 0);
        }
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [categoriaSeleccionada, marcaSeleccionada, busquedaTexto, orden, pagina]);

  const totalPaginas = Math.ceil(totalCount / ITEMS_POR_PAGINA);

  const resetFiltros = () => {
    setCategoriaSeleccionada('TODOS');
    setMarcaSeleccionada('TODAS');
    setBusquedaTexto('');
    setOrden('codigo-asc');
    setPagina(1);
  };

  return (
    <section id="catalogo-seccion" className="scroll-mt-24 mb-20">
      
      {/* HEADER DEL CATÁLOGO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-widest mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>Explorador de Productos</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
            TODOS LOS PRODUCTOS
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            Explorá y filtrá entre nuestras {totalCount > 0 ? totalCount : 'cientos de'} especificaciones técnicas en stock.
          </p>
        </div>

        {/* ORDENAMIENTO */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Ordenar por:</label>
          <select
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value as any);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
          >
            <option value="codigo-asc">Código (A - Z)</option>
            <option value="codigo-desc">Código (Z - A)</option>
            <option value="precio-asc">Menor Precio</option>
            <option value="precio-desc">Mayor Precio</option>
          </select>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS (CATEGORÍAS & MARCAS) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg mb-8 space-y-6">
        
        {/* PILLS CATEGORÍAS */}
        <div>
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-3">
            Filtrar por Categoría:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaSeleccionada(cat);
                  setPagina(1);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                  categoriaSeleccionada === cat
                    ? 'bg-blue-900 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRO POR MARCA Y TEXTO INTERNO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          
          <div>
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Marca de Filtro:
            </label>
            <select
              value={marcaSeleccionada}
              onChange={(e) => {
                setMarcaSeleccionada(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
            >
              {marcasDinamicas.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Filtrar por palabra clave:
            </label>
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => {
                setBusquedaTexto(e.target.value);
                setPagina(1);
              }}
              placeholder="Ej: Maxfil, Iveco, EA205..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFiltros}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          </div>

        </div>

      </div>

      {/* GRID DE PRODUCTOS */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-bold">Cargando productos del catálogo...</span>
        </div>
      ) : productos.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {productos.map((f) => (
              <TarjetaProducto key={f.id} filtro={f} />
            ))}
          </div>

          {/* PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">
                Página <strong className="text-slate-900">{pagina}</strong> de <strong className="text-slate-900">{totalPaginas}</strong> ({totalCount} ítems)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 disabled:opacity-40 rounded-xl font-bold text-xs text-white flex items-center gap-1 transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm my-8">
          <p className="text-lg font-black text-slate-800 mb-2">No se encontraron productos con estos criterios</p>
          <p className="text-xs text-slate-500 mb-6">Intentá modificar la categoría o limpiar los filtros de búsqueda.</p>
          <button
            onClick={resetFiltros}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer Filtros</span>
          </button>
        </div>
      )}

    </section>
  );
}
