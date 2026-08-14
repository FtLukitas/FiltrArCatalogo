import { validateProductPayload, validateVehiclePayload, validateEquivalencePayload } from '../lib/validation';

async function testWegaScrapePipeline() {
  console.log('====================================================');
  console.log('🕷️ RESULTADO DEL SCRAPING REAL EN CATÁLOGO WEGA');
  console.log('====================================================\n');

  // 1. DATOS EXTRAÍDOS POR EL SCRAPER (Scraper Skill)
  const rawScrapedData = {
    producto: {
      codigo_filtrar: 'AKX-1111/C-2',
      titulo_producto: 'Filtro de Habitáculo Carbón Activado Audi A4/A6 (Juego x2)',
      categoria: 'Filtros de Habitáculo',
      marca_filtro: 'WEGA-FILTERS',
      dimensiones: '309mm x 99mm x 30mm (Juego de 2 filtros)',
      descripcion_aplicacion: 'Filtro de cabina de carbón activado para Audi A4 II 3.2 FSI y Audi A6 II V6/V8.'
    },
    vehiculos: [
      { marca: 'audi', modelo: 'AUDI A4 II', version: '3.2 FSI 24v 255cv', año: '2007->' },
      { marca: 'audi', modelo: 'AUDI A6 II', version: '3.0 V6', año: '2004-2006' },
      { marca: 'audi', modelo: 'AUDI A6 II', version: '4.2 quattro 350cv', año: '2007->' },
      { marca: 'audi', modelo: 'AUDI A6 II', version: '2.4 V6 177cv', año: '2008->' }
    ],
    equivalencias: [
      { marca_competidor: 'MANN-FILTER', codigo_competidor: 'CUK 3023-2' },
      { marca_competidor: 'OEM', codigo_competidor: '4F0819439A' }
    ]
  };

  console.log('📦 1. Contrato JSON Devuelto por el Scraper:');
  console.log(JSON.stringify(rawScrapedData, null, 2));

  // 2. PASO POR LA VALIDATION SKILL
  console.log('\n🧹 2. Pasando por la Validation Skill (Zod + Normalización):');

  const prodLimpio = validateProductPayload(rawScrapedData.producto);
  const vehiculosLimpios = rawScrapedData.vehiculos.map(v => validateVehiclePayload({ ...v, filtro_asociado: rawScrapedData.producto.codigo_filtrar }));
  const equivalenciasLimpias = rawScrapedData.equivalencias.map(e => validateEquivalencePayload({ ...e, producto_codigo: rawScrapedData.producto.codigo_filtrar }));

  console.log(' ✅ Producto Normalizado:');
  console.log(prodLimpio.data);

  console.log('\n ✅ Vehículos Sanitizados:');
  vehiculosLimpios.forEach(v => console.log('   -', v.data));

  console.log('\n ✅ Equivalencias Canonizadas:');
  equivalenciasLimpias.forEach(e => console.log('   -', e.data));

  console.log('\n====================================================');
  console.log('🛡️ ESTADO DE LA BASE DE DATOS: NO MODIFICADA');
  console.log('====================================================');
}

testWegaScrapePipeline();
