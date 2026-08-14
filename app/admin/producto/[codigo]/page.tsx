'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { formatearPrecio, normalizarImagenes } from '@/lib/utils';
import { getOcultarPreciosGlobal } from '@/lib/preciosConfig';
import { normalizarMarcaCompetidor, normalizarCodigoCruza, sanitizarVehiculo } from '@/lib/normalization';
import { CATEGORIAS_FILTRO } from '@/lib/constants';
import TarjetaProducto from '@/app/componentes/TarjetaProducto';
import ImageUploader from '../../componentes/ImageUploader';
import ConfirmModal from '../../componentes/ConfirmModal';
import AdminToast, { ToastMessage } from '../../componentes/AdminToast';

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

const POPULAR_COMPETITOR_BRANDS = ['WEGA', 'MANN', 'FRAM', 'OEM', 'MARENO', 'TECNECO', 'MASTERFILT', 'MAHLE'];

function getCompetitorBadgeStyle(marcaRaw: string) {
  const m = (marcaRaw || '').toUpperCase();
  if (m === 'WEGA') {
    return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  }
  if (m === 'MANN' || m === 'MANN-FILTER') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (m === 'FRAM') {
    return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  }
  if (m === 'OEM' || m === 'ORIGINAL') {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  }
  if (m === 'MARENO') {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  }
  if (m === 'TECNECO' || m === 'MASTERFILT' || m === 'MAHLE') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
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
  const [marcasExistentes, setMarcasExistentes] = useState<string[]>(['Pro Filter', 'Maxfil', 'MDH', 'Picborg', 'Mareno', 'Wega', 'Mann', 'Fram', 'Tecfil', 'Mahle']);

  const [precio, setPrecio] = useState<number | ''>('');
  const [dimensiones, setDimensiones] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);
  const [ocultarPrecio, setOcultarPrecio] = useState(false);
  const [ocultarGlobal, setOcultarGlobal] = useState(false);

  useEffect(() => {
    getOcultarPreciosGlobal().then(setOcultarGlobal);
  }, []);

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

  // Kit Components State & Smart Search
  const [componentes, setComponentes] = useState<ComponenteKit[]>([]);
  const [newCompCode, setNewCompCode] = useState('');
  const [addingComp, setAddingComp] = useState(false);
  const [compSearchResults, setCompSearchResults] = useState<Filtro[]>([]);
  const [isSearchingComp, setIsSearchingComp] = useState(false);
  const [showCompDropdown, setShowCompDropdown] = useState(false);

  // Live Smart Search for Kit component insertion
  useEffect(() => {
    const q = newCompCode.trim();
    if (q.length < 2) {
      setCompSearchResults([]);
      setIsSearchingComp(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingComp(true);
      try {
        const tokClean = q.toLowerCase().replace(/[-_ ]/g, '');
        const { data } = await supabase
          .from('productos_filtrar')
          .select('*')
          .or(
            `codigo_filtrar.ilike.%${tokClean}%,` +
            `titulo_producto.ilike.%${q}%,` +
            `descripcion_aplicacion.ilike.%${q}%,` +
            `equivalencias.ilike.%${q}%`
          )
          .limit(6);

        if (data) {
          setCompSearchResults(data as Filtro[]);
        }
      } catch (err) {
        console.error('Error buscando componentes:', err);
      } finally {
        setIsSearchingComp(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [newCompCode]);

  // Equivalences State
  const [equivalencias, setEquivalencias] = useState<Equivalencia[]>([]);
  const [newMarcaComp, setNewMarcaComp] = useState('WEGA');
  const [newCodComp, setNewCodComp] = useState('');
  const [addingEquiv, setAddingEquiv] = useState(false);

  // Vehicles State
  const [vehiculos, setVehiculos] = useState<VehiculoAsociado[]>([]);
  const [newVehMarca, setNewVehMarca] = useState('VOLKSWAGEN');
  const [newVehModelo, setNewVehModelo] = useState('');
  const [newVehVersion, setNewVehVersion] = useState('');
  const [newVehAño, setNewVehAño] = useState('');
  const [addingVeh, setAddingVeh] = useState(false);

  // Smart Autocomplete Quick-Search Linker
  const [vehQuickSearch, setVehQuickSearch] = useState('');
  const [vehQuickResults, setVehQuickResults] = useState<any[]>([]);
  const [isSearchingVeh, setIsSearchingVeh] = useState(false);
  const [showManualVehForm, setShowManualVehForm] = useState(false);

  // Master Vehicles catalog (for dropdown selectors)
  const [masterBrands, setMasterBrands] = useState<string[]>([]);
  const [masterModelsMap, setMasterModelsMap] = useState<Record<string, string[]>>({});
  const [vehFormMode, setVehFormMode] = useState<'existing' | 'custom'>('existing');
  const [isCustomModelSelected, setIsCustomModelSelected] = useState(false);
  const [customModelText, setCustomModelText] = useState('');

  // Live Smart Vehicle Search for instant 1-click linking
  useEffect(() => {
    const q = vehQuickSearch.trim();
    if (q.length < 2) {
      setVehQuickResults([]);
      setIsSearchingVeh(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingVeh(true);
      try {
        const { data } = await supabase
          .from('vehiculos_filtrar')
          .select('*')
          .or(`marca.ilike.%${q}%,modelo.ilike.%${q}%,version.ilike.%${q}%`)
          .limit(12);

        if (data) {
          const seen = new Set<string>();
          const unique: any[] = [];
          (data as any[]).forEach((v) => {
            const key = `${v.marca}__${v.modelo}__${v.version || ''}__${v.año || ''}`.toUpperCase();
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(v);
            }
          });
          setVehQuickResults(unique);
        }
      } catch (err) {
        console.error('Error buscando vehiculos:', err);
      } finally {
        setIsSearchingVeh(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [vehQuickSearch]);

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

      const imgs = normalizarImagenes(p.imagen_url);
      setImagenUrl(imgs.length > 0 ? imgs[0] : '');

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

      // Collect target codes for smart vehicle resolution
      const targetCodes = new Set<string>();
      targetCodes.add(codigo);
      targetCodes.add(codigo.replace(/[-_ ]/g, ''));
      if (equivs) {
        equivs.forEach((e: any) => {
          if (e.codigo_competidor) {
            const c = e.codigo_competidor.trim();
            targetCodes.add(c);
            targetCodes.add(c.replace(/[-_ ]/g, ''));
          }
        });
      }
      const targetCodesArr = Array.from(targetCodes).filter(c => c.length >= 2);

      // Fetch Vehicles
      const { data: vehs } = await supabase
        .from('vehiculos_filtrar')
        .select('*')
        .in('filtro_asociado', targetCodesArr)
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

  // Add Component to Kit (Supports both existing catalog products and new custom codes)
  const executeAddComponente = async (codeToAdd: string) => {
    const cleanCompCode = codeToAdd.trim().toUpperCase();
    if (!cleanCompCode) return;

    if (componentes.some((c) => c.codigo_relacionado === cleanCompCode)) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Ya está en el kit', message: `El código "${cleanCompCode}" ya forma parte de este kit.` });
      return;
    }

    setAddingComp(true);
    setShowCompDropdown(false);

    try {
      // 1. Check if product exists in catalog
      const { data: compProd } = await supabase
        .from('productos_filtrar')
        .select('*')
        .eq('codigo_filtrar', cleanCompCode)
        .maybeSingle();

      // 2. Insert relation into relaciones_productos
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

      // 3. Fallback detail if product is not registered in catalog yet
      const compDetail: Filtro = (compProd as Filtro) || {
        id: 0,
        codigo_filtrar: cleanCompCode,
        titulo_producto: `Filtro ${cleanCompCode}`,
        categoria: cleanCompCode.startsWith('AF') ? 'Filtros de Aire' : cleanCompCode.startsWith('OF') ? 'Filtros de Aceite' : cleanCompCode.startsWith('FF') ? 'Filtros de Combustible' : cleanCompCode.startsWith('CF') ? 'Filtros de Habitáculo' : 'Componente Kit',
        marca_filtro: 'Pro Filter',
        precio: null,
        equivalencias: null,
        dimensiones: null,
        descripcion_aplicacion: null,
        imagen_url: null,
      };

      const newCompItem: ComponenteKit = {
        id: data.id,
        producto_codigo: codigo,
        tipo_relacion: 'CONTIENE_COMPONENTE',
        codigo_relacionado: cleanCompCode,
        detalle: compDetail,
      };

      setComponentes((prev) => [...prev, newCompItem]);
      setNewCompCode('');
      setCompSearchResults([]);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Componente agregado al Kit',
        message: compProd
          ? `${cleanCompCode} agregado correctamente.`
          : `${cleanCompCode} agregado al kit. (Aún no registrado en catálogo).`,
      });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error agregando componente', message: err.message });
    } finally {
      setAddingComp(false);
    }
  };

  const handleAddComponente = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAddComponente(newCompCode);
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

  // Quick Link Vehicle from Search Autocomplete
  const handleQuickLinkVehicle = async (v: { marca: string; modelo: string; version: string | null; año: string | null }) => {
    try {
      const newRow = {
        marca: v.marca.toUpperCase().trim(),
        modelo: v.modelo.trim(),
        version: v.version?.trim() || null,
        año: v.año?.trim() || null,
        filtro_asociado: codigo,
      };

      const { data, error } = await supabase
        .from('vehiculos_filtrar')
        .insert([newRow])
        .select()
        .single();

      if (error) throw error;

      setVehiculos((prev) => [...prev, data as VehiculoAsociado]);
      setVehQuickSearch('');
      setVehQuickResults([]);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Vehículo asociado',
        message: `${v.marca} ${v.modelo} ${v.version || ''} vinculado correctamente.`,
      });
    } catch (err: any) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al asociar', message: err.message });
    }
  };

  // Grouped vehicles by Brand & Model for clean intuitive visual hierarchy
  const groupedProductVehicles = useMemo(() => {
    const map: Record<string, Record<string, VehiculoAsociado[]>> = {};

    vehiculos.forEach((v) => {
      const b = (v.marca || 'GENÉRICO').toUpperCase().trim();
      const m = (v.modelo || 'VARIOS').trim();

      if (!map[b]) map[b] = {};
      if (!map[b][m]) map[b][m] = [];
      map[b][m].push(v);
    });

    const result: {
      marca: string;
      totalApps: number;
      modelos: { modelo: string; items: VehiculoAsociado[] }[];
    }[] = [];

    Object.keys(map).sort().forEach((brand) => {
      const modelsObj = map[brand];
      const modelsList: { modelo: string; items: VehiculoAsociado[] }[] = [];
      let totalApps = 0;

      Object.keys(modelsObj).sort().forEach((model) => {
        const items = modelsObj[model];
        totalApps += items.length;
        modelsList.push({ modelo: model, items });
      });

      result.push({ marca: brand, totalApps, modelos: modelsList });
    });

    return result;
  }, [vehiculos]);

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
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Eye className="w-4 h-4" />
            <span>Ver en Web</span>
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
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
          className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'datos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <Package className="w-4 h-4" />
          <span>Datos del Producto</span>
        </button>

        <button
          onClick={() => setActiveTab('componentes')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'componentes'
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
          className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'equivalencias'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Equivalencias ({equivalencias.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vehiculos')}
          className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 ${activeTab === 'vehiculos'
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-2xl">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Título del Producto
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Kit de Filtros Toyota Hilux 2.8"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-white outline-none focus:border-blue-500 transition-all"
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
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {CATEGORIAS_FILTRO.map((c) => (
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
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer mb-2"
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
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-black text-white outline-none focus:border-blue-500 transition-all"
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
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
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
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-blue-500 transition-all resize-y"
                  />
                </div>
              </div>

              <ImageUploader
                codigo={codigo}
                currentUrl={imagenUrl}
                onImageUploaded={(url) => setImagenUrl(url)}
                onImageRemoved={() => setImagenUrl('')}
              />

              {/* OCULTAR PRECIO INDIVIDUAL Y EXCEPCIONES */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white flex items-center gap-2 flex-wrap">
                    <span>Ocultar Precio en Web Pública</span>
                    {ocultarGlobal && !ocultarPrecio && (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                        ✨ Excepción: Precio Visible
                      </span>
                    )}
                    {ocultarGlobal && ocultarPrecio && (
                      <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                        🔒 Regla Global Activa
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                    {ocultarGlobal
                      ? ocultarPrecio
                        ? 'Oculto por la regla global. Desmarcala si querés MOSTRAR este precio como excepción.'
                        : '¡EXCEPCIÓN ACTIVA! Este precio se muestra en la web aunque el resto esté oculto.'
                      : 'Si se activa, mostrará "Consultar Precio" en lugar del valor numérico.'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ocultarPrecio}
                    onChange={(e) => setOcultarPrecio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    ocultarPrecio ? 'bg-purple-600' : 'bg-slate-800'
                  }`}></div>
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
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Vista Previa</span>
                </h3>

              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 flex items-center justify-center">
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
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-6 text-purple-200 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-black text-sm uppercase tracking-wider">
              <Boxes className="w-5 h-5" />
              <span>Gestión de Componentes del Kit</span>
            </div>
            <p className="text-xs font-semibold text-purple-300/80">
              Aquí podés definir exactamente qué repuestos individuales (aceite, aire, combustible, habitáculo) componen el producto <strong className="text-white">{codigo}</strong>.
            </p>
          </div>

          <form onSubmit={handleAddComponente} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Agregar Filtro / Componente al Kit {codigo}</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center justify-between">
                  <span>Buscar o Ingresar Código de Componente (ej: Hilux, AF-010, MANN, etc.)</span>
                  <span className="text-purple-400 lowercase font-semibold">🔍 Buscador Inteligente + Código Libre</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={newCompCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewCompCode(val);
                      setShowCompDropdown(true);
                    }}
                    onFocus={() => setShowCompDropdown(true)}
                    placeholder="Buscá por código, título o modelo, o escribí un código nuevo..."
                    className="w-full p-3.5 pl-4 pr-10 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-purple-500 uppercase placeholder:normal-case placeholder:text-slate-600"
                    required
                  />

                  {isSearchingComp && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* DROPDOWN SMART SEARCH DE COMPONENTES */}
                {showCompDropdown && compSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 max-h-60 overflow-y-auto">
                    <div className="p-2.5 bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Sugerencias Encontradas ({compSearchResults.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowCompDropdown(false)}
                        className="text-slate-500 hover:text-white"
                      >
                        Cerrar ✕
                      </button>
                    </div>

                    {compSearchResults.map((prod) => {
                      const imgs = normalizarImagenes(prod.imagen_url);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setNewCompCode(prod.codigo_filtrar);
                            executeAddComponente(prod.codigo_filtrar);
                          }}
                          className="w-full p-3 text-left hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                              {imgs[0] ? (
                                <img src={imgs[0]} alt={prod.codigo_filtrar} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-mono font-black text-xs text-white group-hover:text-purple-300 block truncate">
                                {prod.codigo_filtrar}
                              </span>
                              <span className="text-[11px] text-slate-400 font-semibold block truncate">
                                {prod.titulo_producto || `Filtro ${prod.codigo_filtrar}`}
                              </span>
                            </div>
                          </div>

                          <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 shrink-0">
                            + Agregar
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingComp}
                  className="w-full sm:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 shrink-0"
                >
                  {addingComp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Agregar al Kit</span>
                </button>
              </div>
            </div>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
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
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
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

      {/* TAB 3: EQUIVALENCIAS (MATRIZ VISUAL CON PASTILLAS DE COLOR + SELECTOR RÁPIDO DE MARCA) */}
      {activeTab === 'equivalencias' && (
        <div className="space-y-4 animate-fade-in">
          {/* HEADER & RESUMEN DEL TAB */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Equivalencias y Cruces para {codigo}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {equivalencias.length} {equivalencias.length === 1 ? 'cruce registrado' : 'cruces registrados con marcas de la competencia'}
                </p>
              </div>
            </div>
          </div>

          {/* FORMULARIO RÁPIDO PARA AGREGAR CRUCE */}
          <form onSubmit={handleAddEquivalencia} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Nuevo Cruce de Competencia</span>
            </div>

            {/* BOTONES RÁPIDOS DE MARCA */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Seleccionar Marca Competidora:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_COMPETITOR_BRANDS.map((brand) => {
                  const isSelected = newMarcaComp.toUpperCase() === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setNewMarcaComp(brand)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Marca Competidor *
                </label>
                <input
                  type="text"
                  value={newMarcaComp}
                  onChange={(e) => setNewMarcaComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WEGA, FRAM, MANN"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Código de la Competencia *
                </label>
                <input
                  type="text"
                  value={newCodComp}
                  onChange={(e) => setNewCodComp(e.target.value.toUpperCase())}
                  placeholder="Ej: WO-180, C24005, PH-10904"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={addingEquiv}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  {addingEquiv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>+ Agregar Cruce</span>
                </button>
              </div>
            </div>
          </form>

          {/* MATRIZ VISUAL DE CRUCES ACTIVOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white tracking-tight">Cruces Registrados:</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {equivalencias.length} {equivalencias.length === 1 ? 'cruce' : 'cruces'}
              </span>
            </div>

            {equivalencias.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {equivalencias.map((eq) => {
                  const badgeStyle = getCompetitorBadgeStyle(eq.marca_competidor);

                  return (
                    <div
                      key={eq.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2.5 transition-all group ${badgeStyle}`}
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {eq.marca_competidor}
                        </div>
                        <div className="font-mono font-extrabold text-sm text-white truncate mt-0.5">
                          {eq.codigo_competidor}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEquivalencia(eq.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
                        title={`Eliminar cruce con ${eq.marca_competidor} ${eq.codigo_competidor}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-1.5">
                <ArrowLeftRight className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-medium">No hay equivalencias registradas para este producto todavía.</p>
                <p className="text-[11px] text-slate-500">Completá el formulario de arriba para agregar las marcas correspondientes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VEHÍCULOS ASOCIADOS (BÚSQUEDA RÁPIDA + VISTA AGRUPADA POR MARCA Y MODELO) */}
      {activeTab === 'vehiculos' && (
        <div className="space-y-4 animate-fade-in">
          {/* HEADER & CONTROLES DEL TAB */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Vehículos Compatibles con {codigo}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {groupedProductVehicles.length} {groupedProductVehicles.length === 1 ? 'marca' : 'marcas'} · {vehiculos.length} {vehiculos.length === 1 ? 'aplicación registrada' : 'aplicaciones registradas'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowManualVehForm((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                showManualVehForm
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showManualVehForm ? 'Cerrar Formulario Manual' : '+ Agregar Manual / Nuevo'}</span>
            </button>
          </div>

          {/* BUSCADOR RÁPIDO AUTOCOMPLETABLE PARA ASOCIAR EN 1 CLIC */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vehQuickSearch}
                onChange={(e) => setVehQuickSearch(e.target.value)}
                placeholder="🔍 Vincular vehículo existente rápido (ej: Ford Territory, Hilux 2.8, Amarok, Gol Trend, Citan)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              />
              {isSearchingVeh && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
              {vehQuickSearch && !isSearchingVeh && (
                <button
                  type="button"
                  onClick={() => {
                    setVehQuickSearch('');
                    setVehQuickResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* DROPDOWN DE RESULTADOS EN VIVO */}
            {vehQuickResults.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/80 overflow-hidden shadow-xl max-h-64 overflow-y-auto">
                <div className="p-2 bg-slate-900/80 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span>Vehículos sugeridos para vincular:</span>
                  <span className="text-[10px] text-blue-400 font-normal">Hacé clic en &quot;+ Vincular&quot;</span>
                </div>
                {vehQuickResults.map((res, idx) => (
                  <div
                    key={`${res.marca}-${res.modelo}-${res.version}-${idx}`}
                    className="p-2.5 hover:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{res.marca}</span>
                        <span className="font-semibold text-blue-400">{res.modelo}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{res.version || 'Motor estándar'}</span>
                        {res.año && <span className="font-mono text-slate-500">({res.año})</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickLinkVehicle(res)}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold rounded-md transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Vincular</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FORMULARIO MANUAL COMPACTO (OPCIONAL / COLAPSABLE) */}
          {showManualVehForm && (
            <form onSubmit={handleAddVehiculo} className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 shadow-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-blue-400" />
                  <span>Asociación Manual de Vehículo</span>
                </h4>

                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setVehFormMode('existing')}
                    className={`px-2 py-1 rounded transition-all ${
                      vehFormMode === 'existing' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Marca del Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehFormMode('custom')}
                    className={`px-2 py-1 rounded transition-all ${
                      vehFormMode === 'custom' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Crear Nueva
                  </button>
                </div>
              </div>

              {vehFormMode === 'existing' ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Marca *</label>
                    <select
                      value={newVehMarca}
                      onChange={(e) => handleBrandDropdownChange(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-semibold text-white outline-none focus:border-blue-500 cursor-pointer uppercase"
                    >
                      {masterBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Modelo de {newVehMarca} *</label>
                    {isCustomModelSelected ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={customModelText}
                          onChange={(e) => setCustomModelText(e.target.value)}
                          placeholder="Nuevo modelo..."
                          className="w-full p-2 pr-7 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomModelSelected(false)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={newVehModelo}
                        onChange={(e) => handleModelDropdownChange(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {(masterModelsMap[newVehMarca] || []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        <option value="__CUSTOM_MODEL__">+ Escribir otro modelo...</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVehVersion}
                      onChange={(e) => setNewVehVersion(e.target.value)}
                      placeholder="Ej: 2.8 TDi 204cv"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newVehAño}
                      onChange={(e) => setNewVehAño(e.target.value)}
                      placeholder="Ej: 2015 →"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Marca Nueva *</label>
                    <input
                      type="text"
                      value={newVehMarca}
                      onChange={(e) => setNewVehMarca(e.target.value.toUpperCase())}
                      placeholder="Ej: BYD"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Modelo Nuevo *</label>
                    <input
                      type="text"
                      value={newVehModelo}
                      onChange={(e) => setNewVehModelo(e.target.value)}
                      placeholder="Ej: Dolphin"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Versión / Motor</label>
                    <input
                      type="text"
                      value={newVehVersion}
                      onChange={(e) => setNewVehVersion(e.target.value)}
                      placeholder="Ej: 95cv EV"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Año / Rango</label>
                    <input
                      type="text"
                      value={newVehAño}
                      onChange={(e) => setNewVehAño(e.target.value)}
                      placeholder="Ej: 2023 →"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs font-medium text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={addingVeh}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {addingVeh ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Guardar Asociación</span>
                </button>
              </div>
            </form>
          )}

          {/* LISTA DE VEHÍCULOS ASOCIADOS AGRUPADOS POR MARCA Y MODELO */}
          {groupedProductVehicles.length > 0 ? (
            <div className="space-y-3">
              {groupedProductVehicles.map((brand) => (
                <div key={brand.marca} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  {/* CABECERA DE MARCA */}
                  <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white text-xs tracking-tight">{brand.marca}</span>
                      <span className="bg-blue-500/15 text-blue-300 text-[10px] font-mono font-bold px-2 py-0.2 rounded border border-blue-500/30">
                        {brand.totalApps} {brand.totalApps === 1 ? 'aplicación' : 'aplicaciones'}
                      </span>
                    </div>
                  </div>

                  {/* MODELOS DENTRO DE LA MARCA */}
                  <div className="divide-y divide-slate-800/60">
                    {brand.modelos.map((m) => (
                      <div key={m.modelo} className="p-3">
                        <div className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>{m.modelo}</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800 pb-1">
                                <th className="pb-1.5">Versión / Motorización</th>
                                <th className="pb-1.5">Año / Rango</th>
                                <th className="pb-1.5 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                              {m.items.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-2 text-white font-medium">
                                    {v.version || 'Todas las motorizaciones'}
                                  </td>
                                  <td className="py-2 font-mono text-slate-400">
                                    {v.año || 'Todos los años'}
                                  </td>
                                  <td className="py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVehiculo(v.id)}
                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                      title="Desasociar vehículo de este producto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-2">
              <Car className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium">No hay vehículos asociados a este producto todavía.</p>
              <p className="text-[11px] text-slate-500">Usá el buscador de arriba para vincular vehículos con 1 solo clic.</p>
            </div>
          )}
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
