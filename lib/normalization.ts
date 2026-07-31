import type { EquivalenciaItem } from './utils';

// DICCIONARIOS DE CANONIZACIÓN Y ALIAS ANTI-ERRORES DE TIPEO

const ALIAS_MARCAS_COMPETIDOR: Record<string, string> = {
  // PRO FILTER & MARCAS PROPIAS
  'PRO FILTER': 'Pro Filter',
  'PROFILTER': 'Pro Filter',
  'MAXFIL': 'Maxfil',
  'MDH': 'MDH',
  'PICBORG': 'Picborg',
  'COMMON RAIL': 'Common Rail',

  // WEGA
  'WEGA': 'Wega',
  'WEGA S.A.': 'Wega',
  'WEGA SA': 'Wega',
  'WEGA-FILTERS': 'Wega',
  'WEG': 'Wega',

  // MANN
  'MANN': 'Mann',
  'MANN-FILTER': 'Mann',
  'MANN FILTER': 'Mann',
  'MANN+HUMMEL': 'Mann',
  'MANN HUMMEL': 'Mann',
  'MAN': 'Mann',

  // MARENO
  'MARENO': 'Mareno',
  'MH': 'Mareno',
  'MARENO FILTROS': 'Mareno',

  // FRAM
  'FRAM': 'Fram',
  'FRAM-FILTER': 'Fram',
  'FRAM FILTER': 'Fram',
  'SOGEFI FRAM': 'Fram',

  // TECFIL
  'TECFIL': 'Tecfil',
  'TEC FIL': 'Tecfil',
  'TECFIL-FILTERS': 'Tecfil',

  // MAHLE
  'MAHLE': 'Mahle',
  'MAHLE-KNECHT': 'Mahle',
  'KNECHT': 'Mahle',
  'MAHLE ORIGINAL': 'Mahle',

  // OEM
  'OEM': 'OEM',
  'ORIGINAL': 'OEM',
  'GENUINO': 'OEM',
  'FACTORY': 'OEM',

  // OTROS FABRICANTES
  'MOPAR': 'Mopar',
  'BALDWIN': 'Baldwin',
  'DONALDSON': 'Donaldson',
  'FLEETGUARD': 'Fleetguard',
  'PURFLUX': 'Purflux',
  'SAKURA': 'Sakura',
  'LUBER-FINER': 'Luber-Finer',
  'BOSCH': 'Bosch',
};

const ALIAS_MARCAS_VEHICULO: Record<string, string> = {
  // VOLKSWAGEN
  'VW': 'VOLKSWAGEN',
  'VOLKS': 'VOLKSWAGEN',
  'VOLKSWAGEN': 'VOLKSWAGEN',
  'VOLKS WAGEN': 'VOLKSWAGEN',
  'V.W.': 'VOLKSWAGEN',

  // CHEVROLET
  'CHEVROLET': 'CHEVROLET',
  'CHEVY': 'CHEVROLET',
  'GM': 'CHEVROLET',
  'GENERAL MOTORS': 'CHEVROLET',

  // MERCEDES-BENZ
  'MERCEDES-BENZ': 'MERCEDES-BENZ',
  'MERCEDES BENZ': 'MERCEDES-BENZ',
  'MERCEDES': 'MERCEDES-BENZ',
  'MB': 'MERCEDES-BENZ',
  'M.B.': 'MERCEDES-BENZ',

  // JOHN DEERE
  'JOHN DEERE': 'JOHN DEERE',
  'JOHNDEERE': 'JOHN DEERE',
  'JD': 'JOHN DEERE',

  // CATERPILLAR
  'CATERPILLAR': 'CATERPILLAR',
  'CAT': 'CATERPILLAR',

  // MASSEY FERGUSON
  'MASSEY FERGUSON': 'MASSEY FERGUSON',
  'MASSEY': 'MASSEY FERGUSON',
  'MF': 'MASSEY FERGUSON',

  // NEW HOLLAND
  'NEW HOLLAND': 'NEW HOLLAND',
  'NH': 'NEW HOLLAND',
  'NEWHOLLAND': 'NEW HOLLAND',

  // CASE
  'CASE': 'CASE',
  'CASE IH': 'CASE',

  // MARCAS GENERALES LÍNEA LIVIANA Y PESADA
  'TOYOTA': 'TOYOTA',
  'FORD': 'FORD',
  'FIAT': 'FIAT',
  'PEUGEOT': 'PEUGEOT',
  'RENAULT': 'RENAULT',
  'CITROEN': 'CITROEN',
  'CITROËN': 'CITROEN',
  'NISSAN': 'NISSAN',
  'HONDA': 'HONDA',
  'HYUNDAI': 'HYUNDAI',
  'KIA': 'KIA',
  'AUDI': 'AUDI',
  'BMW': 'BMW',
  'JEEP': 'JEEP',
  'RAM': 'RAM',
  'DODGE': 'DODGE',
  'IVECO': 'IVECO',
  'SCANIA': 'SCANIA',
  'VOLVO': 'VOLVO',
  'ZANELLO': 'ZANELLO',
  'VALTRA': 'VALTRA',
  'VALMET': 'VALTRA',
  'DEUTZ': 'DEUTZ',
  'DEUTZ-FAHR': 'DEUTZ',
  'AGRALE': 'AGRALE',
  'CHERY': 'CHERY',
  'SUZUKI': 'SUZUKI',
  'MITSUBISHI': 'MITSUBISHI',
  'SUBARU': 'SUBARU',
  'ISUZU': 'ISUZU',
  'CUMMINS': 'CUMMINS',
  'MWM': 'MWM',
  'PERKINS': 'PERKINS',
};

/**
 * Normaliza y canoniza el nombre de una marca competidora (Wega, Mann, Fram, etc.)
 * Evita duplicados por errores de tipeo o variaciones (ej: "mann-filter" -> "Mann")
 */
export function normalizarMarcaCompetidor(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'Pro Filter';
  const cleanKey = raw.trim().toUpperCase().replace(/\s+/g, ' ');

  if (ALIAS_MARCAS_COMPETIDOR[cleanKey]) {
    return ALIAS_MARCAS_COMPETIDOR[cleanKey];
  }

  // Si no está en el mapa, formatear limpio
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return trimmed.toUpperCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Normaliza y canoniza el nombre de una marca de vehículo (VOLKSWAGEN, TOYOTA, FORD, etc.)
 * Evita duplicados por errores de tipeo (ej: "vw" -> "VOLKSWAGEN", "chevy" -> "CHEVROLET")
 */
export function normalizarMarcaVehiculo(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'GENERAL';
  const clean = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  return ALIAS_MARCAS_VEHICULO[clean] || clean;
}

/**
 * Normaliza un código de repuesto o competidor para búsquedas e índices.
 * Elimina espacios, guiones, barras, guiones bajos y convierte a minúsculas.
 * Ej: "W 610/3" -> "w6103", "JFA-0205" -> "jfa0205"
 */
export function normalizarCodigoCruza(codigo: string | null | undefined): string {
  if (!codigo || !codigo.trim()) return '';
  return codigo.trim().replace(/[-_/\s.]/g, '').toLowerCase();
}

/**
 * Sanitiza y estructura un bloque de texto de equivalencias cruzadas.
 * Parsea el texto y canoniza las marcas y códigos para evitar cualquier error de tipeo.
 */
export function sanitizarEquivalenciasTexto(texto: string | null | undefined): EquivalenciaItem[] {
  if (!texto || !texto.trim()) return [];

  const raw = texto.trim();
  const parts = raw.split(/[,;|\n]/).map((p) => p.trim()).filter(Boolean);
  const items: EquivalenciaItem[] = [];
  const seenKeys = new Set<string>();

  for (const part of parts) {
    let marca = '';
    let codigo = '';

    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      marca = part.slice(0, colonIdx).trim();
      codigo = part.slice(colonIdx + 1).trim();
    } else {
      const tokens = part.split(/\s+/);
      if (tokens.length >= 2) {
        marca = tokens[0];
        codigo = tokens.slice(1).join('');
      } else if (tokens.length === 1 && tokens[0]) {
        marca = 'OTRA MARCA';
        codigo = tokens[0];
      }
    }

    if (codigo) {
      const marcaCanon = normalizarMarcaCompetidor(marca);
      const codigoUpper = codigo.toUpperCase().replace(/\s+/g, '');
      const codigoNorm = normalizarCodigoCruza(codigoUpper);

      const uniqueKey = `${marcaCanon.toUpperCase()}__${codigoNorm}`;
      if (!seenKeys.has(uniqueKey) && codigoNorm.length >= 2) {
        seenKeys.add(uniqueKey);
        items.push({
          marca_competidor: marcaCanon,
          codigo_competidor: codigoUpper,
          codigo_competidor_normalizado: codigoNorm,
        });
      }
    }
  }

  return items;
}

/**
 * Sanitiza y limpia el modelo de vehículo removiendo redundancias de marca o números romanos sueltos.
 */
export function sanitizarVehiculo(
  marcaRaw: string | null | undefined,
  modeloRaw: string | null | undefined,
  versionRaw?: string | null | undefined
): { marca: string; modelo: string; version: string } {
  const marca = normalizarMarcaVehiculo(marcaRaw);
  let modelo = (modeloRaw || '').trim().toUpperCase();
  let version = (versionRaw || '').trim();

  if (!modelo) {
    return { marca, modelo: 'GENERAL', version };
  }

  // 1. Eliminar la marca del inicio del modelo si vino repetida (ej: "VOLKSWAGEN Gol" -> "Gol")
  if (modelo.startsWith(`${marca} `)) {
    modelo = modelo.slice(marca.length).trim();
  }

  // 2. Normalizar modelos conocidos con generaciones romanas sueltas (ej: "Gol IV" -> Modelo "Gol", Versión "Gen IV")
  const romanGenMatch = modelo.match(/^([A-Za-z0-9\s]+?)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i);
  if (romanGenMatch) {
    modelo = romanGenMatch[1].trim();
    const genRoman = romanGenMatch[2].toUpperCase();
    version = version ? `${version} (Gen ${genRoman})` : `Gen ${genRoman}`;
  }

  return { marca, modelo, version };
}
