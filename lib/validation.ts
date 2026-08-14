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

  return {
    success: true,
    data: {
      filtro_asociado: String(input.filtro_asociado || '').trim().toUpperCase(),
      marca,
      modelo,
      version,
      año: String(anioInput).trim(),
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
