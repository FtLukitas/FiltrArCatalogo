import BuscadorUnificado from './componentes/BuscadorUnificado';
import BuscadorGuiado from './componentes/BuscadorGuiado';
import ResultadoBuscador from './componentes/ResultadoBuscador';
import { Car, ArrowDown } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 overflow-x-hidden max-w-full">

      {/* HERO SECTION DISTRIBUIDORA */}
      <section className="relative z-30 bg-slate-950 text-white pt-12 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">

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
            Búsqueda directa por vehículo (ej: 147, Hilux), equivalencias multimarca (WEGA, MANN, FRAM, OEM) o código de catálogo.
          </p>

          {/* BUSCADOR INTELIGENTE UNIFICADO CON DESAMBIGUACIÓN */}
          <div className="max-w-4xl mx-auto">
            <BuscadorUnificado />
          </div>

          {/* ACCESO RÁPIDO AL ASISTENTE GUIADO INFERIOR - BOTÓN DESTACADO Y CUADRADO */}
          <div className="mt-6 sm:mt-8 max-w-4xl mx-auto w-full">
            <a
              href="#buscador-guiado"
              className="w-full group relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-r from-blue-950/95 via-slate-900 to-indigo-950/95 hover:from-blue-900/90 hover:via-slate-850 hover:to-indigo-900/90 border-2 border-sky-500/60 hover:border-sky-400 text-left transition-all duration-300 shadow-2xl shadow-sky-950/50 hover:shadow-sky-500/25 hover:-translate-y-0.5 cursor-pointer"
            >
              {/* Resplandor decorativo de fondo */}
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />

              <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/30 transition-all shadow-inner">
                  <Car className="w-6 h-6 sm:w-7 sm:h-7 text-sky-300" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-sky-400 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                    ¿No conocés el código?
                  </span>
                  <span className="text-base sm:text-xl font-black text-white group-hover:text-sky-200 transition-colors tracking-tight">
                    Elegí tu auto en el Asistente Guiado
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center justify-center sm:justify-end shrink-0 pt-2 sm:pt-0 border-t border-slate-800 sm:border-t-0">
                <span className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 group-hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-sky-500/30 group-hover:bg-sky-300 group-hover:shadow-sky-400/40">
                  <span>Ir al Asistente</span>
                  <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                </span>
              </div>
            </a>
          </div>

        </div>
      </section>

      {/* CONTENIDO PRINCIPAL CON SECCIONES */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12 sm:space-y-16 overflow-x-hidden">

        {/* BUSCADOR GUIADO ASISTIDO (WIZARD DE VEHÍCULO + TIPO DE FILTRO + PRODUCTOS INMEDIATOS) */}
        <BuscadorGuiado />

        {/* CATÁLOGO GENERAL Y EXPLORADOR */}
        <ResultadoBuscador />

      </div>

    </main>
  );
}
