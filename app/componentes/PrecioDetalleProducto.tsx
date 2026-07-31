'use client';

import { useState, useEffect } from 'react';
import type { Filtro } from '@/lib/types';
import { formatearPrecio } from '@/lib/utils';
import { getOcultarPreciosGlobal, debeOcultarPrecio } from '@/lib/preciosConfig';
import { MessageCircle } from 'lucide-react';

interface PrecioDetalleProductoProps {
  filtro: Filtro;
  ocultarGlobalInicial: boolean;
  whatsappUrl: string;
}

export default function PrecioDetalleProducto({
  filtro,
  ocultarGlobalInicial,
  whatsappUrl,
}: PrecioDetalleProductoProps) {
  const [ocultarGlobal, setOcultarGlobal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('filtrar_ocultar_precios_global');
      if (local !== null) return local === 'true';
    }
    return ocultarGlobalInicial;
  });

  useEffect(() => {
    // Sincronizar con localStorage y Supabase en el cliente
    getOcultarPreciosGlobal().then((ocultar) => {
      setOcultarGlobal(ocultar);
    });
  }, []);

  const ocultarFinal = debeOcultarPrecio(filtro, ocultarGlobal);

  return (
    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-2">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          {ocultarFinal ? 'Estado del Precio' : 'Precio de Lista Sugerido'}
        </span>
        <span className={`text-2xl sm:text-3xl font-black ${ocultarFinal ? 'text-blue-600' : 'text-slate-900'}`}>
          {formatearPrecio(filtro.precio, ocultarFinal)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-3 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 border border-emerald-400/30"
        >
          <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
