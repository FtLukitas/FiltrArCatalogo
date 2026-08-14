'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/constants';

export default function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola!%20Quisiera%20consultar%20sobre%20los%20filtros%20del%20cat%C3%A1logo%20FiltrAr`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/20 group"
      aria-label="Contacto por WhatsApp"
      title="Contactar Asesor Comercial"
    >
      <MessageCircle className="w-7 h-7 fill-white text-emerald-500" />
      <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700">
        ¿Dudas o Pedidos? Escribinos
      </span>
    </a>
  );
}
