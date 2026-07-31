'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Sparkles, ArrowRight, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { normalizarImagenes, formatearPrecio } from '@/lib/utils';
import { getOcultarPreciosGlobal, debeOcultarPrecio } from '@/lib/preciosConfig';

interface SmartSearchProps {
  onSelectProduct?: (codigo: string) => void;
  initialValue?: string;
}

export default function SmartSearch({ onSelectProduct, initialValue = '' }: SmartSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const [results, setResults] = useState<Filtro[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [ocultarGlobal, setOcultarGlobal] = useState(false);

  useEffect(() => {
    getOcultarPreciosGlobal().then(setOcultarGlobal);
  }, []);

  // Actualizar si cambia initialValue
  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch Ultra-Inteligente a Supabase
  useEffect(() => {
    const searchProducts = async () => {
      const cleanInput = debouncedQuery.trim();
      if (cleanInput.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const lowerInput = cleanInput.toLowerCase();
        const compact = lowerInput.replace(/[-_ ]/g, '');
        const tokens = cleanInput.split(/[-_ ]+/).filter(t => t.length > 0);

        let queryBuilder = supabase.from('productos_filtrar').select('*').neq('activo', false);

        // CASO 1: Búsqueda Multi-Palabra (ej: "aceite fiat 600", "filtro aire peugeot 206", "wega daf100")
        if (tokens.length > 1) {
          tokens.forEach(tok => {
            const tokClean = tok.toLowerCase().replace(/[-_]/g, '');
            queryBuilder = queryBuilder.or(
              `buscador_unificado.ilike.%${tokClean}%,` +
              `codigo_filtrar.ilike.%${tokClean}%,` +
              `equivalencias.ilike.%${tokClean}%,` +
              `titulo_producto.ilike.%${tokClean}%,` +
              `descripcion_aplicacion.ilike.%${tokClean}%`
            );
          });
        } else {
          // CASO 2: Búsqueda Monotérmino (ej: "scd74s", "SC-D74S", "sc d74s", "ea201", "af04ev")
          const terms = new Set<string>();
          terms.add(lowerInput);
          terms.add(compact);
          terms.add(lowerInput.replace(/[-_]/g, ' '));
          terms.add(lowerInput.replace(/[-_]/g, '-'));

          // Prefijos conocidos de filtros (EA, AF, OF, FF, SC, KIT, UL, WEGA, MANN, FRAM, etc.)
          const pfxMatch = compact.match(/^(ea|af|of|ff|sc|kit|ul|wo|wega|mann|fram|we|hp|ph|fap)(.+)$/i);
          if (pfxMatch) {
            terms.add(`${pfxMatch[1]}%${pfxMatch[2]}`);
            terms.add(`${pfxMatch[1]}-${pfxMatch[2]}`);
            terms.add(`${pfxMatch[1]} ${pfxMatch[2]}`);
          }

          const orConds: string[] = [];
          Array.from(terms).forEach(t => {
            orConds.push(`codigo_filtrar.ilike.%${t}%`);
            orConds.push(`buscador_unificado.ilike.%${t}%`);
            orConds.push(`equivalencias.ilike.%${t}%`);
            orConds.push(`titulo_producto.ilike.%${t}%`);
            orConds.push(`descripcion_aplicacion.ilike.%${t}%`);
          });

          queryBuilder = queryBuilder.or(orConds.join(','));
        }

        const res = await queryBuilder.limit(8);

        if (!res.error && res.data) {
          setResults(res.data as Filtro[]);
        }
      } catch (err) {
        console.error('Error en SmartSearch:', err);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [debouncedQuery]);

  const handleFullSearch = (searchTerm?: string) => {
    const term = (searchTerm !== undefined ? searchTerm : query).trim();
    setFocused(false);
    if (term) {
      router.push(`/catalogo?q=${encodeURIComponent(term)}`);
    } else {
      router.push('/catalogo');
    }
  };

  // Cerrar desplegable al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tagsPopulares = ['SC-D74S', 'EA201', 'Mercedes-Benz', 'Perkins', 'Filtros de Aceite', 'Pro Filter'];

  return (
    <div ref={searchRef} className="relative w-full max-w-3xl mx-auto z-[999]">
      
      {/* INPUT CONTAINER */}
      <div className="relative">
        {/* ÍCONO ÚNICO A LA IZQUIERDA */}
        <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Search className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleFullSearch();
            }
          }}
          placeholder="Buscar por código (ej: SC-D74S, EA201, AF-010T), equivalencia o modelo..."
          className="w-full pl-11 sm:pl-13 pr-10 py-4 sm:py-4.5 bg-white rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 text-sm sm:text-base font-bold shadow-xl transition-all placeholder:text-slate-400 placeholder:font-normal"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs font-black transition-colors"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* TAGS POPULARES ABAJO DEL INPUT */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1 text-slate-300 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Búsquedas frecuentes:
        </span>
        {tagsPopulares.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setQuery(tag);
              setFocused(true);
            }}
            className="bg-slate-900/80 hover:bg-blue-600 border border-slate-700/80 hover:border-blue-500 text-slate-300 hover:text-white px-3 py-1 rounded-full transition-all text-[11px] shadow-sm active:scale-95"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* RESULTADOS DESPLEGABLES INSTANTÁNEOS (ENCIMA DE TODO CON Z-[999]) */}
      {focused && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[999] animate-fade-in max-h-[520px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-medium flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Buscando en el catálogo profesional...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{results.length} coincidencias rápidas</span>
                <span className="text-blue-600 font-extrabold">Presioná ENTER para catálogo completo</span>
              </div>
              <div className="divide-y divide-slate-100">
                {results.map((item) => {
                  const codigo = item.codigo_filtrar;
                  const imgs = normalizarImagenes(item.imagen_url);
                  const thumb = imgs.length > 0 ? imgs[0] : null;

                  return (
                    <Link
                      key={item.id}
                      href={`/producto/${encodeURIComponent(codigo)}`}
                      onClick={() => {
                        setFocused(false);
                        if (onSelectProduct) onSelectProduct(codigo);
                      }}
                      className="p-4 hover:bg-blue-50/80 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* THUMBNAIL */}
                        <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          {thumb ? (
                            <img src={thumb} alt={codigo} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-300" />
                          )}
                        </div>

                        {/* DETALLES */}
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                              {item.titulo_producto || item.descripcion_aplicacion || `Filtro ${codigo}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              {codigo}
                            </span>
                            {item.categoria && (
                              <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                {item.categoria}
                              </span>
                            )}
                          </div>
                          {item.equivalencias && (
                            <span className="text-[10px] font-mono text-slate-500 truncate mt-1">
                              Equiv: {item.equivalencias}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ACCIÓN */}
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-sm font-black text-slate-700 hidden sm:inline">
                          {formatearPrecio(item.precio, debeOcultarPrecio(item, ocultarGlobal))}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* BOTÓN PARA BÚSQUEDA COMPLETA EN EL CATÁLOGO */}
              <button
                onClick={() => handleFullSearch(query)}
                className="w-full p-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all shadow-md active:scale-98"
              >
                <span>Ver todos los resultados para "{query}" en el catálogo completo</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-600 font-bold text-base mb-1">No encontramos resultados para "{query}"</p>
              <p className="text-slate-400 text-xs mb-4">Probá buscando sin guiones (ej: scd74s), con espacios (ej: ea 201), marca o aplicación de motor.</p>
              
              <button
                onClick={() => handleFullSearch(query)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <span>Buscar en catálogo general</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
