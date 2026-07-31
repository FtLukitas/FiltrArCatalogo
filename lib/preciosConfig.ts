import { supabase } from './supabase';
import type { Filtro } from './types';

const STORAGE_KEY = 'filtrar_ocultar_precios_global';

// Obtener el estado global de ocultar precios (de Supabase con fallback a localStorage)
export const getOcultarPreciosGlobal = async (): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('configuracion_catalogo')
      .select('valor')
      .eq('clave', 'ocultar_precios_global')
      .maybeSingle();

    if (data && data.valor !== undefined && data.valor !== null) {
      const isHidden = data.valor === 'true';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(isHidden));
      }
      return isHidden;
    }
  } catch (err) {
    console.warn('Configuración global de precios fallback a localStorage:', err);
  }

  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
  return false;
};

// Guardar el estado global de ocultar precios en Supabase y localStorage
export const setOcultarPreciosGlobal = async (ocultar: boolean): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(ocultar));
  }

  try {
    const { error } = await supabase
      .from('configuracion_catalogo')
      .upsert({ clave: 'ocultar_precios_global', valor: String(ocultar) }, { onConflict: 'clave' });

    if (error) {
      console.warn('Upsert en configuracion_catalogo dio aviso:', error.message);
    }
    return true;
  } catch (err) {
    console.error('Error al guardar estado global de precios:', err);
    return false;
  }
};

// Determina si se debe ocultar el precio de un producto específico o por regla global
export const debeOcultarPrecio = (filtro?: Filtro | null, globalOcultar: boolean = false): boolean => {
  if (globalOcultar) return true;
  if (!filtro) return false;
  if (filtro.ocultar_precio === true) return true;
  if (filtro.precio === null || filtro.precio === undefined || isNaN(filtro.precio) || filtro.precio <= 0) return true;
  return false;
};
