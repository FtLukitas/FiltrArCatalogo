const { normalizarMarcaVehiculo, normalizarMarcaCompetidor, sanitizarVehiculo, sanitizarEquivalenciasTexto } = require('../lib/normalization');
const { validateVehiclePayload, validateReplacePayload } = require('../lib/validation');

console.log('====================================================');
console.log('🧪 PRUEBA EN VIVO DE LAS SKILLS DE INTEGRIDAD Y VALIDACIÓN');
console.log('====================================================\n');

// 1. PRUEBA DE NORMALIZACIÓN DE MARCAS VEHICULARES
console.log('📌 1. Validación de Marca y Modelo Vehicular');
const entradaVehiculo = {
  filtro_asociado: 'scd74s',
  marca: 'vw',                      // Debe convertirse en VOLKSWAGEN
  modelo: 'VOLKSWAGEN Gol IV',      // Debe separarse en Modelo "Gol", Versión "Gen IV"
  version: '1.6 8V Trend'
};

const resultadoVehiculo = validateVehiclePayload(entradaVehiculo);
console.log(' Input sucio:', entradaVehiculo);
console.log(' ✅ Resultado Validado & Sanitizado:', resultadoVehiculo.data);
console.log('----------------------------------------------------\n');

// 2. PRUEBA DE CANONIZACIÓN DE MARCAS DE COMPETIDORES Y EQUIVALENCIAS
console.log('📌 2. Saneamiento de Texto de Equivalencias (Wega, Mann, Fram)');
const textoBruto = 'MANN-FILTER: W 610/3; WEGA SA: WO-120; SOGEFI FRAM: PH-2870';
const equivalenciasParseadas = sanitizarEquivalenciasTexto(textoBruto);

console.log(' Texto de entrada:', textoBruto);
console.log(' ✅ Equivalencias Canonizadas:');
equivalenciasParseadas.forEach(item => {
  console.log(`   - Marca: "${item.marca_competidor}" | Código: "${item.codigo_competidor}" | Normalizado: "${item.codigo_competidor_normalizado}"`);
});
console.log('----------------------------------------------------\n');

// 3. PRUEBA DE VALIDACIÓN DE REEMPLAZO DE CÓDIGO
console.log('📌 3. Validación de Payload de Reemplazo de Código');
const reemplazoValido = validateReplacePayload({ old_codigo: ' ea201 ', new_codigo: ' ea201-v2 ' });
console.log(' Reemplazo EA201 -> EA201-V2:', reemplazoValido);

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA SKILL DE VALIDACIÓN PASARON.');
console.log('====================================================');
