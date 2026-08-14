'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Package,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizarMarcaCompetidor, normalizarCodigoCruza } from '@/lib/normalization';
import { normalizarImagenes } from '@/lib/utils';
import ConfirmModal from '../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

interface EquivalenciaRow {
  id: number;
  producto_codigo: string;
  marca_competidor: string;
  codigo_competidor: string;
}

interface ProductInfo {
  codigo_filtrar: string;
  titulo_producto: string | null;
  categoria: string | null;
  marca_filtro: string | null;
  imagen_url: string | string[] | null;
}

interface GroupedProduct {
  producto_codigo: string;
  titulo_producto: string;
  categoria: string;
  marca_filtro: string;
  imagen_url: string | string[] | null;
  cruces: EquivalenciaRow[];
}

const PAGE_SIZE = 25;

// Colores semánticos por marca competidora para badges visuales
function getCompetitorBadgeStyle(marcaRaw: string) {
  const m = (marcaRaw || '').toUpperCase();
  if (m === 'WEGA') {
    return 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25';
  }
  if (m === 'MANN' || m === 'MANN-FILTER') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25';
  }
  if (m === 'FRAM') {
    return 'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25';
  }
  if (m === 'OEM' || m === 'ORIGINAL') {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
  }
  if (m === 'MARENO') {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25';
  }
  if (m === 'TECNECO' || m === 'MASTERFILT' || m === 'MAHLE') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
}

export default function AdminEquivalenciasPage() {
  const [equivalencias, setEquivalencias] = useState<EquivalenciaRow[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);

  // View mode: 'grouped' (por producto) vs 'flat' (lista 1 a 1)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('Todas');
  const [coverageFilter, setCoverageFilter] = useState<'todos' | 'con_cruces' | 'sin_cruces'>('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdCode, setNewProdCode] = useState('');
  const [newMarcaComp, setNewMarcaComp] = useState('WEGA');
  const [newCodComp, setNewCodComp] = useState('');
  const [adding, setAdding] = useState(false);

  // Delete modal state
  const [equivToDelete, setEquivToDelete] = useState<EquivalenciaRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Fetch all equivalences + products for rich context
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all products metadata
      const prodsMap: Record<string, ProductInfo> = {};
      let pOffset = 0;
      let hasMoreProds = true;

      while (hasMoreProds) {
        const { data, error } = await supabase
          .from('productos_filtrar')
          .select('codigo_filtrar, titulo_producto, categoria, marca_filtro, imagen_url')
          .range(pOffset, pOffset + 999);

        if (error || !data) break;
        data.forEach((p) => {
          if (p.codigo_filtrar) {
            prodsMap[p.codigo_filtrar.toUpperCase()] = p as ProductInfo;
          }
        });
        hasMoreProds = data.length === 1000;
        pOffset += 1000;
      }
      setProductsMap(prodsMap);

      // 2. Fetch all equivalences
      const allRows: EquivalenciaRow[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('equivalencias_cruza')
          .select('id, producto_codigo, marca_competidor, codigo_competidor')
          .order('id', { ascending: false })
          .range(offset, offset + 999);

        if (error || !data) break;
        allRows.push(...(data as EquivalenciaRow[]));
        hasMore = data.length === 1000;
        offset += 1000;
      }

      setEquivalencias(allRows);
    } catch (err) {
      console.error('Error fetching equivalencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Top competitor brands with count
  const brandStats = useMemo(() => {
    const counts: Record<string, number> = {};
    equivalencias.forEach((e) => {
      if (e.marca_competidor) {
        const m = e.marca_competidor.toUpperCase();
        counts[m] = (counts[m] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [equivalencias]);

  // Grouped products matrix
  const groupedProducts = useMemo(() => {
    // Group all equivalences by product_codigo
    const mapCruces: Record<string, EquivalenciaRow[]> = {};
    equivalencias.forEach((e) => {
      const code = (e.producto_codigo || '').toUpperCase();
      if (!mapCruces[code]) mapCruces[code] = [];
      mapCruces[code].push(e);
    });

    // Build complete list combining registered products + any orphan equivalence codes
    const allCodes = new Set([
      ...Object.keys(productsMap),
      ...Object.keys(mapCruces),
    ]);

    const result: GroupedProduct[] = [];
    allCodes.forEach((code) => {
      const prod = productsMap[code];
      const cruces = mapCruces[code] || [];

      result.push({
        producto_codigo: code,
        titulo_producto: prod?.titulo_producto || `Filtro ${code}`,
        categoria: prod?.categoria || 'Sin categoría',
        marca_filtro: prod?.marca_filtro || 'FiltrAr',
        imagen_url: prod?.imagen_url || null,
        cruces,
      });
    });

    // Sort by code or count
    return result.sort((a, b) => b.cruces.length - a.cruces.length || a.producto_codigo.localeCompare(b.producto_codigo));
  }, [equivalencias, productsMap]);

  // Filtered Grouped Products
  const filteredGrouped = useMemo(() => {
    return groupedProducts.filter((p) => {
      // Coverage filter
      if (coverageFilter === 'con_cruces' && p.cruces.length === 0) return false;
      if (coverageFilter === 'sin_cruces' && p.cruces.length > 0) return false;

      // Brand filter
      if (selectedMarca !== 'Todas') {
        const hasBrand = p.cruces.some((c) => c.marca_competidor.toUpperCase() === selectedMarca.toUpperCase());
        if (!hasBrand) return false;
      }

      // Search text (matches own code, title, or competitor code)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codeMatch = p.producto_codigo.toLowerCase().includes(term);
        const titleMatch = p.titulo_producto.toLowerCase().includes(term);
        const crossMatch = p.cruces.some(
          (c) =>
            c.codigo_competidor.toLowerCase().includes(term) ||
            c.marca_competidor.toLowerCase().includes(term)
        );
        if (!codeMatch && !titleMatch && !crossMatch) return false;
      }

      return true;
    });
  }, [groupedProducts, coverageFilter, selectedMarca, searchTerm]);

  // Filtered Flat List (for flat table view)
  const filteredFlatEquivalencias = useMemo(() => {
    return equivalencias.filter((e) => {
      if (selectedMarca !== 'Todas' && e.marca_competidor.toUpperCase() !== selectedMarca.toUpperCase()) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const prod = (e.producto_codigo || '').toLowerCase();
        const comp = (e.codigo_competidor || '').toLowerCase();
        const prodInfo = productsMap[e.producto_codigo.toUpperCase()];
        const title = (prodInfo?.titulo_producto || '').toLowerCase();
        if (!prod.includes(term) && !comp.includes(term) && !title.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [equivalencias, selectedMarca, searchTerm, productsMap]);

  // Pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMarca, coverageFilter, viewMode]);

  const totalItems = viewMode === 'grouped' ? filteredGrouped.length : filteredFlatEquivalencias.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  const paginatedGrouped = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredGrouped.slice(start, start + PAGE_SIZE);
  }, [filteredGrouped, currentPage]);

  const paginatedFlat = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFlatEquivalencias.slice(start, start + PAGE_SIZE);
  }, [filteredFlatEquivalencias, currentPage]);

  const totalWithCrosses = useMemo(() => {
    return groupedProducts.filter((p) => p.cruces.length > 0).length;
  }, [groupedProducts]);

  const totalWithoutCrosses = useMemo(() => {
    return groupedProducts.filter((p) => p.cruces.length === 0).length;
  }, [groupedProducts]);

  // Open Add Modal prefilled for a product
  const openAddModalForProduct = (prodCode: string) => {
    setNewProdCode(prodCode);
    setNewMarcaComp('WEGA');
    setNewCodComp('');
    setShowAddModal(true);
  };

  // Handle Add
  const handleAddEquivalencia = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanProd = newProdCode.trim().toUpperCase();
    const cleanMarca = normalizarMarcaCompetidor(newMarcaComp);
    const cleanCod = newCodComp.trim().toUpperCase();
    const normCod = normalizarCodigoCruza(cleanCod);

    if (!cleanProd || !cleanMarca || !cleanCod) return;
    setAdding(true);

    try {
      // Check if product exists
      const { data: prodCheck } = await supabase
        .from('productos_filtrar')
        .select('codigo_filtrar')
        .eq('codigo_filtrar', cleanProd)
        .maybeSingle();

      if (!prodCheck) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto no existe', message: `El código "${cleanProd}" no existe en el catálogo.` });
        setAdding(false);
        return;
      }

      const newRow = {
        producto_codigo: cleanProd,
        marca_competidor: cleanMarca,
        codigo_competidor: cleanCod,
        codigo_competidor_normalizado: normCod,
      };

      const { data, error } = await supabase
        .from('equivalencias_cruza')
        .insert([newRow])
        .select()
        .single();

      if (error) throw error;

      setEquivalencias((prev) => [data as EquivalenciaRow, ...prev]);
      setShowAddModal(false);
      setNewProdCode('');
      setNewCodComp('');
      setToast({ id: Date.now().toString(), type: 'success', title: 'Equivalencia agregada', message: `${cleanProd} ↔ ${cleanMarca} ${cleanCod}` });
    } catch (err: any) {
      const isUniqueError = err?.code === '23505' || err?.message?.includes('duplicate') || err?.message?.includes('uq_equivalencia_cruza');
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: isUniqueError ? 'Equivalencia ya existente' : 'Error al agregar',
        message: isUniqueError
          ? `La equivalencia ${cleanProd} ↔ ${cleanMarca} ${cleanCod} ya está registrada en el sistema.`
          : err.message,
      });
    } finally {
      setAdding(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!equivToDelete) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('equivalencias_cruza')
        .delete()
        .eq('id', equivToDelete.id);

      if (error) throw error;

      setEquivalencias((prev) => prev.filter((e) => e.id !== equivToDelete.id));

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Equivalencia eliminada',
        message: `Se eliminó el cruce ${equivToDelete.producto_codigo} ↔ ${equivToDelete.marca_competidor} ${equivToDelete.codigo_competidor}`,
      });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
    } finally {
      setDeleting(false);
      setEquivToDelete(null);
    }
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedMarca !== 'Todas' ||
    coverageFilter !== 'todos';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedMarca('Todas');
    setCoverageFilter('todos');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              <span>Matriz de Equivalencias</span>
            </h1>
            <span className="bg-slate-800 text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-700">
              {equivalencias.length.toLocaleString()} cruces activos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Correspondencias directas entre repuestos FiltrAr y marcas competidoras (Wega, Mann, Fram, OEM, Mareno).
          </p>
        </div>

        {/* ACCIONES Y SELECTOR DE VISTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* SELECTOR DE MODO DE VISTA */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista agrupada por producto con todas sus marcas cruzadas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Por Producto</span>
            </button>

            <button
              onClick={() => setViewMode('flat')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'flat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista en tabla de filas individuales 1 a 1"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Plana</span>
            </button>
          </div>

          <button
            onClick={() => {
              setNewProdCode('');
              setNewMarcaComp('WEGA');
              setNewCodComp('');
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cruce</span>
          </button>
        </div>
      </div>

      {/* TABS DE COBERTURA DE CATÁLOGO */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setCoverageFilter('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            coverageFilter === 'todos'
              ? 'bg-blue-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
          }`}
        >
          <span>Todos los Productos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${coverageFilter === 'todos' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {groupedProducts.length}
          </span>
        </button>

        <button
          onClick={() => setCoverageFilter('con_cruces')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            coverageFilter === 'con_cruces'
              ? 'bg-emerald-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Con Cruces Cargados</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${coverageFilter === 'con_cruces' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {totalWithCrosses}
          </span>
        </button>

        <button
          onClick={() => setCoverageFilter('sin_cruces')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            coverageFilter === 'sin_cruces'
              ? 'bg-amber-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Sin Equivalencias (Faltantes)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${coverageFilter === 'sin_cruces' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {totalWithoutCrosses}
          </span>
        </button>
      </div>

      {/* TOOLBAR DE BÚSQUEDA Y FILTRO DE MARCAS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-sm space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          {/* SEARCH INPUT */}
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código FiltrAr (AF-205), competidor (WO-180, C24005) o modelo..."
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

          {/* SELECT MARCA */}
          <div className="sm:col-span-4">
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="Todas">Marca Competidor: Todas ({equivalencias.length})</option>
              {brandStats.map(([marca, count]) => (
                <option key={marca} value={marca}>
                  {marca} ({count} cruces)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS SUMMARY */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-300 text-[11px]">Filtros:</span>
              {selectedMarca !== 'Todas' && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  Marca: {selectedMarca}
                  <button onClick={() => setSelectedMarca('Todas')} className="hover:text-white">✕</button>
                </span>
              )}
              {coverageFilter !== 'todos' && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  Estado: {coverageFilter === 'con_cruces' ? 'Con Cruces' : 'Sin Cruces'}
                  <button onClick={() => setCoverageFilter('todos')} className="hover:text-white">✕</button>
                </span>
              )}
              {searchTerm && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  &quot;{searchTerm}&quot;
                  <button onClick={() => setSearchTerm('')} className="hover:text-white">✕</button>
                </span>
              )}
              <span className="text-slate-500 font-mono text-[11px]">
                ({totalItems} {viewMode === 'grouped' ? 'productos' : 'cruces'})
              </span>
            </div>

            <button
              onClick={resetAllFilters}
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL: VISTA AGRUPADA vs VISTA PLANA */}
      {loading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3 bg-slate-900 border border-slate-800 rounded-lg">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-medium text-slate-400">Cargando matriz de equivalencias...</span>
        </div>
      ) : totalItems > 0 ? (
        viewMode === 'grouped' ? (
          /* ========================================================================= */
          /* VISTA AGRUPADA POR PRODUCTO (MATRIZ CLARA Y ACCESIBLE)                   */
          /* ========================================================================= */
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm divide-y divide-slate-800/80">
            {paginatedGrouped.map((prod) => {
              const imgs = normalizarImagenes(prod.imagen_url);

              return (
                <div
                  key={prod.producto_codigo}
                  className="p-3.5 sm:p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* COLUMNA 1: INFO DE PRODUCTO FILTRAR */}
                  <div className="flex items-start gap-3 min-w-[260px] max-w-sm shrink-0">
                    <Link
                      href={`/admin/producto/${encodeURIComponent(prod.producto_codigo)}`}
                      className="w-10 h-10 rounded-md bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 hover:border-blue-500 transition-colors block mt-0.5"
                    >
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={prod.producto_codigo} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-600" />
                      )}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(prod.producto_codigo)}`}
                          className="font-mono font-bold text-white text-xs hover:text-blue-400 transition-colors"
                        >
                          {prod.producto_codigo}
                        </Link>
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.2 rounded border border-slate-700">
                          {prod.categoria}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        {prod.titulo_producto}
                      </p>
                    </div>
                  </div>

                  {/* COLUMNA 2: LISTA DE CRUCES CON BADGES DE COLORES */}
                  <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                    {prod.cruces.length > 0 ? (
                      prod.cruces.map((c) => {
                        const badgeStyle = getCompetitorBadgeStyle(c.marca_competidor);

                        return (
                          <span
                            key={c.id}
                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${badgeStyle}`}
                          >
                            <span className="font-bold uppercase tracking-wider text-[10px] opacity-80">
                              {c.marca_competidor}:
                            </span>
                            <span className="font-mono font-bold text-white">
                              {c.codigo_competidor}
                            </span>
                            <button
                              onClick={() => setEquivToDelete(c)}
                              className="opacity-40 group-hover:opacity-100 hover:text-red-400 hover:scale-110 transition-all ml-0.5"
                              title={`Eliminar cruce con ${c.marca_competidor} ${c.codigo_competidor}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" />
                        Sin equivalencias registradas para este código.
                      </span>
                    )}
                  </div>

                  {/* COLUMNA 3: ACCIONES RÁPIDAS */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    <button
                      onClick={() => openAddModalForProduct(prod.producto_codigo)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                      title="Agregar otra marca competidora a este producto"
                    >
                      <Plus className="w-3 h-3 text-blue-400" />
                      <span>+ Cruce</span>
                    </button>

                    <Link
                      href={`/admin/producto/${encodeURIComponent(prod.producto_codigo)}`}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                      title="Ver ficha completa de producto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* VISTA EN LISTA PLANA (TABLA 1 A 1 CON CONTEXTO ENRIQUECIDO)               */
          /* ========================================================================= */
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="p-3">Código FiltrAr</th>
                    <th className="p-3">Título / Producto</th>
                    <th className="p-3">Marca Competidor</th>
                    <th className="p-3">Código Competidor</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {paginatedFlat.map((eq) => {
                    const prodInfo = productsMap[eq.producto_codigo.toUpperCase()];
                    const badgeStyle = getCompetitorBadgeStyle(eq.marca_competidor);

                    return (
                      <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-white">
                          <Link
                            href={`/admin/producto/${encodeURIComponent(eq.producto_codigo)}`}
                            className="hover:text-blue-400 transition-colors"
                          >
                            {eq.producto_codigo}
                          </Link>
                        </td>
                        <td className="p-3 text-slate-300">
                          {prodInfo?.titulo_producto || '-'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                            {eq.marca_competidor}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-white text-xs">
                          {eq.codigo_competidor}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEquivToDelete(eq)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Eliminar equivalencia"
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
        )
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400 space-y-2">
          <ArrowLeftRight className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs font-medium">No se encontraron equivalencias con los filtros actuales.</div>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      )}

      {/* PAGINACIÓN ELEGANTE */}
      {totalPages > 1 && (
        <div className="p-3 border border-slate-800 bg-slate-900 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Mostrando <strong className="text-white">{(currentPage - 1) * PAGE_SIZE + 1}</strong> a{' '}
            <strong className="text-white">
              {Math.min(currentPage * PAGE_SIZE, totalItems)}
            </strong>{' '}
            de <strong className="text-white">{totalItems}</strong> {viewMode === 'grouped' ? 'productos' : 'cruces'}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Primera página"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono font-bold text-white">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Última página"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR EQUIVALENCIA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleAddEquivalencia} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Nueva Equivalencia</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Código Producto FiltrAr *
                </label>
                <input
                  type="text"
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value.toUpperCase())}
                  placeholder="Ej: AF-205"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
                {newProdCode && productsMap[newProdCode.toUpperCase()] && (
                  <p className="text-[11px] text-emerald-400 mt-1">
                    ✓ {productsMap[newProdCode.toUpperCase()].titulo_producto}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Marca Competidor *
                </label>
                <input
                  type="text"
                  value={newMarcaComp}
                  onChange={(e) => setNewMarcaComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WEGA, FRAM, MANN, OEM, MARENO"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Código Competidor *
                </label>
                <input
                  type="text"
                  value={newCodComp}
                  onChange={(e) => setNewCodComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WO-180, CA1000, C24005"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-medium text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>
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
                {adding ? 'Guardando...' : 'Guardar Cruce'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!equivToDelete}
        title="¿Eliminar equivalencia?"
        message={`¿Estás seguro de eliminar el cruce entre ${equivToDelete?.producto_codigo} y ${equivToDelete?.marca_competidor} ${equivToDelete?.codigo_competidor}?`}
        confirmLabel="Eliminar Equivalencia"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setEquivToDelete(null)}
      />

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
