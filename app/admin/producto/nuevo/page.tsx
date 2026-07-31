'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Ruler,
  FileText,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { normalizarMarcaCompetidor } from '@/lib/normalization';
import TarjetaProducto from '@/app/componentes/TarjetaProducto';
import ImageUploader from '../../componentes/ImageUploader';
import AdminToast, { ToastMessage } from '../../componentes/AdminToast';

const CATEGORIAS = ['Filtros de Aceite', 'Filtros de Aire', 'Filtros de Combustible', 'Filtros de Habitáculo', 'Kits de Filtros'];

export default function AdminNuevoProductoPage() {
  const router = useRouter();

  const [codigo, setCodigo] = useState('');
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

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Cargar marcas dinámicamente desde la base de datos de producción
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

  const finalMarca = normalizarMarcaCompetidor(
    isCustomMarcaSelected ? customMarcaText : marca
  );

  // Computed preview object for live card rendering
  const previewFiltro: Filtro = {
    id: 0,
    codigo_filtrar: codigo.trim().toUpperCase() || 'CÓDIGO',
    titulo_producto: titulo.trim() || 'Título del Producto',
    categoria: categoria || 'Filtros de Aceite',
    marca_filtro: finalMarca,
    precio: precio !== '' ? Number(precio) : 0,
    dimensiones: dimensiones.trim() || null,
    descripcion_aplicacion: descripcion.trim() || null,
    imagen_url: (imagenUrl && imagenUrl !== 'preview' && imagenUrl.trim()) ? [imagenUrl.trim()] : null,
    activo: activo,
    ocultar_precio: ocultarPrecio,
    equivalencias: null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCodigo = codigo.trim().toUpperCase();
    if (!cleanCodigo) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Campo obligatorio', message: 'Ingresá el código del producto.' });
      return;
    }

    if (!finalMarca) {
      setToast({ id: Date.now().toString(), type: 'error', title: 'Marca requerida', message: 'Ingresá o seleccioná una marca válida.' });
      return;
    }

    setSaving(true);

    try {
      // 1. Check if codigo_filtrar already exists
      const { data: existing } = await supabase
        .from('productos_filtrar')
        .select('id')
        .eq('codigo_filtrar', cleanCodigo)
        .maybeSingle();

      if (existing) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Código duplicado', message: `El código "${cleanCodigo}" ya existe en el catálogo.` });
        setSaving(false);
        return;
      }

      // 2. Insert new product
      const newProduct = {
        codigo_filtrar: cleanCodigo,
        codigo_normalizado: cleanCodigo.replace(/[-_/\s]/g, '').toLowerCase(),
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
        .insert([newProduct]);

      if (error) throw error;

      setToast({ id: Date.now().toString(), type: 'success', title: 'Producto creado', message: `El producto ${cleanCodigo} fue creado correctamente.` });

      // Redirect after 1s
      setTimeout(() => {
        router.push(`/admin/producto/${encodeURIComponent(cleanCodigo)}`);
      }, 1000);
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      setToast({ id: Date.now().toString(), type: 'error', title: 'Error al guardar', message: err.message });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/productos"
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            <span>ALTA DE NUEVO PRODUCTO</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Ingresá los datos del nuevo repuesto y observá la vista previa en tiempo real.
          </p>
        </div>
      </div>

      {/* CONTENEDOR 2 COLUMNAS: FORMULARIO + VISTA PREVIA TARJETA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULARIO (7 COLUMNAS) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Código de Producto *
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AF-205, KIT-01, OF-711T"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-mono font-black text-white outline-none focus:border-blue-500 uppercase transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Título del Producto
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Filtro de Aire Toyota Hilux 2.8"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Categoría *
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
                  Marca del Filtro *
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
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* DIMENSIONES Y DESCRIPCIÓN */}
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
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Compatible con Toyota Hilux 2.4 / 2.8 TDi (2015 en adelante), SW4..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500 transition-all resize-y placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* SUBIDA DE IMAGEN WEBP */}
            <ImageUploader
              codigo={codigo || 'NUEVO'}
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

            {/* ESTADO VISIBLE */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-white block">Estado Visible en la Web</span>
                <span className="text-[11px] text-slate-400 font-semibold block">Si está desactivado, no aparecerá en las búsquedas.</span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:translate-x-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Crear Producto</span>
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
                <span>Vista Previa en Vivo</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Pública
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-center">
              <div className="w-full max-w-sm">
                <TarjetaProducto filtro={previewFiltro} />
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 text-center">
              Esta es la apariencia exacta con la que se mostrará este producto a los clientes en el catálogo web.
            </p>
          </div>
        </aside>
      </div>

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
