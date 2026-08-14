import { supabase } from '../lib/supabase';
import { normalizarCodigoCruza } from '../lib/normalization';

async function lookupAkx1593() {
  console.log('====================================================');
  console.log('🔍 BÚSQUEDA Y AUDITORÍA EN SUPABASE PARA AKX-1593F-2');
  console.log('====================================================\n');

  const codigoRaw = 'AKX-1593F-2';
  const codigoNorm = normalizarCodigoCruza(codigoRaw); // akx1593f2
  const codigoNormBase = 'akx1593f';
  const mannEquivalent = 'cu230052';
  const oemBmw = '64116823724';

  console.log(`📌 Códigos a consultar en la BD Supabase:`);
  console.log(`   - Código directo: "${codigoRaw}"`);
  console.log(`   - Normalizados: "${codigoNorm}", "${codigoNormBase}"`);
  console.log(`   - Cruces alternativos Mann/BMW: "${mannEquivalent}", "${oemBmw}"`);

  // 1. BUSCAR EN EQUIVALENCIAS CRUZADAS
  const { data: equivalencias, error: eqErr } = await supabase
    .from('equivalencias_cruza')
    .select('id, producto_codigo, marca_competidor, codigo_competidor, codigo_competidor_normalizado')
    .or(`codigo_competidor_normalizado.eq.${codigoNorm},codigo_competidor_normalizado.eq.${codigoNormBase},codigo_competidor_normalizado.eq.${mannEquivalent},codigo_competidor_normalizado.eq.${oemBmw}`);

  // 2. BUSCAR EN PRODUCTOS FILTRAR DIRECTAMENTE
  const { data: productos, error: prodErr } = await supabase
    .from('productos_filtrar')
    .select('codigo_filtrar, titulo_producto, categoria, marca_filtro, equivalencias')
    .or(`codigo_normalizado.eq.${codigoNorm},codigo_filtrar.ilike.%AKX-1593%,equivalencias.ilike.%AKX-1593%`);

  console.log('\n📊 RESULTADOS DE LA AUDITORÍA EN TU BASE DE DATOS:');

  const hayEquivalencias = equivalencias && equivalencias.length > 0;
  const hayProductos = productos && productos.length > 0;

  if (hayEquivalencias) {
    console.log(`\n ✅ ENCONTRADO EN EQUIVALENCIAS (${equivalencias.length} registro/s):`);
    equivalencias.forEach(eq => {
      console.log(`    - Marca: "${eq.marca_competidor}" | Código: "${eq.codigo_competidor}" ──> TU CÓDIGO FILTRAR ES: [ ${eq.producto_codigo} ]`);
    });
  } else {
    console.log('\n ℹ️ No existe coincidencia en la tabla "equivalencias_cruza".');
  }

  if (hayProductos) {
    console.log(`\n ✅ ENCONTRADO EN CATALOGO PRINCIPAL (${productos.length} producto/s):`);
    productos.forEach(p => {
      console.log(`    - CÓDIGO FILTRAR: [ ${p.codigo_filtrar} ] | Título: "${p.titulo_producto}" | Categoría: ${p.categoria}`);
    });
  } else {
    console.log(' ℹ️ Tampoco existe en la tabla "productos_filtrar".');
  }

  if (!hayEquivalencias && !hayProductos) {
    console.log('\n❌ CONCLUSIÓN: Este filtro Wega (AKX-1593F-2) NO está registrado actualmente en tu base de datos.');
  }

  console.log('\n====================================================');
  console.log('🛡️ OPERACIÓN COMPLETADA SIN MUTACIONES EN LA BASE DE DATOS.');
  console.log('====================================================');
}

lookupAkx1593();
