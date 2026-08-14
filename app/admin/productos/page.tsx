'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Layers,
  CheckSquare,
  Square,
  DollarSign,
  Tag,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  FileSpreadsheet,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { formatearPrecio, normalizarImagenes } from '@/lib/utils';
import { getOcultarPreciosGlobal, setOcultarPreciosGlobal, debeOcultarPrecio } from '@/lib/preciosConfig';
import { CATEGORIAS_FILTRO } from '@/lib/constants';
import ConfirmModal from '../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

const PAGE_SIZE = 25;

// Tabs de categorías con nombres cortos y legibles
const TABS_CATEGORIAS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'Filtros de Aceite', label: 'Aceite' },
  { key: 'Filtros de Aire', label: 'Aire' },
  { key: 'Filtros de Combustible', label: 'Combustible' },
  { key: 'Filtros de Habitáculo', label: 'Habitáculo' },
  { key: 'Filtros de Inyección', label: 'Inyección' },
  { key: 'Kits de Filtros', label: 'Kits' },
  { key: 'Filtros Varios', label: 'Varios' },
];

// Helper visual para badges de categoría con colores semánticos
function getCategoriaBadge(catRaw: string | null) {
  const cat = (catRaw || '').toLowerCase();
  if (cat.includes('aceite')) {
    return {
      label: 'Aceite',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dotClass: 'bg-amber-400',
    };
  }
  if (cat.includes('aire')) {
    return {
      label: 'Aire',
      badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
      dotClass: 'bg-sky-400',
    };
  }
  if (cat.includes('combustible')) {
    return {
      label: 'Combustible',
      badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
    };
  }
  if (cat.includes('habitaculo') || cat.includes('habitáculo')) {
    return {
      label: 'Habitáculo',
      badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      dotClass: 'bg-purple-400',
    };
  }
  if (cat.includes('inyeccion') || cat.includes('inyección')) {
    return {
      label: 'Inyección',
      badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      dotClass: 'bg-cyan-400',
    };
  }
  if (cat.includes('kit')) {
    return {
      label: 'Kit',
      badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      dotClass: 'bg-indigo-400',
    };
  }
  return {
    label: catRaw || 'Varios',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-400',
  };
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('TODOS');
  const [selectedMarca, setSelectedMarca] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos' | 'codigo' | 'precio_asc' | 'precio_desc'>('recientes');
  const [currentPage, setCurrentPage] = useState(1);

  const [ocultarGlobal, setOcultarGlobal] = useState(false);

  useEffect(() => {
    getOcultarPreciosGlobal().then(setOcultarGlobal);
  }, []);

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPriceChange, setBulkPriceChange] = useState<number | ''>('');
  const [bulkPriceVisibility, setBulkPriceVisibility] = useState<'no_change' | 'mostrar' | 'ocultar'>('no_change');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState<Filtro | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Fetch all products
  const fetchProductos = async () => {
    setLoading(true);
    try {
      const allRows: Filtro[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('productos_filtrar')
          .select('*')
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error || !data) break;
        allRows.push(...(data as Filtro[]));
        hasMore = data.length === pageSize;
        offset += pageSize;
      }

      setProductos(allRows);
    } catch (err) {
      console.error('Error fetching productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  // Dinámico: obtener todas las marcas presentes en la lista de productos
  const marcasFiltro = useMemo(() => {
    const brandSet = new Set<string>();
    productos.forEach((p) => {
      if (p.marca_filtro) brandSet.add(p.marca_filtro.trim());
    });
    return ['Todas', ...Array.from(brandSet).sort()];
  }, [productos]);

  // Conteo por categoría para los tabs de navegación rápida
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: productos.length };
    productos.forEach((p) => {
      const cat = (p.categoria || '').toLowerCase();
      TABS_CATEGORIAS.forEach((t) => {
        if (t.key === 'TODOS') return;
        const sel = t.label.toLowerCase();
        if (cat.includes(sel) || cat.includes(t.key.toLowerCase())) {
          counts[t.key] = (counts[t.key] || 0) + 1;
        }
      });
    });
    return counts;
  }, [productos]);

  // Filtered products list
  const filteredProductos = useMemo(() => {
    const list = productos.filter((p) => {
      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codigo = (p.codigo_filtrar || '').toLowerCase();
        const titulo = (p.titulo_producto || '').toLowerCase();
        const desc = (p.descripcion_aplicacion || '').toLowerCase();
        const equiv = (p.equivalencias || '').toLowerCase();
        if (!codigo.includes(term) && !titulo.includes(term) && !desc.includes(term) && !equiv.includes(term)) {
          return false;
        }
      }

      // Category
      if (selectedCategoria !== 'TODOS' && selectedCategoria !== 'Todas') {
        const cat = (p.categoria || '').toLowerCase();
        const tab = TABS_CATEGORIAS.find((t) => t.key === selectedCategoria);
        const sel = tab ? tab.label.toLowerCase() : selectedCategoria.toLowerCase().replace(/^filtros de\s+/i, '');
        if (!cat.includes(sel) && !cat.includes(selectedCategoria.toLowerCase())) {
          return false;
        }
      }

      // Brand
      if (selectedMarca !== 'Todas' && p.marca_filtro !== selectedMarca) {
        return false;
      }

      // Status
      if (statusFilter === 'activos' && p.activo === false) return false;
      if (statusFilter === 'inactivos' && p.activo !== false) return false;

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'recientes') {
        return (b.id || 0) - (a.id || 0);
      }
      if (sortBy === 'antiguos') {
        return (a.id || 0) - (b.id || 0);
      }
      if (sortBy === 'codigo') {
        return (a.codigo_filtrar || '').localeCompare(b.codigo_filtrar || '');
      }
      if (sortBy === 'precio_asc') {
        return (a.precio || 0) - (b.precio || 0);
      }
      if (sortBy === 'precio_desc') {
        return (b.precio || 0) - (a.precio || 0);
      }
      return 0;
    });
  }, [productos, searchTerm, selectedCategoria, selectedMarca, statusFilter, sortBy]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, selectedCategoria, selectedMarca, statusFilter, sortBy]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCategoria !== 'TODOS' ||
    selectedMarca !== 'Todas' ||
    statusFilter !== 'todos' ||
    sortBy !== 'recientes';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategoria('TODOS');
    setSelectedMarca('Todas');
    setStatusFilter('todos');
    setSortBy('recientes');
    setCurrentPage(1);
  };

  // Paginated list
  const totalPages = Math.ceil(filteredProductos.length / PAGE_SIZE) || 1;
  const paginatedProductos = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProductos.slice(start, start + PAGE_SIZE);
  }, [filteredProductos, currentPage]);

  // Toggle active status
  const handleToggleActivo = async (producto: Filtro) => {
    const nuevoEstado = producto.activo === false ? true : false;
    try {
      const { error } = await supabase
        .from('productos_filtrar')
        .update({ activo: nuevoEstado })
        .eq('id', producto.id);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, activo: nuevoEstado } : p))
      );

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: `Producto ${nuevoEstado ? 'activado' : 'desactivado'}`,
        message: `El código ${producto.codigo_filtrar} ahora está ${nuevoEstado ? 'visible' : 'oculto'} en la web.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error al cambiar estado',
        message: err.message,
      });
    }
  };

  // Toggle ocultar precio individual con soporte de excepciones
  const handleToggleOcultarPrecio = async (producto: Filtro) => {
    let nuevoValorOcultar: boolean | null = null;

    if (ocultarGlobal) {
      nuevoValorOcultar = producto.ocultar_precio === false ? null : false;
    } else {
      nuevoValorOcultar = producto.ocultar_precio === true ? null : true;
    }

    try {
      const { error } = await supabase
        .from('productos_filtrar')
        .update({ ocultar_precio: nuevoValorOcultar })
        .eq('id', producto.id);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, ocultar_precio: nuevoValorOcultar } : p))
      );

      const esVisibleAhora = !debeOcultarPrecio({ ...producto, ocultar_precio: nuevoValorOcultar }, ocultarGlobal);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: `Precio de ${producto.codigo_filtrar}`,
        message: esVisibleAhora
          ? `El precio de ${producto.codigo_filtrar} ahora está VISIBLE ${ocultarGlobal ? '(Excepción al ocultamiento global)' : ''}.`
          : `El precio de ${producto.codigo_filtrar} ahora está OCULTADO.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error al cambiar visibilidad del precio',
        message: err.message,
      });
    }
  };

  // Delete product
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('productos_filtrar')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProductos((prev) => prev.filter((p) => p.id !== productToDelete.id));

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Producto eliminado',
        message: `El producto ${productToDelete.codigo_filtrar} fue eliminado correctamente.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error al eliminar',
        message: err.message,
      });
    } finally {
      setDeleting(false);
      setProductToDelete(null);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProductos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProductos.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Edit execute
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);

    try {
      const idsArray = Array.from(selectedIds);
      const updatePayload: Record<string, any> = {};

      if (bulkCategory) {
        updatePayload.categoria = bulkCategory;
      }
      if (bulkPriceChange !== '') {
        updatePayload.precio = Number(bulkPriceChange);
      }
      if (bulkPriceVisibility === 'ocultar') {
        updatePayload.ocultar_precio = true;
      } else if (bulkPriceVisibility === 'mostrar') {
        updatePayload.ocultar_precio = false;
      }

      if (Object.keys(updatePayload).length === 0) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Sin cambios', message: 'Seleccioná al menos una propiedad para modificar.' });
        setBulkLoading(false);
        return;
      }

      const { error } = await supabase
        .from('productos_filtrar')
        .update(updatePayload)
        .in('id', idsArray);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, ...updatePayload } : p))
      );

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Edición masiva completada',
        message: `Se actualizaron ${selectedIds.size} productos correctamente.`,
      });

      setSelectedIds(new Set());
      setShowBulkModal(false);
      setBulkCategory('');
      setBulkPriceChange('');
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error en edición masiva',
        message: err.message,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestión de Productos
            </h1>
            <span className="bg-slate-800 text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-700">
              {productos.length.toLocaleString()} items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Administrá precios, categorías, estados y compatibilidades del catálogo general.
          </p>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm animate-fade-in"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Editar ({selectedIds.size})</span>
            </button>
          )}

          <Link
            href="/admin/importar"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importar Planilla</span>
          </Link>

          <Link
            href="/admin/producto/nuevo"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Link>
        </div>
      </div>

      {/* BARRA COMPACTA DE CONTROL GLOBAL DE PRECIOS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
            ocultarGlobal
              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {ocultarGlobal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                Visibilidad Global de Precios
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                ocultarGlobal
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {ocultarGlobal ? 'Precios Ocultos' : 'Precios Visibles'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {ocultarGlobal
                ? 'La web pública muestra "Consultar Precio" en los repuestos (excepto excepciones individuales).'
                : 'La web pública muestra los precios numéricos en ARS.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            const nuevoEstado = !ocultarGlobal;
            setOcultarGlobal(nuevoEstado);

            if (nuevoEstado) {
              setProductos((prev) =>
                prev.map((p) => ({
                  ...p,
                  ocultar_precio: p.ocultar_precio === false ? null : p.ocultar_precio,
                }))
              );
            }

            await setOcultarPreciosGlobal(nuevoEstado);
            setToast({
              id: Date.now().toString(),
              type: 'success',
              title: nuevoEstado ? 'Precios ocultos globalmente' : 'Precios visibles globalmente',
              message: nuevoEstado
                ? 'El catálogo ahora muestra "Consultar Precio". Podés hacer clic en el ojo de cada producto para marcarlo como excepción visible.'
                : 'Se muestran los precios numéricos en la web pública.',
            });
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 border ${
            ocultarGlobal
              ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          {ocultarGlobal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{ocultarGlobal ? 'Restablecer Precios Visibles' : 'Ocultar Precios Globalmente'}</span>
        </button>
      </div>

      {/* TABS DE CATEGORÍAS (CLEAN SEGMENTED NAV) */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {TABS_CATEGORIAS.map((tab) => {
          const isSelected = selectedCategoria === tab.key;
          const count = categoryCounts[tab.key] || 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategoria(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 bg-slate-900/60 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-blue-700/90 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TOOLBAR DE BÚSQUEDA Y FILTROS SECUNDARIOS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-sm space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
          {/* SEARCH INPUT (5 COLUMNS) */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, aplicación o equivalencia..."
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

          {/* FILTRO MARCA (3 COLUMNS) */}
          <div className="lg:col-span-3">
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {marcasFiltro.map((m) => (
                <option key={m} value={m}>
                  Marca: {m}
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO ESTADO (2 COLUMNS) */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="todos">Estado: Todos</option>
              <option value="activos">Solo Activos</option>
              <option value="inactivos">Solo Inactivos</option>
            </select>
          </div>

          {/* ORDENAMIENTO (2 COLUMNS) */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="recientes">Ingreso: Recientes</option>
              <option value="antiguos">Ingreso: Antiguos</option>
              <option value="codigo">Código: A - Z</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS SUMMARY BAR */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-300 text-[11px]">
                Filtros:
              </span>
              {selectedCategoria !== 'TODOS' && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  Cat: {TABS_CATEGORIAS.find((t) => t.key === selectedCategoria)?.label || selectedCategoria}
                  <button onClick={() => setSelectedCategoria('TODOS')} className="hover:text-white">✕</button>
                </span>
              )}
              {selectedMarca !== 'Todas' && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  Marca: {selectedMarca}
                  <button onClick={() => setSelectedMarca('Todas')} className="hover:text-white">✕</button>
                </span>
              )}
              {statusFilter !== 'todos' && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  Estado: {statusFilter}
                  <button onClick={() => setStatusFilter('todos')} className="hover:text-white">✕</button>
                </span>
              )}
              {searchTerm && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  &quot;{searchTerm}&quot;
                  <button onClick={() => setSearchTerm('')} className="hover:text-white">✕</button>
                </span>
              )}
              <span className="text-slate-500 font-mono text-[11px]">
                ({filteredProductos.length} resultados)
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

      {/* TABLA DE PRODUCTOS PROFESIONAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-xs font-medium text-slate-400">Cargando catálogo de productos...</span>
          </div>
        ) : paginatedProductos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Seleccionar todos en esta página"
                    >
                      {selectedIds.size === paginatedProductos.length && paginatedProductos.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 w-12">Foto</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Título / Aplicación</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Precio ARS</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {paginatedProductos.map((p) => {
                  const imgs = normalizarImagenes(p.imagen_url);
                  const isSelected = selectedIds.has(p.id);
                  const isActivo = p.activo !== false;
                  const estaOcultoFinal = debeOcultarPrecio(p, ocultarGlobal);
                  const esExcepcionVisible = ocultarGlobal && p.ocultar_precio === false;
                  const catInfo = getCategoriaBadge(p.categoria);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelect(p.id)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* MINIATURA */}
                      <td className="p-3">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                          className="w-9 h-9 rounded-md bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center hover:border-blue-500 transition-colors block shrink-0"
                        >
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={p.codigo_filtrar} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-600" />
                          )}
                        </Link>
                      </td>

                      {/* CÓDIGO */}
                      <td className="p-3 font-mono font-bold text-white text-xs">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {p.codigo_filtrar}
                        </Link>
                      </td>

                      {/* TÍTULO / APLICACIÓN */}
                      <td className="p-3 max-w-xs">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                          className="font-medium text-white hover:text-blue-400 transition-colors truncate block"
                        >
                          {p.titulo_producto || 'Sin título'}
                        </Link>
                        {p.descripcion_aplicacion && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {p.descripcion_aplicacion}
                          </div>
                        )}
                      </td>

                      {/* CATEGORÍA COLOR-CODED BADGE */}
                      <td className="p-3">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] border inline-flex items-center gap-1.5 ${catInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dotClass}`} />
                          <span>{catInfo.label}</span>
                        </span>
                      </td>

                      {/* MARCA */}
                      <td className="p-3 text-slate-400 font-medium">
                        {p.marca_filtro || '-'}
                      </td>

                      {/* PRECIO Y VISIBILIDAD */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-xs ${
                              esExcepcionVisible
                                ? 'text-emerald-400 font-bold'
                                : estaOcultoFinal
                                  ? 'text-purple-400'
                                  : 'text-white'
                            }`}
                          >
                            {formatearPrecio(p.precio, estaOcultoFinal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleOcultarPrecio(p)}
                            title={
                              ocultarGlobal
                                ? esExcepcionVisible
                                  ? 'Excepción activa (Precio Visible). Clic para volver a ocultar.'
                                  : 'Clic para mostrar este precio como EXCEPCIÓN al ocultamiento global.'
                                : p.ocultar_precio === true
                                  ? 'Precio oculto individualmente. Clic para mostrar.'
                                  : 'Precio visible. Clic para ocultar individualmente.'
                            }
                            className={`p-1 rounded border transition-colors ${
                              esExcepcionVisible
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : estaOcultoFinal
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {esExcepcionVisible ? (
                              <Eye className="w-3 h-3 text-emerald-300" />
                            ) : estaOcultoFinal ? (
                              <EyeOff className="w-3 h-3 text-purple-300" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>

                          {esExcepcionVisible && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border border-emerald-500/30">
                              Excepción
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ESTADO TOGGLE */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleActivo(p)}
                          title="Hacé click para cambiar estado"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border ${
                            isActivo
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {isActivo ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Inactivo
                            </>
                          )}
                        </button>
                      </td>

                      {/* ACCIONES */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                            target="_blank"
                            title="Ver en web pública"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                            title="Editar producto"
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setProductToDelete(p)}
                            title="Eliminar producto"
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs font-medium">No se encontraron productos con los filtros actuales.</div>
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
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Mostrando <strong className="text-white">{(currentPage - 1) * PAGE_SIZE + 1}</strong> a{' '}
              <strong className="text-white">
                {Math.min(currentPage * PAGE_SIZE, filteredProductos.length)}
              </strong>{' '}
              de <strong className="text-white">{filteredProductos.length}</strong> productos
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Primera página"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs font-mono font-bold text-white">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDICIÓN MASIVA */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Edición Masiva ({selectedIds.size} productos)</span>
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Cambiar Categoría (opcional)
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">No modificar categoría</option>
                  {CATEGORIAS_FILTRO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Establecer Nuevo Precio ARS (opcional)
                </label>
                <input
                  type="number"
                  value={bulkPriceChange}
                  onChange={(e) => setBulkPriceChange(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ej: 15500"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Visibilidad de Precio (opcional)
                </label>
                <select
                  value={bulkPriceVisibility}
                  onChange={(e) => setBulkPriceVisibility(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="no_change">No modificar visibilidad</option>
                  <option value="mostrar">Mostrar precio públicamente</option>
                  <option value="ocultar">Ocultar precio (Muestra &apos;Consultar Precio&apos;)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {bulkLoading ? 'Aplicando cambios...' : 'Aplicar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="¿Eliminar producto?"
        message={`¿Estás seguro de eliminar el producto "${productToDelete?.codigo_filtrar}"? Se quitará del catálogo de forma permanente.`}
        confirmLabel="Sí, Eliminar"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
