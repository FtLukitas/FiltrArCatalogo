import * as fs from 'fs';
import * as path from 'path';

function generateSqlDump() {
  console.log('====================================================');
  console.log('🐘 GENERANDO DUMP SQL PARA RESTAURACIÓN DIRECTA EN SUPABASE');
  console.log('====================================================\n');

  const backupsDir = path.join(__dirname, '..', 'backups');
  const dirs = fs.readdirSync(backupsDir).filter(d => d.startsWith('backup_')).sort().reverse();
  
  if (dirs.length === 0) {
    console.error('No se encontraron carpetas de respaldo.');
    return;
  }

  const latestBackupDir = path.join(backupsDir, dirs[0]);
  const sqlFilePath = path.join(latestBackupDir, 'backup_database_dump.sql');

  let sqlContent = `-- =====================================================\n`;
  sqlContent += `-- DUMP COMPLETO DE RESPALDO POSTGRESQL / SUPABASE\n`;
  sqlContent += `-- Proyecto: FiltrAr Catalogo\n`;
  sqlContent += `-- Fecha de generación: ${new Date().toISOString()}\n`;
  sqlContent += `-- =====================================================\n\n`;

  const order = ['configuracion_catalogo', 'productos_filtrar', 'equivalencias_cruza', 'vehiculos_filtrar', 'relaciones_productos'];

  for (const tabla of order) {
    const jsonFile = path.join(latestBackupDir, `${tabla}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    const rows = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    if (rows.length === 0) continue;

    sqlContent += `-- -----------------------------------------------------\n`;
    sqlContent += `-- TABLA: public.${tabla} (${rows.length} filas)\n`;
    sqlContent += `-- -----------------------------------------------------\n`;

    const keys = Object.keys(rows[0]);
    const colsSql = keys.map(k => `"${k}"`).join(', ');

    // Agrupar inserts en bloques
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      sqlContent += `INSERT INTO public.${tabla} (${colsSql}) VALUES\n`;

      const valuesSql = chunk.map((r: any) => {
        const vals = keys.map(k => {
          const v = r[k];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean' || typeof v === 'number') return String(v);
          const escaped = String(v).replace(/'/g, "''");
          return `'${escaped}'`;
        });
        return `(${vals.join(', ')})`;
      }).join(',\n');

      sqlContent += `${valuesSql}\nON CONFLICT DO NOTHING;\n\n`;
    }
  }

  fs.writeFileSync(sqlFilePath, sqlContent, 'utf-8');
  console.log(`✅ SQL Dump generado con éxito en:\n   ${sqlFilePath}\n`);
}

generateSqlDump();
