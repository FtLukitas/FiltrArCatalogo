'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Wind, 
  Droplet, 
  Fuel, 
  Sparkles, 
  Boxes, 
  AlertTriangle,
  Layers,
  Tag
} from 'lucide-react';
import type { Filtro } from '@/lib/types';
import { normalizarImagenes, formatearPrecio } from '@/lib/utils';

interface TarjetaProductoProps {
  filtro: Filtro;
}

// Configuración de temas visuales según la categoría del filtro
function obtenerTemaCategoria(categoriaRaw: string | null) {
  const cat = (categoriaRaw || '').toLowerCase();
  
  if (cat.includes('aceite')) {
    return {
      gradient: 'from-amber-600 via-amber-700 to-slate-900',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      accentColor: 'text-amber-400',
      icon: Droplet,
      label: 'Filtro de Aceite'
    };
  }
  if (cat.includes('aire')) {
    return {
      gradient: 'from-sky-600 via-blue-700 to-slate-900',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      accentColor: 'text-sky-400',
      icon: Wind,
      label: 'Filtro de Aire'
    };
  }
  if (cat.includes('combustible') || cat.includes('nafta') || cat.includes('gasoil')) {
    return {
      gradient: 'from-emerald-600 via-teal-700 to-slate-900',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      accentColor: 'text-emerald-400',
      icon: Fuel,
      label: 'Filtro de Combustible'
    };
  }
  if (cat.includes('habitaculo') || cat.includes('cabina')) {
    return {
      gradient: 'from-purple-600 via-indigo-700 to-slate-900',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      accentColor: 'text-purple-400',
      icon: Sparkles,
      label: 'Filtro de Habitáculo'
    };
  }
  if (cat.includes('kit')) {
    return {
      gradient: 'from-blue-700 via-indigo-800 to-slate-950',
      badgeBg: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
      accentColor: 'text-blue-300',
      icon: Boxes,
      label: 'Kit de Filtros'
    };
  }

  return {
    gradient: 'from-slate-700 via-slate-800 to-slate-950',
    badgeBg: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    accentColor: 'text-blue-400',
    icon: Layers,
    label: categoriaRaw || 'Filtro Técnico'
  };
}

export default function TarjetaProducto({ filtro }: TarjetaProductoProps) {
  const imagenes = normalizarImagenes(filtro.imagen_url);
  const imagenPrincipal = imagenes.length > 0 ? imagenes[0] : null;
  const tema = obtenerTemaCategoria(filtro.categoria);
  const IconoCategoria = tema.icon;
  const estaDiscontinuado = filtro.activo === false && Boolean(filtro.reemplazo_codigo);

  // Título exacto del producto desde la columna titulo_producto de la BD
  const tituloProductoExacto = filtro.titulo_producto || `Filtro ${filtro.codigo_filtrar}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-500/80 hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group relative">
      
      {/* BADGE DE REEMPLAZO SI ESTÁ DISCONTINUADO */}
      {estaDiscontinuado && (
        <div className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 flex items-center justify-between z-20">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            Reemplazado
          </span>
          {filtro.reemplazo_codigo && (
            <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded font-mono text-[9px]">
              Ver: {filtro.reemplazo_codigo}
            </span>
          )}
        </div>
      )}

      {/* HEADER DE LA TARJETA: FOTO O BLUEPRINT TÉCNICO */}
      <Link 
        href={`/producto/${encodeURIComponent(filtro.codigo_filtrar)}`}
        className="relative block overflow-hidden group/image"
      >
        {imagenPrincipal ? (
          /* CON FOTO: HEADER CON CÓDIGO EN BADGE PEQUEÑO EN LA ESQUINA */
          <div className="p-4 bg-slate-50/80 h-44 flex items-center justify-center relative transition-colors group-hover/image:bg-blue-50/30">
            
            {/* BADGE DE CÓDIGO PEQUEÑO EN LA MINIATURA */}
            <div className="absolute top-3 left-3 z-10">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-sm border border-slate-800 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-blue-400" />
                CÓD: {filtro.codigo_filtrar}
              </span>
            </div>

            {/* MARCA EN LA ESQUINA DERECHA */}
            {filtro.marca_filtro && (
              <div className="absolute top-3 right-3 z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                  {filtro.marca_filtro}
                </span>
              </div>
            )}

            <img
              src={imagenPrincipal}
              alt={tituloProductoExacto}
              className="max-h-full max-w-full object-contain group-hover/image:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          /* SIN FOTO: BANNER BLUEPRINT CON CÓDIGO Y TÍTULO MOSTRADOS DE FORMA TÉCNICA */
          <div className={`h-44 bg-gradient-to-br ${tema.gradient} p-4 flex flex-col justify-between relative text-white overflow-hidden`}>
            
            {/* PATRÓN RETÍCULA TÉCNICA DE FONDO */}
            <div 
              className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none"
            />

            {/* CABECERA CON CÓDIGO PEQUEÑO Y MARCA */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-md border border-white/30 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-blue-300" />
                CÓD: {filtro.codigo_filtrar}
              </span>

              {filtro.marca_filtro && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/30 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-md border border-white/10">
                  {filtro.marca_filtro}
                </span>
              )}
            </div>

            {/* TÍTULO TÉCNICO EXACTO EN EL BANNER */}
            <div className="my-auto relative z-10">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${tema.accentColor} flex items-center gap-1 mb-0.5`}>
                <IconoCategoria className="w-3 h-3" />
                {tema.label}
              </span>
              <h3 className="text-sm font-bold tracking-tight text-white line-clamp-2 group-hover/image:text-blue-200 transition-colors leading-snug drop-shadow-sm">
                {tituloProductoExacto}
              </h3>
            </div>

            {/* PIE DEL BLUEPRINT: DIMENSIONES */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-white/70">
              <span className="font-mono truncate max-w-[180px]">
                {filtro.dimensiones ? filtro.dimensiones : 'Especificación Técnica'}
              </span>
              <span className="text-white/40 uppercase text-[9px] font-bold">Ficha</span>
            </div>

          </div>
        )}
      </Link>

      {/* CUERPO DE LA TARJETA: EL TÍTULO ES STRICTAMENTE titulo_producto */}
      <div className="p-3.5 flex flex-col flex-grow bg-white">
        
        {/* TÍTULO PRINCIPAL DE LA TARJETA (COLUMNA titulo_producto DE LA BD) */}
        <Link 
          href={`/producto/${encodeURIComponent(filtro.codigo_filtrar)}`}
          className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight mb-1 line-clamp-2 leading-snug"
        >
          {tituloProductoExacto}
        </Link>

        {/* DESCRIPCIÓN O APLICACIÓN DE VEHÍCULO ABAJO DEL TÍTULO */}
        {filtro.descripcion_aplicacion && filtro.descripcion_aplicacion !== tituloProductoExacto && (
          <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-2.5 leading-relaxed">
            {filtro.descripcion_aplicacion}
          </p>
        )}

        {/* ETIQUETA SECUNDARIA CON CATEGORÍA Y CÓDIGO SI TIENE FOTO */}
        {imagenPrincipal && (
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
              CÓD: {filtro.codigo_filtrar}
            </span>
            {filtro.categoria && (
              <span className="text-[10px] font-semibold text-slate-500 truncate">
                • {filtro.categoria}
              </span>
            )}
          </div>
        )}

        {/* BLOQUE DE EQUIVALENCIAS DE MARCA */}
        {filtro.equivalencias && (
          <div className="mb-2.5 bg-slate-50 p-2 rounded-md border border-slate-100/90">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
              Equivalencias:
            </span>
            <p className="text-[11px] font-mono text-slate-700 line-clamp-2 leading-tight">
              {filtro.equivalencias}
            </p>
          </div>
        )}

        {/* DIMENSIONES FÍSICAS (MOSTRAR ABAJO SOLO SI TIENE IMAGEN PARA EVITAR REDUNDANCIA) */}
        {imagenPrincipal && filtro.dimensiones && (
          <div className="mb-2.5 text-[10px] bg-blue-50/50 p-2 rounded-md border border-blue-100/60 text-blue-900 font-medium flex items-center justify-between">
            <span className="font-bold text-blue-600 uppercase text-[9px]">Medidas:</span>
            <span className="font-mono text-slate-800 font-bold">{filtro.dimensiones}</span>
          </div>
        )}

        {/* PIE DE LA TARJETA: PRECIO Y ACCIÓN */}
        <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Precio Lista</span>
            <span className="text-sm font-black text-slate-900">
              {formatearPrecio(filtro.precio)}
            </span>
          </div>

          <Link
            href={`/producto/${encodeURIComponent(filtro.codigo_filtrar)}`}
            className="bg-slate-900 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 group/btn"
          >
            <span>Ver Ficha</span>
            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </div>

    </div>
  );
}
