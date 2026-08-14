import { validateProductPayload, validateVehiclePayload, validateEquivalencePayload } from '../lib/validation';

/**
 * CONTRATO DE SALIDA DEL SCRAPER (Playwright / Scraper Skill)
 */
export interface ScraperResult {
  producto: {
    codigo_filtrar: string;
    titulo_producto: string;
    categoria: string;
    marca_filtro: string;
  };
  vehiculos: Array<{
    marca: string;
    modelo: string;
    version: string;
    año: string;
  }>;
  equivalencias: Array<{
    marca_competidor: string;
    codigo_competidor: string;
  }>;
}

/**
 * Función que simula la extracción estricta de Playwright (Scraper Skill).
 * Extrae datos crudos de una web externa sin tocar la base de datos.
 */
export async function runScraperExample(urlTarget: string): Promise<ScraperResult> {
  console.log(`🕷️ [Scraper Skill] Extrayendo datos desde: ${urlTarget}...`);

  // Simulamos la extracción de HTML/DOM realizada por Playwright
  const rawScrapedData: ScraperResult = {
    producto: {
      codigo_filtrar: ' wo-120 ',
      titulo_producto: 'Filtro de Aceite Wega WO-120',
      categoria: 'Filtros de Aceite',
      marca_filtro: 'WEGA-FILTERS'
    },
    vehiculos: [
      { marca: 'vw', modelo: 'VOLKSWAGEN Gol Trend', version: '1.6 8V', año: '2012->' },
      { marca: 'chevy', modelo: 'CHEVROLET Corsa Classic', version: '1.4 8V', año: '2009-2016' }
    ],
    equivalencias: [
      { marca_competidor: 'MANN+HUMMEL', codigo_competidor: 'W 610/3' },
      { marca_competidor: 'SOGEFI FRAM', codigo_competidor: 'PH 2870' }
    ]
  };

  return rawScrapedData;
}

/**
 * PIPELINE COMPLETO: Scraper -> Validator -> Pre-Database Payload
 */
async function runScraperPipelineDemo() {
  console.log('====================================================');
  console.log('🔄 PIPELINE COMPLETO: SCRAPER → VALIDATOR → DATABASE');
  console.log('====================================================\n');

  // 1. EXTRAER (Scraper Skill)
  const rawData = await runScraperExample('https://cat-ejemplo.com/filtro/wo-120');
  console.log(' 📦 Datos Crudos Retornados por el Scraper:\n', JSON.stringify(rawData, null, 2));
  console.log('----------------------------------------------------\n');

  // 2. VALIDAR Y SANITIZAR (Validation Skill)
  console.log(' 🧹 PASO 2: Pasando por la Skill de Validación (Zod + Normalización)...');
  
  const productoValidado = validateProductPayload(rawData.producto);
  const vehiculosValidados = rawData.vehiculos.map(v => validateVehiclePayload({ ...v, filtro_asociado: rawData.producto.codigo_filtrar }));
  const equivalenciasValidadas = rawData.equivalencias.map(e => validateEquivalencePayload({ ...e, producto_codigo: rawData.producto.codigo_filtrar }));

  console.log(' ✅ Producto Limpio:', productoValidado.data);
  console.log(' ✅ Vehículos Sanitizados:', vehiculosValidados.map(v => v.data));
  console.log(' ✅ Equivalencias Canonizadas:', equivalenciasValidadas.map(e => e.data));

  console.log('\n====================================================');
  console.log('✨ PIPELINE FINALIZADO CON ÉXITO (Datos listos para RPC de Supabase)');
  console.log('====================================================');
}

runScraperPipelineDemo();
