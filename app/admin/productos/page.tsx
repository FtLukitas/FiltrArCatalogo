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
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { formatearPrecio, normalizarImagenes } from '@/lib/utils';
import ConfirmModal from '../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

const CATEGORIAS = ['Todas', 'Aceite', 'Aire', 'Combustible', 'Habitáculo', 'Inyección', 'Kits'];
const MARCAS = ['Todas', 'Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Common Rail'];
const PAGE_SIZE = 25;

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Filtro[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');
  const [selectedMarca, setSelectedMarca] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPriceChange, setBulkPriceChange] = useState<number | ''>('');
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

  // Filtered products list
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codigo = (p.codigo_filtrar || '').toLowerCase();
        const titulo = (p.titulo_producto || '').toLowerCase();
        const desc = (p.descripcion_aplicacion || '').toLowerCase();
        if (!codigo.includes(term) && !titulo.includes(term) && !desc.includes(term)) {
          return false;
        }
      }

      // Category
      if (selectedCategoria !== 'Todas') {
        const cat = (p.categoria || '').toLowerCase();
        const sel = selectedCategoria.toLowerCase();
        if (!cat.includes(sel)) {
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
  }, [productos, searchTerm, selectedCategoria, selectedMarca, statusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, selectedCategoria, selectedMarca, statusFilter]);

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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <span>GESTIÓN DE PRODUCTOS</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Administrá todos los repuestos del catálogo ({filteredProductos.length} de {productos.length} items).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-purple-600/25 animate-fade-in"
            >
              <Layers className="w-4 h-4" />
              <span>Editar Seleccionados ({selectedIds.size})</span>
            </button>
          )}

          <Link
            href="/admin/importar"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Excel / CSV</span>
          </Link>

          <Link
            href="/admin/producto/nuevo"
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Link>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* INPUT DE BÚSQUEDA */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o título..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* FILTRO CATEGORÍA */}
          <div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  Categoría: {cat}
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO MARCA */}
          <div>
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              {marcasFiltro.map((m) => (
                <option key={m} value={m}>
                  Marca: {m}
                </option>
              ))}
            </select>
          </div>

          {/* FILTRO ESTADO */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="todos">Estado: Todos</option>
              <option value="activos">Solo Activos</option>
              <option value="inactivos">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs font-bold text-slate-400">Cargando lista de productos...</span>
          </div>
        ) : paginatedProductos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                      {selectedIds.size === paginatedProductos.length && paginatedProductos.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 w-16">Foto</th>
                  <th className="p-4">Código</th>
                  <th className="p-4">Título / Descripción</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Marca</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {paginatedProductos.map((p) => {
                  const imgs = normalizarImagenes(p.imagen_url);
                  const isSelected = selectedIds.has(p.id);
                  const isActivo = p.activo !== false;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      {/* SELECT CHECKBOX */}
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* MINIATURA */}
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={p.codigo_filtrar} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </td>

                      {/* CÓDIGO */}
                      <td className="p-4 font-mono font-black text-white text-xs">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {p.codigo_filtrar}
                        </Link>
                      </td>

                      {/* TÍTULO / APLICACIÓN */}
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-white truncate">
                          {p.titulo_producto || 'Sin título'}
                        </div>
                        {p.descripcion_aplicacion && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {p.descripcion_aplicacion}
                          </div>
                        )}
                      </td>

                      {/* CATEGORÍA */}
                      <td className="p-4">
                        <span className="bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full text-[10px]">
                          {p.categoria || 'Sin cat.'}
                        </span>
                      </td>

                      {/* MARCA */}
                      <td className="p-4 font-bold text-slate-400 text-xs">
                        {p.marca_filtro || '-'}
                      </td>

                      {/* PRECIO */}
                      <td className="p-4 font-black text-white text-xs">
                        {formatearPrecio(p.precio)}
                      </td>

                      {/* ESTADO (TOGGLE) */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActivo(p)}
                          title="Hacé click para cambiar estado"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                            isActivo
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
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
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                            target="_blank"
                            title="Ver en web pública"
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
                            title="Editar producto"
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setProductToDelete(p)}
                            title="Eliminar producto"
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="p-16 text-center text-slate-400 font-semibold space-y-2">
            <Package className="w-12 h-12 text-slate-700 mx-auto" />
            <div>No se encontraron productos con los filtros seleccionados.</div>
          </div>
        )}

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Página {currentPage} de {totalPages} ({filteredProductos.length} productos)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDICIÓN MASIVA */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Edición Masiva ({selectedIds.size} productos)</span>
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                  Cambiar Categoría (opcional)
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-purple-500"
                >
                  <option value="">No modificar categoría</option>
                  {CATEGORIAS.filter((c) => c !== 'Todas').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                  Establecer Nuevo Precio ARS (opcional)
                </label>
                <input
                  type="number"
                  value={bulkPriceChange}
                  onChange={(e) => setBulkPriceChange(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ej: 15500"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-purple-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkLoading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/20"
              >
                {bulkLoading ? 'Aplicando...' : 'Aplicar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINACIÓN */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="¿Eliminar producto?"
        message={`¿Estás seguro de eliminar el producto "${productToDelete?.codigo_filtrar}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar Producto"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      {/* TOAST FEEDBACK */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
