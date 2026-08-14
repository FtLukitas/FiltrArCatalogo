import { supabase } from './supabase';
import {
  validateProductPayload,
  validateVehiclePayload,
  validateEquivalencePayload,
  validateReplacePayload
} from './validation';

/**
 * 1. ANALIZADOR DETERMINISTA DE IMPACTO (Pre-mutación)
 * Invoca la función SQL RPC analyze_product_impact para calcular el riesgo en la BD.
 */
export async function analyzeProductImpact(codigo: string) {
  const cleanCodigo = (codigo || '').trim().toUpperCase();

  const { data, error } = await supabase.rpc('analyze_product_impact', {
    p_codigo: cleanCodigo
  });

  if (error) {
    throw new Error(`Error en analyzeProductImpact: ${error.message}`);
  }

  return data;
}

/**
 * 2. REEMPLAZO ATÓMICO DE CÓDIGO (Commit / Rollback)
 */
export async function replaceProduct(oldCodigo: string, newCodigo: string) {
  const validation = validateReplacePayload({ old_codigo: oldCodigo, new_codigo: newCodigo });
  if (!validation.success) {
    throw new Error(`Fallo de Validación: ${validation.errors?.join(', ')}`);
  }

  // Ejecutar RPC atómica
  const { data, error } = await supabase.rpc('replace_product_rpc', {
    p_old_codigo: validation.data!.old_codigo,
    p_new_codigo: validation.data!.new_codigo
  });

  if (error) {
    throw new Error(`Fallo RPC en replaceProduct: ${error.message}`);
  }

  return data;
}

/**
 * 3. VINCULACIÓN ATÓMICA DE VEHÍCULOS
 */
export async function linkVehicle(payload: any) {
  const validation = validateVehiclePayload(payload);
  if (!validation.success) {
    throw new Error(`Fallo de Validación de Vehículo: ${validation.errors?.join(', ')}`);
  }

  const { data, error } = await supabase.rpc('link_vehicle_rpc', {
    p_filtro: validation.data!.filtro_asociado,
    p_marca: validation.data!.marca,
    p_modelo: validation.data!.modelo,
    p_version: validation.data!.version || null,
    p_anio: validation.data!.año || null
  });

  if (error) {
    throw new Error(`Fallo RPC en linkVehicle: ${error.message}`);
  }

  return data;
}

/**
 * 4. AGREGAR EQUIVALENCIA CRUZADA
 */
export async function addEquivalence(payload: any) {
  const validation = validateEquivalencePayload(payload);
  if (!validation.success) {
    throw new Error(`Fallo de Validación de Equivalencia: ${validation.errors?.join(', ')}`);
  }

  const { data, error } = await supabase.rpc('add_equivalence_rpc', {
    p_producto_codigo: validation.data!.producto_codigo,
    p_marca_competidor: validation.data!.marca_competidor,
    p_codigo_competidor: validation.data!.codigo_competidor,
    p_codigo_competidor_normalizado: validation.data!.codigo_competidor.toLowerCase().replace(/[-_/\s.]/g, '')
  });

  if (error) {
    throw new Error(`Fallo RPC en addEquivalence: ${error.message}`);
  }

  return data;
}
