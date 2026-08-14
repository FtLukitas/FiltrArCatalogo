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
  Tag,
  DollarSign,
  Ruler,
  FileText,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { normalizarMarcaCompetidor } from '@/lib/normalization';
import { CATEGORIAS_FILTRO } from '@/lib/constants';
import TarjetaProducto from '@/app/componentes/TarjetaProducto';
import ImageUploader from '../../componentes/ImageUploader';
import AdminToast, { ToastMessage } from '../../componentes/AdminToast';

export default function AdminNuevoProductoPage() {
  const router = useRouter();

  const [codigo, setCodigo] = useState('');
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
    <div className="space-y-5 max-w-7xl">
      {/* HEADER */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
        <Link
          href="/admin/productos"
          className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            <span>Alta de Nuevo Producto</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingresá los datos del repuesto y observá la vista previa en tiempo real.
          </p>
        </div>
      </div>

      {/* CONTENEDOR 2 COLUMNAS: FORMULARIO + VISTA PREVIA TARJETA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORMULARIO (7 COLUMNAS) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Código de Producto *
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AF-205, KIT-01, OF-711T"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white outline-none focus:border-blue-500 uppercase placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Título del Producto
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Filtro de Aire Toyota Hilux 2.8"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Categoría *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  {CATEGORIAS_FILTRO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
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
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  {marcasExistentes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="__CUSTOM_MARCA__">+ Escribir otra marca...</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Precio ARS
                </label>
                <input
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ej: 14500"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* SI SELECCIONÓ MARCA CUSTOM */}
            {isCustomMarcaSelected && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-blue-400">
                  Nombre de la Nueva Marca:
                </label>
                <input
                  type="text"
                  value={customMarcaText}
                  onChange={(e) => setCustomMarcaText(e.target.value)}
                  placeholder="Ej: FRAM, MANN-FILTER, BOSCH..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>
            )}

            <div className="text-xs">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Dimensiones y Medidas
              </label>
              <input
                type="text"
                value={dimensiones}
                onChange={(e) => setDimensiones(e.target.value)}
                placeholder="Ej: Largo: 240mm, Ancho: 180mm, Alto: 45mm"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Descripción y Aplicación Resumida
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Ej: Compatible con Toyota Hilux 2.4 / 2.8 TDi (2016 en adelante), SW4 2.8..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>

            {/* COMPRESOR & UPLOADER DE IMAGEN */}
            <div className="pt-2 border-t border-slate-800">
              <ImageUploader
                codigo={codigo.trim().toUpperCase() || 'PRODUCTO'}
                onImageUploaded={(url) => setImagenUrl(url)}
                onImageRemoved={() => setImagenUrl('')}
              />
            </div>

            {/* VISIBILIDAD DE PRECIO INDIVIDUAL */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Ocultar Precio Individual</span>
                <span className="text-[11px] text-slate-400">Si se activa, mostrará &quot;Consultar Precio&quot; en lugar del valor en ARS.</span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ocultarPrecio}
                  onChange={(e) => setOcultarPrecio(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* ESTADO ACTIVO */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Estado Visible en la Web</span>
                <span className="text-[11px] text-slate-400">Si está desactivado, el repuesto quedará guardado pero no se mostrará al público.</span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/admin/productos"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Vista Previa en Vivo</span>
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                Tiempo Real
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex items-center justify-center">
              <div className="w-full max-w-sm">
                <TarjetaProducto filtro={previewFiltro} />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Así se visualizará la tarjeta del producto para los clientes en el catálogo.
            </p>
          </div>
        </aside>
      </div>

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
