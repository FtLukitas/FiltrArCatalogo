'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Car,
  Truck,
  Droplet,
  Wind,
  Fuel,
  Sparkles,
  Syringe,
  Boxes,
  Layers,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  Package,
  MessageCircle,
  ArrowRight,
  Info,
  SlidersHorizontal,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import TarjetaProducto from './TarjetaProducto';
import { TIPOS_VEHICULO, type TipoVehiculo } from '@/lib/constants';
import { normalizarModeloBase } from '@/lib/normalization';
import { generarUrlWhatsapp } from '@/lib/utils';

export interface VersionAgrupadaConProductos {
  id: string;
  label: string;
  version: string;
  año: string | null;
  codigos: string[];
  productos: Filtro[];
}

/* ── CONFIGURACIÓN DE CATEGORÍAS ── */
interface CategoriaConfig {
  id: string;
  nombre: string;
  subtitulo: string;
  icon: any;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  dbValues: string[];
}

const CATEGORIAS_WIZARD: CategoriaConfig[] = [
  {
    id: 'TODOS',
    nombre: 'Todos los Filtros',
    subtitulo: 'Ver todo el catálogo para este tipo',
    icon: Layers,
    color: 'slate',
    activeBg: 'bg-blue-600',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    dbValues: [],
  },
  {
    id: 'AIRE',
    nombre: 'Filtros de Aire',
    subtitulo: 'Paneles, cónicos y línea pesada',
    icon: Wind,
    color: 'sky',
    activeBg: 'bg-sky-500/20',
    activeBorder: 'border-sky-400',
    activeText: 'text-sky-300',
    dbValues: ['Filtros de Aire', 'Filtros de Aire (Línea Pesada)', 'Filtros de Aire (Paneles)', 'Filtros de Aire (Redondos)'],
  },
  {
    id: 'ACEITE',
    nombre: 'Filtros de Aceite',
    subtitulo: 'Blindados y ecológicos',
    icon: Droplet,
    color: 'amber',
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-400',
    activeText: 'text-amber-300',
    dbValues: ['Filtros de Aceite'],
  },
  {
    id: 'COMBUSTIBLE',
    nombre: 'Filtros de Combustible',
    subtitulo: 'Nafta, Diesel y Common Rail',
    icon: Fuel,
    color: 'emerald',
    activeBg: 'bg-emerald-500/20',
    activeBorder: 'border-emerald-400',
    activeText: 'text-emerald-300',
    dbValues: ['Filtros de Combustible'],
  },
  {
    id: 'HABITACULO',
    nombre: 'Filtros de Habitáculo',
    subtitulo: 'Cabina y aire acondicionado',
    icon: Sparkles,
    color: 'purple',
    activeBg: 'bg-purple-500/20',
    activeBorder: 'border-purple-400',
    activeText: 'text-purple-300',
    dbValues: ['Filtros de Habitáculo'],
  },
  {
    id: 'INYECCION',
    nombre: 'Filtros de Inyección',
    subtitulo: 'Sistemas electrónicos de inyección',
    icon: Syringe,
    color: 'cyan',
    activeBg: 'bg-cyan-500/20',
    activeBorder: 'border-cyan-400',
    activeText: 'text-cyan-300',
    dbValues: ['Filtros de Inyección'],
  },
  {
    id: 'KITS',
    nombre: 'Kits de Filtros',
    subtitulo: 'Combos para service completo',
    icon: Boxes,
    color: 'indigo',
    activeBg: 'bg-indigo-500/20',
    activeBorder: 'border-indigo-400',
    activeText: 'text-indigo-300',
    dbValues: ['Kits de Filtros'],
  },
];

export default function BuscadorGuiado() {
  // ── Estados de selección del Wizard ──
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);

  // ── Refinamientos opcionales de Marca y Modelo ──
  const [marcasDisponibles, setMarcasDisponibles] = useState<string[]>([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string>('');
  const [modelosDisponibles, setModelosDisponibles] = useState<string[]>([]);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<string>('');

  // ── Versiones agrupadas con sus productos (Opción 2: acordeones en resultados) ──
  const [versionesConProductos, setVersionesConProductos] = useState<VersionAgrupadaConProductos[]>([]);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

  // ── Filtros dentro de la UI ──
  const [busquedaMarca, setBusquedaMarca] = useState('');
  const [busquedaModelo, setBusquedaModelo] = useState('');

  // ── Búsqueda en tiempo real dentro de los resultados seleccionados ──
  const [filtroTextoResultados, setFiltroTextoResultados] = useState('');

  // ── Productos y resultados ──
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 24;
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Dropdowns de refinamiento por vehículo (Solo Marca y Modelo) ──
  const [showMarcaDropdown, setShowMarcaDropdown] = useState(false);
  const [showModeloDropdown, setShowModeloDropdown] = useState(false);
  const marcaDropdownRef = useRef<HTMLDivElement>(null);
  const modeloDropdownRef = useRef<HTMLDivElement>(null);

  // Funciones para manipular acordeones de versión
  const toggleVersion = (id: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllVersions = () => {
    const all: Record<string, boolean> = {};
    versionesConProductos.forEach((v) => {
      all[v.id] = true;
    });
    setExpandedVersions(all);
  };

  const collapseAllVersions = () => {
    setExpandedVersions({});
  };

  // Cerrar dropdowns de marca y modelo al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        marcaDropdownRef.current &&
        !marcaDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMarcaDropdown(false);
      }
      if (
        modeloDropdownRef.current &&
        !modeloDropdownRef.current.contains(event.target as Node)
      ) {
        setShowModeloDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const seleccionarMarca = (m: string) => {
    if (marcaSeleccionada === m) {
      setMarcaSeleccionada('');
      setModeloSeleccionado('');
      setVersionesConProductos([]);
      setShowMarcaDropdown(false);
    } else {
      setMarcaSeleccionada(m);
      setModeloSeleccionado('');
      setVersionesConProductos([]);
      setShowMarcaDropdown(false);
      setShowModeloDropdown(true);
    }
    setBusquedaMarca('');
  };

  const seleccionarModelo = (mod: string) => {
    if (modeloSeleccionado === mod) {
      setModeloSeleccionado('');
      setVersionesConProductos([]);
      setShowModeloDropdown(false);
    } else {
      setModeloSeleccionado(mod);
      setShowModeloDropdown(false);
    }
    setBusquedaModelo('');
  };

  // ── PASO 1: SELECCIONAR TIPO DE VEHÍCULO ──
  const handleSelectTipo = (tipo: TipoVehiculo) => {
    setTipoVehiculo(tipo);
    setCategoriaSeleccionada(null);
    setMarcaSeleccionada('');
    setModeloSeleccionado('');
    setVersionesConProductos([]);
    setExpandedVersions({});
    setShowMarcaDropdown(false);
    setShowModeloDropdown(false);
    setFiltroTextoResultados('');
    setProductos([]);
    setMarcasDisponibles([]);
    setModelosDisponibles([]);
  };

  // ── PASO 2: SELECCIONAR TIPO DE FILTRO ──
  const handleSelectCategoria = (catId: string) => {
    setCategoriaSeleccionada(catId);
    setMarcaSeleccionada('');
    setModeloSeleccionado('');
    setVersionesConProductos([]);
    setExpandedVersions({});
    setShowMarcaDropdown(false);
    setShowModeloDropdown(false);
    setFiltroTextoResultados('');
    setPage(1);
  };

  // ── 1. CARGAR TODAS LAS MARCAS DISPONIBLES USANDO LA VISTA OPTIMIZADA ──
  useEffect(() => {
    if (!tipoVehiculo) {
      setMarcasDisponibles([]);
      return;
    }

    const fetchMarcas = async () => {
      setLoadingMarcas(true);
      try {
        const { data, error } = await supabase
          .from('marcas_vehiculos_tipo')
          .select('marca')
          .eq('tipo_vehiculo', tipoVehiculo)
          .order('marca', { ascending: true });

        if (error || !data) {
          console.error('Error fetching marcas_vehiculos_tipo:', error);
          setMarcasDisponibles([]);
          return;
        }

        const list = data
          .map((r: any) => (r.marca || '').trim())
          .filter((m: string) => m && m !== 'GENERAL');

        setMarcasDisponibles(list);
      } catch (err) {
        console.error('Error cargando marcas para wizard:', err);
      } finally {
        setLoadingMarcas(false);
      }
    };

    fetchMarcas();
  }, [tipoVehiculo]);

  // ── 2. CARGAR MODELOS CUANDO SE SELECCIONA UNA MARCA ──
  useEffect(() => {
    if (!tipoVehiculo || !marcaSeleccionada) {
      setModelosDisponibles([]);
      setModeloSeleccionado('');
      return;
    }

    const fetchModelos = async () => {
      setLoadingModelos(true);
      try {
        const { data, error } = await supabase
          .from('modelos_vehiculos_tipo')
          .select('modelo')
          .eq('tipo_vehiculo', tipoVehiculo)
          .ilike('marca', marcaSeleccionada)
          .order('modelo', { ascending: true });

        if (error || !data) {
          setModelosDisponibles([]);
          return;
        }

        const modeloSet = new Set<string>();
        data.forEach((r: any) => {
          const raw = (r.modelo || '').trim();
          if (raw) {
            const { baseModel } = normalizarModeloBase(raw, marcaSeleccionada);
            if (baseModel && baseModel !== 'GENERAL' && baseModel !== 'ESTÁNDAR' && baseModel.length >= 2) {
              modeloSet.add(baseModel);
            }
          }
        });

        const list = Array.from(modeloSet).sort((a, b) =>
          a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
        );

        setModelosDisponibles(list);
      } catch (err) {
        console.error('Error cargando modelos:', err);
      } finally {
        setLoadingModelos(false);
      }
    };

    fetchModelos();
  }, [tipoVehiculo, marcaSeleccionada]);

  // ── 3. CONSULTAR PRODUCTOS Y VERSIONES AL SELECCIONAR CATEGORÍA O VEHÍCULO ──
  useEffect(() => {
    if (!tipoVehiculo || !categoriaSeleccionada) {
      setProductos([]);
      setVersionesConProductos([]);
      return;
    }

    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const catConfig = CATEGORIAS_WIZARD.find((c) => c.id === categoriaSeleccionada);
        const dbCats = catConfig?.dbValues || [];

        // CASO A: Si se seleccionó Marca y Modelo -> Agrupamos por Versión (Opción 2: acordeones)
        if (marcaSeleccionada && modeloSeleccionado) {
          const { data: vehData, error: vehErr } = await supabase
            .from('vehiculos_filtrar')
            .select('version, año, filtro_asociado, modelo')
            .eq('tipo_vehiculo', tipoVehiculo)
            .ilike('marca', marcaSeleccionada)
            .or(`modelo.eq.${modeloSeleccionado},modelo.ilike.${modeloSeleccionado} %,modelo.ilike.${modeloSeleccionado}-%`);

          if (vehErr || !vehData || vehData.length === 0) {
            setVersionesConProductos([]);
            setProductos([]);
            setLoadingProductos(false);
            return;
          }

          const map = new Map<string, VersionAgrupadaConProductos>();
          const allCodesSet = new Set<string>();

          vehData.forEach((r: any) => {
            let v = (r.version || '').trim();
            let a = (r.año || '').trim();
            if (v.toLowerCase() === 'null' || v.toLowerCase() === 'undefined') v = '';
            if (a.toLowerCase() === 'null' || a.toLowerCase() === 'undefined') a = '';

            let label = 'Versión Única / Estándar';
            if (v && a) {
              label = v.includes(a) ? v : `${v} (${a})`;
            } else if (v) {
              label = v;
            } else if (a) {
              label = `Año ${a}`;
            }

            if (!map.has(label)) {
              map.set(label, {
                id: label,
                label,
                version: r.version || '',
                año: r.año || null,
                codigos: [],
                productos: [],
              });
            }

            const entry = map.get(label)!;
            const code = (r.filtro_asociado || '').trim();
            if (code) {
              if (!entry.codigos.includes(code)) entry.codigos.push(code);
              allCodesSet.add(code);
            }
          });

          if (allCodesSet.size === 0) {
            setVersionesConProductos([]);
            setProductos([]);
            setLoadingProductos(false);
            return;
          }

          const allCodes = Array.from(allCodesSet);
          let prodQuery = supabase
            .from('productos_filtrar')
            .select('*')
            .in('codigo_filtrar', allCodes)
            .neq('activo', false);

          if (dbCats.length > 0) {
            prodQuery = prodQuery.in('categoria', dbCats);
          }

          const { data: prodData } = await prodQuery;
          const prods = (prodData || []) as Filtro[];
          const prodMap = new Map<string, Filtro>();
          prods.forEach((p) => prodMap.set(p.codigo_filtrar, p));

          const vList: VersionAgrupadaConProductos[] = [];
          map.forEach((entry) => {
            const vProds: Filtro[] = [];
            entry.codigos.forEach((code) => {
              const p = prodMap.get(code);
              if (p && !vProds.some((item) => item.codigo_filtrar === p.codigo_filtrar)) {
                vProds.push(p);
              }
            });
            vProds.sort((a, b) => a.codigo_filtrar.localeCompare(b.codigo_filtrar));

            if (vProds.length > 0) {
              vList.push({
                ...entry,
                productos: vProds,
              });
            }
          });

          vList.sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' }));

          setVersionesConProductos(vList);
          setProductos(prods);

          // Por defecto todos los desplegables vienen plegados
          setExpandedVersions({});
        } else if (marcaSeleccionada) {
          // CASO B: Solo se seleccionó Marca (sin modelo aún)
          setVersionesConProductos([]);
          let vehQuery = supabase
            .from('filtros_por_vehiculo_tipo')
            .select('filtro_asociado, modelo')
            .eq('tipo_vehiculo', tipoVehiculo)
            .ilike('marca', marcaSeleccionada);

          const { data: vehData, error: vehErr } = await vehQuery.limit(2000);
          if (vehErr || !vehData || vehData.length === 0) {
            setProductos([]);
            setLoadingProductos(false);
            return;
          }

          const codes = Array.from(new Set(vehData.map((r: any) => r.filtro_asociado).filter(Boolean)));
          if (codes.length === 0) {
            setProductos([]);
            setLoadingProductos(false);
            return;
          }

          let prodQuery = supabase
            .from('productos_filtrar')
            .select('*')
            .in('codigo_filtrar', codes)
            .neq('activo', false);

          if (dbCats.length > 0) {
            prodQuery = prodQuery.in('categoria', dbCats);
          }

          const { data: prodData } = await prodQuery;
          const res = (prodData || []) as Filtro[];
          res.sort((a, b) => a.codigo_filtrar.localeCompare(b.codigo_filtrar));
          setProductos(res);
        } else {
          // CASO C: No hay marca seleccionada -> Cargar productos generales de la categoría
          setVersionesConProductos([]);
          let prodQuery = supabase
            .from('productos_filtrar')
            .select('*')
            .neq('activo', false);

          if (dbCats.length > 0) {
            prodQuery = prodQuery.in('categoria', dbCats);
          }

          const { data: prodData } = await prodQuery.limit(1000);
          const res = (prodData || []) as Filtro[];
          res.sort((a, b) => a.codigo_filtrar.localeCompare(b.codigo_filtrar));
          setProductos(res);
        }

        setPage(1);
      } catch (err) {
        console.error('Error cargando productos en wizard:', err);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [tipoVehiculo, categoriaSeleccionada, marcaSeleccionada, modeloSeleccionado]);

  // ── 4. FILTRADO EN MEMORIA EN TIEMPO REAL ("BUSCAR DENTRO DE LO SELECCIONADO") ──
  const productosFiltradosPorTexto = useMemo(() => {
    if (!filtroTextoResultados.trim()) return productos;

    const q = filtroTextoResultados.trim().toLowerCase();
    const qCompact = q.replace(/[-_/\s.]/g, '');

    return productos.filter((p) => {
      const code = (p.codigo_filtrar || '').toLowerCase();
      const codeCompact = code.replace(/[-_/\s.]/g, '');
      const title = (p.titulo_producto || '').toLowerCase();
      const eq = (p.equivalencias || '').toLowerCase();
      const desc = (p.descripcion_aplicacion || '').toLowerCase();
      const dim = (p.dimensiones || '').toLowerCase();
      const brand = (p.marca_filtro || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();

      return (
        code.includes(q) ||
        codeCompact.includes(qCompact) ||
        title.includes(q) ||
        eq.includes(q) ||
        desc.includes(q) ||
        dim.includes(q) ||
        brand.includes(q) ||
        cat.includes(q)
      );
    });
  }, [productos, filtroTextoResultados]);

  // Filtrado de versiones cuando hay marca y modelo seleccionados
  const versionesFiltradas = useMemo(() => {
    if (!marcaSeleccionada || !modeloSeleccionado) return [];
    if (!filtroTextoResultados.trim()) return versionesConProductos;

    const q = filtroTextoResultados.trim().toLowerCase();
    const qCompact = q.replace(/[-_/\s.]/g, '');

    return versionesConProductos
      .map((ver) => {
        const labelMatches = ver.label.toLowerCase().includes(q);
        const matchingProds = ver.productos.filter((p) => {
          const code = (p.codigo_filtrar || '').toLowerCase();
          const codeCompact = code.replace(/[-_/\s.]/g, '');
          const title = (p.titulo_producto || '').toLowerCase();
          const eq = (p.equivalencias || '').toLowerCase();
          const desc = (p.descripcion_aplicacion || '').toLowerCase();
          const brand = (p.marca_filtro || '').toLowerCase();
          const cat = (p.categoria || '').toLowerCase();

          return (
            code.includes(q) ||
            codeCompact.includes(qCompact) ||
            title.includes(q) ||
            eq.includes(q) ||
            desc.includes(q) ||
            brand.includes(q) ||
            cat.includes(q)
          );
        });

        if (labelMatches || matchingProds.length > 0) {
          return {
            ...ver,
            productos: labelMatches ? ver.productos : matchingProds,
          };
        }
        return null;
      })
      .filter(Boolean) as VersionAgrupadaConProductos[];
  }, [versionesConProductos, filtroTextoResultados, marcaSeleccionada, modeloSeleccionado]);

  // Al buscar texto, expandir automáticamente las versiones que coincidan
  useEffect(() => {
    if (filtroTextoResultados.trim() && versionesFiltradas.length > 0) {
      const exp: Record<string, boolean> = {};
      versionesFiltradas.forEach((v) => {
        exp[v.id] = true;
      });
      setExpandedVersions(exp);
    }
  }, [filtroTextoResultados, versionesFiltradas]);

  // Paginación de los resultados planos
  const displayedProductos = useMemo(() => {
    return productosFiltradosPorTexto.slice(0, page * PAGE_SIZE);
  }, [productosFiltradosPorTexto, page]);

  const canLoadMore = displayedProductos.length < productosFiltradosPorTexto.length;

  // Filtrar lista de marcas visibles en el selector
  const marcasFiltradas = useMemo(() => {
    if (!busquedaMarca.trim()) return marcasDisponibles;
    const term = busquedaMarca.trim().toUpperCase();
    return marcasDisponibles.filter((m) => m.includes(term));
  }, [marcasDisponibles, busquedaMarca]);

  // Filtrar lista de modelos visibles
  const modelosFiltrados = useMemo(() => {
    if (!busquedaModelo.trim()) return modelosDisponibles;
    const term = busquedaModelo.trim().toUpperCase();
    return modelosDisponibles.filter((m) => m.includes(term));
  }, [modelosDisponibles, busquedaModelo]);

  const catActual = CATEGORIAS_WIZARD.find((c) => c.id === categoriaSeleccionada);

  // Reiniciar todo el wizard
  const handleReset = () => {
    setTipoVehiculo(null);
    setCategoriaSeleccionada(null);
    setMarcaSeleccionada('');
    setModeloSeleccionado('');
    setVersionesConProductos([]);
    setExpandedVersions({});
    setShowMarcaDropdown(false);
    setShowModeloDropdown(false);
    setFiltroTextoResultados('');
    setProductos([]);
    setMarcasDisponibles([]);
    setModelosDisponibles([]);
    setBusquedaMarca('');
    setBusquedaModelo('');
  };

  return (
    <section id="buscador-guiado" className="relative w-full max-w-7xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 text-white shadow-2xl p-4 sm:p-8 overflow-hidden backdrop-blur-md scroll-mt-24">
      {/* Fondo estético decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── CABECERA DEL BUSCADOR GUIADO ── */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>Búsqueda Asistida Paso a Paso</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ¿Qué filtro estás buscando?
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Seleccioná el tipo de vehículo y categoría. Los productos aparecerán al instante y podrás buscar o refinar dentro de lo seleccionado.
          </p>
        </div>

        {/* Botón de reinicio si hay algún paso activo */}
        {tipoVehiculo && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 hover:border-slate-600 shrink-0 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Nueva Búsqueda</span>
          </button>
        )}
      </div>

      {/* ── BREADCRUMB / INDICADOR DE PASOS INTERACTIVO ── */}
      <div className="relative z-10 flex items-center gap-2 py-4 text-xs font-bold overflow-x-auto no-scrollbar border-b border-slate-800/60 mb-6">
        <span className="text-slate-500 uppercase text-[10px] tracking-wider shrink-0">Flujo:</span>

        {/* Paso 1 Breadcrumb */}
        <button
          type="button"
          onClick={() => {
            setCategoriaSeleccionada(null);
            setMarcaSeleccionada('');
            setModeloSeleccionado('');
            setFiltroTextoResultados('');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-all ${
            tipoVehiculo
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'bg-blue-600 text-white shadow-sm'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>1. {tipoVehiculo ? (tipoVehiculo === 'LIVIANO' ? 'Liviano / Auto' : 'Pesado / Agro') : 'Tipo Vehículo'}</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

        {/* Paso 2 Breadcrumb */}
        <button
          type="button"
          disabled={!tipoVehiculo}
          onClick={() => {
            setMarcaSeleccionada('');
            setModeloSeleccionado('');
            setFiltroTextoResultados('');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-all ${
            !tipoVehiculo
              ? 'text-slate-600 opacity-50 cursor-not-allowed'
              : categoriaSeleccionada
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'bg-blue-600 text-white shadow-sm'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. {catActual ? catActual.nombre : 'Tipo de Filtro'}</span>
        </button>

        {marcaSeleccionada && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setModeloSeleccionado('');
                setVersionesConProductos([]);
                setFiltroTextoResultados('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                modeloSeleccionado ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-blue-600 text-white shadow-sm'
              }`}
            >
              <span>{marcaSeleccionada}</span>
            </button>
          </>
        )}

        {modeloSeleccionado && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shrink-0">
              <Car className="w-3.5 h-3.5" />
              <span>{modeloSeleccionado}</span>
            </span>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PASO 1: SELECCIÓN DE TIPO DE VEHÍCULO (LIVIANO vs PESADO)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
            ¿Qué tipo de vehículo buscas?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TARJETA LIVIANO */}
            <button
              type="button"
              onClick={() => handleSelectTipo('LIVIANO')}
              className={`group relative p-5 sm:p-6 rounded-2xl border text-left transition-all duration-200 overflow-hidden flex items-start gap-4 ${
                tipoVehiculo === 'LIVIANO'
                  ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-950/50'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  tipoVehiculo === 'LIVIANO'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-700/60 text-slate-300 group-hover:bg-blue-600/20 group-hover:text-blue-400'
                }`}
              >
                <Car className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base sm:text-lg font-black text-white group-hover:text-blue-300 transition-colors">
                    Auto / Camioneta / SUV
                  </h4>
                  {tipoVehiculo === 'LIVIANO' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  Línea liviana particular y comercial: Fiat, Volkswagen, Toyota Hilux, Ford Ranger, Chevrolet, Renault, Peugeot, etc.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-400 font-bold">
                  <span>12.800+ aplicaciones livianas</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* TARJETA PESADO */}
            <button
              type="button"
              onClick={() => handleSelectTipo('PESADO')}
              className={`group relative p-5 sm:p-6 rounded-2xl border text-left transition-all duration-200 overflow-hidden flex items-start gap-4 ${
                tipoVehiculo === 'PESADO'
                  ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  tipoVehiculo === 'PESADO'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-700/60 text-slate-300 group-hover:bg-amber-500/20 group-hover:text-amber-400'
                }`}
              >
                <Truck className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    Camión / Maquinaria / Agro
                  </h4>
                  {tipoVehiculo === 'PESADO' && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  Línea pesada, colectivos y tractores: Scania, Mercedes-Benz Camiones, Volvo, Iveco, John Deere, Caterpillar, Agrale, etc.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400 font-bold">
                  <span>6.100+ aplicaciones industriales</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PASO 2: SELECCIÓN DE TIPO DE FILTRO
        ───────────────────────────────────────────────────────────── */}
        {tipoVehiculo && (
          <div className="pt-4 border-t border-slate-800/80 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
              Seleccioná el tipo de filtro:
              <span className="text-xs font-normal text-slate-400 lowercase">
                (los productos aparecerán de inmediato abajo)
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
              {CATEGORIAS_WIZARD.map((cat) => {
                const isSelected = categoriaSeleccionada === cat.id;
                const IconComp = cat.icon;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategoria(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 relative overflow-hidden group ${
                      isSelected
                        ? `${cat.activeBg} ${cat.activeBorder} ring-2 ring-blue-500/40 shadow-md`
                        : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/60 text-slate-300 group-hover:text-white'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <span className={`text-xs font-bold block leading-tight ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                        {cat.nombre}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                        {cat.subtitulo}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECCIÓN DE RESULTADOS INMEDIATOS + REFINAMIENTOS DE MARCA/MODELO
        ───────────────────────────────────────────────────────────── */}
        {tipoVehiculo && categoriaSeleccionada && (
          <div ref={resultsRef} className="pt-6 border-t border-slate-800/80 animate-fade-in space-y-5">
            {/* BARRA DE REFINAMIENTOS OPCIONALES DE VEHÍCULO */}
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Refinar por Vehículo Específico
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (opcional: seleccioná marca y modelo)
                  </span>
                </div>

                {(marcaSeleccionada || modeloSeleccionado) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMarcaSeleccionada('');
                      setModeloSeleccionado('');
                      setVersionesConProductos([]);
                      setShowMarcaDropdown(false);
                      setShowModeloDropdown(false);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 self-start sm:self-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Quitar filtro de auto</span>
                  </button>
                )}
              </div>

              {/* SELECTORES DESPLEGABLES EN CASCADA (1. MARCA -> 2. MODELO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. SELECTOR DESPLEGABLE DE MARCA */}
                <div ref={marcaDropdownRef} className="relative">
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-2 border-l-2 border-blue-500 pl-2">
                    1. MARCA DEL VEHÍCULO
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMarcaDropdown(!showMarcaDropdown);
                      setShowModeloDropdown(false);
                    }}
                    className={`w-full p-3.5 bg-slate-900/90 border rounded-xl text-left flex items-center justify-between transition-all ${
                      showMarcaDropdown
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-800/80'
                        : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <Car className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className={`text-xs sm:text-sm font-bold truncate ${marcaSeleccionada ? 'text-white' : 'text-slate-400'}`}>
                        {marcaSeleccionada || 'Elegí la marca...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {marcaSeleccionada && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMarcaSeleccionada('');
                            setModeloSeleccionado('');
                            setVersionesConProductos([]);
                          }}
                          className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white"
                          title="Quitar marca"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {loadingMarcas ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showMarcaDropdown ? 'rotate-180 text-blue-400' : ''}`} />
                      )}
                    </div>
                  </button>

                  {/* MENÚ DESPLEGABLE DE MARCA */}
                  {showMarcaDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-80 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 z-10 space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={busquedaMarca}
                            onChange={(e) => setBusquedaMarca(e.target.value)}
                            placeholder="Buscar marca (ej: Fiat, Toyota, Ford)..."
                            className="w-full pl-9 pr-7 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                          />
                          {busquedaMarca && (
                            <button
                              type="button"
                              onClick={() => setBusquedaMarca('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>{marcasFiltradas.length} marcas disponibles</span>
                          {marcaSeleccionada && (
                            <button
                              type="button"
                              onClick={() => {
                                setMarcaSeleccionada('');
                                setModeloSeleccionado('');
                                setVersionesConProductos([]);
                                setShowMarcaDropdown(false);
                              }}
                              className="text-blue-400 hover:underline"
                            >
                              Limpiar selección
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-y-auto max-h-60 custom-scrollbar p-1.5 space-y-0.5">
                        {/* Opción Todas las marcas */}
                        <button
                          type="button"
                          onClick={() => {
                            setMarcaSeleccionada('');
                            setModeloSeleccionado('');
                            setVersionesConProductos([]);
                            setShowMarcaDropdown(false);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                            !marcaSeleccionada
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span>Todas las Marcas ({marcasDisponibles.length})</span>
                          {!marcaSeleccionada && <Check className="w-4 h-4 text-blue-400" />}
                        </button>

                        {marcasFiltradas.map((m) => {
                          const isSelected = marcaSeleccionada === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => seleccionarMarca(m)}
                              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{m}</span>
                              {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                            </button>
                          );
                        })}

                        {marcasFiltradas.length === 0 && (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            No se encontraron marcas con "{busquedaMarca}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SELECTOR DESPLEGABLE DE MODELO */}
                <div ref={modeloDropdownRef} className="relative">
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-2 border-l-2 border-sky-500 pl-2">
                    2. MODELO DEL VEHÍCULO
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!marcaSeleccionada) return;
                      setShowModeloDropdown(!showModeloDropdown);
                      setShowMarcaDropdown(false);
                    }}
                    disabled={!marcaSeleccionada}
                    className={`w-full p-3.5 bg-slate-900/90 border rounded-xl text-left flex items-center justify-between transition-all ${
                      !marcaSeleccionada
                        ? 'opacity-50 cursor-not-allowed border-slate-800'
                        : showModeloDropdown
                        ? 'border-sky-500 ring-2 ring-sky-500/20 bg-slate-800/80'
                        : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <Car className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className={`text-xs sm:text-sm font-bold truncate ${modeloSeleccionado ? 'text-white' : 'text-slate-400'}`}>
                        {modeloSeleccionado || (marcaSeleccionada ? 'Elegí el modelo...' : 'Primero elegí una marca')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {modeloSeleccionado && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModeloSeleccionado('');
                            setVersionesConProductos([]);
                          }}
                          className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white"
                          title="Quitar modelo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {loadingModelos ? (
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      ) : (
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showModeloDropdown ? 'rotate-180 text-sky-400' : ''}`} />
                      )}
                    </div>
                  </button>

                  {/* MENÚ DESPLEGABLE DE MODELO */}
                  {showModeloDropdown && marcaSeleccionada && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-80 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 z-10 space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={busquedaModelo}
                            onChange={(e) => setBusquedaModelo(e.target.value)}
                            placeholder={`Buscar modelo de ${marcaSeleccionada}...`}
                            className="w-full pl-9 pr-7 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            autoFocus
                          />
                          {busquedaModelo && (
                            <button
                              type="button"
                              onClick={() => setBusquedaModelo('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>{modelosFiltrados.length} modelos de {marcaSeleccionada}</span>
                          {modeloSeleccionado && (
                            <button
                              type="button"
                              onClick={() => {
                                setModeloSeleccionado('');
                                setVersionesConProductos([]);
                                setShowModeloDropdown(false);
                              }}
                              className="text-sky-400 hover:underline"
                            >
                              Limpiar selección
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-y-auto max-h-60 custom-scrollbar p-1.5 space-y-0.5">
                        {/* Opción Todos los modelos */}
                        <button
                          type="button"
                          onClick={() => {
                            setModeloSeleccionado('');
                            setVersionesConProductos([]);
                            setShowModeloDropdown(false);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                            !modeloSeleccionado
                              ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span>Todos los Modelos ({modelosDisponibles.length})</span>
                          {!modeloSeleccionado && <Check className="w-4 h-4 text-sky-400" />}
                        </button>

                        {modelosFiltrados.map((mod) => {
                          const isSelected = modeloSeleccionado === mod;
                          return (
                            <button
                              key={mod}
                              type="button"
                              onClick={() => seleccionarModelo(mod)}
                              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/30'
                                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{mod}</span>
                              {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                            </button>
                          );
                        })}

                        {modelosFiltrados.length === 0 && (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            No se encontraron modelos con "{busquedaModelo}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BADGES DE FILTROS ACTIVOS */}
              {(marcaSeleccionada || modeloSeleccionado) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Filtro aplicado:</span>
                  {marcaSeleccionada && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold">
                      <Car className="w-3 h-3" />
                      <span>{marcaSeleccionada}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMarcaSeleccionada('');
                          setModeloSeleccionado('');
                          setVersionesConProductos([]);
                        }}
                        className="text-blue-400 hover:text-white"
                        title="Quitar marca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {modeloSeleccionado && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold">
                      <span>{modeloSeleccionado}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setModeloSeleccionado('');
                          setVersionesConProductos([]);
                        }}
                        className="text-sky-400 hover:text-white"
                        title="Quitar modelo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── BARRA DE BÚSQUEDA INTERNA EN TIEMPO REAL ("BUSCAR DENTRO DE LO SELECCIONADO") ── */}
            <div className="bg-slate-950/90 rounded-2xl border-2 border-blue-600/30 p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-blue-950/30">
              <div className="relative w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4 text-blue-400" />
                </div>
                <input
                  type="text"
                  value={filtroTextoResultados}
                  onChange={(e) => {
                    setFiltroTextoResultados(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar dentro de estos resultados (código, título, motor, medidas...)"
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-900 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium placeholder:text-slate-500"
                />
                {filtroTextoResultados && (
                  <button
                    type="button"
                    onClick={() => setFiltroTextoResultados('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title="Limpiar búsqueda interna"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Resumen numérico */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
                <span>
                  {marcaSeleccionada && modeloSeleccionado ? (
                    <>
                      <span className="text-blue-400">{versionesFiltradas.length}</span> {versionesFiltradas.length === 1 ? 'versión' : 'versiones'} (
                      <span className="text-emerald-400">{productos.length}</span> filtros en total)
                    </>
                  ) : filtroTextoResultados ? (
                    <>
                      Mostrando <span className="text-blue-400">{productosFiltradosPorTexto.length}</span> de {productos.length} filtros
                    </>
                  ) : (
                    <>
                      Total: <span className="text-blue-400">{productos.length}</span> {productos.length === 1 ? 'filtro compatible' : 'filtros compatibles'}
                    </>
                  )}
                </span>
                {filtroTextoResultados && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] uppercase font-bold border border-blue-500/30">
                    Filtrado activo
                  </span>
                )}
              </div>
            </div>

            {/* ── LISTADO / GRILLA DE PRODUCTOS O ACORDEONES POR VERSIÓN ── */}
            {loadingProductos ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-bold text-slate-300">
                  Consultando filtros en base de datos...
                </p>
              </div>
            ) : marcaSeleccionada && modeloSeleccionado ? (
              /* ── CASO MODELO SELECCIONADO: ACORDEONES POR VERSIÓN / MOTOR ── */
              <div className="space-y-4">
                {/* Resumen del Vehículo y Botones Expandir / Colapsar */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-blue-400">
                          Vehículo Seleccionado
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          {versionesConProductos.length} {versionesConProductos.length === 1 ? 'Versión / Motor' : 'Versiones / Motores'}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {marcaSeleccionada} <span className="text-blue-400">{modeloSeleccionado}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hacé clic en tu motorización o versión para desplegar los filtros correspondientes a cada service.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                    <button
                      type="button"
                      onClick={expandAllVersions}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors"
                    >
                      Expandir todas
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllVersions}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors"
                    >
                      Colapsar todas
                    </button>
                  </div>
                </div>

                {/* Lista de Acordeones por Versión */}
                {versionesFiltradas.map((ver) => {
                  const isExpanded = !!expandedVersions[ver.id];
                  return (
                    <div
                      key={ver.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-slate-900/90 border-blue-500/50 shadow-xl shadow-blue-950/30'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/75'
                      }`}
                    >
                      {/* Encabezado del Acordeón */}
                      <button
                        type="button"
                        onClick={() => toggleVersion(ver.id)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isExpanded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <Settings2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-white truncate">
                                {ver.label}
                              </h4>
                              {ver.año && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold">
                                  {ver.año}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {marcaSeleccionada} {modeloSeleccionado} {ver.version ? `• Motor ${ver.version}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                              isExpanded
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {ver.productos.length} {ver.productos.length === 1 ? 'filtro' : 'filtros'}
                          </span>
                          <div
                            className={`w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-blue-400 bg-blue-600/20' : ''
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </button>

                      {/* Grilla de productos al estar expandido */}
                      {isExpanded && (
                        <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-slate-800/70 bg-slate-950/40 animate-fade-in space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {ver.productos.map((filtro) => (
                              <TarjetaProducto key={filtro.id || filtro.codigo_filtrar} filtro={filtro} />
                            ))}
                          </div>

                          {/* Botón CTA de WhatsApp para el service de este vehículo */}
                          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-left">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  ¿Querés el Kit de Service Completo para tu {marcaSeleccionada} {modeloSeleccionado} ({ver.label})?
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Te armamos el presupuesto con aceite sintético/semisintético y todos los filtros compatibles listos para colocar.
                                </p>
                              </div>
                            </div>
                            <a
                              href={generarUrlWhatsapp(
                                `Hola FiltrAr! Quiero consultar por el kit completo de filtros para mi ${marcaSeleccionada} ${modeloSeleccionado} versión ${ver.label}.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 shrink-0 shadow-md shadow-emerald-950/50 transition-all"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>Pedir Kit por WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {versionesFiltradas.length === 0 && (
                  <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                    <Info className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">
                      No se encontraron versiones ni filtros que coincidan con "{filtroTextoResultados}".
                    </p>
                    <button
                      type="button"
                      onClick={() => setFiltroTextoResultados('')}
                      className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                    >
                      Limpiar búsqueda interna
                    </button>
                  </div>
                )}
              </div>
            ) : displayedProductos.length > 0 ? (
              /* ── CASO GENERAL (SIN MODELO SELECCIONADO): GRILLA PLANA CON PAGINACIÓN ── */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedProductos.map((filtro) => (
                    <TarjetaProducto key={filtro.id || filtro.codigo_filtrar} filtro={filtro} />
                  ))}
                </div>

                {canLoadMore && (
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => prev + 1)}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all"
                    >
                      Cargar más productos ({productosFiltradosPorTexto.length - displayedProductos.length} restantes)
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Estado Vacío General */
              <div className="py-16 text-center bg-slate-950/40 rounded-2xl border border-slate-800 p-8 space-y-3">
                <Info className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-slate-300">
                  {filtroTextoResultados
                    ? `No se encontraron filtros que coincidan con "${filtroTextoResultados}".`
                    : 'No se encontraron filtros para esta combinación exacta.'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {filtroTextoResultados
                    ? 'Intentá buscar por otro término o limpiá la barra de búsqueda interna.'
                    : 'Probá seleccionando "Todas las Marcas" o "Todos los Filtros" para ampliar el rango de búsqueda.'}
                </p>
                {filtroTextoResultados ? (
                  <button
                    type="button"
                    onClick={() => setFiltroTextoResultados('')}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm"
                  >
                    Limpiar término de búsqueda
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMarcaSeleccionada('');
                      setModeloSeleccionado('');
                      setVersionesConProductos([]);
                    }}
                    className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
                  >
                    Restablecer filtros de vehículo
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
