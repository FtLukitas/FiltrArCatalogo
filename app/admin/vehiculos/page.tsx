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
  X,
  ListFilter,
  PenTool,
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

const PAGE_SIZE = 50;

export default function AdminVehiculosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('Todas');
  const [currentPage, setCurrentPage] = useState(1);

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

  const fetchVehiculos = async () => {
    setLoading(true);
    try {
      const allRows: VehiculoRow[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('vehiculos_filtrar')
          .select('*')
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error || !data) break;
        allRows.push(...(data as any as VehiculoRow[]));
        hasMore = data.length === pageSize;
        offset += pageSize;
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

  // Unique vehicle brands list for header filter
  const marcasVehiculos = useMemo(() => {
    return ['Todas', ...masterBrands];
  }, [masterBrands]);

  // Filtered List
  const filteredVehiculos = useMemo(() => {
    return vehiculos.filter((v) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const marca = (v.marca || '').toLowerCase();
        const modelo = (v.modelo || '').toLowerCase();
        const version = (v.version || '').toLowerCase();
        const filtro = (v.filtro_asociado || '').toLowerCase();
        if (!marca.includes(term) && !modelo.includes(term) && !version.includes(term) && !filtro.includes(term)) {
          return false;
        }
      }

      if (selectedMarca !== 'Todas' && v.marca.toUpperCase() !== selectedMarca) {
        return false;
      }

      return true;
    });
  }, [vehiculos, searchTerm, selectedMarca]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMarca]);

  const totalPages = Math.ceil(filteredVehiculos.length / PAGE_SIZE) || 1;
  const paginatedVehiculos = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredVehiculos.slice(start, start + PAGE_SIZE);
  }, [filteredVehiculos, currentPage]);

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
      setToast({ id: Date.now().toString(), type: 'error', title: 'Campos requeridos', message: 'Ingresá Marca, Modelo y Código de Producto.' });
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
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto no existe', message: `El código de producto "${cleanFiltro}" no existe en el catálogo.` });
        setAdding(false);
        return;
      }

      const newRow = {
        marca: finalMarca,
        modelo: finalModelo,
        version: finalVersion || null,
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
      if (isCustomModelSelected) {
        setCustomModelText('');
        setIsCustomModelSelected(false);
      }
      setNewVersion('');
      setNewAño('');
      setNewFiltroCode('');
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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-500" />
            <span>GESTIÓN DE VEHÍCULOS ASOCIADOS</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Administrá qué repuestos aplican a cada marca, modelo y versión de vehículo ({filteredVehiculos.length} de {vehiculos.length} registrados).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Asociar Vehículo</span>
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
              placeholder="Buscar por marca, modelo o código de filtro..."
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
              {marcasVehiculos.map((m) => (
                <option key={m} value={m}>
                  Marca Vehículo: {m}
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
            <span className="text-xs font-bold text-slate-400">Cargando catálogo de vehículos...</span>
          </div>
        ) : paginatedVehiculos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-black uppercase text-[10px]">
                  <th className="p-4">Marca Vehículo</th>
                  <th className="p-4">Modelo</th>
                  <th className="p-4">Versión / Motor</th>
                  <th className="p-4">Año</th>
                  <th className="p-4">Filtro Asociado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {paginatedVehiculos.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">{v.marca}</td>
                    <td className="p-4 font-bold text-blue-400">{v.modelo}</td>
                    <td className="p-4 text-slate-300">{v.version || '-'}</td>
                    <td className="p-4 font-mono text-slate-400">{v.año || '-'}</td>
                    <td className="p-4 font-mono font-black text-white">
                      <Link
                        href={`/admin/producto/${encodeURIComponent(v.filtro_asociado)}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {v.filtro_asociado}
                      </Link>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setVehToDelete(v)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Eliminar asociación"
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
            <Car className="w-12 h-12 text-slate-700 mx-auto" />
            <div>No se encontraron vehículos asociados.</div>
          </div>
        )}

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Página {currentPage} de {totalPages} ({filteredVehiculos.length} vehículos)
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

      {/* MODAL CREAR ASOCIACIÓN (SELECTOR DUAL) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleAddVehiculo} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Asociar Vehículo</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BOTONES MODO: EXISTENTE vs CUSTOM */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setVehFormMode('existing')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  vehFormMode === 'existing'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Marca/Modelo del Catálogo</span>
              </button>

              <button
                type="button"
                onClick={() => setVehFormMode('custom')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  vehFormMode === 'custom'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Crear Marca/Modelo Nuevo</span>
              </button>
            </div>

            {vehFormMode === 'existing' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                      Marca Existente *
                    </label>
                    <select
                      value={newMarca}
                      onChange={(e) => handleBrandDropdownChange(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer uppercase"
                    >
                      {masterBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                      Modelo *
                    </label>
                    {isCustomModelSelected ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={customModelText}
                          onChange={(e) => setCustomModelText(e.target.value)}
                          placeholder="Escribí el nuevo modelo..."
                          className="w-full p-3 pr-8 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomModelSelected(false)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={newModelo}
                        onChange={(e) => handleModelDropdownChange(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="Ej: 2.8 TDi 204cv"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newAño}
                      onChange={(e) => setNewAño(e.target.value)}
                      placeholder="Ej: 2015 →"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Marca Nueva *</label>
                    <input
                      type="text"
                      value={newMarca}
                      onChange={(e) => setNewMarca(e.target.value.toUpperCase())}
                      placeholder="Ej: TESLA, BYD, AUDI"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Modelo Nuevo *</label>
                    <input
                      type="text"
                      value={newModelo}
                      onChange={(e) => setNewModelo(e.target.value)}
                      placeholder="Ej: Model 3, Dolphin, A4"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="Ej: Long Range / Dual Motor"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newAño}
                      onChange={(e) => setNewAño(e.target.value)}
                      placeholder="Ej: 2022 →"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                Código Producto FiltrAr *
              </label>
              <input
                type="text"
                value={newFiltroCode}
                onChange={(e) => setNewFiltroCode(e.target.value.toUpperCase())}
                placeholder="Ej: AF-205, KIT-01, OF-711T"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                required
              />
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
