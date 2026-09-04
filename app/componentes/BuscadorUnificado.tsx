'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Loader2,
  Car,
  Layers,
  ArrowRight,
  Package,
  ArrowLeftRight,
  MessageCircle,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
  Wrench,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { normalizarImagenes, formatearPrecio, generarUrlWhatsapp } from '@/lib/utils';
import { normalizarMarcaVehiculo } from '@/lib/normalization';
import { normalizarModeloBase } from './BuscadorVehiculo';
import { getOcultarPreciosGlobal, debeOcultarPrecio } from '@/lib/preciosConfig';

/* ── TIPOS PARA RESULTADOS UNIFICADOS ── */

export interface VehiculoCoincidencia {
  marca: string;
  modeloBase: string;
  modeloRaw: string;
  version: string | null;
  año: string | null;
  filtro_asociado: string;
}

export interface VehiculoGrupo {
  key: string;
  marca: string;
  modelo: string;
  versiones: {
    version: string;
    año: string | null;
    filtros: {
      codigo: string;
      producto: Filtro | null;
    }[];
  }[];
}

export interface EquivalenciaCoincidencia {
  id: number;
  producto_codigo: string;
  marca_competidor: string;
  codigo_competidor: string;
  producto?: Filtro | null;
}

export type TabContexto = 'vehiculos' | 'equivalencias' | 'productos';

interface BuscadorUnificadoProps {
  onSelectProduct?: (codigo: string) => void;
  initialValue?: string;
}

/* ── HELPER ESTILOS DE BADGES COMPETIDORES ── */
function getCompetitorBadgeStyle(marcaRaw: string) {
  const m = (marcaRaw || '').toUpperCase();
  if (m === 'WEGA') return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  if (m === 'MANN' || m === 'MANN-FILTER') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (m === 'FRAM') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  if (m === 'OEM' || m === 'ORIGINAL') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  if (m === 'MARENO') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  if (m === 'TECNECO' || m === 'MASTERFILT' || m === 'MAHLE') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-700';
}

function getCategoriaBadge(cat: string | null) {
  const c = (cat || '').toLowerCase();
  if (c.includes('aceite')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (c.includes('aire')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  if (c.includes('combustible')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (c.includes('habitáculo') || c.includes('habitaculo')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (c.includes('inyección') || c.includes('inyeccion')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (c.includes('kit')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

export default function BuscadorUnificado({ onSelectProduct, initialValue = '' }: BuscadorUnificadoProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<TabContexto>('vehiculos');
  const [ocultarGlobal, setOcultarGlobal] = useState(false);

  // Estados de resultados por contexto
  const [vehiculoGrupos, setVehiculoGrupos] = useState<VehiculoGrupo[]>([]);
  const [equivalencias, setEquivalencias] = useState<EquivalenciaCoincidencia[]>([]);
  const [productos, setProductos] = useState<Filtro[]>([]);

  // Estado de drilldown de vehículo expandido
  const [expandedVehiculoKey, setExpandedVehiculoKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOcultarPreciosGlobal().then(setOcultarGlobal);
  }, []);

  // Debounce de 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // BÚSQUEDA MULTI-CONTEXTO PARALELA (3 FUENTES SIMULTÁNEAS)
  useEffect(() => {
    const runUnifiedSearch = async () => {
      const cleanInput = debouncedQuery.trim();
      if (cleanInput.length < 2) {
        setVehiculoGrupos([]);
        setEquivalencias([]);
        setProductos([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const lowerInput = cleanInput.toLowerCase();
        const compact = lowerInput.replace(/[-_ ]/g, '');
        const tokens = cleanInput.split(/[-_ ]+/).filter((t) => t.length > 0);

        // ── 1. PROMISE: BUSCAR EN VEHÍCULOS ──
        const vehiculosPromise = (async () => {
          let q = supabase.from('vehiculos_filtrar').select('*');
          if (tokens.length > 1) {
            // Cada token debe cumplirse en al menos uno de los campos (AND entre tokens)
            tokens.forEach((t) => {
              q = q.or(
                `marca.ilike.%${t}%,modelo.ilike.%${t}%,version.ilike.%${t}%,año.ilike.%${t}%`
              );
            });
          } else {
            q = q.or(
              `marca.ilike.%${cleanInput}%,modelo.ilike.%${cleanInput}%,version.ilike.%${cleanInput}%,año.ilike.%${cleanInput}%`
            );
          }
          const { data, error } = await q.limit(40);
          if (error || !data) return [];
          return data;
        })();

        // ── 2. PROMISE: BUSCAR EN EQUIVALENCIAS ──
        const equivalenciasPromise = (async () => {
          let q = supabase.from('equivalencias_cruza').select('*');
          q = q.or(
            `codigo_competidor.ilike.%${cleanInput}%,codigo_competidor_normalizado.ilike.%${compact}%,marca_competidor.ilike.%${cleanInput}%`
          );
          const { data, error } = await q.limit(20);
          if (error || !data) return [];
          return data;
        })();

        // ── 3. PROMISE: BUSCAR EN PRODUCTOS FILTRAR ──
        const productosPromise = (async () => {
          let q = supabase.from('productos_filtrar').select('*').neq('activo', false);
          if (tokens.length > 1) {
            tokens.forEach((tok) => {
              const tokClean = tok.toLowerCase().replace(/[-_]/g, '');
              q = q.or(
                `codigo_filtrar.ilike.%${tokClean}%,titulo_producto.ilike.%${tokClean}%,descripcion_aplicacion.ilike.%${tokClean}%,buscador_unificado.ilike.%${tokClean}%`
              );
            });
          } else {
            q = q.or(
              `codigo_filtrar.ilike.%${cleanInput}%,codigo_normalizado.ilike.%${compact}%,titulo_producto.ilike.%${cleanInput}%,descripcion_aplicacion.ilike.%${cleanInput}%`
            );
          }
          const { data, error } = await q.limit(12);
          if (error || !data) return [];
          return data as Filtro[];
        })();

        // Ejecutar las 3 en paralelo
        const [rawVehiculos, rawEquivs, rawProds] = await Promise.all([
          vehiculosPromise,
          equivalenciasPromise,
          productosPromise,
        ]);

        // RECOLECTAR CÓDIGOS DE PRODUCTOS ASOCIADOS PARA COMPLETAR DATOS EN VEHÍCULOS Y EQUIVALENCIAS
        const productCodesToFetch = new Set<string>();
        rawVehiculos.forEach((v: any) => {
          if (v.filtro_asociado) productCodesToFetch.add(v.filtro_asociado);
        });
        rawEquivs.forEach((eq: any) => {
          if (eq.producto_codigo) productCodesToFetch.add(eq.producto_codigo);
        });

        // Fetch de productos para los códigos asociados si no vinieron en rawProds
        const productMap = new Map<string, Filtro>();
        rawProds.forEach((p) => productMap.set(p.codigo_filtrar, p));

        const missingCodes = Array.from(productCodesToFetch).filter((c) => !productMap.has(c));
        if (missingCodes.length > 0) {
          const { data: missingData } = await supabase
            .from('productos_filtrar')
            .select('*')
            .in('codigo_filtrar', missingCodes.slice(0, 50));
          if (missingData) {
            missingData.forEach((p: any) => productMap.set(p.codigo_filtrar, p as Filtro));
          }
        }

        // ── A. AGRUPAR VEHÍCULOS POR MARCA + MODELO Y SUS VERSIONES ──
        const groupMap = new Map<string, VehiculoGrupo>();
        rawVehiculos.forEach((row: any) => {
          const marcaNorm = normalizarMarcaVehiculo(row.marca) || row.marca || 'GENÉRICO';
          const { baseModel, subVersion } = normalizarModeloBase(row.modelo || '');
          const modeloFinal = baseModel || row.modelo || 'ESTÁNDAR';
          const groupKey = `${marcaNorm} - ${modeloFinal}`.toUpperCase();

          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              key: groupKey,
              marca: marcaNorm,
              modelo: modeloFinal,
              versiones: [],
            });
          }

          const grupo = groupMap.get(groupKey)!;
          const versionText = row.version || subVersion || row.modelo || 'Versión Estándar';
          const versionAño = row.año || null;

          let vObj = grupo.versiones.find(
            (v) => v.version === versionText && v.año === versionAño
          );
          if (!vObj) {
            vObj = {
              version: versionText,
              año: versionAño,
              filtros: [],
            };
            grupo.versiones.push(vObj);
          }

          if (row.filtro_asociado) {
            const alreadyAdded = vObj.filtros.some((f) => f.codigo === row.filtro_asociado);
            if (!alreadyAdded) {
              vObj.filtros.push({
                codigo: row.filtro_asociado,
                producto: productMap.get(row.filtro_asociado) || null,
              });
            }
          }
        });

        const listaVehiculos = Array.from(groupMap.values());
        setVehiculoGrupos(listaVehiculos);

        // Si hay solo 1 grupo de vehículo, auto-expandirlo
        if (listaVehiculos.length === 1) {
          setExpandedVehiculoKey(listaVehiculos[0].key);
        } else {
          setExpandedVehiculoKey(null);
        }

        // ── B. ENRIQUECER EQUIVALENCIAS CON DATOS DEL PRODUCTO FILTRAR ──
        const listaEquivs: EquivalenciaCoincidencia[] = rawEquivs.map((eq: any) => ({
          id: eq.id,
          producto_codigo: eq.producto_codigo,
          marca_competidor: eq.marca_competidor,
          codigo_competidor: eq.codigo_competidor,
          producto: productMap.get(eq.producto_codigo) || null,
        }));
        setEquivalencias(listaEquivs);

        // ── C. PRODUCTOS FILTRAR DIRECTOS ──
        setProductos(rawProds);

        // AUTO-DETECCIÓN INTELIGENTE DE PESTAÑA:
        // Detectar si parece código de filtro técnico (ej: "WO-180", "W712", "C 29 198", "PH10904", "SC-D74S", etc.)
        // Evitar falsos positivos en marcas/modelos que empiezan con C o W (Corsa, Corolla, Clio, Cronos, Cruze, Civic, Wrangler, etc.)
        const looksLikeCode = /^(wo[- ]?\d{2,}|ph[- ]?\d{3,}|w[- ]?\d{3,}|c[- ]\d{2,}|c\d{4,}|cuk[- ]?\d|cu[- ]?\d{3,}|cf[- ]?\d{2,}|wk[- ]?\d{2,}|akx[- ]?\d|fcd[- ]?\d|sc[- ]?\d|ea[- ]?\d|af[- ]?\d|of[- ]?\d|ff[- ]?\d|mif[- ]?\d|efpa[- ]?\d|ul[- ]?\d|ox[- ]?\d|lx[- ]?\d|hu[- ]?\d|\d{3,}[a-z]|\d+[-/]\d+)/i.test(cleanInput);

        if (looksLikeCode) {
          if (listaEquivs.length > 0) {
            setActiveTab('equivalencias');
          } else if (rawProds.length > 0) {
            setActiveTab('productos');
          } else if (listaVehiculos.length > 0) {
            setActiveTab('vehiculos');
          }
        } else {
          if (listaVehiculos.length > 0) {
            setActiveTab('vehiculos');
          } else if (listaEquivs.length > 0) {
            setActiveTab('equivalencias');
          } else if (rawProds.length > 0) {
            setActiveTab('productos');
          } else {
            setActiveTab('vehiculos');
          }
        }
      } catch (err) {
        console.error('Error en BuscadorUnificado:', err);
      } finally {
        setLoading(false);
      }
    };

    runUnifiedSearch();
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

  const totalVehiculosCount = vehiculoGrupos.reduce(
    (sum, g) => sum + g.versiones.length,
    0
  );

  const tagsPopulares = ['Fiat 147', 'Hilux', 'Amarok', 'WO-180', 'W712', 'SC-D74S', 'AF-010T'];

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto z-[999]">
      {/* ── INPUT PRINCIPAL ── */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
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
          placeholder="Buscá por modelo (ej: 147, Hilux), equivalencia (ej: WO-180) o código..."
          className="w-full pl-11 sm:pl-13 pr-10 py-4 sm:py-4.5 bg-white text-slate-900 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-sm sm:text-base font-bold shadow-2xl transition-all placeholder:text-slate-400 placeholder:font-normal"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setVehiculoGrupos([]);
              setEquivalencias([]);
              setProductos([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs font-black transition-colors"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── PANEL DE DESAMBIGUACIÓN INTELIGENTE ── */}
        {focused && query.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2.5 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden z-[9999] animate-fade-in max-h-[580px] flex flex-col">
            {/* CABECERA CON PESTAÑAS DE CONTEXTO */}
            <div className="bg-slate-900/90 backdrop-blur-md p-3 sm:p-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ¿Dónde querés buscar "{query}"?
                </span>
              </div>

              {/* SELECTOR DE CONTEXTO (PESTAÑAS) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold self-stretch sm:self-auto overflow-x-auto">
                {/* PESTAÑA VEHÍCULOS */}
                <button
                  type="button"
                  onClick={() => setActiveTab('vehiculos')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    activeTab === 'vehiculos'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>En Vehículos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === 'vehiculos'
                        ? 'bg-blue-700 text-white'
                        : totalVehiculosCount > 0
                        ? 'bg-slate-800 text-sky-400'
                        : 'bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {totalVehiculosCount}
                  </span>
                </button>

                {/* PESTAÑA EQUIVALENCIAS */}
                <button
                  type="button"
                  onClick={() => setActiveTab('equivalencias')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    activeTab === 'equivalencias'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>En Equivalencias</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === 'equivalencias'
                        ? 'bg-blue-700 text-white'
                        : equivalencias.length > 0
                        ? 'bg-slate-800 text-sky-400'
                        : 'bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {equivalencias.length}
                  </span>
                </button>

                {/* PESTAÑA PRODUCTOS */}
                <button
                  type="button"
                  onClick={() => setActiveTab('productos')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    activeTab === 'productos'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>En Productos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === 'productos'
                        ? 'bg-blue-700 text-white'
                        : productos.length > 0
                        ? 'bg-slate-800 text-sky-400'
                        : 'bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {productos.length}
                  </span>
                </button>
              </div>
            </div>

            {/* CONTENIDO DEL PANEL CON SCROLL */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {loading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs font-bold">Consultando vehículos, equivalencias y catálogo...</span>
                </div>
              ) : (
                <>
                  {/* ────────────────── CONTENIDO: VEHÍCULOS / APLICACIONES ────────────────── */}
                  {activeTab === 'vehiculos' && (
                    <div>
                      {vehiculoGrupos.length > 0 ? (
                        <div className="space-y-3">
                          {/* BANNER ACCESO RÁPIDO AL ASISTENTE GUIADO */}
                          <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/25 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                                <Car className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-slate-300 text-[11px] sm:text-xs truncate">
                                ¿Buscás por <strong className="text-white">Marca y Modelo</strong> paso a paso?
                              </span>
                            </div>
                            <a
                              href="#buscador-guiado"
                              onClick={() => setFocused(false)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <span>Asistente Guiado</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                            <span className="font-bold text-slate-300">
                              Seleccioná el modelo para ver el service completo:
                            </span>
                            <span className="text-[11px] font-mono">
                              {vehiculoGrupos.length} {vehiculoGrupos.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
                            </span>
                          </div>

                          {vehiculoGrupos.map((grupo) => {
                            const isExpanded = expandedVehiculoKey === grupo.key;
                            const totalFiltrosGrupo = grupo.versiones.reduce(
                              (acc, v) => acc + v.filtros.length,
                              0
                            );

                            return (
                              <div
                                key={grupo.key}
                                className={`rounded-xl border transition-all ${
                                  isExpanded
                                    ? 'bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-950/50'
                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                }`}
                              >
                                {/* HEADER DEL VEHÍCULO */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedVehiculoKey(isExpanded ? null : grupo.key)
                                  }
                                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                        isExpanded
                                          ? 'bg-blue-600 text-white border-blue-500'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      }`}
                                    >
                                      <Car className="w-4 h-4" />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-white tracking-tight">
                                          {grupo.marca} {grupo.modelo}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        {grupo.versiones.length}{' '}
                                        {grupo.versiones.length === 1 ? 'versión' : 'versiones'} ·{' '}
                                        <span className="text-emerald-400 font-semibold">
                                          {totalFiltrosGrupo}{' '}
                                          {totalFiltrosGrupo === 1 ? 'filtro compatible' : 'filtros compatibles'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold text-blue-400 hidden sm:inline">
                                      {isExpanded ? 'Ocultar filtros' : 'Ver qué filtros lleva'}
                                    </span>
                                    <ChevronDown
                                      className={`w-4 h-4 text-slate-400 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </div>
                                </button>

                                {/* DESGLOSE DE VERSIONES Y SUS FILTROS */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800/80 p-4 bg-slate-950/70 rounded-b-xl space-y-4">
                                    {grupo.versiones.map((ver, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                                          <div>
                                            <span className="font-extrabold text-xs text-white">
                                              Motor / Versión: {ver.version}
                                            </span>
                                            {ver.año && (
                                              <span className="ml-2 text-[11px] text-slate-400 font-mono">
                                                ({ver.año})
                                              </span>
                                            )}
                                          </div>

                                          <a
                                            href={generarUrlWhatsapp(
                                              `SERVICE-${grupo.marca}-${grupo.modelo}`,
                                              `Consulta de filtros para ${grupo.marca} ${grupo.modelo} ${ver.version} (${ver.año || ''})`
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md transition-all self-start sm:self-auto"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>Consultar por WhatsApp</span>
                                          </a>
                                        </div>

                                        {/* GRILLA DE FILTROS ASOCIADOS */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          {ver.filtros.map((item) => {
                                            const prod = item.producto;
                                            const codigo = item.codigo;
                                            const catBadge = getCategoriaBadge(prod?.categoria || null);
                                            const imgs = prod ? normalizarImagenes(prod.imagen_url) : [];
                                            const thumb = imgs.length > 0 ? imgs[0] : null;

                                            return (
                                              <Link
                                                key={codigo}
                                                href={`/producto/${encodeURIComponent(codigo)}`}
                                                onClick={() => {
                                                  setFocused(false);
                                                  if (onSelectProduct) onSelectProduct(codigo);
                                                }}
                                                className="p-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-lg flex items-center justify-between gap-2.5 transition-all group"
                                              >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-md p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                                    {thumb ? (
                                                      <img
                                                        src={thumb}
                                                        alt={codigo}
                                                        className="w-full h-full object-contain"
                                                      />
                                                    ) : (
                                                      <Package className="w-4 h-4 text-slate-600" />
                                                    )}
                                                  </div>

                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-mono font-black text-xs text-white group-hover:text-blue-400 transition-colors">
                                                        {codigo}
                                                      </span>
                                                      {prod?.categoria && (
                                                        <span
                                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${catBadge}`}
                                                        >
                                                          {prod.categoria}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                      {prod?.titulo_producto || prod?.descripcion_aplicacion || 'Filtro homologado'}
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 text-slate-500 group-hover:text-blue-400">
                                                  <span className="text-[10px] font-bold hidden sm:inline">
                                                    Ficha
                                                  </span>
                                                  <ArrowRight className="w-3.5 h-3.5" />
                                                </div>
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 space-y-3">
                          <Car className="w-8 h-8 text-slate-600 mx-auto" />
                          <div className="text-xs font-bold text-slate-300">
                            No se encontraron modelos de vehículos directos con "{query}".
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Probá buscar por marca y modelo en nuestro asistente paso a paso, o revisá las pestañas de <strong>Equivalencias</strong> o <strong>Productos</strong>.
                          </p>
                          <div className="pt-1">
                            <a
                              href="#buscador-guiado"
                              onClick={() => setFocused(false)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
                            >
                              <Car className="w-3.5 h-3.5" />
                              <span>Ir al Asistente Guiado por Vehículo</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────── CONTENIDO: EQUIVALENCIAS ────────────────── */}
                  {activeTab === 'equivalencias' && (
                    <div>
                      {equivalencias.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                            <span className="font-bold text-slate-300">
                              Cruces encontrados con marcas de la competencia:
                            </span>
                            <span className="text-[11px] font-mono">
                              {equivalencias.length} {equivalencias.length === 1 ? 'cruce' : 'cruces'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {equivalencias.map((eq) => {
                              const prod = eq.producto;
                              const badgeStyle = getCompetitorBadgeStyle(eq.marca_competidor);
                              const imgs = prod ? normalizarImagenes(prod.imagen_url) : [];
                              const thumb = imgs.length > 0 ? imgs[0] : null;
                              const catBadge = getCategoriaBadge(prod?.categoria || null);

                              return (
                                <Link
                                  key={eq.id}
                                  href={`/producto/${encodeURIComponent(eq.producto_codigo)}`}
                                  onClick={() => {
                                    setFocused(false);
                                    if (onSelectProduct) onSelectProduct(eq.producto_codigo);
                                  }}
                                  className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 rounded-xl flex flex-col justify-between gap-3 transition-all group shadow-sm hover:shadow-md"
                                >
                                  {/* FILA SUPERIOR: BADGE COMPETIDOR -> FLECHA -> CÓDIGO FILTRAR */}
                                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {/* BADGE COMPETIDOR */}
                                      <div
                                        className={`px-2.5 py-1 rounded-lg border text-left shrink-0 ${badgeStyle}`}
                                      >
                                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                                          {eq.marca_competidor}
                                        </div>
                                        <div className="font-mono font-black text-xs">
                                          {eq.codigo_competidor}
                                        </div>
                                      </div>

                                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />

                                      {/* PRODUCTO FILTRAR DESTINO */}
                                      <div className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 shrink-0">
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
                                          FILTRAR
                                        </div>
                                        <div className="font-mono font-black text-xs text-white">
                                          {eq.producto_codigo}
                                        </div>
                                      </div>
                                    </div>

                                    {prod?.categoria && (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${catBadge}`}
                                      >
                                        {prod.categoria}
                                      </span>
                                    )}
                                  </div>

                                  {/* FILA INFERIOR: IMAGEN + DETALLES + BOTÓN */}
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* MINIATURA DEL PRODUCTO */}
                                      <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-slate-700 transition-colors">
                                        {thumb ? (
                                          <img
                                            src={thumb}
                                            alt={eq.producto_codigo}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <Package className="w-5 h-5 text-slate-700" />
                                        )}
                                      </div>

                                      {/* TÍTULO Y APLICACIÓN */}
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                                          {prod?.titulo_producto || prod?.descripcion_aplicacion || `Filtro ${eq.producto_codigo}`}
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                          {prod?.descripcion_aplicacion || 'Equivalencia verificada'}
                                        </div>
                                      </div>
                                    </div>

                                    {/* BOTÓN O PRECIO */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {prod?.precio && !debeOcultarPrecio(prod, ocultarGlobal) ? (
                                        <span className="text-xs font-black text-emerald-400 font-mono">
                                          {formatearPrecio(prod.precio, false)}
                                        </span>
                                      ) : null}
                                      <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <ArrowLeftRight className="w-8 h-8 text-slate-600 mx-auto" />
                          <div className="text-xs font-bold text-slate-300">
                            No se encontraron cruces de equivalencia para "{query}".
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Podés buscar directamente por marca de vehículo o por código de producto.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────── CONTENIDO: PRODUCTOS FILTRAR ────────────────── */}
                  {activeTab === 'productos' && (
                    <div>
                      {productos.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                            <span className="font-bold text-slate-300">
                              Productos oficiales FiltrAr en catálogo:
                            </span>
                            <span className="text-[11px] font-mono">
                              {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {productos.map((item) => {
                              const codigo = item.codigo_filtrar;
                              const imgs = normalizarImagenes(item.imagen_url);
                              const thumb = imgs.length > 0 ? imgs[0] : null;
                              const catBadge = getCategoriaBadge(item.categoria);

                              return (
                                <Link
                                  key={item.id}
                                  href={`/producto/${encodeURIComponent(codigo)}`}
                                  onClick={() => {
                                    setFocused(false);
                                    if (onSelectProduct) onSelectProduct(codigo);
                                  }}
                                  className="p-3 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl flex items-center justify-between gap-3 transition-all group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                      {thumb ? (
                                        <img
                                          src={thumb}
                                          alt={codigo}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Package className="w-5 h-5 text-slate-600" />
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="bg-slate-800 text-white font-mono font-extrabold text-xs px-1.5 py-0.5 rounded border border-slate-700">
                                          {codigo}
                                        </span>
                                        {item.categoria && (
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${catBadge}`}
                                          >
                                            {item.categoria}
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-bold text-xs text-slate-200 group-hover:text-blue-400 transition-colors truncate mt-1">
                                        {item.titulo_producto || item.descripcion_aplicacion || `Filtro ${codigo}`}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-black text-slate-300">
                                      {formatearPrecio(
                                        item.precio,
                                        debeOcultarPrecio(item, ocultarGlobal)
                                      )}
                                    </span>
                                    <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <Package className="w-8 h-8 text-slate-600 mx-auto" />
                          <div className="text-xs font-bold text-slate-300">
                            No encontramos productos directos con el código "{query}".
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Probá buscar por modelo en la pestaña de <strong>Vehículos</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BOTÓN INFERIOR: VER EN CATÁLOGO COMPLETO */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Presioná <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">ENTER</kbd> para explorar todos los resultados
              </span>
              <button
                type="button"
                onClick={() => handleFullSearch(query)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <span>Ver todos los resultados en el catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAGS POPULARES ABAJO DEL INPUT */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1 text-slate-300 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Búsquedas rápidas:
        </span>
        {tagsPopulares.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              setFocused(true);
            }}
            className="bg-slate-900/90 hover:bg-blue-600 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white px-3 py-1 rounded-full transition-all text-[11px] shadow-sm active:scale-95"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
