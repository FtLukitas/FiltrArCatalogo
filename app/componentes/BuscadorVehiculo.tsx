'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Car,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  Package,
  Droplet,
  Wind,
  Fuel,
  Sparkles,
  Wrench,
  Boxes,
  MessageCircle,
  X,
  Check,
  ArrowRight,
  Filter,
  Settings2,
  Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro, ResultadoVehiculo } from '@/lib/types';
import { formatearPrecio, generarUrlWhatsapp, normalizarImagenes } from '@/lib/utils';
import { normalizarMarcaVehiculo } from '@/lib/normalization';
import TarjetaProducto from './TarjetaProducto';

/* ───────────────── CONSTANTES Y HELPERS ───────────────── */

export function normalizarModeloBase(modeloRaw: string): { baseModel: string; subVersion: string } {
  if (!modeloRaw || !modeloRaw.trim()) return { baseModel: 'GENERAL', subVersion: '' };

  let clean = modeloRaw.trim().replace(/\s+/g, ' ');

  // 1. Quitar marca del inicio si está repetida en el modelo
  const MARCAS_PREFIX = [
    'VOLKSWAGEN', 'VW', 'CHEVROLET', 'CHEVY', 'FORD', 'FIAT', 'PEUGEOT', 'RENAULT',
    'CITROEN', 'CITROËN', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'MERCEDES BENZ',
    'MERCEDES-BENZ', 'MERCEDES', 'MB', 'BMW', 'AUDI', 'JEEP', 'RAM', 'DODGE', 'MITSUBISHI'
  ];

  const upperStr = clean.toUpperCase();
  for (const m of MARCAS_PREFIX) {
    if (upperStr.startsWith(m + ' ')) {
      clean = clean.slice(m.length + 1).trim();
      break;
    }
  }

  // Quitar palabras preliminares
  clean = clean.replace(/^(NUEVO|NUEVA)\s+/i, '');
  const cleanUpper = clean.toUpperCase();

  // 2. Familias canónicas de modelos raíz
  const FAMILIAS: [RegExp, string][] = [
    [/^GOL\b/i, 'GOL'],
    [/^CORSA\b|^CLASSIC\b/i, 'CORSA'],
    [/^PALIO\b/i, 'PALIO'],
    [/^SIENA\b/i, 'SIENA'],
    [/^UNO\b/i, 'UNO'],
    [/^C3\b/i, 'C3'],
    [/^C4\b/i, 'C4'],
    [/^206\b/i, '206'],
    [/^207\b/i, '207'],
    [/^208\b/i, '208'],
    [/^307\b/i, '307'],
    [/^308\b/i, '308'],
    [/^408\b/i, '408'],
    [/^HILUX\b|^SW4\b/i, 'HILUX'],
    [/^AMAROK\b/i, 'AMAROK'],
    [/^RANGER\b/i, 'RANGER'],
    [/^FIESTA\b/i, 'FIESTA'],
    [/^FOCUS\b/i, 'FOCUS'],
    [/^KA\+?\b/i, 'KA'],
    [/^ECOSPORT\b/i, 'ECOSPORT'],
    [/^CLIO\b/i, 'CLIO'],
    [/^KANGOO\b/i, 'KANGOO'],
    [/^SANDERO\b|^STEPWAY\b/i, 'SANDERO'],
    [/^MEGANE\b|^MÉGANE\b/i, 'MEGANE'],
    [/^DUSTER\b/i, 'DUSTER'],
    [/^S10\b/i, 'S10'],
    [/^TRACKER\b/i, 'TRACKER'],
    [/^ONIX\b/i, 'ONIX'],
    [/^PRISMA\b/i, 'PRISMA'],
    [/^CRUZE\b/i, 'CRUZE'],
    [/^PARTNER\b/i, 'PARTNER'],
    [/^BERLINGO\b/i, 'BERLINGO'],
    [/^STRADA\b/i, 'STRADA'],
    [/^TORO\b/i, 'TORO'],
    [/^SAVEIRO\b/i, 'SAVEIRO'],
    [/^SURAN\b/i, 'SURAN'],
    [/^FOX\b|^CROSSFOX\b/i, 'FOX'],
    [/^VENTO\b/i, 'VENTO'],
    [/^BORA\b/i, 'BORA'],
    [/^COROLLA\b/i, 'COROLLA'],
    [/^ETIOS\b/i, 'ETIOS'],
    [/^YARIS\b/i, 'YARIS'],
    [/^FRONTIER\b/i, 'FRONTIER'],
    [/^ALASKAN\b/i, 'ALASKAN'],
    [/^FLUENCE\b/i, 'FLUENCE'],
    [/^LOGAN\b/i, 'LOGAN'],
    [/^KWID\b/i, 'KWID'],
    [/^SPIN\b/i, 'SPIN'],
    [/^AGILE\b/i, 'AGILE'],
    [/^CELTA\b/i, 'CELTA'],
    [/^MERIVA\b/i, 'MERIVA'],
    [/^ZAFIRA\b/i, 'ZAFIRA'],
    [/^ASTRA\b/i, 'ASTRA'],
    [/^VECTRA\b/i, 'VECTRA'],
    [/^FIORINO\b/i, 'FIORINO'],
    [/^CRONOS\b/i, 'CRONOS'],
    [/^MOBI\b/i, 'MOBI'],
    [/^ARGO\b/i, 'ARGO'],
    [/^PUNTO\b/i, 'PUNTO'],
    [/^STILO\b/i, 'STILO'],
    [/^IDEA\b/i, 'IDEA'],
    [/^DOBLO\b|^DOBLÒ\b/i, 'DOBLO'],
    [/^DUCATO\b/i, 'DUCATO'],
    [/^MASTER\b/i, 'MASTER'],
    [/^BOXER\b/i, 'BOXER'],
    [/^JUMPER\b/i, 'JUMPER'],
    [/^HR\b/i, 'HR'],
    [/^SPRINTER\b/i, 'SPRINTER'],
  ];

  for (const [regex, canonicalName] of FAMILIAS) {
    if (regex.test(cleanUpper)) {
      const rest = clean.replace(regex, '').trim();
      return {
        baseModel: canonicalName,
        subVersion: rest || clean,
      };
    }
  }

  const tokens = clean.split(' ');
  const baseToken = tokens[0].toUpperCase();
  const restTokens = tokens.slice(1).join(' ');

  return {
    baseModel: baseToken,
    subVersion: restTokens || clean,
  };
}

interface FiltroConProducto {
  codigoProduct: string;
  producto: Filtro | null;
  wegaCode?: string | null;
}

interface VersionAgrupada {
  version: string | null;
  año: string | null;
  filtros: FiltroConProducto[];
}

/* ───────────────── COMPONENTE PRINCIPAL ───────────────── */

export default function BuscadorVehiculo() {
  // ── Estado de selectores ────────────────────────────────
  const [marcas, setMarcas] = useState<string[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');
  const [modeloSeleccionado, setModeloSeleccionado] = useState('');

  // ── Búsqueda dentro de selectores ───────────────────────
  const [searchMarca, setSearchMarca] = useState('');
  const [searchModelo, setSearchModelo] = useState('');
  const [showMarcaDropdown, setShowMarcaDropdown] = useState(false);
  const [showModeloDropdown, setShowModeloDropdown] = useState(false);

  // ── Resultados ──────────────────────────────────────────
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingResultados, setLoadingResultados] = useState(false);
  const [versiones, setVersiones] = useState<VersionAgrupada[]>([]);
  const [versionExpandida, setVersionExpandida] = useState<string | null>(null);

  // Refs for click-outside handling
  const marcaRef = useRef<HTMLDivElement>(null);
  const modeloRef = useRef<HTMLDivElement>(null);

  // ── 1. Cargar TODAS las marcas con productos disponibles ─
  useEffect(() => {
    const fetchMarcas = async () => {
      setLoadingMarcas(true);
      try {
        const marcaMap = new Map<string, string>();
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('vehiculos_filtrar')
            .select('marca')
            .range(offset, offset + pageSize - 1);

          if (error || !data) break;

          data.forEach((row: any) => {
            const rawM = (row.marca || '').trim();
            if (rawM) {
              const normM = normalizarMarcaVehiculo(rawM);
              if (normM) {
                const lower = normM.toLowerCase();
                if (!marcaMap.has(lower)) {
                  marcaMap.set(lower, normM);
                }
              }
            }
          });

          hasMore = data.length === pageSize;
          offset += pageSize;
        }

        const sortedMarcas = Array.from(marcaMap.values()).sort((a, b) =>
          a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
        );
        setMarcas(sortedMarcas);
      } catch (err) {
        console.error('Error cargando marcas:', err);
      } finally {
        setLoadingMarcas(false);
      }
    };
    fetchMarcas();
  }, []);

  // ── 2. Cargar modelos base cuando se selecciona marca ───
  useEffect(() => {
    if (!marcaSeleccionada) {
      setModelos([]);
      return;
    }

    const fetchModelos = async () => {
      setLoadingModelos(true);
      setModeloSeleccionado('');
      setVersiones([]);
      try {
        const modeloSet = new Set<string>();
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('vehiculos_filtrar')
            .select('marca, modelo')
            .range(offset, offset + pageSize - 1);

          if (error || !data) break;

          data.forEach((row: any) => {
            const normM = normalizarMarcaVehiculo(row.marca);
            if (normM === marcaSeleccionada) {
              const raw = (row.modelo || '').trim();
              if (raw) {
                const { baseModel } = normalizarModeloBase(raw);
                if (baseModel) {
                  modeloSet.add(baseModel);
                }
              }
            }
          });

          hasMore = data.length === pageSize;
          offset += pageSize;
        }

        const sortedModelos = Array.from(modeloSet).sort((a, b) =>
          a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
        );
        setModelos(sortedModelos);
      } catch (err) {
        console.error('Error cargando modelos:', err);
      } finally {
        setLoadingModelos(false);
      }
    };
    fetchModelos();
  }, [marcaSeleccionada]);

  // ── 3. Cargar versiones del modelo base + productos ──────
  useEffect(() => {
    if (!marcaSeleccionada || !modeloSeleccionado) {
      setVersiones([]);
      return;
    }

    const fetchVersiones = async () => {
      setLoadingResultados(true);
      try {
        const allRows: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('vehiculos_filtrar')
            .select('*')
            .range(offset, offset + pageSize - 1);

          if (error || !data) break;

          data.forEach((row: any) => {
            const normM = normalizarMarcaVehiculo(row.marca);
            if (normM === marcaSeleccionada) {
              const { baseModel, subVersion } = normalizarModeloBase(row.modelo || '');
              if (
                baseModel === modeloSeleccionado ||
                (row.modelo && normalizarModeloBase(row.modelo).baseModel === modeloSeleccionado)
              ) {
                let vText = row.version || subVersion;
                if (!vText || vText === modeloSeleccionado) {
                  vText = row.modelo || 'Estándar';
                }
                allRows.push({ ...row, versionCalculada: vText });
              }
            }
          });

          hasMore = data.length === pageSize;
          offset += pageSize;
        }

        if (allRows.length === 0) {
          setVersiones([]);
          return;
        }

        // Group by (versionCalculada, año)
        const versionMap = new Map<string, { version: string | null; año: string | null; codigos: Set<string> }>();
        allRows.forEach((row: any) => {
          const vText = row.versionCalculada || 'Estándar';
          const key = `${vText}|||${row.año || ''}`;
          if (!versionMap.has(key)) {
            versionMap.set(key, { version: vText, año: row.año, codigos: new Set() });
          }
          if (row.filtro_asociado) {
            versionMap.get(key)!.codigos.add(row.filtro_asociado);
          }
        });

        // Extract all unique product codes for bulk lookup
        const allCodigos = new Set<string>();
        versionMap.forEach(v => v.codigos.forEach(c => allCodigos.add(c)));
        const codigosArray = Array.from(allCodigos);

        // Fetch product info from productos_filtrar
        const productoMap = new Map<string, Filtro>();
        if (codigosArray.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < codigosArray.length; i += batchSize) {
            const batch = codigosArray.slice(i, i + batchSize);
            const { data: prodData } = await supabase
              .from('productos_filtrar')
              .select('*')
              .in('codigo_filtrar', batch);
            if (prodData) {
              prodData.forEach((p: any) => productoMap.set(p.codigo_filtrar, p as Filtro));
            }
          }
        }

        // Also fetch WEGA codes mapped to these products for reference
        const wegaEquivMap = new Map<string, string>();
        if (codigosArray.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < codigosArray.length; i += batchSize) {
            const batch = codigosArray.slice(i, i + batchSize);
            const { data: eqData } = await supabase
              .from('equivalencias_cruza')
              .select('producto_codigo, codigo_competidor')
              .eq('marca_competidor', 'WEGA')
              .in('producto_codigo', batch);
            if (eqData) {
              eqData.forEach((eq: any) => {
                if (!wegaEquivMap.has(eq.producto_codigo)) {
                  wegaEquivMap.set(eq.producto_codigo, eq.codigo_competidor);
                }
              });
            }
          }
        }

        // Build final versiones structure
        const versionesOrdenadas: VersionAgrupada[] = Array.from(versionMap.entries())
          .map(([, v]) => ({
            version: v.version,
            año: v.año,
            filtros: Array.from(v.codigos).map(cod => ({
              codigoProduct: cod,
              producto: productoMap.get(cod) || null,
              wegaCode: wegaEquivMap.get(cod) || null,
            })),
          }))
          .sort((a, b) => {
            const va = a.version || '';
            const vb = b.version || '';
            return va.localeCompare(vb, 'es');
          });

        setVersiones(versionesOrdenadas);

        // Auto-expand first version if single version
        if (versionesOrdenadas.length === 1) {
          setVersionExpandida(`${versionesOrdenadas[0].version}|||${versionesOrdenadas[0].año}`);
        } else {
          setVersionExpandida(null);
        }

      } catch (err) {
        console.error('Error cargando versiones:', err);
      } finally {
        setLoadingResultados(false);
      }
    };
    fetchVersiones();
  }, [marcaSeleccionada, modeloSeleccionado]);

  // ── Click-outside handlers ──────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (marcaRef.current && !marcaRef.current.contains(e.target as Node)) {
        setShowMarcaDropdown(false);
      }
      if (modeloRef.current && !modeloRef.current.contains(e.target as Node)) {
        setShowModeloDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Dropdown filters ────────────────────────────────────
  const marcasFiltradas = useMemo(() => {
    if (!searchMarca.trim()) return marcas;
    const term = searchMarca.toLowerCase();
    return marcas.filter(m => m.toLowerCase().includes(term));
  }, [marcas, searchMarca]);

  const modelosFiltrados = useMemo(() => {
    if (!searchModelo.trim()) return modelos;
    const term = searchModelo.toLowerCase();
    return modelos.filter(m => m.toLowerCase().includes(term));
  }, [modelos, searchModelo]);

  // ── Handlers ────────────────────────────────────────────
  const seleccionarMarca = (marca: string) => {
    setMarcaSeleccionada(marca);
    setSearchMarca('');
    setShowMarcaDropdown(false);
    setModeloSeleccionado('');
    setSearchModelo('');
  };

  const seleccionarModelo = (modelo: string) => {
    setModeloSeleccionado(modelo);
    setSearchModelo('');
    setShowModeloDropdown(false);
  };

  const limpiarBusqueda = () => {
    setMarcaSeleccionada('');
    setModeloSeleccionado('');
    setSearchMarca('');
    setSearchModelo('');
    setVersiones([]);
    setVersionExpandida(null);
  };

  const toggleVersion = (key: string) => {
    setVersionExpandida(prev => prev === key ? null : key);
  };

  // ── Conteo total de productos ───────────────────────────
  const totalFiltros = versiones.reduce((sum, v) => sum + v.filtros.length, 0);

  return (
    <section id="vehiculo-section" className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-slate-200/80 mb-16 scroll-mt-24">

      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              BUSCADOR POR VEHÍCULO
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Elegí la marca y el modelo de tu vehículo para ver los filtros en stock compatibles.
            </p>
          </div>
        </div>

        {(marcaSeleccionada || modeloSeleccionado) && (
          <button
            onClick={limpiarBusqueda}
            className="self-start md:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Limpiar Vehículo</span>
          </button>
        )}
      </div>


      {/* ── SELECTORES EN CASCADA ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

        {/* SELECTOR DE MARCA */}
        <div ref={marcaRef} className="relative">
          <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2 border-l-2 border-blue-600 pl-2">
            1. MARCA DEL VEHÍCULO
          </label>
          <button
            onClick={() => {
              setShowMarcaDropdown(!showMarcaDropdown);
              setShowModeloDropdown(false);
            }}
            className={`w-full p-4 bg-slate-50 border rounded-2xl text-left flex items-center justify-between transition-all ${showMarcaDropdown
                ? 'border-blue-600 ring-2 ring-blue-100 bg-white'
                : 'border-slate-200 hover:border-slate-300'
              }`}
          >
            <span className={`text-sm font-bold ${marcaSeleccionada ? 'text-slate-900' : 'text-slate-400'}`}>
              {marcaSeleccionada || 'Elegí la marca...'}
            </span>
            <div className="flex items-center gap-2">
              {loadingMarcas && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showMarcaDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showMarcaDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-hidden">
              <div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchMarca}
                    onChange={(e) => setSearchMarca(e.target.value)}
                    placeholder="Buscar marca (ej: Toyota, Ford...)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    autoFocus
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-2">{marcasFiltradas.length} marcas con productos</div>
              </div>
              <div className="overflow-y-auto max-h-60">
                {marcasFiltradas.map(m => (
                  <button
                    key={m}
                    onClick={() => seleccionarMarca(m)}
                    className={`w-full p-3 text-left text-sm font-bold hover:bg-blue-50 flex items-center justify-between transition-colors ${marcaSeleccionada === m ? 'bg-blue-50 text-blue-700' : 'text-slate-800'
                      }`}
                  >
                    <span>{m}</span>
                    {marcaSeleccionada === m && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                {marcasFiltradas.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400 font-medium">
                    No se encontraron marcas con "{searchMarca}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SELECTOR DE MODELO */}
        <div ref={modeloRef} className="relative">
          <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-2 border-l-2 border-blue-600 pl-2">
            2. MODELO DEL VEHÍCULO
          </label>
          <button
            onClick={() => {
              if (!marcaSeleccionada) return;
              setShowModeloDropdown(!showModeloDropdown);
              setShowMarcaDropdown(false);
            }}
            disabled={!marcaSeleccionada}
            className={`w-full p-4 bg-slate-50 border rounded-2xl text-left flex items-center justify-between transition-all ${!marcaSeleccionada
                ? 'opacity-50 cursor-not-allowed border-slate-200'
                : showModeloDropdown
                  ? 'border-blue-600 ring-2 ring-blue-100 bg-white'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
          >
            <span className={`text-sm font-bold ${modeloSeleccionado ? 'text-slate-900' : 'text-slate-400'}`}>
              {modeloSeleccionado || (marcaSeleccionada ? 'Elegí el modelo...' : 'Primero elegí una marca')}
            </span>
            <div className="flex items-center gap-2">
              {loadingModelos && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showModeloDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showModeloDropdown && modelos.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-80 overflow-hidden">
              <div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchModelo}
                    onChange={(e) => setSearchModelo(e.target.value)}
                    placeholder="Buscar modelo (ej: Hilux, Ranger, Amarok...)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    autoFocus
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-2">{modelosFiltrados.length} modelos disponibles para {marcaSeleccionada}</div>
              </div>
              <div className="overflow-y-auto max-h-60">
                {modelosFiltrados.map(m => (
                  <button
                    key={m}
                    onClick={() => seleccionarModelo(m)}
                    className={`w-full p-3 text-left text-sm font-bold hover:bg-blue-50 flex items-center justify-between transition-colors ${modeloSeleccionado === m ? 'bg-blue-50 text-blue-700' : 'text-slate-800'
                      }`}
                  >
                    <span>{m}</span>
                    {modeloSeleccionado === m && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                {modelosFiltrados.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400 font-medium">
                    No se encontraron modelos con "{searchModelo}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RESULTADOS DE PRODUCTOS POR VERSIÓN ─────────────── */}
      {loadingResultados ? (
        <div className="p-16 bg-slate-50 rounded-2xl text-center flex flex-col items-center justify-center gap-3 border border-slate-200/80">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="font-bold text-sm text-slate-700">
            Cargando catálogo de repuestos para {marcaSeleccionada} {modeloSeleccionado}...
          </span>
        </div>
      ) : marcaSeleccionada && modeloSeleccionado && versiones.length > 0 ? (
        <div className="space-y-4">

          {/* BANNER RESUMEN */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {marcaSeleccionada} {modeloSeleccionado}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                {versiones.length} versión{versiones.length !== 1 ? 'es' : ''} disponible{versiones.length !== 1 ? 's' : ''} · <strong className="text-emerald-400">{totalFiltros} producto{totalFiltros !== 1 ? 's' : ''} disponible{totalFiltros !== 1 ? 's' : ''}</strong>
              </p>
            </div>

            <a
              href={generarUrlWhatsapp(`SERVICE-${marcaSeleccionada}-${modeloSeleccionado}`, `Consulta de Service Completo para ${marcaSeleccionada} ${modeloSeleccionado}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Pedir Presupuesto</span>
            </a>
          </div>

          {/* LISTA DE VERSIONES (ACCORDION) */}
          <div className="space-y-3">
            {versiones.map((v) => {
              const vKey = `${v.version}|||${v.año}`;
              const isExpanded = versionExpandida === vKey;
              const versionLabel = v.version || 'Versión Estándar';
              const añoLabel = v.año ? ` (${v.año})` : '';

              return (
                <div
                  key={vKey}
                  className={`border rounded-2xl overflow-hidden transition-all ${isExpanded
                      ? 'border-blue-300 shadow-lg shadow-blue-100/50 bg-white'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                >
                  {/* VERSION HEADER */}
                  <button
                    onClick={() => toggleVersion(vKey)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                        <Settings2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm md:text-base text-slate-900 truncate">
                          {versionLabel} <span className="text-slate-500 font-bold">{añoLabel}</span>
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {v.filtros.length} producto{v.filtros.length !== 1 ? 's' : ''} disponible{v.filtros.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* VERSION CONTENT: GRID DE TARJETAS DE PRODUCTOS */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 md:p-6 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {v.filtros.map((item) => {
                          const prod = item.producto;
                          const codigo = item.codigoProduct;

                          if (!prod) {
                            return (
                              <div key={codigo} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                <div>
                                  <span className="bg-slate-900 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                                    {codigo}
                                  </span>
                                </div>
                                <a
                                  href={generarUrlWhatsapp(codigo, `Consulta sobre filtro ${codigo} para ${marcaSeleccionada} ${modeloSeleccionado}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Consultar disponibilidad</span>
                                </a>
                              </div>
                            );
                          }

                          return (
                            <div key={prod.id || codigo} className="h-full">
                              <TarjetaProducto filtro={prod} />
                              {item.wegaCode && (
                                <div className="mt-1 px-3 text-[10px] font-mono text-slate-400 text-right">
                                  Equiv. Wega: {item.wegaCode}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : marcaSeleccionada && modeloSeleccionado && versiones.length === 0 && !loadingResultados ? (
        <div className="p-12 bg-slate-50 rounded-2xl text-center border border-slate-200/80">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
            Sin productos directos en stock para este modelo
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Consultá por WhatsApp a nuestros asesores técnicos para enviarte el filtro equivalente exacto.
          </p>
        </div>
      ) : null}

    </section>
  );
}
