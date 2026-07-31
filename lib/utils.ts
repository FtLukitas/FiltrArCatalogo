// Interface para medidas parseadas
export interface MedidaItem {
  label: string;
  valor: string;
}

// Interface para equivalencias cruzadas parseadas
export interface EquivalenciaItem {
  marca_competidor: string;
  codigo_competidor: string;
  codigo_competidor_normalizado: string;
}

import { sanitizarEquivalenciasTexto } from './normalization';

export {
  normalizarMarcaCompetidor,
  normalizarMarcaVehiculo,
  normalizarCodigoCruza,
  sanitizarEquivalenciasTexto,
  sanitizarVehiculo,
} from './normalization';

// Parsear texto libre de equivalencias usando el motor de canonización anti-tipeo
export const parsearEquivalenciasTexto = (texto: string | null | undefined): EquivalenciaItem[] => {
  return sanitizarEquivalenciasTexto(texto);
};

// Parsear dimensiones flexibles de cualquier formato (Largo: X, DE: X | DI: Y, 240x180x45, PICO 6MM, etc.)
export const parsearDimensiones = (texto: string | null | undefined): MedidaItem[] => {
  if (!texto || !texto.trim()) return [];

  const raw = texto.trim();

  // 1. Separar por delimitadores comunes: |, ,, ;, o saltos de línea
  const parts = raw.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
  const items: MedidaItem[] = [];

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      const label = part.slice(0, colonIdx).trim();
      const valor = part.slice(colonIdx + 1).trim();
      if (label && valor) {
        items.push({ label, valor });
      }
    } else {
      // Buscar formato como "PICO 6 MM" o "Alto 140mm"
      const match = part.match(/^([A-Za-zÁÉÍÓÚáéíóú\s.]+)\s+([\d.,/]+(?:\s*[A-Za-z]+)?)$/);
      if (match) {
        items.push({ label: match[1].trim(), valor: match[2].trim() });
      }
    }
  }

  if (items.length > 0) return items;

  // 2. Probar patrón multiplicativo "233X161X57" o "350 X 241 X 365"
  const multMatch = raw.match(/([\d.,]+)\s*[*xX/]\s*([\d.,]+)(?:\s*[*xX/]\s*([\d.,]+))?\s*(mm|cm|in)?/i);
  if (multMatch) {
    const unit = multMatch[4] ? ` ${multMatch[4]}` : ' mm';
    const result: MedidaItem[] = [
      { label: 'Medida 1', valor: `${multMatch[1]}${unit}` },
      { label: 'Medida 2', valor: `${multMatch[2]}${unit}` },
    ];
    if (multMatch[3]) {
      result.push({ label: 'Medida 3', valor: `${multMatch[3]}${unit}` });
    }
    return result;
  }

  // Fallback genérico: retornar la cadena como especificación
  return [{ label: 'Especificación', valor: raw }];
};

// Retrocompatibilidad con extraerMedida anterior
export const extraerMedida = (texto: string | null, etiqueta: string): string => {
  if (!texto) return '-';
  const regexEtiqueta = new RegExp(`${etiqueta}:?\\s*(\\d+(?:[.,]\\d+)?)`, 'i');
  const matchEtiqueta = texto.match(regexEtiqueta);
  if (matchEtiqueta) return `${matchEtiqueta[1]} mm`;
  return '-';
};

// Normalizar la lista de imágenes (soporta string simple, array o JSON string)
export const normalizarImagenes = (imagenes: string | string[] | null | undefined): string[] => {
  if (!imagenes) return [];

  const isValidUrl = (url: any): boolean => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    if (!clean || clean === 'preview' || clean === 'null' || clean === 'undefined' || clean === '[]' || clean === '{}') {
      return false;
    }
    return true;
  };

  if (Array.isArray(imagenes)) {
    return imagenes.map((img) => String(img).trim()).filter(isValidUrl);
  }

  if (typeof imagenes === 'string') {
    const trimmed = imagenes.trim();
    if (!isValidUrl(trimmed)) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((img) => String(img).trim()).filter(isValidUrl);
        }
        return isValidUrl(parsed) ? [String(parsed).trim()] : [];
      } catch {
        return isValidUrl(trimmed) ? [trimmed] : [];
      }
    }
    return [trimmed];
  }

  return [];
};

// Normalizar búsqueda sin guiones ni espacios
export const normalizarBusqueda = (texto: string): string => {
  return texto.replace(/[- ]/g, '').toLowerCase();
};

// Formato de moneda ARS (soporta ocultamiento explícito)
export const formatearPrecio = (precio: number | null | undefined, ocultar?: boolean): string => {
  if (ocultar) {
    return 'Consultar Precio';
  }
  if (precio === null || precio === undefined || isNaN(precio) || precio <= 0) {
    return 'Consultar Precio';
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(precio);
};

// Crear URL de WhatsApp para consulta de producto
export const generarUrlWhatsapp = (codigoFiltrar: string, titulo?: string | null): string => {
  const numero = '5491132881901';
  let textoProducto = codigoFiltrar;
  if (titulo && titulo.trim() && !titulo.toLowerCase().includes(codigoFiltrar.toLowerCase())) {
    textoProducto = `${codigoFiltrar} (${titulo.trim()})`;
  } else if (titulo && titulo.trim()) {
    textoProducto = titulo.trim();
  }

  const mensaje = encodeURIComponent(
    `Hola! Quisiera realizar una consulta sobre el filtro ${textoProducto} del catálogo FiltrAr.`
  );
  return `https://wa.me/${numero}?text=${mensaje}`;
};
