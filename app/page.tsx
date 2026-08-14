import SmartSearch from './componentes/SmartSearch';
import BuscadorVehiculo from './componentes/BuscadorVehiculo';
import ResultadoBuscador from './componentes/ResultadoBuscador';
import { Package, Layers, MessageCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden max-w-full">

      {/* HERO SECTION DISTRIBUIDORA */}
      <section className="relative z-30 bg-slate-950 text-white pt-12 sm:pt-16 pb-20 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">

        {/* MESH RETÍCULA DE FONDO TÉCNICA */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* WATERMARK DEL LOGO EN EL FONDO */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none w-full max-w-4xl flex justify-center overflow-hidden">
          <img
            src="/logo.png"
            alt="FiltrAr Background"
            className="w-[450px] sm:w-[650px] h-auto object-contain blur-[2px] filter brightness-200"
          />
        </div>

        {/* RESPLANDORES AZULES DEL LOGO */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* INSIGNIA DISTRIBUIDORA */}
          <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-500/30 text-sky-300 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-lg shadow-blue-950/40">
            <span>DISTRIBUIDORA DE FILTROS · CATÁLOGO GENERAL</span>
          </div>

          {/* TÍTULO PRINCIPAL DIRECTO */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.15]">
            Filtros para Automotor, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Pesados y Maquinaria
            </span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-base max-w-2xl mx-auto mb-8 sm:mb-10 font-medium px-2 leading-relaxed">
            Búsqueda directa por código propio, equivalencias multimarca (WEGA, MANN, FRAM, OEM) o por marca y modelo de vehículo.
          </p>

          {/* BUSCADOR INTELIGENTE UNIFICADO */}
          <div className="max-w-3xl mx-auto">
            <SmartSearch />
          </div>

          {/* TARJETAS DE SERVICIO DISTRIBUIDORA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto mt-12 sm:mt-16 text-left border-t border-slate-800/80 pt-6 sm:pt-8">
            <div className="bg-slate-900/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="text-[11px] sm:text-xs font-black text-white block">Venta Mayorista</span>
                <span className="text-[10px] text-slate-400 font-semibold block">y Minorista</span>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="text-[11px] sm:text-xs font-black text-white block">Cruces Directos</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Todas las Marcas</span>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <span className="text-[11px] sm:text-xs font-black text-white block">Atención Directa</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Por WhatsApp</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CONTENIDO PRINCIPAL CON SECCIONES */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12 sm:space-y-16 overflow-x-hidden">

        {/* BUSCADOR POR VEHÍCULO */}
        <BuscadorVehiculo />

        {/* SECCIÓN NUEVA RESULTADO BUSCADOR */}
        <ResultadoBuscador />

      </div>

    </main>
  );
}
