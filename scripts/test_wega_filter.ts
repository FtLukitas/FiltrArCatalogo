import { supabase } from '../lib/supabase';
import { normalizarMarcaCompetidor, normalizarCodigoCruza } from '../lib/normalization';
import { analyzeProductImpact } from '../lib/domainTools';

async function testWegaFilter() {
  console.log('====================================================');
  console.log('🔍 PRUEBA EN VIVO: BÚSQUEDA Y EVALUACIÓN DE FILTRO');
  console.log('====================================================\n');

  const inputRaw = 'AKX-1111/C-2';
  const marcaInput = 'WEGA-FILTERS';

  console.log(`📌 1. Entrada recibida del usuario:`);
  console.log(`   - Código: "${inputRaw}"`);
  console.log(`   - Marca: "${marcaInput}"`);

  // 1. APLICAR SKILL DE VALIDACIÓN Y NORMALIZACIÓN
  const marcaCanon = normalizarMarcaCompetidor(marcaInput);
  const codigoNorm = normalizarCodigoCruza(inputRaw);

  console.log(`\n🧹 2. Procesamiento por Validation Skill:`);
  console.log(`   - Marca Canonizada: "${marcaCanon}"`);
  console.log(`   - Código Normalizado para búsqueda: "${codigoNorm}"`);

  // 2. BUSCAR EN SUPABASE (Solo Lectura)
  console.log(`\n🔎 3. Consultando base de datos Supabase (equivalencias_cruza y productos_filtrar)...`);

  // Buscar en equivalencias_cruza por codigo_competidor_normalizado
  const { data: equivalencias, error: eqError } = await supabase
    .from('equivalencias_cruza')
    .select('id, producto_codigo, marca_competidor, codigo_competidor, codigo_competidor_normalizado')
    .or(`codigo_competidor_normalizado.eq.${codigoNorm},codigo_competidor.ilike.%${inputRaw}%`);

  if (eqError) {
    console.error('❌ Error al consultar equivalencias:', eqError.message);
  }

  // Buscar en productos_filtrar directamente por si es un código propio
  const { data: productos, error: prodError } = await supabase
    .from('productos_filtrar')
    .select('codigo_filtrar, titulo_producto, categoria, marca_filtro, activo')
    .or(`codigo_normalizado.eq.${codigoNorm},codigo_filtrar.ilike.%${inputRaw}%`);

  if (prodError) {
    console.error('❌ Error al consultar productos:', prodError.message);
  }

  console.log('\n📊 4. RESULTADOS DE LA BÚSQUEDA:');

  const hayEquivalencias = equivalencias && equivalencias.length > 0;
  const hayProductos = productos && productos.length > 0;

  if (hayEquivalencias) {
    console.log(` ✅ Encontradas ${equivalencias.length} equivalencias directas:`);
    equivalencias.forEach(eq => {
      console.log(`    - Marca Competidor: ${eq.marca_competidor} | Código: ${eq.codigo_competidor} ──> Código FiltrAr: [${eq.producto_codigo}]`);
    });
  } else {
    console.log(' ℹ️ No se encontraron equivalencias directas registradas en "equivalencias_cruza".');
  }

  if (hayProductos) {
    console.log(` ✅ Encontrados ${productos.length} productos directos en el catálogo:`);
    productos.forEach(p => {
      console.log(`    - Código FiltrAr: [${p.codigo_filtrar}] | Título: "${p.titulo_producto}" | Categoría: ${p.categoria}`);
    });
  } else {
    console.log(' ℹ️ Tampoco existe como código directo en "productos_filtrar".');
  }

  // 3. ANÁLISIS DE IMPACTO SI SE ENCONTRÓ UN PRODUCTO ASOCIADO
  const codigoAsociado = hayEquivalencias ? equivalencias[0].producto_codigo : (hayProductos ? productos[0].codigo_filtrar : null);

  if (codigoAsociado) {
    console.log(`\n📊 5. Evaluación de Impacto para el producto vinculado [${codigoAsociado}]:`);
    try {
      const impact = await analyzeProductImpact(codigoAsociado);
      console.log(JSON.stringify(impact, null, 2));
    } catch (e: any) {
      console.log('   (RPC de impacto pendiente de ejecutar en Supabase SQL Editor).');
    }
  } else {
    console.log('\n🛡️ DIAGNÓSTICO FINAL DE SEGURIDAD:');
    console.log(`   El código "${inputRaw}" no existe actualmente en tu base de datos.`);
    console.log('   Gracias a la restricción "CERO mutaciones sin permiso", NO se ha insertado nada en Supabase.');
  }

  console.log('\n====================================================');
  console.log('✨ PRUEBA COMPLETADA SIN MODIFICAR LA BASE DE DATOS.');
  console.log('====================================================');
}

testWegaFilter();
