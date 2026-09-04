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

// Marcas de vehículos 100% pesados / agro / industriales / viales / colectivos (27 marcas)
const MARCAS_PESADAS_SET = new Set([
  'AGCO', 'AGRALE', 'BOBCAT', 'CASE', 'CATERPILLAR', 'CLAAS',
  'DEUTZ-AGRALE', 'DEUTZ', 'DEUTZ AGRALE', 'DIMEX', 'DON ROQUE', 'EL DETALLE',
  'HELI', 'INTERNATIONAL', 'IVECO', 'JCB', 'JOHN DEERE', 'KOMATSU',
  'KUBOTA', 'LIEBHERR', 'MASSEY FERGUSON', 'NEW HOLLAND',
  'PAUNY', 'PUMA', 'RENAULT TRUCKS', 'SCANIA', 'VALTRA',
  'VASALLI', 'ZANELLO'
]);

// Marcas de vehículos 100% livianos (autos particulares / SUVs / compactos) (28 marcas)
const MARCAS_LIVIANAS_SET = new Set([
  'ALFA ROMEO', 'ASIA', 'AUDI', 'BMW', 'CHERY', 'CHRYSLER',
  'CITROEN', 'DAEWOO', 'DAIHATSU', 'DS', 'GEELY', 'HONDA',
  'JAC', 'JAGUAR', 'JEEP', 'KIA', 'LAND ROVER', 'LIFAN',
  'MAZDA', 'MINI', 'PEUGEOT', 'PORSCHE', 'RAM', 'SEAT',
  'SMART', 'SSANG YONG', 'SUBARU', 'SUZUKI'
]);

// Regex para autos, SUVs y utilitarios livianos de Mercedes-Benz (evita falsos positivos como LI-VIANO)
const MB_LIVIANO_REGEX = /\b(SPRINTER|VITO|VIANO|CITAN|CLASE\s+[ABCESGV]|GLA|GLB|GLC|GLE|GLS|GLK|ML|SLK|CLS|290\s*GD|300\s*GD|350\s*GD|300\s*TD\s*SERIE\s*S\s*124|V\s*230)\b/i;

// Modelos livianos de Volvo (autos y SUVs de pasajeros)
const VOLVO_LIVIANO_MODELS = [
  'S40', 'V50', 'C30', 'V40', '850', '940', 'XC60', 'XC70', 'S70', 'S80',
  'V70', 'C70', 'C-S40', '240', '740', '760', '960'
];

/**
 * Clasifica un vehículo en LIVIANO o PESADO según su marca y modelo.
 * Aplica la taxonomía oficial de FiltrAr sobre las 69 marcas del catálogo.
 */
export function classifyVehicleType(marcaRaw: string | null | undefined, modeloRaw: string | null | undefined): 'LIVIANO' | 'PESADO' {
  const marca = (marcaRaw || '').trim().toUpperCase();
  const modelo = (modeloRaw || '').trim().toUpperCase();

  // 1. Marcas puras
  if (MARCAS_PESADAS_SET.has(marca)) return 'PESADO';
  if (MARCAS_LIVIANAS_SET.has(marca)) return 'LIVIANO';

  // 2. Marcas mixtas
  if (marca === 'MERCEDES-BENZ') {
    return MB_LIVIANO_REGEX.test(modelo) ? 'LIVIANO' : 'PESADO';
  }

  if (marca === 'VOLKSWAGEN') {
    const vwHeavy = [
      'CONSTELLATION', 'COSNTELLATION', 'DELIVERY', 'WORKER', 'METEOR', 'TITAN', 'VOLKSBUS', 'BUS',
      'SERIE 2000', 'CAMIÓN', '13.170', '13.180', '15.180', '15.190', '17.220', '17.230', '17.240',
      '17.250', '17.260', '18.310', '18.320', '19.320', '19.370', '24.220', '24.250',
      '26.260', '31.260', '31.320', '31.370', '8.150', '9.150', '16220', '17220', '26260'
    ];
    return vwHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'FORD') {
    const fordHeavy = [
      'CARGO', 'F-14000', 'F 14000', 'F14000', 'F-12000', 'F 12000', 'F12000',
      'F-4000', 'F 4000', 'F4000', 'F-600', 'F 600', 'F-700', 'F 700', 'F 6000', 'F 7000',
      'F-3500', 'F 350', 'F-350', '1723', '1933', '2042', '2842', 'CAMION', 'CAMIÓN', 'CUMMINS'
    ];
    return fordHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'CHEVROLET') {
    const chevyHeavy = [
      'CAMIÓN', 'CAMION', '14000', '14-190', '15-190', '16-220', '6-100', '6-150',
      'KODIAK', 'D 40', 'D-40', 'NPR', 'RACOR'
    ];
    return chevyHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'FIAT') {
    const fiatHeavy = ['AGRI', 'ALLIS', 'TRACTOR', 'TRACTORES', 'CAMIONES', 'SOMECA', ' 411', ' 66', '619', '697', 'IVECO'];
    return fiatHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'RENAULT') {
    const renHeavy = ['TRUCKS', 'KERAX', 'MAGNUM', 'MIDLINER', 'MIDLUM', 'PREMIUM', 'CAMION', 'CAMIONES'];
    return renHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'VOLVO') {
    return VOLVO_LIVIANO_MODELS.some((k) => modelo.includes(k)) ? 'LIVIANO' : 'PESADO';
  }

  if (marca === 'TOYOTA') {
    const toyHeavy = ['AUTOELEVADOR', 'COASTER', 'DYNA'];
    return toyHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'HYUNDAI') {
    const hyunHeavy = ['CAMION', 'H65', 'H72', 'H75', 'HD', 'MINIBUS COUNTRY'];
    return hyunHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'ISUZU') {
    const isuzuHeavy = ['NKR', 'NPR', 'NQR', 'FORWARD', 'CAMION'];
    return isuzuHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'MITSUBISHI') {
    const mitsHeavy = ['CANTER', 'FUSO'];
    return mitsHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'NISSAN') {
    const nissanHeavy = ['AUTOELEVADOR', 'CAMIÓN', 'CATERPILLAR', 'CPB', 'CPPRIMARIO', 'CPSECUNDARIO', 'ISUZU-GMC'];
    return nissanHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'DODGE') {
    const dodgeHeavy = ['CAMIÓN C 38', 'C 38 T', 'FARGO'];
    return dodgeHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
  }

  if (marca === 'TATA') {
    const tataHeavy = ['608', '609'];
    return tataHeavy.some((k) => modelo.includes(k)) ? 'PESADO' : 'LIVIANO';
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
 * Deduce la categoría canónica para filtros de marca Maxfil según su prefijo técnico.
 */
export function deduceMaxfilCategory(codigo: string): string | null {
  const c = codigo.trim().toUpperCase();
  if (c.startsWith('EFPA')) return 'Filtros de Aire (Línea Pesada)';
  if (c.startsWith('EA') || c.startsWith('UL')) return 'Filtros de Aceite';
  if (c.startsWith('EC') || c.startsWith('UC')) return 'Filtros de Combustible';
  if (c.startsWith('MIF') || c.startsWith('FN')) return 'Filtros de Inyección';
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

  const marcaFinal = input.marca_filtro ? normalizarMarcaCompetidor(String(input.marca_filtro)) : 'Pro Filter';
  let categoriaFinal = input.categoria ? String(input.categoria).trim() : '';

  if (marcaFinal.toLowerCase() === 'maxfil') {
    const deduced = deduceMaxfilCategory(codigoClean);
    if (deduced && (!categoriaFinal || categoriaFinal === 'Filtros Generales' || (categoriaFinal === 'Filtros de Aire (Línea Pesada)' && !codigoClean.startsWith('EFPA')))) {
      categoriaFinal = deduced;
    }
  }

  if (!categoriaFinal) {
    categoriaFinal = 'Filtros Generales';
  }

  const sanitized: ProductPayload = {
    codigo_filtrar: codigoClean,
    titulo_producto: input.titulo_producto ? String(input.titulo_producto).trim() : '',
    categoria: categoriaFinal,
    marca_filtro: marcaFinal,
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
