'use client';

import { useState } from 'react';
import { ZoomIn, X, Wind, Droplet, Fuel, Sparkles, Boxes, Layers } from 'lucide-react';
import { normalizarImagenes } from '@/lib/utils';

interface VisorImagenesProps {
  imagenUrl: string | string[] | null;
  codigoFiltrar: string;
  categoria?: string | null;
  dimensiones?: string | null;
}

function obtenerIconoCategoria(categoriaRaw?: string | null) {
  const cat = (categoriaRaw || '').toLowerCase();
  if (cat.includes('aceite')) return { icon: Droplet, label: 'Filtro de Aceite', gradient: 'from-amber-600 via-amber-700 to-slate-900' };
  if (cat.includes('aire')) return { icon: Wind, label: 'Filtro de Aire', gradient: 'from-sky-600 via-blue-700 to-slate-900' };
  if (cat.includes('combustible') || cat.includes('nafta')) return { icon: Fuel, label: 'Filtro de Combustible', gradient: 'from-emerald-600 via-teal-700 to-slate-900' };
  if (cat.includes('habitaculo')) return { icon: Sparkles, label: 'Filtro de Habitáculo', gradient: 'from-purple-600 via-indigo-700 to-slate-900' };
  if (cat.includes('kit')) return { icon: Boxes, label: 'Kit de Filtros', gradient: 'from-blue-700 via-indigo-800 to-slate-950' };
  return { icon: Layers, label: categoriaRaw || 'Filtro Técnico', gradient: 'from-slate-700 via-slate-800 to-slate-950' };
}

export default function VisorImagenes({ imagenUrl, codigoFiltrar, categoria, dimensiones }: VisorImagenesProps) {
  const imagenes = normalizarImagenes(imagenUrl);
  const [indice, setIndice] = useState(0);
  const [zoomActivo, setZoomActivo] = useState(false);

  const tema = obtenerIconoCategoria(categoria);
  const IconoCategoria = tema.icon;

  if (imagenes.length === 0) {
    return (
      <div className={`w-full bg-gradient-to-br ${tema.gradient} border border-slate-700 rounded-3xl p-8 flex flex-col justify-between h-[350px] md:h-[450px] shadow-2xl relative overflow-hidden text-white`}>
        
        {/* PATRÓN RETÍCULA TÉCNICA BLUEPRINT */}
        <div 
          className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none"
        />

        {/* HEADER CON BADGE */}
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
            <IconoCategoria className="w-4 h-4 text-blue-300" />
            {tema.label}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-black/30 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-white/70">
            Ficha Técnica Oficial
          </span>
        </div>

        {/* CÓDIGO GIGANTE */}
        <div className="my-auto relative z-10 text-center">
          <span className="text-xs font-mono tracking-widest text-white/50 uppercase block mb-1">
            Código de Repuesto
          </span>
          <h2 className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
            {codigoFiltrar}
          </h2>
        </div>

        {/* FOOTER BLUEPRINT */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-white/80">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-white/50 uppercase text-[10px]">Dimensiones:</span>
            <span>{dimensiones || 'Estándar Industrial'}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">FiltrAr Catálogo</span>
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* MAIN FOTO CARD WITH ZOOM HOVER */}
      <div
        onClick={() => setZoomActivo(true)}
        className="w-full bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-center h-[350px] md:h-[450px] overflow-hidden shadow-xl relative cursor-zoom-in group transition-all hover:border-blue-400"
      >
        <img
          src={imagenes[indice]}
          alt={`Filtro ${codigoFiltrar} - Vista ${indice + 1}`}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Click para Zoom</span>
        </div>
      </div>

      {/* GALERÍA DE MINIATURAS */}
      {imagenes.length > 1 && (
        <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 no-scrollbar">
          {imagenes.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setIndice(idx)}
              className={`w-20 h-20 rounded-2xl border-2 overflow-hidden bg-white p-1 transition-all shrink-0 ${
                indice === idx
                  ? 'border-blue-600 ring-4 ring-blue-100 scale-105 shadow-md'
                  : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
              }`}
            >
              <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* MODAL ZOOM A PANTALLA COMPLETA */}
      {zoomActivo && (
        <div
          onClick={() => setZoomActivo(false)}
          className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out animate-fade-in"
        >
          <img
            src={imagenes[indice]}
            alt={`Zoom ${codigoFiltrar}`}
            className="max-w-full max-h-full object-contain drop-shadow-2xl"
          />

          <button
            onClick={() => setZoomActivo(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
