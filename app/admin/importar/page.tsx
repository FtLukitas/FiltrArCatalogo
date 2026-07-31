'use client';

import { useState, useRef, useEffect } from 'react';
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
  BookOpen,
  HelpCircle,
  Info,
  ListChecks,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
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

  // Tutorial State
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [activeTutorialTab, setActiveTutorialTab] = useState<'pasos' | 'columnas' | 'equivalencias' | 'faq'>('pasos');



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
        const chunkCodes = chunk.map((r) => r.codigo_filtrar);

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

        if (chunkCodes.length > 0) {
          await supabase
            .from('equivalencias_cruza')
            .delete()
            .in('producto_codigo', chunkCodes);
        }

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

      {/* TUTORIAL EXTENSO DE IMPORTACIÓN */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all">
        {/* TUTORIAL HEADER */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>GUÍA COMPLETA Y TUTORIAL DE IMPORTACIÓN</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Paso a Paso
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Aprendé a estructurar tu archivo de Excel o CSV para cargar o actualizar cientos de datos sin errores.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTutorialOpen(!tutorialOpen)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto"
          >
            <span>{tutorialOpen ? 'Ocultar Tutorial' : 'Ver Tutorial Completo'}</span>
            {tutorialOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* TUTORIAL BODY (EXPANDABLE) */}
        {tutorialOpen && (
          <div className="p-6 space-y-6 animate-fade-in">
            {/* TABS NAVEGACIÓN TUTORIAL */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTutorialTab('pasos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  activeTutorialTab === 'pasos'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>1. Paso a Paso (Guía Rápida)</span>
              </button>

              <button
                onClick={() => setActiveTutorialTab('columnas')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  activeTutorialTab === 'columnas'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>2. Columnas Aceptadas</span>
              </button>

              <button
                onClick={() => setActiveTutorialTab('equivalencias')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  activeTutorialTab === 'equivalencias'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>3. Formato Equivalencias & Vehículos</span>
              </button>

              <button
                onClick={() => setActiveTutorialTab('faq')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  activeTutorialTab === 'faq'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>4. Preguntas Frecuentes (FAQ)</span>
              </button>
            </div>

            {/* TAB 1: PASOS SENCILLOS Y RÁPIDOS */}
            {activeTutorialTab === 'pasos' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
                {/* PASO 1 */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-black flex items-center justify-center text-base">
                      1
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      Paso Inicial
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Descargá la Plantilla Modelo</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Hacé clic en <strong className="text-white">Descargar Plantilla (.XLSX)</strong> arriba. El archivo viene listo con los encabezados exactos que requiere el sistema.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDescargarPlantilla('xlsx')}
                      className="px-3.5 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Bajar Excel Modelo (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* PASO 2 */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-sky-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-black flex items-center justify-center text-base">
                      2
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                      Carga de Repuestos
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>Llená tus Repuestos en Excel</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Completá los datos de tus repuestos. El único campo obligatorio es <strong className="text-amber-300 font-mono">codigo_filtrar</strong> (ej: <code className="text-white bg-slate-900 px-1 rounded">AF-205</code>).
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
                    <span className="text-sky-300 font-bold">Opcionales:</span> titulo, categoria, marca, precio, equivalencias, vehiculo.
                  </div>
                </div>

                {/* PASO 3 */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-purple-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono font-black flex items-center justify-center text-base">
                      3
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                      Publicar en la Web
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Arrastrá y Confirmá</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Soltá el archivo en el recuadro de abajo. Verás una tabla de previsualización para revisar los datos antes de guardarlos. Si un código ya existe, <strong className="text-emerald-400">se actualizará automáticamente</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: COLUMNAS ACEPTADAS */}
            {activeTutorialTab === 'columnas' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
                  <Info className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>
                    El sistema es inteligente y reconoce variaciones en los nombres de las cabeceras (mayúsculas, minúsculas o inglés). A continuación se detallan las columnas compatibles:
                  </span>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black tracking-wider sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Nombre Recomendado</th>
                          <th className="p-3">Nombres Alternativos Aceptados</th>
                          <th className="p-3">Requerido</th>
                          <th className="p-3">Tipo de Dato & Ejemplo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-amber-400">codigo_filtrar</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">codigo, code, sku, id_producto</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-black">
                              SI (OBLIGATORIO)
                            </span>
                          </td>
                          <td className="p-3">Texto (ej: <code className="text-white bg-slate-900 px-1 rounded">AF-205</code>, <code className="text-white bg-slate-900 px-1 rounded">KIT-01</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">titulo_producto</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">titulo, title, nombre, producto</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto (ej: <code className="text-white bg-slate-900 px-1 rounded">Filtro de Aire Toyota Hilux 2.8</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">categoria</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">category, tipo, rubro</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto (Filtros de Aire, Aceite, Combustible, Habitáculo, Kits)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">marca_filtro</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">marca, brand, fabricante</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto (ej: <code className="text-white bg-slate-900 px-1 rounded">Pro Filter</code>, <code className="text-white bg-slate-900 px-1 rounded">Maxfil</code>, <code className="text-white bg-slate-900 px-1 rounded">MDH</code>, <code className="text-white bg-slate-900 px-1 rounded">Picborg</code>, <code className="text-white bg-slate-900 px-1 rounded">Wega</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">precio</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">precio_ars, price, importe, valor</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Número (ej: <code className="text-white bg-slate-900 px-1 rounded">14500</code> - Sin signos $ ni puntos)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">dimensiones</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">medidas, dimensions, tamano</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto (ej: <code className="text-white bg-slate-900 px-1 rounded">DE: 76mm | DI: 71mm | Alt: 123mm</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-emerald-400">descripcion_aplicacion</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">descripcion, aplicacion, detalle</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto largo (ej: <code className="text-white bg-slate-900 px-1 rounded">Compatible con Toyota Hilux 2.8 2016+</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-sky-400">equivalencias</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">cruces, equivalencias_texto, cruza</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto estructurado (ej: <code className="text-white bg-slate-900 px-1 rounded">WEGA: JFA-0205 | MANN: C24005</code>)</td>
                        </tr>

                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-black text-sky-400">vehiculo_marca / modelo</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">auto_marca, auto_modelo, marca_vehiculo</td>
                          <td className="p-3 text-slate-500 font-semibold">Opcional</td>
                          <td className="p-3">Texto (ej: <code className="text-white bg-slate-900 px-1 rounded">TOYOTA</code> / <code className="text-white bg-slate-900 px-1 rounded">HILUX</code>)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORMATO DE EQUIVALENCIAS Y VEHÍCULOS */}
            {activeTutorialTab === 'equivalencias' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* EQUIVALENCIAS CARD */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-black uppercase tracking-wider">
                    <RefreshCw className="w-4 h-4" />
                    <span>Carga de Equivalencias Cruzadas</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    Podés cargar los cruces con marcas competidoras de dos maneras en la planilla:
                  </p>

                  <div className="space-y-3">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-black text-emerald-400 block mb-1">Opción A: Columna Combinada ("equivalencias")</span>
                      <p className="text-[11px] text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800 text-amber-300">
                        WEGA: WO-180, MANN: W712/95, FRAM: PH5803  ó  WO-180 / W712/95
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-1">Usá comas (,), punto y coma (;), o la barra / para separar. ¡No se necesita la barrita vertical (|)!</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-black text-sky-400 block mb-1">Opción B: Columnas Dedicadas por Marca</span>
                      <p className="text-[11px] text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800 text-slate-300">
                        wega_codigo, mann_codigo, fram_codigo, oem_codigo
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-1">Podés agregar columnas específicas con el código directo de cada marca competidora.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Motor Anti-Errores de Tipeo: Corregirá erratas automáticamente (ej: <code className="text-white">mann-filter</code> ➔ <code className="text-white">Mann</code>, <code className="text-white">W 610/3</code> ➔ <code className="text-white">w6103</code>).</span>
                  </div>
                </div>

                {/* VEHÍCULOS CARD */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-wider">
                    <Car className="w-4 h-4" />
                    <span>Asociación a Vehículos y Aplicaciones</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    Si deseás que el producto aparezca en el buscador inteligente por vehículo, completá las columnas correspondientes:
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-bold text-slate-400">vehiculo_marca:</span>
                      <span className="font-mono text-amber-300 font-bold">TOYOTA, VOLKSWAGEN, FORD...</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-bold text-slate-400">vehiculo_modelo:</span>
                      <span className="font-mono text-amber-300 font-bold">HILUX, AMAROK, RANGER...</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-bold text-slate-400">vehiculo_version:</span>
                      <span className="font-mono text-slate-300">2.8 TDi, 2.0 BiTurbo...</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-bold text-slate-400">vehiculo_año:</span>
                      <span className="font-mono text-slate-300">2016-2023, 2010+</span>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300 font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                    <span>Consolidador Inteligente: Elimina nombres repetidos en el modelo (ej: <code className="text-white">VOLKSWAGEN Gol IV</code> ➔ Modelo: <code className="text-white">Gol</code>, Versión: <code className="text-white">Gen IV</code>).</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PREGUNTAS FRECUENTES (FAQ) */}
            {activeTutorialTab === 'faq' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>¿Qué sucede si un producto de la planilla ya existe en el sistema?</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    El sistema detectará que ya existe (etiqueta <strong className="text-sky-400">🔵 ACTUALIZA</strong>) y actualizará su precio, categoría, marca y descripción sin borrar las equivalencias o vehículos asociados previamente.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>¿Qué pasa si la celda de precio está vacía?</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Si no asignás un número en el precio, el producto quedará etiquetado como <strong className="text-white">"Consultar Precio"</strong> en la web pública, invitando a los clientes a consultar por WhatsApp.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>¿Cómo se importan los Kits de Filtros?</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Podés crear el producto asignando la categoría <code className="text-amber-300 font-mono">Kits de Filtros</code> y un código que empiece con KIT (ej: <code className="text-amber-300 font-mono">KIT-01</code>). Luego podés asociar sus componentes individuales desde el panel del producto.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-sky-400" />
                    <span>¿Puedo subir archivos comprimidos o fotos en el Excel?</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Las fotos de los productos se suben directamente desde el administrador de cada producto usando el cargador automático que comprime las imágenes a formato WebP (≤100KB).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


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
