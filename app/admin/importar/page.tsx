'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileText,
  Boxes,
  Car,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { parsearEquivalenciasTexto, sanitizarVehiculo, normalizarMarcaCompetidor } from '@/lib/utils';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

interface ParsedRow {
  codigo_filtrar: string;
  titulo_producto: string;
  categoria: string;
  marca_filtro: string;
  precio: number | null;
  dimensiones: string;
  descripcion_aplicacion: string;
  equivalencias: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_version: string;
  vehiculo_año: string;
  status?: 'nuevo' | 'existente' | 'invalido';
}

export default function AdminImportarPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  
  const [readingFile, setReadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importLog, setImportLog] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 1. GENERAR Y DESCARGAR PLANTILLA EXCEL / CSV
  const handleDescargarPlantilla = (format: 'csv' | 'xlsx') => {
    const templateData = [
      {
        codigo_filtrar: 'AF-205',
        titulo_producto: 'Filtro de Aire Toyota Hilux 2.8 TDi',
        categoria: 'Filtros de Aire',
        marca_filtro: 'Pro Filter',
        precio: 14500,
        dimensiones: 'Largo: 240mm, Ancho: 180mm, Alto: 45mm',
        descripcion_aplicacion: 'Compatible con Toyota Hilux 2.4 / 2.8 TDi (2016 en adelante), SW4 2.8',
        equivalencias: 'WEGA: JFA-0205 | MANN: C24005 | FRAM: CA11442',
        vehiculo_marca: 'TOYOTA',
        vehiculo_modelo: 'HILUX',
        vehiculo_version: '2.8 TDi',
        vehiculo_año: '2016-2023',
      },
      {
        codigo_filtrar: 'OF-711T',
        titulo_producto: 'Filtro de Aceite Volkswagen Amarok 2.0 TDi',
        categoria: 'Filtros de Aceite',
        marca_filtro: 'Maxfil',
        precio: 11200,
        dimensiones: 'DE: 76mm | DI: 71mm | Alt: 123mm',
        descripcion_aplicacion: 'VW Amarok 2.0 TDi BiTurbo (2010 en adelante)',
        equivalencias: 'WEGA: WO-180 | MANN: W712/95 | FRAM: PH5803',
        vehiculo_marca: 'VOLKSWAGEN',
        vehiculo_modelo: 'AMAROK',
        vehiculo_version: '2.0 TDi',
        vehiculo_año: '2010-2022',
      },
      {
        codigo_filtrar: 'CF-10430',
        titulo_producto: 'Filtro de Habitáculo Ford Ranger 3.2',
        categoria: 'Filtros de Habitáculo',
        marca_filtro: 'MDH',
        precio: 9800,
        dimensiones: 'Largo: 215mm, Ancho: 200mm, Alto: 30mm',
        descripcion_aplicacion: 'Ford Ranger 2.2 / 3.2 TDCi (2012 en adelante)',
        equivalencias: 'WEGA: AKX-3535 | MANN: CU22022',
        vehiculo_marca: 'FORD',
        vehiculo_modelo: 'RANGER',
        vehiculo_version: '3.2 TDCi',
        vehiculo_año: '2012-2023',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Productos');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'plantilla_importacion_filtrar.xlsx');
    } else {
      XLSX.writeFile(workbook, 'plantilla_importacion_filtrar.csv', { bookType: 'csv' });
    }

    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Plantilla Descargada',
      message: `La plantilla en formato .${format.toUpperCase()} se descargó correctamente. Usala para cargar tus datos.`,
    });
  };

  // 2. PARSEAR ARCHIVO EXCEL O CSV CARGADO
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setReadingFile(true);
    setImportLog(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (rawRows.length === 0) {
        setToast({
          id: Date.now().toString(),
          type: 'error',
          title: 'Planilla Vacía',
          message: 'No se encontraron filas con datos en la planilla seleccionada.',
        });
        setReadingFile(false);
        return;
      }

      // Obtener lista de códigos existentes en Supabase para validar si son Nuevos o Existentes
      const { data: dbCodes } = await supabase
        .from('productos_filtrar')
        .select('codigo_filtrar');

      const existingSet = new Set((dbCodes || []).map((p) => (p.codigo_filtrar || '').toUpperCase()));
      setExistingCodes(existingSet);

      // Mapear y limpiar columnas
      const mappedRows: (ParsedRow | null)[] = rawRows.map((row) => {
        const rawCodigo = String(
          row.codigo_filtrar || row.CODIGO_FILTRAR || row.codigo || row.CODIGO || ''
        ).trim().toUpperCase();

        if (!rawCodigo) return null;

        const rawPrecio = row.precio || row.PRECIO || null;
        const numPrecio = rawPrecio !== null && rawPrecio !== '' ? Number(rawPrecio) : null;

        const status: 'nuevo' | 'existente' = existingSet.has(rawCodigo) ? 'existente' : 'nuevo';

        // Combinar columna equivalencias con columnas específicas si existen (wega_codigo, mann_codigo, etc.)
        const equivParts: string[] = [];
        if (row.equivalencias || row.EQUIVALENCIAS) equivParts.push(String(row.equivalencias || row.EQUIVALENCIAS));
        if (row.wega_codigo || row.WEGA) equivParts.push(`WEGA: ${String(row.wega_codigo || row.WEGA)}`);
        if (row.mann_codigo || row.MANN) equivParts.push(`MANN: ${String(row.mann_codigo || row.MANN)}`);
        if (row.fram_codigo || row.FRAM) equivParts.push(`FRAM: ${String(row.fram_codigo || row.FRAM)}`);
        if (row.oem_codigo || row.OEM) equivParts.push(`OEM: ${String(row.oem_codigo || row.OEM)}`);
        const finalEquiv = equivParts.join(' | ').trim();

        // Sanitizar vehículo para prevenir marcas duplicadas ("vw" -> "VOLKSWAGEN", etc.)
        const vehClean = sanitizarVehiculo(
          String(row.vehiculo_marca || row.VEHICULO_MARCA || '').trim(),
          String(row.vehiculo_modelo || row.VEHICULO_MODELO || '').trim(),
          String(row.vehiculo_version || row.VEHICULO_VERSION || '').trim()
        );

        return {
          codigo_filtrar: rawCodigo,
          titulo_producto: String(row.titulo_producto || row.TITULO_PRODUCTO || row.titulo || row.TITULO || '').trim(),
          categoria: String(row.categoria || row.CATEGORIA || 'Filtros de Aceite').trim(),
          marca_filtro: normalizarMarcaCompetidor(String(row.marca_filtro || row.MARCA_FILTRO || row.marca || row.MARCA || 'Pro Filter').trim()),
          precio: isNaN(numPrecio as number) ? null : numPrecio,
          dimensiones: String(row.dimensiones || row.DIMENSIONES || row.medidas || '').trim(),
          descripcion_aplicacion: String(row.descripcion_aplicacion || row.DESCRIPCION_APLICACION || row.aplicacion || '').trim(),
          equivalencias: finalEquiv,
          vehiculo_marca: vehClean.marca !== 'GENERAL' ? vehClean.marca : '',
          vehiculo_modelo: vehClean.modelo !== 'GENERAL' ? vehClean.modelo : '',
          vehiculo_version: vehClean.version,
          vehiculo_año: String(row.vehiculo_año || row.VEHICULO_AÑO || row.año || '').trim(),
          status,
        };
      });

      const cleaned: ParsedRow[] = mappedRows.filter((r): r is ParsedRow => r !== null);

      setParsedRows(cleaned);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Planilla Procesada',
        message: `Se leyeron correctamente ${cleaned.length} productos listos para importar.`,
      });
    } catch (err: any) {
      console.error('Error al leer planilla:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error al leer archivo',
        message: 'Asegurate de subir un archivo .xlsx, .xls o .csv válido.',
      });
    } finally {
      setReadingFile(false);
    }
  };

  // 3. EJECUTAR LA IMPORTACIÓN MASIVA EN LORTES
  const handleEjecutarImportacion = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    setProgress(0);
    setImportLog(null);

    const CHUNK_SIZE = 50;
    const total = parsedRows.length;
    let processed = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let vehiculosCount = 0;

    try {
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);

        // Preparar array de productos para upsert
        const productosBatch = chunk.map((r) => ({
          codigo_filtrar: r.codigo_filtrar,
          codigo_normalizado: r.codigo_filtrar.replace(/[-_/\s]/g, '').toLowerCase(),
          titulo_producto: r.titulo_producto || null,
          categoria: r.categoria || 'Filtros de Aceite',
          marca_filtro: r.marca_filtro || 'Pro Filter',
          precio: r.precio,
          dimensiones: r.dimensiones || null,
          descripcion_aplicacion: r.descripcion_aplicacion || null,
          equivalencias: r.equivalencias || null,
          activo: true,
        }));

        // Upsert en productos_filtrar
        const { error: errorProd } = await supabase
          .from('productos_filtrar')
          .upsert(productosBatch, { onConflict: 'codigo_filtrar' });

        if (errorProd) throw errorProd;

        // Mapear equivalencias cruzadas estructuradas en equivalencias_cruza
        const equivalenciasBatch: any[] = [];
        chunk.forEach((r) => {
          if (r.equivalencias) {
            const itemsEq = parsearEquivalenciasTexto(r.equivalencias);
            itemsEq.forEach((eq) => {
              equivalenciasBatch.push({
                producto_codigo: r.codigo_filtrar,
                marca_competidor: eq.marca_competidor,
                codigo_competidor: eq.codigo_competidor,
                codigo_competidor_normalizado: eq.codigo_competidor_normalizado,
              });
            });
          }
        });

        if (equivalenciasBatch.length > 0) {
          await supabase
            .from('equivalencias_cruza')
            .insert(equivalenciasBatch);
        }

        // Mapear asociaciones vehiculares si están presentes en la fila
        const vehiculosBatch: any[] = [];
        chunk.forEach((r) => {
          if (r.vehiculo_marca && r.vehiculo_modelo) {
            vehiculosBatch.push({
              marca: r.vehiculo_marca,
              modelo: r.vehiculo_modelo,
              version: r.vehiculo_version || null,
              año: r.vehiculo_año || null,
              filtro_asociado: r.codigo_filtrar,
            });
          }
        });

        if (vehiculosBatch.length > 0) {
          const { error: errorVeh } = await supabase
            .from('vehiculos_filtrar')
            .insert(vehiculosBatch);

          if (!errorVeh) {
            vehiculosCount += vehiculosBatch.length;
          }
        }

        // Conteo de insertados vs actualizados
        chunk.forEach((r) => {
          if (r.status === 'nuevo') insertedCount++;
          else updatedCount++;
        });

        processed += chunk.length;
        setProgress(Math.round((processed / total) * 100));
      }

      const summaryText = `¡Importación Masiva Completada! Se procesaron ${processed} repuestos (${insertedCount} nuevos creados, ${updatedCount} existentes actualizados) y ${vehiculosCount} aplicaciones vehiculares vinculadas.`;

      setImportLog(summaryText);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Importación Exitosa',
        message: summaryText,
      });

      // Limpiar vista tras importar
      setParsedRows([]);
      setFileName(null);
    } catch (err: any) {
      console.error('Error al importar:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error durante la importación',
        message: err.message || 'Ocurrió un fallo al guardar en la base de datos.',
      });
    } finally {
      setImporting(false);
    }
  };

  const nuevosCount = parsedRows.filter((r) => r.status === 'nuevo').length;
  const existentesCount = parsedRows.filter((r) => r.status === 'existente').length;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos"
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              <span>IMPORTACIÓN MASIVA DESDE EXCEL / CSV</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Cargá cientos de productos en segundos mediante planillas de Excel o Google Sheets.
            </p>
          </div>
        </div>

        {/* BOTONES DESCARGAR PLANTILLA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDescargarPlantilla('xlsx')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Descargar Plantilla (.XLSX)</span>
          </button>

          <button
            onClick={() => handleDescargarPlantilla('csv')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Plantilla (.CSV)</span>
          </button>
        </div>
      </div>

      {/* RESULTADO PREVIO LOG */}
      {importLog && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-3xl p-5 text-emerald-200 flex items-center gap-4 animate-fade-in shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Resultado del Proceso</h3>
            <p className="text-xs font-semibold text-emerald-300/90 mt-0.5 leading-relaxed">{importLog}</p>
          </div>
        </div>
      )}

      {/* ÁREA DE CARGA Y DROPAZONE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-slate-950 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center space-y-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            {readingFile ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>

          <div>
            <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
              {fileName ? fileName : 'Hacé clic o arrastrá tu planilla de Excel (.xlsx) o CSV aquí'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Soporta columnas de código, título, categoría, marca, precio, dimensiones, descripción, equivalencias y vehículo.
            </p>
          </div>
        </div>
      </div>

      {/* TABLA DE PREVISUALIZACIÓN DE FILAS DETECTADAS */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
          {/* RESUMEN DE FILAS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Previsualización de Datos Detectados ({parsedRows.length} repuestos)</span>
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Revisá los datos leídos antes de enviarlos a la base de datos de producción.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black px-3 py-1 rounded-full">
                {nuevosCount} Nuevos a Crear
              </span>
              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-3 py-1 rounded-full">
                {existentesCount} Existentes a Actualizar
              </span>
            </div>
          </div>

          {/* PROGRESS BAR SI ESTÁ IMPORTANDO */}
          {importing && (
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Procesando e importando productos...</span>
                </span>
                <span className="text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* TABLA PREVIEW */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-[11px] font-black uppercase text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <th className="p-3">Estado</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Título / Descripción</th>
                  <th className="p-3">Categoría / Marca</th>
                  <th className="p-3">Precio ($)</th>
                  <th className="p-3">Dimensiones</th>
                  <th className="p-3">Vehículo Asociado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      {row.status === 'nuevo' ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 rounded-md">
                          NUEVO
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black px-2 py-0.5 rounded-md">
                          ACTUALIZA
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-black text-white whitespace-nowrap">
                      {row.codigo_filtrar}
                    </td>
                    <td className="p-3 text-slate-200 min-w-[200px]">
                      <span className="font-bold block truncate">{row.titulo_producto || row.codigo_filtrar}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{row.descripcion_aplicacion}</span>
                    </td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      <span className="block font-bold">{row.categoria}</span>
                      <span className="text-[10px] text-slate-400">{row.marca_filtro}</span>
                    </td>
                    <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">
                      {row.precio ? `$ ${row.precio.toLocaleString('es-AR')}` : '-'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-300 max-w-[150px] truncate">
                      {row.dimensiones || '-'}
                    </td>
                    <td className="p-3 text-slate-300 text-[11px] whitespace-nowrap">
                      {row.vehiculo_marca && row.vehiculo_modelo ? (
                        <span className="font-bold text-sky-400">
                          {row.vehiculo_marca} {row.vehiculo_modelo} {row.vehiculo_version}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedRows.length > 50 && (
            <p className="text-center text-[11px] font-bold text-slate-400 pt-1">
              Mostrando las primeras 50 filas de {parsedRows.length} repuestos cargados. Todos los repuestos serán procesados al presionar el botón de abajo.
            </p>
          )}

          {/* ACCIÓN BOTÓN EJECUTAR */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setParsedRows([]);
                setFileName(null);
              }}
              disabled={importing}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-all disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleEjecutarImportacion}
              disabled={importing}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Iniciar Importación Masiva ({parsedRows.length} productos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <AdminToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
