'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Car,
  Search,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  X,
  ListFilter,
  PenTool,
  RotateCcw,
  List,
  ExternalLink,
  Package,
  FolderTree,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sanitizarVehiculo } from '@/lib/normalization';
import ConfirmModal from '../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

interface VehiculoRow {
  id: number;
  marca: string;
  modelo: string;
  version: string | null;
  año: string | null;
  filtro_asociado: string;
}

interface ProductMini {
  codigo_filtrar: string;
  titulo_producto: string | null;
  categoria: string | null;
  imagen_url: string | string[] | null;
}

interface VersionApp {
  id: number;
  version: string | null;
  año: string | null;
  filtro_asociado: string;
  product?: ProductMini;
}

interface ModelGroup {
  modelo: string;
  totalAplicaciones: number;
  aplicaciones: VersionApp[];
}

interface BrandGroup {
  marca: string;
  totalModelos: number;
  totalAplicaciones: number;
  modelos: ModelGroup[];
}

const PAGE_SIZE_FLAT = 25;

// Helper visual para badges de categoría con colores semánticos
function getCategoriaBadge(catRaw: string | null | undefined) {
  const cat = (catRaw || '').toLowerCase();
  if (cat.includes('aceite')) {
    return {
      label: 'Aceite',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    };
  }
  if (cat.includes('aire')) {
    return {
      label: 'Aire',
      badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    };
  }
  if (cat.includes('combustible')) {
    return {
      label: 'Combustible',
      badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }
  if (cat.includes('habitaculo') || cat.includes('habitáculo')) {
    return {
      label: 'Habitáculo',
      badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    };
  }
  if (cat.includes('inyeccion') || cat.includes('inyección')) {
    return {
      label: 'Inyección',
      badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    };
  }
  if (cat.includes('kit')) {
    return {
      label: 'Kit',
      badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    };
  }
  return {
    label: catRaw || 'Filtro',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };
}

export default function AdminVehiculosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoRow[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, ProductMini>>({});
  const [loading, setLoading] = useState(true);

  // View mode: 'tree' (Árbol Vertical: Marca -> Modelo -> Versiones) vs 'flat' (Tabla 1 a 1)
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  // Search & Navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [brandSort, setBrandSort] = useState<'apps' | 'az'>('apps');
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [currentFlatPage, setCurrentFlatPage] = useState(1);

  // Add new vehicle association state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMarca, setNewMarca] = useState('');
  const [newModelo, setNewModelo] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newAño, setNewAño] = useState('');
  const [newFiltroCode, setNewFiltroCode] = useState('');
  const [adding, setAdding] = useState(false);

  // Master Vehicles catalog (for dropdown selectors)
  const [masterBrands, setMasterBrands] = useState<string[]>([]);
  const [masterModelsMap, setMasterModelsMap] = useState<Record<string, string[]>>({});
  const [vehFormMode, setVehFormMode] = useState<'existing' | 'custom'>('existing');
  const [isCustomModelSelected, setIsCustomModelSelected] = useState(false);
  const [customModelText, setCustomModelText] = useState('');

  // Delete state
  const [vehToDelete, setVehToDelete] = useState<VehiculoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Fetch all vehicles & products
  const fetchVehiculos = async () => {
    setLoading(true);
    try {
      // 1. Fetch products map
      const prods: Record<string, ProductMini> = {};
      let pOffset = 0;
      let hasMoreProds = true;

      while (hasMoreProds) {
        const { data, error } = await supabase
          .from('productos_filtrar')
          .select('codigo_filtrar, titulo_producto, categoria, imagen_url')
          .range(pOffset, pOffset + 999);

        if (error || !data) break;
        data.forEach((p) => {
          if (p.codigo_filtrar) prods[p.codigo_filtrar.toUpperCase()] = p;
        });
        hasMoreProds = data.length === 1000;
        pOffset += 1000;
      }
      setProductsMap(prods);

      // 2. Fetch all vehicle associations (10,004 rows in batches of 1,000)
      const allRows: VehiculoRow[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('vehiculos_filtrar')
          .select('*')
          .order('id', { ascending: false })
          .range(offset, offset + 999);

        if (error || !data) break;
        allRows.push(...(data as any as VehiculoRow[]));
        hasMore = data.length === 1000;
        offset += 1000;
      }

      setVehiculos(allRows);

      // Build master brand & model list
      const brandSet = new Set<string>();
      const map: Record<string, Set<string>> = {};

      allRows.forEach((r) => {
        if (r.marca) {
          const b = r.marca.toUpperCase().trim();
          brandSet.add(b);
          if (!map[b]) map[b] = new Set<string>();
          if (r.modelo) map[b].add(r.modelo.trim());
        }
      });

      const sortedBrands = Array.from(brandSet).sort();
      const sortedMap: Record<string, string[]> = {};
      for (const b of sortedBrands) {
        sortedMap[b] = Array.from(map[b] || []).sort();
      }

      setMasterBrands(sortedBrands);
      setMasterModelsMap(sortedMap);

      if (sortedBrands.length > 0) {
        setNewMarca(sortedBrands[0]);
        if (sortedMap[sortedBrands[0]] && sortedMap[sortedBrands[0]].length > 0) {
          setNewModelo(sortedMap[sortedBrands[0]][0]);
        }
      }
    } catch (err) {
      console.error('Error fetching vehiculos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  // Construir Árbol Jerárquico: Marca -> Modelo -> Versiones
  const hierarchyData = useMemo(() => {
    const brandsMap: Record<string, Record<string, VersionApp[]>> = {};

    vehiculos.forEach((v) => {
      const b = (v.marca || 'GENÉRICO').toUpperCase().trim();
      const m = (v.modelo || 'VARIOS').trim();

      if (!brandsMap[b]) brandsMap[b] = {};
      if (!brandsMap[b][m]) brandsMap[b][m] = [];

      brandsMap[b][m].push({
        id: v.id,
        version: v.version,
        año: v.año,
        filtro_asociado: v.filtro_asociado,
        product: productsMap[v.filtro_asociado.toUpperCase()],
      });
    });

    const result: BrandGroup[] = [];
    Object.keys(brandsMap).forEach((brand) => {
      const modelsObj = brandsMap[brand];
      const modelGroups: ModelGroup[] = [];
      let brandTotalApps = 0;

      Object.keys(modelsObj).forEach((model) => {
        const apps = modelsObj[model];
        brandTotalApps += apps.length;
        modelGroups.push({
          modelo: model,
          totalAplicaciones: apps.length,
          aplicaciones: apps.sort((a, b) => (a.version || '').localeCompare(b.version || '')),
        });
      });

      // Sort models alphabetically
      modelGroups.sort((a, b) => a.modelo.localeCompare(b.modelo));

      result.push({
        marca: brand,
        totalModelos: modelGroups.length,
        totalAplicaciones: brandTotalApps,
        modelos: modelGroups,
      });
    });

    // Sort brands by apps count or A-Z
    if (brandSort === 'apps') {
      return result.sort((a, b) => b.totalAplicaciones - a.totalAplicaciones);
    } else {
      return result.sort((a, b) => a.marca.localeCompare(b.marca));
    }
  }, [vehiculos, productsMap, brandSort]);

  // Lista filtrada para búsqueda
  const isSearchActive = searchTerm.trim() !== '';

  const searchFilteredHierarchy = useMemo(() => {
    if (!isSearchActive) return null;
    const term = searchTerm.toLowerCase();

    const matchedBrands: BrandGroup[] = [];

    hierarchyData.forEach((b) => {
      const matchedModels: ModelGroup[] = [];

      b.modelos.forEach((m) => {
        const brandMatch = b.marca.toLowerCase().includes(term);
        const modelMatch = m.modelo.toLowerCase().includes(term);

        const matchedApps = m.aplicaciones.filter((app) => {
          if (brandMatch || modelMatch) return true;
          const versionMatch = (app.version || '').toLowerCase().includes(term);
          const añoMatch = (app.año || '').toLowerCase().includes(term);
          const filtroMatch = app.filtro_asociado.toLowerCase().includes(term);
          const prodTitleMatch = (app.product?.titulo_producto || '').toLowerCase().includes(term);
          return versionMatch || añoMatch || filtroMatch || prodTitleMatch;
        });

        if (matchedApps.length > 0) {
          matchedModels.push({
            modelo: m.modelo,
            totalAplicaciones: matchedApps.length,
            aplicaciones: matchedApps,
          });
        }
      });

      if (matchedModels.length > 0) {
        matchedBrands.push({
          marca: b.marca,
          totalModelos: matchedModels.length,
          totalAplicaciones: matchedModels.reduce((acc, m) => acc + m.totalAplicaciones, 0),
          modelos: matchedModels,
        });
      }
    });

    return matchedBrands;
  }, [hierarchyData, searchTerm, isSearchActive]);

  // Auto-expandir marcas y modelos coincidentes en búsqueda
  useEffect(() => {
    if (isSearchActive && searchFilteredHierarchy) {
      const bKeys = new Set<string>();
      const mKeys = new Set<string>();
      searchFilteredHierarchy.forEach((b) => {
        bKeys.add(b.marca);
        b.modelos.forEach((m) => {
          mKeys.add(`${b.marca}__${m.modelo}`);
        });
      });
      setExpandedBrands(bKeys);
      setExpandedModels(mKeys);
    }
  }, [isSearchActive, searchFilteredHierarchy]);

  // Toggle expandir Marca
  const toggleBrandExpand = (marca: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(marca)) next.delete(marca);
      else next.add(marca);
      return next;
    });
  };

  // Toggle expandir Modelo
  const toggleModelExpand = (marca: string, modelo: string) => {
    const key = `${marca}__${modelo}`;
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Expandir / Plegar Todo
  const expandAll = () => {
    const bKeys = new Set<string>();
    const mKeys = new Set<string>();
    hierarchyData.forEach((b) => {
      bKeys.add(b.marca);
      b.modelos.forEach((m) => {
        mKeys.add(`${b.marca}__${m.modelo}`);
      });
    });
    setExpandedBrands(bKeys);
    setExpandedModels(mKeys);
  };

  const collapseAll = () => {
    setExpandedBrands(new Set());
    setExpandedModels(new Set());
  };

  // Abrir modal de asociación con marca y modelo preseleccionados
  const openAddModalForModel = (marca: string, modelo?: string) => {
    setVehFormMode('existing');
    setNewMarca(marca);
    if (modelo) {
      setNewModelo(modelo);
    } else {
      const defaultMod = masterModelsMap[marca]?.[0] || '';
      setNewModelo(defaultMod);
    }
    setIsCustomModelSelected(false);
    setCustomModelText('');
    setNewVersion('');
    setNewAño('');
    setNewFiltroCode('');
    setShowAddModal(true);
  };

  // Dropdown Brand change
  const handleBrandDropdownChange = (brand: string) => {
    setNewMarca(brand);
    setIsCustomModelSelected(false);
    setCustomModelText('');
    const models = masterModelsMap[brand] || [];
    if (models.length > 0) {
      setNewModelo(models[0]);
    } else {
      setNewModelo('');
    }
  };

  // Dropdown Model change
  const handleModelDropdownChange = (model: string) => {
    if (model === '__CUSTOM_MODEL__') {
      setIsCustomModelSelected(true);
      setNewModelo('');
    } else {
      setIsCustomModelSelected(false);
      setNewModelo(model);
    }
  };

  // Handle Add
  const handleAddVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawModelo = isCustomModelSelected ? customModelText : newModelo;
    const { marca: finalMarca, modelo: finalModelo, version: finalVersion } = sanitizarVehiculo(
      newMarca,
      rawModelo,
      newVersion
    );

    const cleanFiltro = newFiltroCode.trim().toUpperCase();

    if (!finalMarca || !finalModelo || !cleanFiltro) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Campos requeridos', message: 'Marca, modelo y código de filtro son obligatorios.' });
      return;
    }

    setAdding(true);

    try {
      // Check if product exists
      const { data: prodCheck } = await supabase
        .from('productos_filtrar')
        .select('codigo_filtrar')
        .eq('codigo_filtrar', cleanFiltro)
        .maybeSingle();

      if (!prodCheck) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto inexistente', message: `El código "${cleanFiltro}" no existe en el catálogo.` });
        setAdding(false);
        return;
      }

      const newRow = {
        marca: finalMarca,
        modelo: finalModelo,
        version: finalVersion,
        año: newAño.trim() || null,
        filtro_asociado: cleanFiltro,
      };

      const { data, error } = await supabase
        .from('vehiculos_filtrar')
        .insert([newRow])
        .select()
        .single();

      if (error) throw error;

      setVehiculos((prev) => [data as VehiculoRow, ...prev]);
      setShowAddModal(false);

      // Auto-expandir la marca y modelo
      setExpandedBrands((prev) => new Set([...prev, finalMarca]));
      setExpandedModels((prev) => new Set([...prev, `${finalMarca}__${finalModelo}`]));

      setToast({ id: Date.now().toString(), type: 'success', title: 'Vehículo asociado', message: `${finalMarca} ${finalModelo} ↔ ${cleanFiltro}` });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al agregar', message: err.message });
    } finally {
      setAdding(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!vehToDelete) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('vehiculos_filtrar')
        .delete()
        .eq('id', vehToDelete.id);

      if (error) throw error;

      setVehiculos((prev) => prev.filter((v) => v.id !== vehToDelete.id));
      setToast({ id: Date.now().toString(), type: 'success', title: 'Asociación eliminada' });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
    } finally {
      setDeleting(false);
      setVehToDelete(null);
    }
  };

  // Flat view list (for traditional table)
  const filteredFlatList = useMemo(() => {
    return vehiculos.filter((v) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const m = (v.marca || '').toLowerCase();
        const mod = (v.modelo || '').toLowerCase();
        const ver = (v.version || '').toLowerCase();
        const f = (v.filtro_asociado || '').toLowerCase();
        if (!m.includes(term) && !mod.includes(term) && !ver.includes(term) && !f.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [vehiculos, searchTerm]);

  const totalFlatPages = Math.ceil(filteredFlatList.length / PAGE_SIZE_FLAT) || 1;
  const paginatedFlatList = useMemo(() => {
    const start = (currentFlatPage - 1) * PAGE_SIZE_FLAT;
    return filteredFlatList.slice(start, start + PAGE_SIZE_FLAT);
  }, [filteredFlatList, currentFlatPage]);

  // Lista de marcas a renderizar en árbol
  const displayHierarchy = isSearchActive ? (searchFilteredHierarchy || []) : hierarchyData;

  return (
    <div className="space-y-4">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-500" />
              <span>Gestión de Vehículos Asociados</span>
            </h1>
            <span className="bg-slate-800 text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-700">
              {vehiculos.length.toLocaleString()} asociaciones
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Árbol jerárquico desplegable: Marca → Modelo → Versiones y Motorizaciones.
          </p>
        </div>

        {/* ACCIONES Y TOGGLE DE VISTA */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'tree'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista jerárquica: Marcas desplegables verticalmente una abajo de la otra"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Árbol de Marcas</span>
            </button>

            <button
              onClick={() => setViewMode('flat')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'flat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista en tabla tradicional de filas individuales 1 a 1"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Plana</span>
            </button>
          </div>

          <button
            onClick={() => {
              setVehFormMode('existing');
              setNewMarca(masterBrands[0] || 'VOLKSWAGEN');
              setNewModelo(masterModelsMap[masterBrands[0] || 'VOLKSWAGEN']?.[0] || '');
              setIsCustomModelSelected(false);
              setCustomModelText('');
              setNewVersion('');
              setNewAño('');
              setNewFiltroCode('');
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Asociar Vehículo</span>
          </button>
        </div>
      </div>

      {/* TOOLBAR DE BÚSQUEDA Y CONTROLES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-sm space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          {/* SEARCH INPUT */}
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por marca (Toyota), modelo (Hilux, Amarok), motor (2.8 TDi) o código de filtro (AF-205)..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ORDEN DE MARCAS (SI ES VISTA ÁRBOL) */}
          <div className="sm:col-span-4 flex items-center justify-end gap-2">
            {viewMode === 'tree' && (
              <>
                <select
                  value={brandSort}
                  onChange={(e) => setBrandSort(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="apps">Ordenar: Más Populares</option>
                  <option value="az">Ordenar: A - Z (Alfabético)</option>
                </select>

                <button
                  onClick={expandAll}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded transition-colors border border-slate-700 whitespace-nowrap"
                  title="Desplegar todas las marcas y modelos"
                >
                  Desplegar
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded transition-colors border border-slate-700 whitespace-nowrap"
                  title="Plegar todas las marcas"
                >
                  Plegar
                </button>
              </>
            )}
          </div>
        </div>

        {searchTerm && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Filtrando resultados para: <strong className="text-white">&quot;{searchTerm}&quot;</strong> ({displayHierarchy.length} marcas coincidentes)
            </span>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar búsqueda</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3 bg-slate-900 border border-slate-800 rounded-lg">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-medium text-slate-400">Cargando catálogo de vehículos...</span>
        </div>
      ) : viewMode === 'tree' ? (
        /* ========================================================================= */
        /* VISTA 1: ÁRBOL VERTICAL (MARCAS UNA ABAJO DE LA OTRA -> MODELOS -> VERS.) */
        /* ========================================================================= */
        <div className="space-y-2.5">
          {displayHierarchy.length > 0 ? (
            displayHierarchy.map((brand) => {
              const isBrandExpanded = expandedBrands.has(brand.marca);

              return (
                <div
                  key={brand.marca}
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all shadow-sm"
                >
                  {/* NIVEL 1: CABECERA DE LA MARCA (CLICKABLE PARA DESPLEGAR SUS MODELOS) */}
                  <div
                    onClick={() => toggleBrandExpand(brand.marca)}
                    className="p-3.5 bg-slate-950/90 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between gap-3 select-none transition-colors border-b border-transparent data-[expanded=true]:border-slate-800"
                    data-expanded={isBrandExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm tracking-tight">
                            {brand.marca}
                          </h3>
                          <span className="bg-blue-500/15 text-blue-300 text-[11px] font-mono font-bold px-2 py-0.2 rounded border border-blue-500/30">
                            {brand.totalModelos} {brand.totalModelos === 1 ? 'modelo' : 'modelos'}
                          </span>
                          <span className="bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.2 rounded border border-slate-700 hidden sm:inline">
                            {brand.totalAplicaciones} filtros asociados
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModalForModel(brand.marca);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1"
                        title={`Asociar un filtro a ${brand.marca}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:text-white" />
                        <span>+ Asociar</span>
                      </button>

                      <div className="w-6 h-6 rounded flex items-center justify-center text-slate-400">
                        {isBrandExpanded ? (
                          <ChevronDown className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NIVEL 2: MODELOS DESPLEGADOS VERTICALMENTE DENTRO DE LA MARCA */}
                  {isBrandExpanded && (
                    <div className="p-3 bg-slate-950/40 space-y-2 border-l-2 border-blue-500/40 ml-4 my-2 pl-3 animate-fade-in">
                      {brand.modelos.map((m) => {
                        const isModelExpanded = expandedModels.has(`${brand.marca}__${m.modelo}`);

                        return (
                          <div
                            key={m.modelo}
                            className="bg-slate-900 border border-slate-800/90 rounded-md overflow-hidden transition-all shadow-sm"
                          >
                            {/* MODEL HEADER ACCORDION BAR */}
                            <div
                              onClick={() => toggleModelExpand(brand.marca, m.modelo)}
                              className="p-2.5 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between gap-3 select-none transition-colors border-b border-transparent data-[expanded=true]:border-slate-800"
                              data-expanded={isModelExpanded}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                  <Car className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-semibold text-white text-xs tracking-tight">
                                  {m.modelo}
                                </span>
                                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.2 rounded border border-slate-700">
                                  {m.totalAplicaciones} {m.totalAplicaciones === 1 ? 'filtro' : 'filtros'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddModalForModel(brand.marca, m.modelo);
                                  }}
                                  className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-semibold rounded transition-colors flex items-center gap-1"
                                  title="Asociar un repuesto a este modelo"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Filtro</span>
                                </button>

                                <span className="text-slate-400 p-0.5">
                                  {isModelExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                                </span>
                              </div>
                            </div>

                            {/* NIVEL 3: DESGLOSE DE VERSIONES & FILTROS ASOCIADOS */}
                            {isModelExpanded && (
                              <div className="p-3 bg-slate-900/90 animate-fade-in">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800 pb-1">
                                        <th className="pb-2 pl-2">Versión / Motorización</th>
                                        <th className="pb-2">Año / Rango</th>
                                        <th className="pb-2">Filtro Asociado</th>
                                        <th className="pb-2">Categoría</th>
                                        <th className="pb-2 text-right pr-2">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                      {m.aplicaciones.map((app) => {
                                        const catInfo = getCategoriaBadge(app.product?.categoria);

                                        return (
                                          <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2 pl-2 font-medium text-white">
                                              {app.version || 'Todas las motorizaciones'}
                                            </td>
                                            <td className="py-2 font-mono text-slate-400">
                                              {app.año || 'Todos los años'}
                                            </td>
                                            <td className="py-2">
                                              <div className="flex items-center gap-2">
                                                <Link
                                                  href={`/admin/producto/${encodeURIComponent(app.filtro_asociado)}`}
                                                  className="font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                  {app.filtro_asociado}
                                                </Link>
                                                {app.product?.titulo_producto && (
                                                  <span className="text-[11px] text-slate-400 truncate max-w-xs hidden sm:inline">
                                                    · {app.product.titulo_producto}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catInfo.badgeClass}`}>
                                                {catInfo.label}
                                              </span>
                                            </td>
                                            <td className="py-2 text-right pr-2">
                                              <button
                                                onClick={() => setVehToDelete({
                                                  id: app.id,
                                                  marca: brand.marca,
                                                  modelo: m.modelo,
                                                  version: app.version,
                                                  año: app.año,
                                                  filtro_asociado: app.filtro_asociado,
                                                })}
                                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                title="Eliminar asociación"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-lg">
              <Car className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium">No se encontraron marcas ni modelos para &quot;{searchTerm}&quot;.</p>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: LISTA PLANA TRADICIONAL                                          */
        /* ========================================================================= */
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="p-3">Marca Vehículo</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Versión / Motor</th>
                  <th className="p-3">Año</th>
                  <th className="p-3">Filtro Asociado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {paginatedFlatList.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-white">{v.marca}</td>
                    <td className="p-3 font-semibold text-blue-400">{v.modelo}</td>
                    <td className="p-3 text-slate-300">{v.version || '-'}</td>
                    <td className="p-3 font-mono text-slate-400">{v.año || '-'}</td>
                    <td className="p-3 font-mono font-bold text-white">
                      <Link
                        href={`/admin/producto/${encodeURIComponent(v.filtro_asociado)}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {v.filtro_asociado}
                      </Link>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setVehToDelete(v)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar asociación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN FLAT */}
          {totalFlatPages > 1 && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Página <strong className="text-white">{currentFlatPage}</strong> de <strong className="text-white">{totalFlatPages}</strong> ({filteredFlatList.length} registros)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentFlatPage((p) => Math.max(1, p - 1))}
                  disabled={currentFlatPage === 1}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white">
                  {currentFlatPage} / {totalFlatPages}
                </span>

                <button
                  onClick={() => setCurrentFlatPage((p) => Math.min(totalFlatPages, p + 1))}
                  disabled={currentFlatPage === totalFlatPages}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR ASOCIACIÓN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleAddVehiculo} className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Asociar Vehículo a Filtro</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SELECTOR DE MODO */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setVehFormMode('existing')}
                className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  vehFormMode === 'existing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Marca/Modelo del Catálogo</span>
              </button>

              <button
                type="button"
                onClick={() => setVehFormMode('custom')}
                className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  vehFormMode === 'custom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Crear Marca/Modelo Nuevo</span>
              </button>
            </div>

            {vehFormMode === 'existing' ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Marca Existente *
                    </label>
                    <select
                      value={newMarca}
                      onChange={(e) => handleBrandDropdownChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 cursor-pointer uppercase"
                    >
                      {masterBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Modelo *
                    </label>
                    {isCustomModelSelected ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={customModelText}
                          onChange={(e) => setCustomModelText(e.target.value)}
                          placeholder="Escribí el nuevo modelo..."
                          className="w-full p-2.5 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomModelSelected(false)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={newModelo}
                        onChange={(e) => handleModelDropdownChange(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {(masterModelsMap[newMarca] || []).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__CUSTOM_MODEL__">
                          + Escribir otro modelo para {newMarca}...
                        </option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="Ej: 2.8 TDi 204cv"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newAño}
                      onChange={(e) => setNewAño(e.target.value)}
                      placeholder="Ej: 2015 →"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Marca Nueva *</label>
                    <input
                      type="text"
                      value={newMarca}
                      onChange={(e) => setNewMarca(e.target.value.toUpperCase())}
                      placeholder="Ej: TESLA, BYD, AUDI"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Modelo Nuevo *</label>
                    <input
                      type="text"
                      value={newModelo}
                      onChange={(e) => setNewModelo(e.target.value)}
                      placeholder="Ej: Model 3, Dolphin, A4"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="Ej: Long Range / Dual Motor"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newAño}
                      onChange={(e) => setNewAño(e.target.value)}
                      placeholder="Ej: 2022 →"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Código Producto FiltrAr *
              </label>
              <input
                type="text"
                value={newFiltroCode}
                onChange={(e) => setNewFiltroCode(e.target.value.toUpperCase())}
                placeholder="Ej: AF-205, KIT-01, OF-711T"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                required
              />
              {newFiltroCode && productsMap[newFiltroCode.toUpperCase()] && (
                <p className="text-[11px] text-emerald-400 mt-1">
                  ✓ {productsMap[newFiltroCode.toUpperCase()].titulo_producto} ({productsMap[newFiltroCode.toUpperCase()].categoria})
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {adding ? 'Guardando...' : 'Asociar Vehículo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!vehToDelete}
        title="¿Eliminar asociación de vehículo?"
        message={`¿Estás seguro de desasociar ${vehToDelete?.marca} ${vehToDelete?.modelo} del producto ${vehToDelete?.filtro_asociado}?`}
        confirmLabel="Eliminar Asociación"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setVehToDelete(null)}
      />

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
