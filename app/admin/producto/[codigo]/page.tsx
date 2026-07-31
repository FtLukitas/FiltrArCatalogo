'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowLeftRight,
  Car,
  Plus,
  X,
  ExternalLink,
  Eye,
  Layers,
  Tag,
  Boxes,
  ListFilter,
  PenTool,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { formatearPrecio, normalizarImagenes } from '@/lib/utils';
import { normalizarMarcaCompetidor, normalizarCodigoCruza, sanitizarVehiculo } from '@/lib/normalization';
import TarjetaProducto from '@/app/componentes/TarjetaProducto';
import ImageUploader from '../../componentes/ImageUploader';
import ConfirmModal from '../../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../../componentes/AdminToast';

const CATEGORIAS = ['Filtros de Aceite', 'Filtros de Aire', 'Filtros de Combustible', 'Filtros de Habitáculo', 'Kits de Filtros'];
const MARCAS = ['Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Common Rail'];

interface Equivalencia {
  id: number;
  producto_codigo: string;
  marca_competidor: string;
  codigo_competidor: string;
}

interface VehiculoAsociado {
  id: number;
  marca: string;
  modelo: string;
  version: string | null;
  año: string | null;
  filtro_asociado: string;
}

interface ComponenteKit {
  id: number;
  producto_codigo: string;
  tipo_relacion: string;
  codigo_relacionado: string;
  detalle?: Filtro | null;
}

export default function AdminEditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const rawCodigo = params.codigo as string;
  const codigo = decodeURIComponent(rawCodigo);

  const isKit = codigo.toUpperCase().startsWith('KIT');

  const [activeTab, setActiveTab] = useState<'datos' | 'componentes' | 'equivalencias' | 'vehiculos'>(
    isKit ? 'componentes' : 'datos'
  );

  // Product Data
  const [product, setProduct] = useState<Filtro | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Filtros de Aceite');
  const [marca, setMarca] = useState('Pro Filter');
  const [isCustomMarcaSelected, setIsCustomMarcaSelected] = useState(false);
  const [customMarcaText, setCustomMarcaText] = useState('');
  const [marcasExistentes, setMarcasExistentes] = useState<string[]>(['Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Common Rail', 'Mareno', 'Wega', 'Mann', 'Fram', 'Tecfil', 'Mahle']);

  const [precio, setPrecio] = useState<number | ''>('');
  const [dimensiones, setDimensiones] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);
  const [ocultarPrecio, setOcultarPrecio] = useState(false);

  // Cargar marcas dinámicamente desde la base de datos
  useEffect(() => {
    async function fetchMarcas() {
      try {
        const { data } = await supabase
          .from('productos_filtrar')
          .select('marca_filtro')
          .not('marca_filtro', 'is', null);

        if (data) {
          const distinct = Array.from(
            new Set(
              data
                .map((item) => item.marca_filtro?.trim())
                .filter((m): m is string => Boolean(m))
            )
          ).sort();

          if (distinct.length > 0) {
            setMarcasExistentes(distinct);
          }
        }
      } catch (err) {
        console.error('Error al cargar marcas:', err);
      }
    }
    fetchMarcas();
  }, []);

  // Kit Components State
  const [componentes, setComponentes] = useState<ComponenteKit[]>([]);
  const [newCompCode, setNewCompCode] = useState('');
  const [addingComp, setAddingComp] = useState(false);

  // Equivalences State
  const [equivalencias, setEquivalencias] = useState<Equivalencia[]>([]);
  const [newMarcaComp, setNewMarcaComp] = useState('WEGA');
  const [newCodComp, setNewCodComp] = useState('');
  const [addingEquiv, setAddingEquiv] = useState(false);

  // Vehicles State
  const [vehiculos, setVehiculos] = useState<VehiculoAsociado[]>([]);
  const [newVehMarca, setNewVehMarca] = useState('');
  const [newVehModelo, setNewVehModelo] = useState('');
  const [newVehVersion, setNewVehVersion] = useState('');
  const [newVehAño, setNewVehAño] = useState('');
  const [addingVeh, setAddingVeh] = useState(false);

  // Master Vehicles catalog (for dropdown selectors)
  const [masterBrands, setMasterBrands] = useState<string[]>([]);
  const [masterModelsMap, setMasterModelsMap] = useState<Record<string, string[]>>({});
  const [vehFormMode, setVehFormMode] = useState<'existing' | 'custom'>('existing');
  const [isCustomModelSelected, setIsCustomModelSelected] = useState(false);
  const [customModelText, setCustomModelText] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 1. Fetch Product Data & Relations & Master Vehicles
  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('productos_filtrar')
        .select('*')
        .eq('codigo_filtrar', codigo)
        .maybeSingle();

      if (error || !data) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto no encontrado', message: `No se encontró el producto con código ${codigo}` });
        setLoading(false);
        return;
      }

      const p = data as Filtro;
      setProduct(p);
      setTitulo(p.titulo_producto || '');
      setCategoria(p.categoria || (isKit ? 'Kits de Filtros' : 'Filtros de Aceite'));
      setMarca(p.marca_filtro || 'Pro Filter');

      if (p.marca_filtro) {
        setMarcasExistentes((prev) => Array.from(new Set([...prev, p.marca_filtro!])).sort());
      }

      setPrecio(p.precio !== null && p.precio !== undefined ? p.precio : '');
      setDimensiones(p.dimensiones || '');
      setDescripcion(p.descripcion_aplicacion || '');
      setActivo(p.activo !== false);
      setOcultarPrecio(p.ocultar_precio === true);

      const imgs = Array.isArray(p.imagen_url)
        ? p.imagen_url[0]
        : typeof p.imagen_url === 'string'
          ? p.imagen_url
          : '';
      setImagenUrl(imgs || '');

      // Fetch Kit Components from relaciones_productos
      const { data: compRows } = await supabase
        .from('relaciones_productos')
        .select('*')
        .eq('producto_codigo', codigo);

      if (compRows && compRows.length > 0) {
        const componentCodes = [...new Set(compRows.map((r: any) => r.codigo_relacionado))];
        const { data: compDetails } = await supabase
          .from('productos_filtrar')
          .select('*')
          .in('codigo_filtrar', componentCodes);

        const compDetailMap = new Map<string, Filtro>();
        if (compDetails) {
          compDetails.forEach((d: any) => compDetailMap.set(d.codigo_filtrar, d as Filtro));
        }

        const uniqueCompRows: ComponenteKit[] = [];
        const seenCodes = new Set<string>();

        compRows.forEach((r: any) => {
          if (!seenCodes.has(r.codigo_relacionado)) {
            seenCodes.add(r.codigo_relacionado);
            uniqueCompRows.push({
              id: r.id,
              producto_codigo: r.producto_codigo,
              tipo_relacion: r.tipo_relacion,
              codigo_relacionado: r.codigo_relacionado,
              detalle: compDetailMap.get(r.codigo_relacionado) || null,
            });
          }
        });

        setComponentes(uniqueCompRows);
      } else {
        setComponentes([]);
      }

      // Fetch Equivalences
      const { data: equivs } = await supabase
        .from('equivalencias_cruza')
        .select('*')
        .eq('producto_codigo', codigo)
        .order('marca_competidor');
      if (equivs) setEquivalencias(equivs as Equivalencia[]);

      // Fetch Vehicles
      const { data: vehs } = await supabase
        .from('vehiculos_filtrar')
        .select('*')
        .eq('filtro_asociado', codigo)
        .order('marca');
      if (vehs) setVehiculos(vehs as VehiculoAsociado[]);

      // Fetch Master Vehicles (Brands & Models)
      const { data: masterVehs } = await supabase
        .from('vehiculos_filtrar')
        .select('marca, modelo')
        .order('marca');

      if (masterVehs) {
        const brandSet = new Set<string>();
        const map: Record<string, Set<string>> = {};

        masterVehs.forEach((r: any) => {
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
          setNewVehMarca(sortedBrands[0]);
          if (sortedMap[sortedBrands[0]] && sortedMap[sortedBrands[0]].length > 0) {
            setNewVehModelo(sortedMap[sortedBrands[0]][0]);
          }
        }
      }

    } catch (err: any) {
      console.error('Error cargando producto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [codigo]);

  // Handle Brand dropdown change in 'existing' mode
  const handleBrandDropdownChange = (brand: string) => {
    setNewVehMarca(brand);
    setIsCustomModelSelected(false);
    setCustomModelText('');
    const models = masterModelsMap[brand] || [];
    if (models.length > 0) {
      setNewVehModelo(models[0]);
    } else {
      setNewVehModelo('');
    }
  };

  // Handle Model dropdown change in 'existing' mode
  const handleModelDropdownChange = (model: string) => {
    if (model === '__CUSTOM_MODEL__') {
      setIsCustomModelSelected(true);
      setNewVehModelo('');
    } else {
      setIsCustomModelSelected(false);
      setNewVehModelo(model);
    }
  };

  // Save Main Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const finalMarca = normalizarMarcaCompetidor(
      isCustomMarcaSelected ? customMarcaText : marca
    );

    setSaving(true);

    try {
      const updatedProduct = {
        titulo_producto: titulo.trim() || null,
        categoria,
        marca_filtro: finalMarca,
        precio: precio !== '' ? Number(precio) : null,
        dimensiones: dimensiones.trim() || null,
        descripcion_aplicacion: descripcion.trim() || null,
        imagen_url: (imagenUrl && imagenUrl !== 'preview' && imagenUrl.trim()) ? [imagenUrl.trim()] : null,
        activo,
        ocultar_precio: ocultarPrecio,
      };

      const { error } = await supabase
        .from('productos_filtrar')
        .update(updatedProduct)
        .eq('codigo_filtrar', codigo);

      if (error) throw error;

      setProduct((prev) => (prev ? { ...prev, ...updatedProduct } : null));
      if (isCustomMarcaSelected && customMarcaText) {
        setMarca(finalMarca);
        setIsCustomMarcaSelected(false);
        setCustomMarcaText('');
        setMarcasExistentes((prev) => Array.from(new Set([...prev, finalMarca])).sort());
      }

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Cambios guardados',
        message: `El producto ${codigo} se actualizó correctamente.`,
      });
    } catch (err: any) {
      console.error('Error al actualizar:', err);
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al guardar', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Add Component to Kit
  const handleAddComponente = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCompCode = newCompCode.trim().toUpperCase();
    if (!cleanCompCode) return;

    setAddingComp(true);

    try {
      const { data: compProd } = await supabase
        .from('productos_filtrar')
        .select('*')
        .eq('codigo_filtrar', cleanCompCode)
        .maybeSingle();

      if (!compProd) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Producto no existe', message: `El código "${cleanCompCode}" no existe en el catálogo.` });
        setAddingComp(false);
        return;
      }

      if (componentes.some((c) => c.codigo_relacionado === cleanCompCode)) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Ya está en el kit', message: `El código "${cleanCompCode}" ya forma parte de este kit.` });
        setAddingComp(false);
        return;
      }

      const newRel = {
        producto_codigo: codigo,
        tipo_relacion: 'CONTIENE_COMPONENTE',
        codigo_relacionado: cleanCompCode,
      };

      const { data, error } = await supabase
        .from('relaciones_productos')
        .insert([newRel])
        .select()
        .single();

      if (error) throw error;

      const newCompItem: ComponenteKit = {
        id: data.id,
        producto_codigo: codigo,
        tipo_relacion: 'CONTIENE_COMPONENTE',
        codigo_relacionado: cleanCompCode,
        detalle: compProd as Filtro,
      };

      setComponentes((prev) => [...prev, newCompItem]);
      setNewCompCode('');
      setToast({ id: Date.now().toString(), type: 'success', title: 'Componente agregado al Kit', message: `${cleanCompCode} agregado a ${codigo}.` });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error agregando componente', message: err.message });
    } finally {
      setAddingComp(false);
    }
  };

  // Remove Component from Kit
  const handleDeleteComponente = async (id: number, compCode: string) => {
    try {
      const { error } = await supabase
        .from('relaciones_productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setComponentes((prev) => prev.filter((c) => c.id !== id));
      setToast({ id: Date.now().toString(), type: 'success', title: 'Componente removido del Kit', message: `${compCode} quitado de ${codigo}.` });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al remover', message: err.message });
    }
  };

  // Add Equivalency
  const handleAddEquivalencia = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCodComp = newCodComp.trim().toUpperCase();
    const cleanMarca = newMarcaComp.trim().toUpperCase();

    if (!cleanCodComp || !cleanMarca) return;
    setAddingEquiv(true);

    try {
      const newEquiv = {
        producto_codigo: codigo,
        marca_competidor: cleanMarca,
        codigo_competidor: cleanCodComp,
        codigo_competidor_normalizado: cleanCodComp.replace(/[-_/\s]/g, ''),
      };

      const { data, error } = await supabase
        .from('equivalencias_cruza')
        .insert([newEquiv])
        .select()
        .single();

      if (error) throw error;

      setEquivalencias((prev) => [...prev, data as Equivalencia]);
      setNewCodComp('');
      setToast({ id: Date.now().toString(), type: 'success', title: 'Equivalencia agregada', message: `${cleanMarca} - ${cleanCodComp}` });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error agregando equivalencia', message: err.message });
    } finally {
      setAddingEquiv(false);
    }
  };

  // Delete Equivalency
  const handleDeleteEquivalencia = async (id: number) => {
    try {
      const { error } = await supabase
        .from('equivalencias_cruza')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEquivalencias((prev) => prev.filter((e) => e.id !== id));
      setToast({ id: Date.now().toString(), type: 'success', title: 'Equivalencia eliminada' });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
    }
  };

  // Add Vehicle Association
  const handleAddVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMarca = newVehMarca.trim().toUpperCase();
    const finalModelo = (isCustomModelSelected ? customModelText : newVehModelo).trim();

    if (!finalMarca || !finalModelo) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Campos requeridos', message: 'Ingresá Marca y Modelo del vehículo.' });
      return;
    }

    setAddingVeh(true);

    try {
      const newVeh = {
        marca: finalMarca,
        modelo: finalModelo,
        version: newVehVersion.trim() || null,
        año: newVehAño.trim() || null,
        filtro_asociado: codigo,
      };

      const { data, error } = await supabase
        .from('vehiculos_filtrar')
        .insert([newVeh])
        .select()
        .single();

      if (error) throw error;

      setVehiculos((prev) => [...prev, data as VehiculoAsociado]);
      if (isCustomModelSelected) {
        setCustomModelText('');
        setIsCustomModelSelected(false);
      }
      setNewVehVersion('');
      setNewVehAño('');
      setToast({ id: Date.now().toString(), type: 'success', title: 'Vehículo asociado', message: `${newVeh.marca} ${newVeh.modelo}` });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al asociar vehículo', message: err.message });
    } finally {
      setAddingVeh(false);
    }
  };

  // Delete Vehicle Association
  const handleDeleteVehiculo = async (id: number) => {
    try {
      const { error } = await supabase
        .from('vehiculos_filtrar')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVehiculos((prev) => prev.filter((v) => v.id !== id));
      setToast({ id: Date.now().toString(), type: 'success', title: 'Asociación eliminada' });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
    }
  };

  // Delete Entire Product
  const handleDeleteProduct = async () => {
    if (!product) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('productos_filtrar')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      setToast({ id: Date.now().toString(), type: 'success', title: 'Producto eliminado', message: `El producto ${codigo} fue eliminado.` });
      setTimeout(() => {
        router.push('/admin/productos');
      }, 800);
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al eliminar', message: err.message });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs font-bold text-slate-400">Cargando producto {codigo}...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-4">
        <Package className="w-12 h-12 text-slate-700 mx-auto" />
        <h2 className="text-lg font-black text-white">Producto no encontrado</h2>
        <Link href="/admin/productos" className="text-xs font-bold text-blue-400 hover:text-blue-300">
          ← Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos"
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-white tracking-tight">
                {codigo}
              </span>
              {isKit && (
                <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Boxes className="w-3 h-3" /> KIT DE FILTROS
                </span>
              )}
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                {activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {titulo || 'Sin título especificado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/producto/${encodeURIComponent(codigo)}`}
            target="_blank"
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Eye className="w-4 h-4" />
            <span>Ver en Web</span>
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('datos')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'datos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <Package className="w-4 h-4" />
          <span>Datos del Producto</span>
        </button>

        <button
          onClick={() => setActiveTab('componentes')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'componentes'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : isKit
                ? 'bg-purple-950/40 text-purple-300 border border-purple-800/50 hover:bg-purple-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Componentes del Kit ({componentes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('equivalencias')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'equivalencias'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Equivalencias ({equivalencias.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vehiculos')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'vehiculos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <Car className="w-4 h-4" />
          <span>Vehículos Asociados ({vehiculos.length})</span>
        </button>
      </div>

      {/* TAB 1: DATOS DEL PRODUCTO */}
      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* FORMULARIO (7 COLUMNAS) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Título del Producto
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Kit de Filtros Toyota Hilux 2.8"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Marca del Filtro
                  </label>
                  <select
                    value={isCustomMarcaSelected ? '__CUSTOM_MARCA__' : (
                      marcasExistentes.find((m) => m.toLowerCase() === marca.toLowerCase()) || marca
                    )}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM_MARCA__') {
                        setIsCustomMarcaSelected(true);
                      } else {
                        setIsCustomMarcaSelected(false);
                        setMarca(val);
                      }
                    }}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer mb-2"
                  >
                    {marcasExistentes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__CUSTOM_MARCA__">+ Escribir otra marca...</option>
                  </select>

                  {isCustomMarcaSelected && (
                    <input
                      type="text"
                      value={customMarcaText}
                      onChange={(e) => setCustomMarcaText(e.target.value)}
                      placeholder="Escribí el nombre de la nueva marca (ej: Donaldson)"
                      className="w-full p-3 bg-slate-950 border border-blue-500 rounded-xl text-xs font-bold text-white outline-none animate-fade-in placeholder:text-slate-600"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Precio ARS ($)
                  </label>
                  <input
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-black text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Medidas / Dimensiones (Formato Libre)
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDimensiones('Largo: 240mm, Ancho: 180mm, Alto: 45mm')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      >
                        + Largo/Ancho/Alto
                      </button>
                      <button
                        type="button"
                        onClick={() => setDimensiones('DE: 135mm | DI: 70mm | Alt: 280mm')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      >
                        + Diám Ext/Int/Alt
                      </button>
                      <button
                        type="button"
                        onClick={() => setDimensiones('PICO 8 MM')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      >
                        + Pico
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={dimensiones}
                    onChange={(e) => setDimensiones(e.target.value)}
                    placeholder="Ej: DE: 135mm | DI: 70mm | Alt: 280mm  ó  Largo: 240mm, Ancho: 180mm  ó  PICO 8 MM"
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Descripción / Aplicación Vehicular
                  </label>
                  <textarea
                    rows={4}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Compatible con Toyota Hilux 2.4 / 2.8 TDi (2015 en adelante), SW4..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all resize-y"
                  />
                </div>
              </div>

              <ImageUploader
                codigo={codigo}
                currentUrl={imagenUrl}
                onImageUploaded={(url) => setImagenUrl(url)}
                onImageRemoved={() => setImagenUrl('')}
              />

              {/* OCULTAR PRECIO INDIVIDUAL */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white block">Ocultar Precio en Web Pública</span>
                  <span className="text-[11px] text-slate-400 font-semibold block">Si se activa, mostrará "Consultar Precio" en lugar del valor numérico.</span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ocultarPrecio}
                    onChange={(e) => setOcultarPrecio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:translate-x-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white block">Estado Visible en la Web</span>
                  <span className="text-[11px] text-slate-400 font-semibold block">Si está desactivado, no aparecerá en las búsquedas del público.</span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SIDEBAR VISTA PREVIA EN VIVO (5 COLUMNAS STICKY) */}
          <aside className="lg:col-span-5 sticky top-6 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Vista Previa</span>
                </h3>

              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <TarjetaProducto filtro={{
                    id: product.id,
                    codigo_filtrar: codigo,
                    titulo_producto: titulo.trim() || 'Título del Producto',
                    categoria: categoria || 'Filtros de Aceite',
                    marca_filtro: marca || 'Pro Filter',
                    precio: precio !== '' ? Number(precio) : 0,
                    dimensiones: dimensiones.trim() || null,
                    descripcion_aplicacion: descripcion.trim() || null,
                    imagen_url: (imagenUrl && imagenUrl !== 'preview' && imagenUrl.trim()) ? [imagenUrl.trim()] : null,
                    activo: activo,
                    equivalencias: null,
                  }} />
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-400 text-center">
                Esta es la apariencia exacta con la que se mostrará este producto a los clientes en el catálogo web.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: COMPONENTES DEL KIT */}
      {activeTab === 'componentes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-3xl p-6 text-purple-200 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-black text-sm uppercase tracking-wider">
              <Boxes className="w-5 h-5" />
              <span>Gestión de Componentes del Kit</span>
            </div>
            <p className="text-xs font-semibold text-purple-300/80">
              Aquí podés definir exactamente qué repuestos individuales (aceite, aire, combustible, habitáculo) componen el producto <strong className="text-white">{codigo}</strong>.
            </p>
          </div>

          <form onSubmit={handleAddComponente} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Agregar Filtro / Componente al Kit {codigo}</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Código de Filtro Componente (ej: AF-010T, OF-711T, FF-010T, CF-390T)
                </label>
                <input
                  type="text"
                  value={newCompCode}
                  onChange={(e) => setNewCompCode(e.target.value.toUpperCase())}
                  placeholder="Ingresá el código exacto del producto componente..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white outline-none focus:border-purple-500 uppercase"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingComp}
                  className="w-full sm:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 shrink-0"
                >
                  {addingComp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Agregar al Kit</span>
                </button>
              </div>
            </div>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {componentes.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                {componentes.map((c) => {
                  const d = c.detalle;
                  const imgs = normalizarImagenes(d?.imagen_url || null);

                  return (
                    <div
                      key={c.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={c.codigo_relacionado} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/producto/${encodeURIComponent(c.codigo_relacionado)}`}
                              className="font-mono font-black text-sm text-white hover:text-purple-400 transition-colors"
                            >
                              {c.codigo_relacionado}
                            </Link>
                            {d?.categoria && (
                              <span className="bg-slate-800 text-purple-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                {d.categoria}
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">
                            {d?.titulo_producto || d?.marca_filtro || 'Componente del kit'}
                          </p>

                          {d?.precio && d.precio > 0 && (
                            <span className="text-xs font-black text-purple-400 block mt-0.5">
                              {formatearPrecio(d.precio)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/producto/${encodeURIComponent(c.codigo_relacionado)}`}
                          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                          title="Editar este componente"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteComponente(c.id, c.codigo_relacionado)}
                          className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Quitar componente del kit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Boxes className="w-12 h-12 text-slate-700 mx-auto" />
                <div className="font-bold text-sm text-white">Este kit aún no tiene componentes registrados.</div>
                <p className="text-xs text-slate-500">Usá el formulario de arriba para ingresar los códigos de filtros de este kit (ej: AF-010T, OF-711T, etc.).</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EQUIVALENCIAS */}
      {activeTab === 'equivalencias' && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleAddEquivalencia} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Agregar Nueva Equivalencia para {codigo}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Marca Competidor
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
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Código Competidor
                </label>
                <input
                  type="text"
                  value={newCodComp}
                  onChange={(e) => setNewCodComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WO-420, C24005"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingEquiv}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  {addingEquiv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Agregar Equivalencia</span>
                </button>
              </div>
            </div>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {equivalencias.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-black uppercase text-[10px]">
                    <th className="p-4">Marca Competidor</th>
                    <th className="p-4">Código Competidor</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {equivalencias.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-blue-400">{eq.marca_competidor}</td>
                      <td className="p-4 font-mono font-black text-white">{eq.codigo_competidor}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteEquivalencia(eq.id)}
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
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No hay equivalencias registradas para este producto.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VEHÍCULOS ASOCIADOS (SELECTOR DUAL: EXISTENTE vs NUEVO) */}
      {activeTab === 'vehiculos' && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleAddVehiculo} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Asociar Vehículo a {codigo}</span>
              </h3>

              {/* BOTONES MODO: EXISTENTE vs CUSTOM */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setVehFormMode('existing')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${vehFormMode === 'existing'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Seleccionar de la Lista</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehFormMode('custom')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${vehFormMode === 'custom'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Escribir Marca / Modelo Nuevo</span>
                </button>
              </div>
            </div>

            {/* MODO 1: SELECCIONAR EXISTENTE */}
            {vehFormMode === 'existing' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* DROPDOWN MARCA EXISTENTE */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Marca del Catálogo *
                  </label>
                  <select
                    value={newVehMarca}
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

                {/* DROPDOWN MODELO EXISTENTE (O CUSTOM) */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Modelo de {newVehMarca || 'la marca'} *
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
                        title="Volver a la lista de modelos"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newVehModelo}
                      onChange={(e) => handleModelDropdownChange(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {(masterModelsMap[newVehMarca] || []).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__CUSTOM_MODEL__">
                        + Escribir otro modelo para {newVehMarca}...
                      </option>
                    </select>
                  )}
                </div>

                {/* VERSIÓN */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Versión / Motor</label>
                  <input
                    type="text"
                    value={newVehVersion}
                    onChange={(e) => setNewVehVersion(e.target.value)}
                    placeholder="Ej: 2.8 TDi 204cv"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* AÑO */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Año / Rango</label>
                  <input
                    type="text"
                    value={newVehAño}
                    onChange={(e) => setNewVehAño(e.target.value)}
                    placeholder="Ej: 2015 →"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              /* MODO 2: ESCRIBIR CUSTOM */
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Marca Nueva *</label>
                  <input
                    type="text"
                    value={newVehMarca}
                    onChange={(e) => setNewVehMarca(e.target.value.toUpperCase())}
                    placeholder="Ej: TESLA, BYD, AUDI"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Modelo Nuevo *</label>
                  <input
                    type="text"
                    value={newVehModelo}
                    onChange={(e) => setNewVehModelo(e.target.value)}
                    placeholder="Ej: Model 3, Dolphin, A4"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Versión / Motor</label>
                  <input
                    type="text"
                    value={newVehVersion}
                    onChange={(e) => setNewVehVersion(e.target.value)}
                    placeholder="Ej: Long Range / Dual Motor"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Año / Rango</label>
                  <input
                    type="text"
                    value={newVehAño}
                    onChange={(e) => setNewVehAño(e.target.value)}
                    placeholder="Ej: 2022 →"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={addingVeh}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                {addingVeh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Asociar Vehículo</span>
              </button>
            </div>
          </form>

          {/* LISTA DE VEHÍCULOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {vehiculos.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-black uppercase text-[10px]">
                    <th className="p-4">Marca</th>
                    <th className="p-4">Modelo</th>
                    <th className="p-4">Versión</th>
                    <th className="p-4">Año</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {vehiculos.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-white">{v.marca}</td>
                      <td className="p-4 font-bold text-blue-400">{v.modelo}</td>
                      <td className="p-4">{v.version || '-'}</td>
                      <td className="p-4 font-mono text-slate-400">{v.año || '-'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteVehiculo(v.id)}
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
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No hay vehículos asociados a este producto.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="¿Eliminar producto completo?"
        message={`¿Estás seguro de eliminar el producto "${codigo}" y sus referencias? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, Eliminar Producto"
        isLoading={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setShowDeleteModal(false)}
      />

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
