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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizarMarcaCompetidor, normalizarCodigoCruza } from '@/lib/normalization';
import ConfirmModal from '../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

interface EquivalenciaRow {
  id: number;
  producto_codigo: string;
  marca_competidor: string;
  codigo_competidor: string;
}

const PAGE_SIZE = 50;

export default function AdminEquivalenciasPage() {
  const [equivalencias, setEquivalencias] = useState<EquivalenciaRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('Todas');
  const [currentPage, setCurrentPage] = useState(1);

  // Add new equivalence state
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

  const fetchEquivalencias = async () => {
    setLoading(true);
    try {
      const allRows: EquivalenciaRow[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('equivalencias_cruza')
          .select('id, producto_codigo, marca_competidor, codigo_competidor')
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error || !data) break;
        allRows.push(...(data as EquivalenciaRow[]));
        hasMore = data.length === pageSize;
        offset += pageSize;
      }

      setEquivalencias(allRows);
    } catch (err) {
      console.error('Error fetching equivalencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquivalencias();
  }, []);

  // Unique competitor brands list
  const marcasCompetidoras = useMemo(() => {
    const setM = new Set<string>();
    equivalencias.forEach((e) => {
      if (e.marca_competidor) setM.add(e.marca_competidor.toUpperCase());
    });
    return ['Todas', ...Array.from(setM).sort()];
  }, [equivalencias]);

  // Filtered List
  const filteredEquivalencias = useMemo(() => {
    return equivalencias.filter((e) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const prod = (e.producto_codigo || '').toLowerCase();
        const comp = (e.codigo_competidor || '').toLowerCase();
        const marca = (e.marca_competidor || '').toLowerCase();
        if (!prod.includes(term) && !comp.includes(term) && !marca.includes(term)) {
          return false;
        }
      }

      if (selectedMarca !== 'Todas' && e.marca_competidor.toUpperCase() !== selectedMarca) {
        return false;
      }

      return true;
    });
  }, [equivalencias, searchTerm, selectedMarca]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMarca]);

  const totalPages = Math.ceil(filteredEquivalencias.length / PAGE_SIZE) || 1;
  const paginatedEquivalencias = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEquivalencias.slice(start, start + PAGE_SIZE);
  }, [filteredEquivalencias, currentPage]);

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
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto no existe', message: `El código de producto "${cleanProd}" no existe en el catálogo.` });
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
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al agregar', message: err.message });
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
      setToast({ id: Date.now().toString(), type: 'success', title: 'Equivalencia eliminada' });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
    } finally {
      setDeleting(false);
      setEquivToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-500" />
            <span>GESTIÓN DE EQUIVALENCIAS</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Administrá el cruce de marcas competidoras ({filteredEquivalencias.length} de {equivalencias.length} registradas).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Equivalencia</span>
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código propio o de competidor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              {marcasCompetidoras.map((m) => (
                <option key={m} value={m}>
                  Marca Competidor: {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs font-bold text-slate-400">Cargando equivalencias...</span>
          </div>
        ) : paginatedEquivalencias.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-black uppercase text-[10px]">
                  <th className="p-4">Producto FiltrAr</th>
                  <th className="p-4">Marca Competidor</th>
                  <th className="p-4">Código Competidor</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {paginatedEquivalencias.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-black text-white">
                      <Link
                        href={`/admin/producto/${encodeURIComponent(eq.producto_codigo)}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {eq.producto_codigo}
                      </Link>
                    </td>
                    <td className="p-4 font-bold text-blue-400">{eq.marca_competidor}</td>
                    <td className="p-4 font-mono font-black text-slate-100">{eq.codigo_competidor}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setEquivToDelete(eq)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Eliminar equivalencia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 font-semibold space-y-2">
            <ArrowLeftRight className="w-12 h-12 text-slate-700 mx-auto" />
            <div>No se encontraron equivalencias.</div>
          </div>
        )}

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Página {currentPage} de {totalPages} ({filteredEquivalencias.length} equivalencias)
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

      {/* MODAL CREAR EQUIVALENCIA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleAddEquivalencia} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Nueva Equivalencia</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                  Código Producto FiltrAr *
                </label>
                <input
                  type="text"
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value.toUpperCase())}
                  placeholder="Ej: AF-205"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                  Marca Competidor *
                </label>
                <input
                  type="text"
                  value={newMarcaComp}
                  onChange={(e) => setNewMarcaComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WEGA, FRAM, MANN, OEM"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                  Código Competidor *
                </label>
                <input
                  type="text"
                  value={newCodComp}
                  onChange={(e) => setNewCodComp(e.target.value.toUpperCase())}
                  placeholder="Ej: FAP-205, CA1000"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20"
              >
                {adding ? 'Guardando...' : 'Guardar Equivalencia'}
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
