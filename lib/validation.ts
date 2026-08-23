import {
  normalizarMarcaCompetidor,
  normalizarMarcaVehiculo,
  normalizarCodigoCruza,
  sanitizarVehiculo
} from './normalization';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface ProductPayload {
  codigo_filtrar: string;
  titulo_producto?: string;
  categoria?: string;
  marca_filtro?: string;
  precio?: number | null;
  dimensiones?: string;
  descripcion_aplicacion?: string;
  equivalencias?: string;
  imagen_url?: string;
  activo?: boolean;
}

export interface VehiclePayload {
  filtro_asociado: string;
  marca: string;
  modelo: string;
  version?: string;
  año?: string;
  tipo_vehiculo?: 'LIVIANO' | 'PESADO';
}

export interface EquivalencePayload {
  producto_codigo: string;
  marca_competidor: string;
  codigo_competidor: string;
}

export interface ReplacePayload {
  old_codigo: string;
  new_codigo: string;
}

// Marcas de vehículos 100% pesados / agro / industriales
const MARCAS_PESADAS_SET = new Set([
  'SCANIA', 'VOLVO', 'IVECO', 'MAN', 'DAF', 'KENWORTH', 'FREIGHTLINER',
  'INTERNATIONAL', 'MACK', 'PETERBILT', 'WESTERN STAR', 'HINO',
  'UD TRUCKS', 'ISUZU', 'MITSUBISHI FUSO', 'DONGFENG',
  'JOHN DEERE', 'CATERPILLAR', 'CASE', 'NEW HOLLAND', 'MASSEY FERGUSON',
  'VALTRA', 'ZANELLO', 'DEUTZ', 'DEUTZ AGRALE', 'KOMATSU', 'LIEBHERR', 'JCB',
  'BOBCAT', 'HYSTER', 'CLARK', 'YALE', 'AGRALE', 'CUMMINS', 'MWM', 'PERKINS',
  'RENAULT TRUCKS', 'DIMEX', 'PEGASO'
]);

// Modelos pesados en marcas mixtas
const MODELOS_PESADOS_MAP: Record<string, string[]> = {
  'MERCEDES-BENZ': ['SPRINTER', 'ACCELO', 'ATEGO', 'AXOR', 'ACTROS', 'AROCS',
    '1114', '1214', '1517', '1620', '1633', '1634', '1718', '1720', '1938',
    'L1113', 'L1114', 'L1313', 'L1418', 'L1618', 'O371', 'OF', 'OH', 'LO', 'LK', 'LP', 'LS'],
  'FORD': ['CARGO', 'F-14000', 'F-12000', 'F-4000', 'F14000', 'F12000', 'F4000', 'TRANSIT', 'CAMION'],
  'VOLKSWAGEN': ['CONSTELLATION', 'DELIVERY', 'WORKER', '8.150', '9.150', '13.180', '15.180', '17.250', '24.250', '31.320', 'TITAN', 'VOLKSBUS'],
  'CHEVROLET': ['SILVERADO', 'KODIAK', 'NHR', 'NKR', 'NPR', 'NQR'],
  'TOYOTA': ['DYNA', 'COASTER', 'LAND CRUISER'],
  'FIAT': ['DUCATO', 'DAILY'],
  'RENAULT': ['MASTER', 'MIDLUM', 'PREMIUM', 'KERAX', 'MAGNUM'],
  'HYUNDAI': ['HD', 'MIGHTY', 'UNIVERSE', 'COUNTY'],
  'NISSAN': ['CABSTAR', 'ATLEON'],
  'DODGE': ['RAM 2500', 'RAM 3500', 'RAM 4500', 'RAM 5500'],
};

/**
 * Clasifica un vehículo en LIVIANO o PESADO según su marca y modelo.
 */
export function classifyVehicleType(marcaRaw: string | null | undefined, modeloRaw: string | null | undefined): 'LIVIANO' | 'PESADO' {
  const marca = (marcaRaw || '').trim().toUpperCase();
  const modelo = (modeloRaw || '').trim().toUpperCase();

  if (MARCAS_PESADAS_SET.has(marca)) {
    return 'PESADO';
  }

  const pesadosDeMarca = MODELOS_PESADOS_MAP[marca];
  if (pesadosDeMarca) {
    for (const m of pesadosDeMarca) {
      if (modelo.includes(m)) {
        return 'PESADO';
      }
    }
  }

  return 'LIVIANO';
}

/**
 * Valida y sanitiza el campo año de un vehículo.
 * Corrige años de 2 dígitos (ej: "97 →" -> "1997 →"), valida rangos,
 * y elimina valores basura (ej: potencias "160cv", números absurdos "1223").
 */
export function validateYear(yearRaw: string | null | undefined): string | null {
  if (!yearRaw || !yearRaw.trim()) return null;
  let y = yearRaw.trim().replace('->', '→').replace(/\s+/g, ' ');

  // Rechazar basura obvia
  if (/\b\d+\s*(cv|hp|kw|valv|valvulas|v)\b/i.test(y)) return null;
  if (/^(n\/a|na|s\/d|sd|-|\.)$/i.test(y)) return null;

  // 1. Corregir años de 2 dígitos con flecha (ej: "97 →" -> "1997 →", "03 →" -> "2003 →")
  const twoDigitArrow = y.match(/^(\d{2})\s*(→|->)$/);
  if (twoDigitArrow) {
    const num = parseInt(twoDigitArrow[1], 10);
    const fullYear = num >= 50 ? 1900 + num : 2000 + num;
    return `${fullYear} →`;
  }

  // 2. Corregir años de 2 dígitos en rango (ej: "95-02" -> "1995-2002")
  const twoDigitRange = y.match(/^(\d{2})\s*[-/]\s*(\d{2})$/);
  if (twoDigitRange) {
    const n1 = parseInt(twoDigitRange[1], 10);
    const n2 = parseInt(twoDigitRange[2], 10);
    const y1 = n1 >= 50 ? 1900 + n1 : 2000 + n1;
    const y2 = n2 >= 50 ? 1900 + n2 : 2000 + n2;
    return `${y1}-${y2}`;
  }

  // 3. Rango canónico de 4 dígitos (ej: "2010-2020", "2015 →")
  if (/^\d{4}\s*[-/]\s*(\d{4}|→)$/.test(y)) {
    return y;
  }

  // 4. Año de 4 dígitos suelto (ej: "2018")
  if (/^\d{4}$/.test(y)) {
    const num = parseInt(y, 10);
    if (num >= 1950 && num <= 2030) return y;
    return null;
  }

  // 5. "Desde 2010" o "Hasta 2018"
  const desdeMatch = y.match(/^(desde|año|ano)\s*(\d{4})$/i);
  if (desdeMatch) {
    const num = parseInt(desdeMatch[2], 10);
    if (num >= 1950 && num <= 2030) return `${num} →`;
  }

  // Si contiene un año válido de 4 dígitos pero tiene texto adicional
  const any4d = y.match(/\b(19\d{2}|20\d{2})\b/);
  if (any4d) {
    return y;
  }

  return null;
}

/**
 * Validador para payload de creación / edición de productos.
 */
export function validateProductPayload(input: any): ValidationResult<ProductPayload> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload inválido: debe ser un objeto.'] };
  }

  if (!input.codigo_filtrar || typeof input.codigo_filtrar !== 'string' || !input.codigo_filtrar.trim()) {
    errors.push('El campo "codigo_filtrar" es obligatorio y no puede estar vacío.');
  }

  const codigoClean = (input.codigo_filtrar || '').trim().toUpperCase();

  if (codigoClean.length < 2) {
    errors.push('El "codigo_filtrar" debe contener al menos 2 caracteres.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const sanitized: ProductPayload = {
    codigo_filtrar: codigoClean,
    titulo_producto: input.titulo_producto ? String(input.titulo_producto).trim() : '',
    categoria: input.categoria ? String(input.categoria).trim() : 'Filtros Generales',
    marca_filtro: input.marca_filtro ? normalizarMarcaCompetidor(String(input.marca_filtro)) : 'Pro Filter',
    precio: typeof input.precio === 'number' && input.precio > 0 ? input.precio : null,
    dimensiones: input.dimensiones ? String(input.dimensiones).trim() : '',
    descripcion_aplicacion: input.descripcion_aplicacion ? String(input.descripcion_aplicacion).trim() : '',
    equivalencias: input.equivalencias ? String(input.equivalencias).trim() : '',
    imagen_url: input.imagen_url ? String(input.imagen_url).trim() : '',
    activo: input.activo !== undefined ? Boolean(input.activo) : true,
  };

  return { success: true, data: sanitized };
}

/**
 * Validador mejorado para vehículos con parser de cadenas complejas de catálogos web.
 */
export function validateVehiclePayload(input: any): ValidationResult<VehiclePayload> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload de vehículo inválido.'] };
  }

  let marcaInput = input.marca || '';
  let modeloInput = input.modelo || '';
  let versionInput = input.version || '';
  let anioInput = input.año || '';

  // REFINAMIENTO: Si el modelo trae una cadena compleja de Wega (ej: "BMW Serie 1 118 i - 1,5 12v 140cv 2019 →")
  if (modeloInput && typeof modeloInput === 'string' && (modeloInput.includes(' - ') || modeloInput.includes('→'))) {
    const match = modeloInput.match(/^([A-Za-z0-9\s]+?)\s*-\s*(.+?)\s*(\d{4}.*)$/i);
    if (match) {
      modeloInput = match[1].trim();
      versionInput = match[2].trim();
      anioInput = match[3].replace('→', '->').trim();
    }
  }

  if (!marcaInput && modeloInput) {
    const firstWord = modeloInput.split(' ')[0];
    marcaInput = firstWord;
  }

  const { marca, modelo, version } = sanitizarVehiculo(marcaInput, modeloInput, versionInput);

  // Lista estricta de comprobación de marcas vehiculares reales
  const isFilterOrJunk = (
    !marca ||
    marca === 'GENERAL' ||
    marca.startsWith('AKX') ||
    marca.startsWith('WO-') ||
    marca.startsWith('FCD-') ||
    marca.startsWith('OF-') ||
    marca.startsWith('AF-') ||
    marca.startsWith('FF-') ||
    marca.startsWith('CF-') ||
    marca.startsWith('SC-') ||
    marca.startsWith('EA-') ||
    marca.includes('PROVEEMOS') ||
    marca.includes('©') ||
    marca.includes('ACEITE')
  );

  if (isFilterOrJunk) {
    return { success: false, errors: [`Marca vehicular inválida o código de repuesto rechazado: "${marcaInput}"`] };
  }

  const sanitizedYear = validateYear(anioInput);
  const tipoVehiculo = classifyVehicleType(marca, modelo);

  return {
    success: true,
    data: {
      filtro_asociado: String(input.filtro_asociado || '').trim().toUpperCase(),
      marca,
      modelo,
      version,
      año: sanitizedYear || '',
      tipo_vehiculo: tipoVehiculo,
    }
  };
}

/**
 * Validador para agregar equivalencias cruzadas.
 */
export function validateEquivalencePayload(input: any): ValidationResult<EquivalencePayload> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Payload de equivalencia inválido.'] };
  }

  if (!input.producto_codigo || !String(input.producto_codigo).trim()) {
    errors.push('El campo "producto_codigo" es obligatorio.');
  }

  if (!input.marca_competidor || !String(input.marca_competidor).trim()) {
    errors.push('El campo "marca_competidor" es obligatorio.');
  }

  if (!input.codigo_competidor || !String(input.codigo_competidor).trim()) {
    errors.push('El campo "codigo_competidor" es obligatorio.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const marcaCanon = normalizarMarcaCompetidor(input.marca_competidor);
  const codigoUpper = String(input.codigo_competidor).trim().toUpperCase().replace(/\s+/g, '');

  return {
    success: true,
    data: {
      producto_codigo: String(input.producto_codigo).trim().toUpperCase(),
      marca_competidor: marcaCanon,
      codigo_competidor: codigoUpper,
    }
  };
}

/**
 * Validador para el reemplazo atómico de código.
 */
export function validateReplacePayload(input: any): ValidationResult<ReplacePayload> {
  const errors: string[] = [];

  if (!input.old_codigo || !String(input.old_codigo).trim()) {
    errors.push('El "old_codigo" es obligatorio.');
  }

  if (!input.new_codigo || !String(input.new_codigo).trim()) {
    errors.push('El "new_codigo" es obligatorio.');
  }

  if (input.old_codigo === input.new_codigo) {
    errors.push('El "old_codigo" y "new_codigo" no pueden ser idénticos.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      old_codigo: String(input.old_codigo).trim().toUpperCase(),
      new_codigo: String(input.new_codigo).trim().toUpperCase()
    }
  };
}
