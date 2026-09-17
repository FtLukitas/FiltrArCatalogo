'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Boxes,
  Car,
  Layers,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Info,
  Check,
  X,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Tag,
  Truck,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import {
  normalizarMarcaCompetidor,
  normalizarMarcaVehiculo,
  normalizarModeloBase,
  sanitizarEquivalenciasTexto,
  sanitizarVehiculo,
  normalizarCodigoCruza,
  normalizarMarcaMercadoArgentino,
  esModeloAdmisibleMercadoArgentino,
} from '@/lib/normalization';
import { classifyVehicleType } from '@/lib/validation';
import AdminToast, { ToastMessage } from '../componentes/AdminToast';

/* ─────────────────────────────────────────────────────────────
   TIPOS DE DATOS
───────────────────────────────────────────────────────────── */

export type TabImportar = 'productos' | 'vehiculos';

// Fila parseada de producto
export interface ParsedProductoRow {
  codigo_filtrar: string;
  titulo_producto: string;
  categoria: string;
  marca_filtro: string;
  precio: number | null;
  dimensiones: string;
  descripcion_aplicacion: string;
  equivalencias: string;
  status: 'nuevo' | 'existente' | 'invalido';
}

// Fila parseada de vehículo
export interface ParsedVehiculoRow {
  marca: string;
  modelo: string;
  modeloOriginal: string;
  version: string;
  año: string;
  filtro_asociado: string;
  tipo_vehiculo: 'LIVIANO' | 'PESADO';
  categoria_filtro?: string;
  status: 'nuevo' | 'similar_estandarizado' | 'duplicado_omitido';
  motivo_status?: string;
}

export default function AdminImportarPage() {
  // Pestaña activa: productos o vehiculos
  const [activeTab, setActiveTab] = useState<TabImportar>('productos');

  // Input refs
  const fileInputRefProductos = useRef<HTMLInputElement | null>(null);
  const fileInputRefVehiculos = useRef<HTMLInputElement | null>(null);

  // Estados generales
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importLog, setImportLog] = useState<string | null>(null);

  // Estados de Productos
  const [fileProductos, setFileProductos] = useState<File | null>(null);
  const [readingProductos, setReadingProductos] = useState(false);
  const [parsedProductos, setParsedProductos] = useState<ParsedProductoRow[]>([]);
  const [previewPageProd, setPreviewPageProd] = useState(1);

  // Estados de Vehículos
  const [fileVehiculos, setFileVehiculos] = useState<File | null>(null);
  const [readingVehiculos, setReadingVehiculos] = useState(false);
  const [parsedVehiculos, setParsedVehiculos] = useState<ParsedVehiculoRow[]>([]);
  const [previewPageVeh, setPreviewPageVeh] = useState(1);
  const [autoEstandarizarModelos, setAutoEstandarizarModelos] = useState(true);
  const [omitirDuplicadosVeh, setOmitirDuplicadosVeh] = useState(true);

  // Tutorial / FAQ colapsable
  const [tutorialOpen, setTutorialOpen] = useState(false);

  /* ─────────────────────────────────────────────────────────────
     1. MÓDULO PRODUCTOS: DESCARGA DE PLANTILLA Y EXPORTACIÓN
  ───────────────────────────────────────────────────────────── */

  const handleDescargarPlantillaProductos = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        codigo_filtrar: 'AF-205',
        titulo_producto: 'Filtro de Aire Toyota Hilux 2.8 TDi',
        categoria: 'Filtros de Aire',
        marca_filtro: 'Pro Filter',
        precio: 14500,
        dimensiones: 'Largo: 240mm, Ancho: 180mm, Alto: 45mm',
        descripcion_aplicacion: 'Toyota Hilux 2.4 / 2.8 TDi (2016 en adelante), SW4 2.8',
        equivalencias: 'WEGA: JFA-0205 | MANN: C24005 | FRAM: CA11442',
        wega: 'JFA-0205',
        mann: 'C24005',
        fram: 'CA11442',
        oem: '17801-0L040',
        mareno: 'MR-205',
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
        wega: 'WO-180',
        mann: 'W712/95',
        fram: 'PH5803',
        oem: '03L115562',
        mareno: 'MR-180',
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
        wega: 'AKX-3535',
        mann: 'CU22022',
        fram: '',
        oem: 'AB39-19N619-AA',
        mareno: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'plantilla_productos_filtrar.xlsx');
    } else {
      XLSX.writeFile(wb, 'plantilla_productos_filtrar.csv', { bookType: 'csv' });
    }

    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Plantilla de Productos Descargada',
      message: `Formato .${format.toUpperCase()} generado correctamente con columnas de equivalencias y precios.`,
    });
  };

  const handleExportarProductosExcel = async () => {
    setExporting(true);
    try {
      // 1. Obtener todos los productos
      const { data: prods, error: pErr } = await supabase
        .from('productos_filtrar')
        .select('*')
        .order('id', { ascending: true });

      if (pErr) throw pErr;
      if (!prods || prods.length === 0) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Sin datos', message: 'No hay productos para exportar.' });
        return;
      }

      // 2. Obtener equivalencias cruzadas
      const { data: equivs } = await supabase
        .from('equivalencias_cruza')
        .select('producto_codigo, marca_competidor, codigo_competidor');

      const equivMap = new Map<string, { wega: string; mann: string; fram: string; oem: string; mareno: string; todas: string[] }>();
      (equivs || []).forEach((eq) => {
        const cod = eq.producto_codigo;
        if (!equivMap.has(cod)) {
          equivMap.set(cod, { wega: '', mann: '', fram: '', oem: '', mareno: '', todas: [] });
        }
        const item = equivMap.get(cod)!;
        const marca = (eq.marca_competidor || '').toUpperCase();
        item.todas.push(`${eq.marca_competidor}: ${eq.codigo_competidor}`);
        if (marca === 'WEGA') item.wega = eq.codigo_competidor;
        else if (marca === 'MANN' || marca === 'MANN-FILTER') item.mann = eq.codigo_competidor;
        else if (marca === 'FRAM') item.fram = eq.codigo_competidor;
        else if (marca === 'OEM') item.oem = eq.codigo_competidor;
        else if (marca === 'MARENO') item.mareno = eq.codigo_competidor;
      });

      // 3. Mapear datos a planilla Excel
      const rows = prods.map((p) => {
        const eqData = equivMap.get(p.codigo_filtrar);
        return {
          codigo_filtrar: p.codigo_filtrar,
          titulo_producto: p.titulo_producto || '',
          categoria: p.categoria || '',
          marca_filtro: p.marca_filtro || '',
          precio: p.precio ?? '',
          dimensiones: p.dimensiones || '',
          descripcion_aplicacion: p.descripcion_aplicacion || '',
          equivalencias: eqData?.todas.join(' | ') || p.equivalencias || '',
          wega: eqData?.wega || '',
          mann: eqData?.mann || '',
          fram: eqData?.fram || '',
          oem: eqData?.oem || '',
          mareno: eqData?.mareno || '',
          activo: p.activo !== false ? 'SI' : 'NO',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Catálogo Productos');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `catalogo_productos_filtrar_${fecha}.xlsx`);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Catálogo Exportado',
        message: `Se descargaron ${rows.length} productos con sus equivalencias y precios.`,
      });
    } catch (err: any) {
      console.error('Error exportando productos:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error en Exportación',
        message: err.message || 'No se pudo generar el archivo Excel.',
      });
    } finally {
      setExporting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     2. MÓDULO PRODUCTOS: LECTURA Y PARSING DE PLANILLA
  ───────────────────────────────────────────────────────────── */

  const handleFileProductosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileProductos(file);
    setReadingProductos(true);
    setImportLog(null);
    setPreviewPageProd(1);

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
        setReadingProductos(false);
        return;
      }

      // Obtener códigos existentes en Supabase
      const { data: dbCodes } = await supabase.from('productos_filtrar').select('codigo_filtrar');
      const existingSet = new Set((dbCodes || []).map((p) => (p.codigo_filtrar || '').toUpperCase().trim()));

      const parsed: ParsedProductoRow[] = [];

      rawRows.forEach((row) => {
        const rawCodigo = String(
          row.codigo_filtrar || row.CODIGO_FILTRAR || row.codigo || row.CODIGO || row.cod || ''
        ).trim().toUpperCase();

        if (!rawCodigo) return; // descartar filas sin código

        const rawPrecio = row.precio !== undefined ? row.precio : (row.PRECIO !== undefined ? row.PRECIO : row.lista);
        let numPrecio: number | null = null;
        if (rawPrecio !== null && rawPrecio !== undefined && rawPrecio !== '') {
          const cleanNum = Number(String(rawPrecio).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(cleanNum)) numPrecio = cleanNum;
        }

        // Combinar equivalencias si vinieron en columnas individuales
        const eqParts: string[] = [];
        if (row.equivalencias || row.EQUIVALENCIAS) eqParts.push(String(row.equivalencias || row.EQUIVALENCIAS));
        if (row.wega || row.WEGA || row.wega_codigo) eqParts.push(`WEGA: ${String(row.wega || row.WEGA || row.wega_codigo)}`);
        if (row.mann || row.MANN || row.mann_codigo) eqParts.push(`MANN: ${String(row.mann || row.MANN || row.mann_codigo)}`);
        if (row.fram || row.FRAM || row.fram_codigo) eqParts.push(`FRAM: ${String(row.fram || row.FRAM || row.fram_codigo)}`);
        if (row.oem || row.OEM || row.oem_codigo) eqParts.push(`OEM: ${String(row.oem || row.OEM || row.oem_codigo)}`);
        if (row.mareno || row.MARENO || row.mh) eqParts.push(`MARENO: ${String(row.mareno || row.MARENO || row.mh)}`);
        if (row.tecneco || row.TECNECO) eqParts.push(`TECNECO: ${String(row.tecneco || row.TECNECO)}`);

        const eqFinal = eqParts.join(' | ').trim();

        // Categoría con fallback inteligente si está vacía
        let cat = String(row.categoria || row.CATEGORIA || row.familia || '').trim();
        if (!cat) {
          if (rawCodigo.startsWith('AF') || rawCodigo.startsWith('C ')) cat = 'Filtros de Aire';
          else if (rawCodigo.startsWith('OF') || rawCodigo.startsWith('W ') || rawCodigo.startsWith('WO')) cat = 'Filtros de Aceite';
          else if (rawCodigo.startsWith('FF') || rawCodigo.startsWith('WK ') || rawCodigo.startsWith('FCD')) cat = 'Filtros de Combustible';
          else if (rawCodigo.startsWith('CF') || rawCodigo.startsWith('CU ') || rawCodigo.startsWith('AKX')) cat = 'Filtros de Habitáculo';
          else if (rawCodigo.startsWith('KIT')) cat = 'Kits de Filtros';
          else cat = 'Filtros Varios';
        }

        const isExistente = existingSet.has(rawCodigo);

        parsed.push({
          codigo_filtrar: rawCodigo,
          titulo_producto: String(row.titulo_producto || row.TITULO_PRODUCTO || row.titulo || row.TITULO || row.descripcion || `Filtro ${rawCodigo}`).trim(),
          categoria: cat,
          marca_filtro: normalizarMarcaCompetidor(String(row.marca_filtro || row.MARCA_FILTRO || row.marca || 'Pro Filter').trim()),
          precio: numPrecio,
          dimensiones: String(row.dimensiones || row.DIMENSIONES || row.medidas || '').trim(),
          descripcion_aplicacion: String(row.descripcion_aplicacion || row.DESCRIPCION_APLICACION || row.aplicacion || '').trim(),
          equivalencias: eqFinal,
          status: isExistente ? 'existente' : 'nuevo',
        });
      });

      setParsedProductos(parsed);
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Planilla de Productos Analizada',
        message: `Se detectaron ${parsed.length} productos (${parsed.filter(p => p.status === 'nuevo').length} nuevos, ${parsed.filter(p => p.status === 'existente').length} para actualizar).`,
      });
    } catch (err: any) {
      console.error('Error leyendo productos:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error de Lectura',
        message: 'No se pudo procesar el archivo. Verificá que sea un formato Excel o CSV válido.',
      });
    } finally {
      setReadingProductos(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     3. MÓDULO PRODUCTOS: EJECUCIÓN DE LA IMPORTACIÓN
  ───────────────────────────────────────────────────────────── */

  const handleEjecutarImportacionProductos = async () => {
    if (parsedProductos.length === 0) return;

    setImporting(true);
    setProgress(0);
    setImportLog(null);

    const CHUNK_SIZE = 50;
    const total = parsedProductos.length;
    let insertedCount = 0;
    let updatedCount = 0;
    let equivsCount = 0;

    try {
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = parsedProductos.slice(i, i + CHUNK_SIZE);

        // 1. Preparar lote de productos para upsert
        const batchProd = chunk.map((r) => ({
          codigo_filtrar: r.codigo_filtrar,
          codigo_normalizado: normalizarCodigoCruza(r.codigo_filtrar),
          titulo_producto: r.titulo_producto || null,
          categoria: r.categoria,
          marca_filtro: r.marca_filtro || 'Pro Filter',
          precio: r.precio,
          dimensiones: r.dimensiones || null,
          descripcion_aplicacion: r.descripcion_aplicacion || null,
          equivalencias: r.equivalencias || null,
          activo: true,
        }));

        const { error: errP } = await supabase
          .from('productos_filtrar')
          .upsert(batchProd, { onConflict: 'codigo_filtrar' });

        if (errP) throw errP;

        // 2. Extraer y estructurar equivalencias cruzadas
        const equivsBatch: any[] = [];
        const chunkCodes = chunk.map((r) => r.codigo_filtrar);

        chunk.forEach((r) => {
          if (r.equivalencias) {
            const parsedEq = sanitizarEquivalenciasTexto(r.equivalencias);
            parsedEq.forEach((eq) => {
              equivsBatch.push({
                producto_codigo: r.codigo_filtrar,
                marca_competidor: eq.marca_competidor,
                codigo_competidor: eq.codigo_competidor,
                codigo_competidor_normalizado: eq.codigo_competidor_normalizado,
              });
            });
          }
        });

        // Limpiar equivalencias previas de los códigos tocados para no acumular basura
        if (chunkCodes.length > 0) {
          await supabase.from('equivalencias_cruza').delete().in('producto_codigo', chunkCodes);
        }

        if (equivsBatch.length > 0) {
          const uniqueEqMap = new Map<string, any>();
          equivsBatch.forEach((eq) => {
            const k = `${eq.producto_codigo}__${eq.marca_competidor}__${eq.codigo_competidor}`;
            if (!uniqueEqMap.has(k)) uniqueEqMap.set(k, eq);
          });
          const deduplicated = Array.from(uniqueEqMap.values());

          const { error: errEq } = await supabase
            .from('equivalencias_cruza')
            .upsert(deduplicated, { onConflict: 'producto_codigo,marca_competidor,codigo_competidor', ignoreDuplicates: true });

          if (!errEq) equivsCount += deduplicated.length;
        }

        chunk.forEach((r) => {
          if (r.status === 'nuevo') insertedCount++;
          else updatedCount++;
        });

        const currentProgress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
        setProgress(currentProgress);
      }

      setImportLog(
        `✅ Importación de Productos Completada con Éxito:\n` +
        `• Total procesados: ${total}\n` +
        `• Productos nuevos registrados: ${insertedCount}\n` +
        `• Productos existentes actualizados: ${updatedCount}\n` +
        `• Cruces de equivalencias sincronizados: ${equivsCount}`
      );

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Productos Importados',
        message: `Se actualizaron ${total} productos y sus equivalencias correctamente.`,
      });

      setParsedProductos([]);
      setFileProductos(null);
      if (fileInputRefProductos.current) fileInputRefProductos.current.value = '';
    } catch (err: any) {
      console.error('Error importando productos:', err);
      setImportLog(`❌ Error durante la importación: ${err.message || 'Error inesperado'}`);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error en Importación',
        message: err.message || 'No se pudieron guardar los productos.',
      });
    } finally {
      setImporting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     4. MÓDULO VEHÍCULOS: PLANTILLAS Y EXPORTACIÓN
  ───────────────────────────────────────────────────────────── */

  const handleDescargarPlantillaVehiculos = (tipo: 'service' | 'directo', format: 'xlsx' | 'csv') => {
    let templateData: any[] = [];

    if (tipo === 'service') {
      templateData = [
        {
          marca: 'TOYOTA',
          modelo: 'HILUX',
          version: '2.8 TDi',
          año: '2016-2023',
          filtro_aire: 'AF-205',
          filtro_aceite: 'OF-711T',
          filtro_combustible: 'FF-010',
          filtro_habitaculo: 'CF-390',
          tipo_vehiculo: 'LIVIANO',
        },
        {
          marca: 'VOLKSWAGEN',
          modelo: 'AMAROK',
          version: '2.0 TDi BiTurbo',
          año: '2010-2022',
          filtro_aire: 'AF-198',
          filtro_aceite: 'OF-719V',
          filtro_combustible: 'FF-200',
          filtro_habitaculo: 'CF-198',
          tipo_vehiculo: 'LIVIANO',
        },
        {
          marca: 'FORD',
          modelo: 'RANGER',
          version: '3.2 TDCi',
          año: '2012-2023',
          filtro_aire: 'AF-3535',
          filtro_aceite: 'OF-104',
          filtro_combustible: 'FF-3535',
          filtro_habitaculo: 'CF-10430',
          tipo_vehiculo: 'LIVIANO',
        },
        {
          marca: 'SCANIA',
          modelo: 'SERIE 4',
          version: 'R124 / 420',
          año: '1998-2008',
          filtro_aire: 'AF-900',
          filtro_aceite: 'OF-900',
          filtro_combustible: 'FF-900',
          filtro_habitaculo: '',
          tipo_vehiculo: 'PESADO',
        },
      ];
    } else {
      templateData = [
        { marca: 'TOYOTA', modelo: 'HILUX', version: '2.8 TDi', año: '2016-2023', codigo_filtro: 'AF-205', tipo_vehiculo: 'LIVIANO' },
        { marca: 'TOYOTA', modelo: 'HILUX', version: '2.8 TDi', año: '2016-2023', codigo_filtro: 'OF-711T', tipo_vehiculo: 'LIVIANO' },
        { marca: 'VOLKSWAGEN', modelo: 'AMAROK', version: '2.0 TDi', año: '2010-2022', codigo_filtro: 'OF-719V', tipo_vehiculo: 'LIVIANO' },
        { marca: 'SCANIA', modelo: 'R124', version: '420', año: '1998-2008', codigo_filtro: 'AF-900', tipo_vehiculo: 'PESADO' },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === 'service' ? 'Vehiculos Service' : 'Vehiculos Directo');

    const fileName = tipo === 'service' ? 'plantilla_vehiculos_service_completo' : 'plantilla_vehiculos_directo';
    if (format === 'xlsx') {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    }

    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Plantilla de Vehículos Descargada',
      message: `Plantilla ${tipo === 'service' ? 'Service Completo (matriz)' : 'Directa'} generada correctamente.`,
    });
  };

  const handleExportarVehiculosExcel = async () => {
    setExporting(true);
    try {
      const { data: vehs, error: vErr } = await supabase
        .from('vehiculos_filtrar')
        .select('*')
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true });

      if (vErr) throw vErr;
      if (!vehs || vehs.length === 0) {
        setToast({ id: Date.now().toString(), type: 'error', title: 'Sin datos', message: 'No hay aplicaciones registradas para exportar.' });
        return;
      }

      const rows = vehs.map((v) => ({
        marca: v.marca || '',
        modelo: v.modelo || '',
        version: v.version || '',
        año: v.año || '',
        filtro_asociado: v.filtro_asociado || '',
        tipo_vehiculo: v.tipo_vehiculo || 'LIVIANO',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aplicaciones Vehiculares');

      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `aplicaciones_vehiculos_filtrar_${fecha}.xlsx`);

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Aplicaciones Exportadas',
        message: `Se descargaron ${rows.length} compatibilidades vehiculares en Excel.`,
      });
    } catch (err: any) {
      console.error('Error exportando vehículos:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error en Exportación',
        message: err.message || 'No se pudo generar el archivo de vehículos.',
      });
    } finally {
      setExporting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     5. MÓDULO VEHÍCULOS: LECTURA, VERIFICACIÓN DE SIMILITUD Y DEDUPLICACIÓN
  ───────────────────────────────────────────────────────────── */

  const handleFileVehiculosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileVehiculos(file);
    setReadingVehiculos(true);
    setImportLog(null);
    setPreviewPageVeh(1);

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
          message: 'No se encontraron filas en la planilla de vehículos.',
        });
        setReadingVehiculos(false);
        return;
      }

      // Obtener firmas de compatibilidades existentes para deduplicación exacta
      const { data: dbVehs } = await supabase
        .from('vehiculos_filtrar')
        .select('*');

      const existingSignatures = new Set<string>();
      (dbVehs || []).forEach((v: any) => {
        const sig = `${(v.marca || '').toUpperCase()}__${(v.modelo || '').toUpperCase()}__${(v.version || '').toUpperCase()}__${(v.año || '').toUpperCase()}__${(v.filtro_asociado || '').toUpperCase()}`;
        existingSignatures.add(sig);
      });

      const parsed: ParsedVehiculoRow[] = [];

      // Detectar si la planilla tiene formato "Service Completo" (columnas de filtros específicos)
      const firstRow = rawRows[0] || {};
      const keys = Object.keys(firstRow).map((k) => k.toLowerCase().replace(/[-_]/g, ''));
      const isServiceMatrix = keys.some((k) =>
        ['filtroaire', 'aire', 'filtroaceite', 'aceite', 'filtrocombustible', 'combustible', 'filtrohabitaculo', 'habitaculo'].includes(k)
      );

      rawRows.forEach((row) => {
        const marcaRaw = String(row.marca || row.MARCA || row.Marca || '').trim();
        const modeloRaw = String(row.modelo || row.MODELO || row.Modelo || '').trim();
        if (!marcaRaw || !modeloRaw) return;

        // 1. Sanitizar marca y modelo
        const marcaClean = normalizarMarcaVehiculo(marcaRaw);
        let modeloClean = modeloRaw.toUpperCase().trim();
        let versionClean = String(row.version || row.VERSION || row.Version || '').trim();
        const añoClean = String(row.año || row.ano || row.AÑO || row.ANO || row.anio || row.Año || '').trim();

        // Eliminar prefijo de marca en modelo si vino repetido (ej: "TOYOTA Hilux" -> "Hilux")
        if (modeloClean.startsWith(`${marcaClean} `)) {
          modeloClean = modeloClean.slice(marcaClean.length).trim();
        }

        // 2. Detección de modelo similar y estandarización inteligente
        let statusModelo: 'nuevo' | 'similar_estandarizado' = 'nuevo';
        let modeloFinal = modeloClean;

        if (autoEstandarizarModelos) {
          const { baseModel, subVersion } = normalizarModeloBase(modeloClean);
          if (baseModel && baseModel !== 'GENERAL' && baseModel !== modeloClean) {
            modeloFinal = baseModel;
            statusModelo = 'similar_estandarizado';
            if (subVersion && !versionClean.includes(subVersion)) {
              versionClean = versionClean ? `${versionClean} (${subVersion})` : subVersion;
            }
          }
        }

        // 3. Clasificación de tipo de vehículo
        const tipoInput = String(row.tipo_vehiculo || row.tipo || row.TIPO || '').toUpperCase().trim();
        const tipoVehiculo: 'LIVIANO' | 'PESADO' =
          tipoInput === 'PESADO' || tipoInput === 'LIVIANO'
            ? tipoInput
            : classifyVehicleType(marcaClean, modeloFinal);

        // 4. Extracción de filtros asociados
        const itemsToCreate: { filtro: string; categoria: string }[] = [];

        if (isServiceMatrix) {
          // Extraer las 4 columnas de service
          const aire = String(row.filtro_aire || row.aire || row.FILTRO_AIRE || row.AIRE || '').trim().toUpperCase();
          const aceite = String(row.filtro_aceite || row.aceite || row.FILTRO_ACEITE || row.ACEITE || '').trim().toUpperCase();
          const combustible = String(row.filtro_combustible || row.combustible || row.FILTRO_COMBUSTIBLE || row.COMBUSTIBLE || '').trim().toUpperCase();
          const habitaculo = String(row.filtro_habitaculo || row.habitaculo || row.FILTRO_HABITACULO || row.HABITACULO || '').trim().toUpperCase();

          if (aire) itemsToCreate.push({ filtro: aire, categoria: 'Aire' });
          if (aceite) itemsToCreate.push({ filtro: aceite, categoria: 'Aceite' });
          if (combustible) itemsToCreate.push({ filtro: combustible, categoria: 'Combustible' });
          if (habitaculo) itemsToCreate.push({ filtro: habitaculo, categoria: 'Habitáculo' });
        } else {
          // Formato directo 1 a 1
          const codDirecto = String(
            row.codigo_filtro || row.filtro_asociado || row.filtro || row.CODIGO_FILTRO || row.FILTRO || ''
          ).trim().toUpperCase();

          if (codDirecto) {
            itemsToCreate.push({ filtro: codDirecto, categoria: 'Filtro' });
          }
        }

        // 5. Verificar duplicados por cada filtro
        itemsToCreate.forEach((item) => {
          const canonMarcaArg = normalizarMarcaMercadoArgentino(marcaClean);
          const esModeloArg = esModeloAdmisibleMercadoArgentino(modeloFinal);

          const sig = `${marcaClean}__${modeloFinal}__${versionClean.toUpperCase()}__${añoClean.toUpperCase()}__${item.filtro}`;
          const isDuplicado = existingSignatures.has(sig);

          let finalStatus: 'nuevo' | 'similar_estandarizado' | 'duplicado_omitido' = statusModelo;
          let motivo = undefined;

          if (!canonMarcaArg) {
            finalStatus = 'duplicado_omitido';
            motivo = `Marca "${marcaClean}" no admitida: no pertenece al parque vehicular del mercado argentino.`;
          } else if (!esModeloArg) {
            finalStatus = 'duplicado_omitido';
            motivo = `Modelo "${modeloFinal}" no admitido: modelo foráneo o residuo no perteneciente al mercado argentino.`;
          } else if (isDuplicado) {
            finalStatus = 'duplicado_omitido';
            motivo = 'Aplicación ya existente en la base de datos (se omite para no duplicar).';
          } else if (statusModelo === 'similar_estandarizado') {
            motivo = `Modelo unificado a "${modeloFinal}" (original era "${modeloRaw}").`;
          }

          parsed.push({
            marca: marcaClean,
            modelo: modeloFinal,
            modeloOriginal: modeloRaw,
            version: versionClean,
            año: añoClean,
            filtro_asociado: item.filtro,
            tipo_vehiculo: tipoVehiculo,
            categoria_filtro: item.categoria,
            status: finalStatus,
            motivo_status: motivo,
          });
        });
      });

      setParsedVehiculos(parsed);

      const countNuevos = parsed.filter((v) => v.status === 'nuevo').length;
      const countSimilares = parsed.filter((v) => v.status === 'similar_estandarizado').length;
      const countOmitidos = parsed.filter((v) => v.status === 'duplicado_omitido').length;

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Planilla de Vehículos Analizada',
        message: `Se detectaron ${parsed.length} asociaciones (${countNuevos} nuevas, ${countSimilares} similares unificados, ${countOmitidos} omitidos por duplicado).`,
      });
    } catch (err: any) {
      console.error('Error leyendo vehículos:', err);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error de Lectura',
        message: 'No se pudo procesar la planilla de vehículos. Verificá los nombres de las columnas.',
      });
    } finally {
      setReadingVehiculos(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     6. MÓDULO VEHÍCULOS: EJECUCIÓN DE LA IMPORTACIÓN
  ───────────────────────────────────────────────────────────── */

  const handleEjecutarImportacionVehiculos = async () => {
    // Filtrar solo las filas que no son omitidas (o todas si no se omiten duplicados)
    const toInsert = parsedVehiculos.filter((v) => (omitirDuplicadosVeh ? v.status !== 'duplicado_omitido' : true));

    if (toInsert.length === 0) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Nada para Importar',
        message: 'Todas las aplicaciones leídas ya existen en la base de datos.',
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportLog(null);

    const CHUNK_SIZE = 100;
    const total = toInsert.length;
    let insertedCount = 0;

    try {
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);

        const batch = chunk.map((v) => ({
          marca: v.marca,
          modelo: v.modelo,
          version: v.version || null,
          año: v.año || null,
          filtro_asociado: v.filtro_asociado,
          tipo_vehiculo: v.tipo_vehiculo,
        }));

        const { error: vErr } = await supabase.from('vehiculos_filtrar').insert(batch);
        if (vErr) throw vErr;

        insertedCount += chunk.length;
        const currentProgress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
        setProgress(currentProgress);
      }

      setImportLog(
        `✅ Importación de Vehículos Completada:\n` +
        `• Total aplicaciones procesadas: ${total}\n` +
        `• Nuevas asociaciones registradas: ${insertedCount}\n` +
        `• Omitidas por duplicado: ${parsedVehiculos.length - toInsert.length}`
      );

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Vehículos Importados',
        message: `Se registraron ${insertedCount} compatibilidades vehiculares exitosamente.`,
      });

      setParsedVehiculos([]);
      setFileVehiculos(null);
      if (fileInputRefVehiculos.current) fileInputRefVehiculos.current.value = '';
    } catch (err: any) {
      console.error('Error importando vehículos:', err);
      setImportLog(`❌ Error durante la importación de vehículos: ${err.message || 'Error inesperado'}`);
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error en Importación',
        message: err.message || 'No se pudieron registrar las aplicaciones vehiculares.',
      });
    } finally {
      setImporting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER PRINCIPAL
  ───────────────────────────────────────────────────────────── */

  const ITEMS_PER_PAGE = 15;
  const paginatedProductos = useMemo(() => {
    const start = (previewPageProd - 1) * ITEMS_PER_PAGE;
    return parsedProductos.slice(start, start + ITEMS_PER_PAGE);
  }, [parsedProductos, previewPageProd]);

  const paginatedVehiculos = useMemo(() => {
    const start = (previewPageVeh - 1) * ITEMS_PER_PAGE;
    return parsedVehiculos.slice(start, start + ITEMS_PER_PAGE);
  }, [parsedVehiculos, previewPageVeh]);

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* HEADER & VOLVER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-blue-400 font-bold">Importación & Exportación</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Módulo de Importación Masiva Excel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Carga masiva, actualización de precios y compatibilidades separadas por entidad.
          </p>
        </div>

        {/* BOTÓN TOGGLE GUÍA / FAQ */}
        <button
          onClick={() => setTutorialOpen(!tutorialOpen)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span>{tutorialOpen ? 'Ocultar Guía' : 'Ver Guía de Columnas'}</span>
        </button>
      </div>

      {/* GUÍA DE COLUMNAS COLAPSABLE */}
      {tutorialOpen && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Instrucciones y Formato de Planillas</span>
            </h3>
            <button onClick={() => setTutorialOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-2">
              <div className="font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Boxes className="w-3.5 h-3.5" />
                <span>Pestaña 1: Productos y Precios</span>
              </div>
              <p className="text-slate-400">
                Usá esta pestaña para dar de alta repuestos, actualizar listas de precios o sincronizar equivalencias.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">codigo_filtrar:</strong> Código único obligatorio (ej: <code>AF-205</code>).</li>
                <li><strong className="text-slate-200">precio:</strong> Valor numérico en pesos (ej: <code>14500</code>).</li>
                <li><strong className="text-slate-200">equivalencias:</strong> Puede ir en una sola columna con marcas (<code>WEGA: WO-180 | MANN: W712</code>) o en columnas separadas (<code>wega</code>, <code>mann</code>, <code>fram</code>, <code>oem</code>, <code>mareno</code>).</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-2">
              <div className="font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Car className="w-3.5 h-3.5" />
                <span>Pestaña 2: Aplicaciones de Vehículos</span>
              </div>
              <p className="text-slate-400">
                Usá esta pestaña para asignar qué filtros lleva cada modelo de auto, utilitario o camión.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Formato Service Completo:</strong> Una sola fila con <code>filtro_aire</code>, <code>filtro_aceite</code>, <code>filtro_combustible</code> y <code>filtro_habitaculo</code> crea el juego completo.</li>
                <li><strong className="text-slate-200">Detección de Similares:</strong> Si cargás <code>Hilux 2.8</code>, el sistema sugiere normalizar el modelo a <code>HILUX</code> y mover la motorización a la versión para no fragmentar el catálogo.</li>
                <li><strong className="text-slate-200">Cero Duplicados:</strong> Si el filtro ya estaba asociado a ese modelo, se omite automáticamente.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTED TAB NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl max-w-xl">
        <button
          onClick={() => {
            setActiveTab('productos');
            setImportLog(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'productos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>1. Productos y Precios</span>
          {parsedProductos.length > 0 && (
            <span className="bg-blue-500/30 text-sky-200 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {parsedProductos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('vehiculos');
            setImportLog(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'vehiculos'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>2. Aplicaciones de Vehículos</span>
          {parsedVehiculos.length > 0 && (
            <span className="bg-violet-500/30 text-violet-200 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {parsedVehiculos.length}
            </span>
          )}
        </button>
      </div>

      {/* LOG DE RESULTADOS (SI EXISTE) */}
      {importLog && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Reporte de Ejecución</span>
            </span>
            <button onClick={() => setImportLog(null)} className="text-slate-400 hover:text-white text-xs">
              ✕ Cerrar
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
            {importLog}
          </pre>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         CONTENIDO PESTAÑA 1: PRODUCTOS Y PRECIOS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'productos' && (
        <div className="space-y-6 animate-fadeIn">
          {/* BARRA SUPERIOR DE ACCIONES */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Plantillas Modelo:</span>
              <button
                onClick={() => handleDescargarPlantillaProductos('xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportarProductosExcel}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                <span>Exportar Catálogo a Excel</span>
              </button>
            </div>
          </div>

          {/* DROPZONE CARGA DE ARCHIVO */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
            <input
              ref={fileInputRefProductos}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileProductosChange}
              className="hidden"
              id="upload-productos-input"
            />

            {!fileProductos ? (
              <label
                htmlFor="upload-productos-input"
                className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/60 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-blue-300 block">
                    Seleccioná o arrastrá tu planilla de Productos (.xlsx / .csv)
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Admite códigos, precios, medidas, marcas y columnas de equivalencias multimarca.
                  </span>
                </div>
              </label>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{fileProductos.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {(fileProductos.size / 1024).toFixed(1)} KB · {parsedProductos.length} filas analizadas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setFileProductos(null);
                      setParsedProductos([]);
                      if (fileInputRefProductos.current) fileInputRefProductos.current.value = '';
                    }}
                    disabled={importing}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Cambiar Archivo
                  </button>

                  <button
                    onClick={handleEjecutarImportacionProductos}
                    disabled={importing || parsedProductos.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/40 transition-all disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importando ({progress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Confirmar e Importar {parsedProductos.length} Productos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BARRA DE PROGRESO DE IMPORTACIÓN */}
          {importing && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Guardando productos en Supabase...</span>
                <span className="text-blue-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* TARJETAS DE ESTADÍSTICAS DEL ARCHIVO ANALIZADO */}
          {parsedProductos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Detectados
                </span>
                <div className="text-xl font-bold text-white font-mono">{parsedProductos.length}</div>
                <span className="text-[10px] text-slate-500 block mt-1">Filas listas para procesar</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  🟢 Nuevos Productos
                </span>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {parsedProductos.filter((p) => p.status === 'nuevo').length}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Se crearán en el catálogo</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                  🔵 Existentes a Actualizar
                </span>
                <div className="text-xl font-bold text-sky-400 font-mono">
                  {parsedProductos.filter((p) => p.status === 'existente').length}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Actualizarán precio y datos</span>
              </div>
            </div>
          )}

          {/* PREVIEW TABULAR DE PRODUCTOS */}
          {parsedProductos.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Previsualización de Productos (Página {previewPageProd} de {Math.ceil(parsedProductos.length / ITEMS_PER_PAGE)})</span>
                </h3>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewPageProd((p) => Math.max(1, p - 1))}
                    disabled={previewPageProd === 1}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 text-xs rounded"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPreviewPageProd((p) => Math.min(Math.ceil(parsedProductos.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={previewPageProd >= Math.ceil(parsedProductos.length / ITEMS_PER_PAGE)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 text-xs rounded"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Título / Descripción</th>
                      <th className="p-2.5">Categoría</th>
                      <th className="p-2.5">Marca</th>
                      <th className="p-2.5 text-right">Precio</th>
                      <th className="p-2.5">Equivalencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {paginatedProductos.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              p.status === 'nuevo'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {p.status === 'nuevo' ? 'Nuevo' : 'Existente'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-white">{p.codigo_filtrar}</td>
                        <td className="p-2.5 max-w-[200px] truncate">{p.titulo_producto}</td>
                        <td className="p-2.5 text-slate-400">{p.categoria}</td>
                        <td className="p-2.5 text-slate-400">{p.marca_filtro}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                          {p.precio !== null ? `$${p.precio.toLocaleString('es-AR')}` : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-400 max-w-[220px] truncate">
                          {p.equivalencias || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         CONTENIDO PESTAÑA 2: APLICACIONES DE VEHÍCULOS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'vehiculos' && (
        <div className="space-y-6 animate-fadeIn">
          {/* BARRA SUPERIOR DE ACCIONES */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Descargar Plantillas:</span>
              <button
                onClick={() => handleDescargarPlantillaVehiculos('service', 'xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-xs font-semibold transition-colors"
                title="Una fila por vehículo con columnas para aire, aceite, combustible y habitáculo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla Service Completo (.xlsx)</span>
              </button>

              <button
                onClick={() => handleDescargarPlantillaVehiculos('directo', 'xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                title="Una fila por asociación directa (marca, modelo, versión, año, filtro)"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Plantilla Directa (.xlsx)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportarVehiculosExcel}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                <span>Exportar Vehículos a Excel</span>
              </button>
            </div>
          </div>

          {/* CONTROLES DE VERIFICACIÓN INTELIGENTE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">Controles de Calidad y Estandarización:</span>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={autoEstandarizarModelos}
                  onChange={(e) => setAutoEstandarizarModelos(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Estandarizar automáticamente modelos similares (ej: <code>Hilux 2.8</code> $\rightarrow$ <code>HILUX</code>)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={omitirDuplicadosVeh}
                  onChange={(e) => setOmitirDuplicadosVeh(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Omitir aplicaciones idénticas que ya existen</span>
              </label>
            </div>
          </div>

          {/* DROPZONE CARGA DE ARCHIVO DE VEHÍCULOS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
            <input
              ref={fileInputRefVehiculos}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileVehiculosChange}
              className="hidden"
              id="upload-vehiculos-input"
            />

            {!fileVehiculos ? (
              <label
                htmlFor="upload-vehiculos-input"
                className="border-2 border-dashed border-slate-700/80 hover:border-violet-500/60 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white group-hover:text-violet-300 block">
                    Seleccioná o arrastrá tu planilla de Vehículos (.xlsx / .csv)
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Soporta formato Service Completo (Aire, Aceite, Combustible, Habitáculo) o formato directo 1 a 1.
                  </span>
                </div>
              </label>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{fileVehiculos.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {(fileVehiculos.size / 1024).toFixed(1)} KB · {parsedVehiculos.length} aplicaciones detectadas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setFileVehiculos(null);
                      setParsedVehiculos([]);
                      if (fileInputRefVehiculos.current) fileInputRefVehiculos.current.value = '';
                    }}
                    disabled={importing}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Cambiar Archivo
                  </button>

                  <button
                    onClick={handleEjecutarImportacionVehiculos}
                    disabled={importing || parsedVehiculos.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-900/40 transition-all disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando ({progress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Confirmar e Importar Aplicaciones</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BARRA DE PROGRESO DE VEHÍCULOS */}
          {importing && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Guardando aplicaciones vehiculares...</span>
                <span className="text-violet-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-sky-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* TARJETAS DE ESTADÍSTICAS DEL ARCHIVO DE VEHÍCULOS */}
          {parsedVehiculos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Asociaciones
                </span>
                <div className="text-xl font-bold text-white font-mono">{parsedVehiculos.length}</div>
                <span className="text-[10px] text-slate-500 block mt-1">Compatibilidades procesadas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  🟢 Nuevas
                </span>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {parsedVehiculos.filter((v) => v.status === 'nuevo').length}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Listas para registrar</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                  🟡 Similares Unificados
                </span>
                <div className="text-xl font-bold text-amber-400 font-mono">
                  {parsedVehiculos.filter((v) => v.status === 'similar_estandarizado').length}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Estandarizados a modelo canónico</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  ⚪ Omitidos (Ya Existentes)
                </span>
                <div className="text-xl font-bold text-slate-400 font-mono">
                  {parsedVehiculos.filter((v) => v.status === 'duplicado_omitido').length}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Cero registros duplicados</span>
              </div>
            </div>
          )}

          {/* PREVIEW TABULAR DE VEHÍCULOS */}
          {parsedVehiculos.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-violet-400" />
                  <span>Previsualización de Aplicaciones (Página {previewPageVeh} de {Math.ceil(parsedVehiculos.length / ITEMS_PER_PAGE)})</span>
                </h3>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewPageVeh((p) => Math.max(1, p - 1))}
                    disabled={previewPageVeh === 1}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 text-xs rounded"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPreviewPageVeh((p) => Math.min(Math.ceil(parsedVehiculos.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={previewPageVeh >= Math.ceil(parsedVehiculos.length / ITEMS_PER_PAGE)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-40 text-xs rounded"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Estado / Control</th>
                      <th className="p-2.5">Marca</th>
                      <th className="p-2.5">Modelo Estandarizado</th>
                      <th className="p-2.5">Versión</th>
                      <th className="p-2.5">Año</th>
                      <th className="p-2.5">Filtro Asociado</th>
                      <th className="p-2.5">Tipo Flota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {paginatedVehiculos.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-2.5">
                          {v.status === 'nuevo' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Nuevo
                            </span>
                          )}
                          {v.status === 'similar_estandarizado' && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 cursor-help"
                              title={v.motivo_status}
                            >
                              Similar Unificado
                            </span>
                          )}
                          {v.status === 'duplicado_omitido' && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 cursor-help"
                              title={v.motivo_status}
                            >
                              Omitido (Existente)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-white">{v.marca}</td>
                        <td className="p-2.5 font-bold text-sky-300">
                          {v.modelo}
                          {v.modelo !== v.modeloOriginal && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              Orig: {v.modeloOriginal}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-400">{v.version || '-'}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{v.año || '-'}</td>
                        <td className="p-2.5 font-mono font-bold text-violet-300">
                          <span className="bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                            {v.filtro_asociado}
                          </span>
                          {v.categoria_filtro && (
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                              ({v.categoria_filtro})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              v.tipo_vehiculo === 'PESADO'
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {v.tipo_vehiculo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
