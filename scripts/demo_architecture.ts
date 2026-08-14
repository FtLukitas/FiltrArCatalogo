import { analyzeProductImpact, replaceProduct, linkVehicle, addEquivalence } from '../lib/domainTools';
import { validateProductPayload, validateVehiclePayload } from '../lib/validation';

async function runArchitectureDemo() {
  console.log('====================================================');
  console.log('🚀 DEMOSTRACIÓN DE ARQUITECTURA DE SKILLS & TOOLS');
  console.log('====================================================\n');

  // 1. DEMO VALIDACIÓN
  console.log('📌 1. PRUEBA DE LA VALIDATION SKILL');
  const rawVehicle = {
    filtro_asociado: 'ea201',
    marca: 'vw', // Se auto-normalizará a VOLKSWAGEN
    modelo: 'VOLKSWAGEN Gol IV', // Se auto-sanitizará a Modelo "Gol", Versión "Gen IV"
    version: '1.6 8V'
  };

  const validationResult = validateVehiclePayload(rawVehicle);
  console.log(' Payload Original:', rawVehicle);
  console.log(' ✅ Payload Normalizado y Validado:', validationResult.data);
  console.log('----------------------------------------------------\n');

  // 2. DEMO ANÁLISIS DE IMPACTO (Pre-mutación)
  console.log('📌 2. PRUEBA DEL ANALIZADOR DE IMPACTO (analyzeProductImpact)');
  const targetCodigo = 'EA201';
  console.log(` Probando análisis sobre el código: "${targetCodigo}"...`);
  
  try {
    const impact = await analyzeProductImpact(targetCodigo);
    console.log(' 📊 Reporte de Impacto Retornado por Supabase RPC:');
    console.log(JSON.stringify(impact, null, 2));
  } catch (err: any) {
    console.log(' ℹ️ (Nota: Para ejecutar la RPC en vivo en Supabase, asegúrate de aplicar el archivo INICIALIZAR_SUPABASE.sql o rpc_functions.sql en el SQL Editor).');
  }

  console.log('\n====================================================');
  console.log('✨ Demostración completada.');
  console.log('====================================================');
}

runArchitectureDemo();
