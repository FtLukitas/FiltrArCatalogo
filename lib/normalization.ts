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

  // MASTERFILT
  'MASTERFILT': 'Masterfilt',
  'MASTERFIL': 'Masterfilt',
  'MASTERFILD': 'Masterfilt',
  'MARTERFILT': 'Masterfilt',
  'MASATERFILT': 'Masterfilt',

  // TECNECO
  'TECNECO': 'Tecneco',
  'TECNECO FILTROS': 'Tecneco',

  // FARO
  'FARO': 'Faro',
  'FAR0': 'Faro',

  // EQUIV (equivalencias genéricas)
  'EQUIV': 'Equiv',

  // OTROS FABRICANTES
  'MOPAR': 'Mopar',
  'BALDWIN': 'Baldwin',
  'DONALDSON': 'Donaldson',
  'FLEETGUARD': 'Fleetguard',
  'PURFLUX': 'Purflux',
  'SAKURA': 'Sakura',
  'LUBER-FINER': 'Luber-Finer',
  'BOSCH': 'Bosch',
  'WIX': 'Wix',
  'MOTORCRAFT': 'Motorcraft',
  'EMAFI': 'Emafi',

  // MARENO typos
  'MARANO': 'Mareno',
  'MARFENO': 'Mareno',

  // FRAM typos
  'FRAMM': 'Fram',
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
  const parts = raw.split(/(?:\s+\/\s+|[,;|\n])/).map((p) => p.trim()).filter(Boolean);
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

/**
 * Normaliza y extrae el modelo raíz/base canónico y la subversión de un vehículo.
 * Ej: "HILUX 2.8 TDI" -> { baseModel: "HILUX", subVersion: "2.8 TDI" }
 */
export function normalizarModeloBase(modeloRaw: string): { baseModel: string; subVersion: string } {
  if (!modeloRaw || !modeloRaw.trim()) return { baseModel: 'GENERAL', subVersion: '' };

  let clean = modeloRaw.trim().replace(/\s+/g, ' ');

  // 1. Quitar marca del inicio si está repetida en el modelo
  const MARCAS_PREFIX = [
    'VOLKSWAGEN', 'VW', 'CHEVROLET', 'CHEVY', 'FORD', 'FIAT', 'PEUGEOT', 'RENAULT',
    'CITROEN', 'CITROËN', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'MERCEDES BENZ',
    'MERCEDES-BENZ', 'MERCEDES', 'MB', 'BMW', 'AUDI', 'JEEP', 'RAM', 'DODGE', 'MITSUBISHI'
  ];

  const upperStr = clean.toUpperCase();
  for (const m of MARCAS_PREFIX) {
    if (upperStr.startsWith(m + ' ')) {
      clean = clean.slice(m.length + 1).trim();
      break;
    }
  }

  // Quitar palabras preliminares
  clean = clean.replace(/^(NUEVO|NUEVA)\s+/i, '');
  const cleanUpper = clean.toUpperCase();

  // 2. Familias canónicas de modelos raíz
  const FAMILIAS: [RegExp, string][] = [
    [/^GOL\b/i, 'GOL'],
    [/^CORSA\b|^CLASSIC\b/i, 'CORSA'],
    [/^PALIO\b/i, 'PALIO'],
    [/^SIENA\b/i, 'SIENA'],
    [/^UNO\b/i, 'UNO'],
    [/^C3\b/i, 'C3'],
    [/^C4\b/i, 'C4'],
    [/^206\b/i, '206'],
    [/^207\b/i, '207'],
    [/^208\b/i, '208'],
    [/^307\b/i, '307'],
    [/^308\b/i, '308'],
    [/^408\b/i, '408'],
    [/^HILUX\b|^SW4\b/i, 'HILUX'],
    [/^AMAROK\b/i, 'AMAROK'],
    [/^RANGER\b/i, 'RANGER'],
    [/^FIESTA\b/i, 'FIESTA'],
    [/^FOCUS\b/i, 'FOCUS'],
    [/^KA\+?\b/i, 'KA'],
    [/^ECOSPORT\b/i, 'ECOSPORT'],
    [/^CLIO\b/i, 'CLIO'],
    [/^KANGOO\b/i, 'KANGOO'],
    [/^SANDERO\b|^STEPWAY\b/i, 'SANDERO'],
    [/^MEGANE\b|^MÉGANE\b/i, 'MEGANE'],
    [/^DUSTER\b/i, 'DUSTER'],
    [/^S10\b/i, 'S10'],
    [/^TRACKER\b/i, 'TRACKER'],
    [/^ONIX\b/i, 'ONIX'],
    [/^PRISMA\b/i, 'PRISMA'],
    [/^CRUZE\b/i, 'CRUZE'],
    [/^PARTNER\b/i, 'PARTNER'],
    [/^BERLINGO\b/i, 'BERLINGO'],
    [/^STRADA\b/i, 'STRADA'],
    [/^TORO\b/i, 'TORO'],
    [/^SAVEIRO\b/i, 'SAVEIRO'],
    [/^SURAN\b/i, 'SURAN'],
    [/^FOX\b|^CROSSFOX\b/i, 'FOX'],
    [/^VENTO\b/i, 'VENTO'],
    [/^BORA\b/i, 'BORA'],
    [/^COROLLA\b/i, 'COROLLA'],
    [/^ETIOS\b/i, 'ETIOS'],
    [/^YARIS\b/i, 'YARIS'],
    [/^FRONTIER\b/i, 'FRONTIER'],
    [/^ALASKAN\b/i, 'ALASKAN'],
    [/^FLUENCE\b/i, 'FLUENCE'],
    [/^LOGAN\b/i, 'LOGAN'],
    [/^KWID\b/i, 'KWID'],
    [/^SPIN\b/i, 'SPIN'],
    [/^AGILE\b/i, 'AGILE'],
    [/^CELTA\b/i, 'CELTA'],
    [/^MERIVA\b/i, 'MERIVA'],
    [/^ZAFIRA\b/i, 'ZAFIRA'],
    [/^ASTRA\b/i, 'ASTRA'],
    [/^VECTRA\b/i, 'VECTRA'],
    [/^FIORINO\b/i, 'FIORINO'],
    [/^CRONOS\b/i, 'CRONOS'],
    [/^MOBI\b/i, 'MOBI'],
    [/^ARGO\b/i, 'ARGO'],
    [/^PUNTO\b/i, 'PUNTO'],
    [/^STILO\b/i, 'STILO'],
    [/^IDEA\b/i, 'IDEA'],
    [/^DOBLO\b|^DOBLÒ\b/i, 'DOBLO'],
    [/^DUCATO\b/i, 'DUCATO'],
    [/^MASTER\b/i, 'MASTER'],
    [/^BOXER\b/i, 'BOXER'],
    [/^JUMPER\b/i, 'JUMPER'],
    [/^HR\b/i, 'HR'],
    [/^SPRINTER\b/i, 'SPRINTER'],
  ];

  for (const [regex, canonicalName] of FAMILIAS) {
    if (regex.test(cleanUpper)) {
      const rest = clean.replace(regex, '').trim();
      return {
        baseModel: canonicalName,
        subVersion: rest || clean,
      };
    }
  }

  const tokens = clean.split(' ');
  const baseToken = tokens[0].toUpperCase();
  const restTokens = tokens.slice(1).join(' ');

  return {
    baseModel: baseToken,
    subVersion: restTokens || clean,
  };
}
