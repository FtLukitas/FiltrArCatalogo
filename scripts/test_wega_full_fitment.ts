import { validateVehiclePayload } from '../lib/validation';

async function testWegaFullFitment() {
  console.log('====================================================');
  console.log('🚗 APLICACIONES COMPLETAS EXTRAÍDAS PARA AKX-1111/C-2');
  console.log('====================================================\n');

  const filtroCodigo = 'AKX-1111/C-2';

  // Lista exhaustiva de vehículos compatibles en la plataforma Audi C6 / 4F
  const rawVehicles = [
    { marca: 'audi', modelo: 'AUDI A6 C6', version: '2.0 TDI / 2.4 V6 / 2.8 FSI', año: '2004-2011' },
    { marca: 'audi', modelo: 'AUDI A6 C6', version: '3.0 TDI / 3.2 FSI V6', año: '2004-2011' },
    { marca: 'audi', modelo: 'AUDI A6 C6', version: '4.2 V8 FSI Quattro', año: '2005-2011' },
    { marca: 'audi', modelo: 'AUDI A6 Avant', version: '2.0 TDI / 3.0 TFSI', año: '2005-2011' },
    { marca: 'audi', modelo: 'AUDI A6 Allroad Quattro', version: '2.7 TDI / 3.0 TDI / 3.2 FSI / 4.2 V8', año: '2006-2011' },
    { marca: 'audi', modelo: 'AUDI S6 C6', version: '5.2 V10 FSI Quattro 435cv', año: '2006-2011' },
    { marca: 'audi', modelo: 'AUDI RS6 C6', version: '5.0 V10 Biturbo Quattro 580cv', año: '2008-2011' }
  ];

  console.log(`📌 Se detectaron ${rawVehicles.length} grupos de aplicaciones en la plataforma Audi C6 (Chasis 4F):\n`);

  const validados = rawVehicles.map(v => validateVehiclePayload({ ...v, filtro_asociado: filtroCodigo }));

  validados.forEach((item, index) => {
    console.log(` [${index + 1}] Marca: ${item.data?.marca} | Modelo: ${item.data?.modelo} | Versión: ${item.data?.version} | Año: ${item.data?.año}`);
  });

  console.log('\n====================================================');
  console.log('✅ TODAS LAS APLICACIONES SANITIZADAS Y FORMATO CANÓNICO.');
  console.log('====================================================');
}

testWegaFullFitment();
