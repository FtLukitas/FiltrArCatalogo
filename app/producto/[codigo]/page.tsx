import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Filtro, ResultadoVehiculo } from '@/lib/types';
import VisorImagenes from '@/app/componentes/VisorImagenes';
import { extraerMedida, parsearDimensiones, formatearPrecio, generarUrlWhatsapp } from '@/lib/utils';
import { 
  ArrowLeft, 
  MessageCircle, 
  Car, 
  Layers, 
  Ruler, 
  CheckCircle2, 
  Tag, 
  Info,
  Boxes,
  ArrowRight
} from 'lucide-react';

export const revalidate = 3600; // Cache public product page for 1 hour

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { codigo } = await params;
  const decodedCodigo = decodeURIComponent(codigo);

  let res = await supabase
    .from('productos_filtrar')
    .select('*')
    .eq('codigo_filtrar', decodedCodigo)
    .single();

  if (!res.data) return { title: 'Producto No Encontrado | FiltrAr' };

  const codigoItem = res.data.codigo_filtrar || decodedCodigo;

  return {
    title: `${res.data.titulo_producto || `Filtro ${codigoItem}`} - Ficha Técnica | FiltrAr`,
    description: res.data.descripcion_aplicacion || `Especificaciones del filtro ${codigoItem}`,
  };
}

export default async function ProductoPage({ params }: PageProps) {
  const { codigo } = await params;
  const decodedCodigo = decodeURIComponent(codigo);

  // 1. Obtener datos del filtro desde productos_filtrar
  let resProd = await supabase
    .from('productos_filtrar')
    .select('*')
    .eq('codigo_filtrar', decodedCodigo)
    .single();

  if (resProd.error || !resProd.data) {
    notFound();
  }

  const filtro = resProd.data as Filtro;
  const codigoActual = filtro.codigo_filtrar || decodedCodigo;

  // 2. Obtener vehículos compatibles desde vehiculos_filtrar
  let resVeh = await supabase
    .from('vehiculos_filtrar')
    .select('*')
    .eq('filtro_asociado', codigoActual)
    .order('marca', { ascending: true });

  const listaVehiculos = (resVeh.data as ResultadoVehiculo[]) || [];
  const whatsappUrl = generarUrlWhatsapp(codigoActual, filtro.titulo_producto);

  // 2b. Obtener equivalencias cruzadas desde equivalencias_cruza (si filtro.equivalencias esta vacio)
  if (!filtro.equivalencias) {
    const resEquiv = await supabase
      .from('equivalencias_cruza')
      .select('marca_competidor, codigo_competidor')
      .eq('producto_codigo', codigoActual);

    if (!resEquiv.error && resEquiv.data && resEquiv.data.length > 0) {
      const eqMap = resEquiv.data.map(e => `${e.marca_competidor}: ${e.codigo_competidor}`);
      filtro.equivalencias = eqMap.join(' | ');
    }
  }

  // 3. Obtener componentes incluidos si es un Kit o tiene relaciones internas
  let componentesKit: Filtro[] = [];
  let resRel = await supabase
    .from('relaciones_productos')
    .select('codigo_relacionado')
    .eq('producto_codigo', codigoActual)
    .eq('tipo_relacion', 'CONTIENE_COMPONENTE');

  if (!resRel.error && resRel.data && resRel.data.length > 0) {
    const codigosComp = [...new Set(resRel.data.map(r => r.codigo_relacionado))];
    const resComp = await supabase
      .from('productos_filtrar')
      .select('*')
      .in('codigo_filtrar', codigosComp);
    
    const mapProds = new Map<string, Filtro>();
    if (!resComp.error && resComp.data) {
      resComp.data.forEach(p => mapProds.set(p.codigo_filtrar, p as Filtro));
    }

    componentesKit = codigosComp.map(c => {
      if (mapProds.has(c)) {
        return mapProds.get(c)!;
      }
      return {
        id: 0,
        codigo_filtrar: c,
        titulo_producto: `Filtro ${c}`,
        categoria: c.startsWith('AF') ? 'Filtros de Aire' : c.startsWith('OF') ? 'Filtros de Aceite' : c.startsWith('FF') ? 'Filtros de Combustible' : c.startsWith('CF') ? 'Filtros de Habitáculo' : 'Filtro Componente',
        marca_filtro: 'Pro Filter',
        precio: null,
        equivalencias: null,
        dimensiones: null,
        descripcion_aplicacion: null,
        imagen_url: null
      };
    });
  }

  return (
    <main className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BOTÓN VOLVER Y BREADCRUMB */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-extrabold px-3.5 py-2 rounded-lg text-xs border border-slate-200 shadow-sm transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Volver al Catálogo</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/" className="hover:text-blue-600">Catálogo</Link>
            <span>/</span>
            <span className="text-slate-600 font-bold">{filtro.categoria || 'Filtro'}</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">{codigoActual}</span>
          </nav>
        </div>

        {/* CONTENEDOR UNIFICADO PRINCIPAL CON Bordes TÉCNICOS (rounded-xl) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-8 overflow-hidden">
          
          {/* GRILLA DOS COLUMNAS DE DETALLE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-8">
            
            {/* COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES O BLUEPRINT TÉCNICO */}
            <div className="lg:col-span-6">
              <VisorImagenes 
                imagenUrl={filtro.imagen_url} 
                codigoFiltrar={codigoActual} 
                categoria={filtro.categoria}
                dimensiones={filtro.dimensiones}
              />
            </div>

            {/* COLUMNA DERECHA: INFORMACIÓN TÉCNICA */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                
                {/* BADGES */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-slate-900 text-white font-mono text-xs font-black px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    CÓD: {codigoActual}
                  </span>
                  <span className="bg-blue-100 text-blue-900 font-black text-xs px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {filtro.categoria || 'Filtro Industrial'}
                  </span>
                  {filtro.marca_filtro && (
                    <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-1 rounded-md uppercase">
                      Marca: {filtro.marca_filtro}
                    </span>
                  )}
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stock Disponible
                  </span>
                </div>

                {/* TÍTULO PRINCIPAL DEL PRODUCTO */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                  {filtro.titulo_producto || `Filtro ${codigoActual}`}
                </h1>

                {/* TABLA DE DIMENSIONES Y MEDIDAS FLEXIBLE */}
                {filtro.dimensiones && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">
                      <Ruler className="w-4 h-4 text-blue-600" />
                      <span>Especificaciones de Medidas</span>
                    </div>

                    {(() => {
                      const itemsMedida = parsearDimensiones(filtro.dimensiones);
                      if (itemsMedida.length > 0) {
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                            {itemsMedida.map((item, idx) => (
                              <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-sm">
                                <span className="block text-[10px] text-slate-400 font-black uppercase mb-0.5 truncate">
                                  {item.label}
                                </span>
                                <span className="text-xs text-slate-900 font-black tracking-tight block truncate">
                                  {item.valor}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 text-center">
                          {filtro.dimensiones}
                        </div>
                      );
                    })()}

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-center">
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        Texto completo: {filtro.dimensiones}
                      </span>
                    </div>
                  </div>
                )}

                {/* MATRIZ DE EQUIVALENCIAS DE OTRAS MARCAS */}
                {filtro.equivalencias && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Equivalencias Cruzadas de Marca</span>
                    </div>
                    <p className="text-xs font-mono text-slate-800 leading-relaxed font-semibold">
                      {filtro.equivalencias}
                    </p>
                  </div>
                )}

                {/* APLICACIÓN DETALLADA */}
                {filtro.descripcion_aplicacion && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 mb-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900 uppercase tracking-widest mb-1.5">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>Aplicación y Uso Recomendado</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                      {filtro.descripcion_aplicacion}
                    </p>
                  </div>
                )}

              </div>

              {/* BLOQUE PRECIO Y ACCIONES */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio de Lista Sugerido</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatearPrecio(filtro.precio)}
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

            </div>

          </div>

          {/* COMPONENTES PEGADOS DIRECTAMENTE ABAJO DE LA TARJETA DEL PRODUCTO (SI ES UN KIT) */}
          {componentesKit.length > 0 && (
            <div className="border-t border-slate-800 bg-slate-950 text-white p-6 md:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white uppercase">
                    Filtros Incluidos en este Kit ({componentesKit.length})
                  </h2>
                  <p className="text-slate-400 text-xs font-medium">
                    Componentes originales que componen el kit de servicio.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {componentesKit.map((comp) => (
                  <Link
                    key={comp.codigo_filtrar}
                    href={`/producto/${encodeURIComponent(comp.codigo_filtrar)}`}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500 p-3.5 rounded-lg transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-black uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                          {comp.codigo_filtrar}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {comp.categoria || 'Componente'}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 mb-1 leading-snug">
                        {comp.titulo_producto || `Filtro ${comp.codigo_filtrar}`}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-extrabold text-blue-400 group-hover:text-white mt-2">
                      <span>Ver Ficha</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* SECCIÓN VEHÍCULOS COMPATIBLES CON BORDES TÉCNICOS (rounded-xl) */}
        <section className="bg-white rounded-xl p-6 md:p-8 border border-slate-200 shadow-md mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                Vehículos Compatibles ({listaVehiculos.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Aplicación directa homologada para este filtro en vehículos de línea.
              </p>
            </div>
          </div>

          {listaVehiculos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {listaVehiculos.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center shrink-0">
                    {v.marca ? v.marca.slice(0, 2).toUpperCase() : 'VH'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-slate-900 text-xs block truncate">
                      {v.marca} {v.modelo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block truncate">
                      {v.version ? `Versión: ${v.version}` : ''} {v.año ? `(${v.año})` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-lg text-center text-slate-500 text-xs font-medium border border-slate-200/60">
              No hay modelos específicos cargados de forma directa para este código. Consulta por WhatsApp para confirmar compatibilidad.
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
