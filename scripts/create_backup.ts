import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno antes de importar Supabase
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const val = valueParts.join('=').trim();
      if (val && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qrqqnutkldmtyljtgwxm.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln';
}

async function runFullBackup() {
  const { supabase } = await import('../lib/supabase');

  console.log('====================================================');
  console.log('💾 INICIANDO RESPALDO COMPLETO DE BASE DE DATOS SUPABASE');
  console.log('====================================================\n');

  async function fetchAllRows(tableName: string) {
    console.log(`📦 Respaldando tabla: "${tableName}"...`);
    let allRows: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`❌ Error extrayendo "${tableName}":`, error.message);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        offset += pageSize;
        hasMore = data.length === pageSize;
        console.log(`   -> Extraídos ${allRows.length} registros...`);
      } else {
        hasMore = false;
      }
    }

    return allRows;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tablas = [
    'productos_filtrar',
    'equivalencias_cruza',
    'vehiculos_filtrar',
    'relaciones_productos',
    'configuracion_catalogo'
  ];

  const backupSummary: Record<string, number> = {};

  for (const tabla of tablas) {
    const rows = await fetchAllRows(tabla);
    backupSummary[tabla] = rows.length;

    const filePath = path.join(backupDir, `${tabla}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`💾 Guardado respaldo en: ${filePath} (${rows.length} filas)\n`);
  }

  const summaryPath = path.join(backupDir, 'index.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    project: 'FiltrAr',
    tables: backupSummary
  }, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('🎉 RESPALDO COMPLETO REALIZADO CON ÉXITO');
  console.log(`📂 Carpeta de respaldo: ${backupDir}`);
  console.log('====================================================');
  console.log('Resumen de registros respaldados:');
  console.dir(backupSummary);
}

runFullBackup();
