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

          {/* ACCESO RÁPIDO AL ASISTENTE GUIADO INFERIOR */}
          <div className="mt-5 flex items-center justify-center">
            <a
              href="#buscador-guiado"
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all group shadow-md"
            >
              <Car className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
              <span>¿No conocés el código? <strong className="text-sky-300 group-hover:text-sky-200">Elegí tu auto en el Asistente Guiado</strong></span>
              <ArrowDown className="w-3.5 h-3.5 text-sky-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
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
