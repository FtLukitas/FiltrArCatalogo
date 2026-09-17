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
 * Ej: "ESCORT NAFTA" -> { baseModel: "ESCORT", subVersion: "NAFTA" }
 * Ej: "HILUX 2.8 TDI" -> { baseModel: "HILUX", subVersion: "2.8 TDI" }
 */
export function normalizarModeloBase(
  modeloRaw: string,
  marcaRaw?: string
): { baseModel: string; subVersion: string } {
  if (!modeloRaw || !modeloRaw.trim()) return { baseModel: 'GENERAL', subVersion: '' };

  let clean = modeloRaw.trim().replace(/\s+/g, ' ');
  const marca = (marcaRaw || '').toUpperCase().trim();

  // 1. Quitar marca del inicio si está repetida en el modelo
  const MARCAS_PREFIX = [
    'VOLKSWAGEN', 'VW', 'CHEVROLET', 'CHEVY', 'FORD', 'FIAT', 'PEUGEOT', 'RENAULT',
    'CITROEN', 'CITROËN', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'MERCEDES BENZ',
    'MERCEDES-BENZ', 'MERCEDES', 'MB', 'BMW', 'AUDI', 'JEEP', 'RAM', 'DODGE', 'MITSUBISHI',
    'ALFA ROMEO', 'ALFA'
  ];

  const upperStr = clean.toUpperCase();
  if (marca && upperStr.startsWith(marca + ' ')) {
    clean = clean.slice(marca.length + 1).trim();
  } else {
    for (const m of MARCAS_PREFIX) {
      if (upperStr.startsWith(m + ' ')) {
        clean = clean.slice(m.length + 1).trim();
        break;
      }
    }
  }

  // Quitar palabras preliminares
  clean = clean.replace(/^(NUEVO|NUEVA|ALL NEW)\s+/i, '');
  const cleanUpper = clean.toUpperCase();

  // 2. Familias canónicas de modelos raíz del mercado argentino
  const FAMILIAS: [RegExp, string][] = [
    // VW
    [/^GOL\b/i, 'GOL'],
    [/^GOLF\b/i, 'GOLF'],
    [/^POLO\b/i, 'POLO'],
    [/^FOX\b|^CROSSFOX\b/i, 'FOX'],
    [/^SURAN\b/i, 'SURAN'],
    [/^SAVEIRO\b/i, 'SAVEIRO'],
    [/^AMAROK\b/i, 'AMAROK'],
    [/^BORA\b/i, 'BORA'],
    [/^VENTO\b/i, 'VENTO'],
    [/^PASSAT\b|^CC\b/i, 'PASSAT'],
    [/^BEETLE\b|^NEW BEETLE\b/i, 'BEETLE'],
    [/^UP\b|^UP!/i, 'UP'],
    [/^TAOS\b/i, 'TAOS'],
    [/^TIGUAN\b/i, 'TIGUAN'],
    [/^TOUAREG\b/i, 'TOUAREG'],
    [/^NIVUS\b/i, 'NIVUS'],
    [/^VIRTUS\b/i, 'VIRTUS'],
    [/^VOYAGE\b/i, 'VOYAGE'],
    [/^CADDY\b/i, 'CADDY'],
    [/^SHARAN\b/i, 'SHARAN'],
    [/^SCIROCCO\b/i, 'SCIROCCO'],
    [/^GACEL\b/i, 'GACEL'],
    [/^SENDA\b/i, 'SENDA'],
    [/^POINTER\b/i, 'POINTER'],
    [/^SANTANA\b/i, 'SANTANA'],
    [/^QUANTUM\b/i, 'QUANTUM'],
    [/^CARAT\b/i, 'CARAT'],
    [/^CONSTELLATION\b|^COSNTELLATION\b/i, 'CONSTELLATION'],
    [/^WORKER\b/i, 'WORKER'],
    [/^DELIVERY\b/i, 'DELIVERY'],
    [/^TITAN\b/i, 'TITAN'],

    // FORD
    [/^ESCORT\b/i, 'ESCORT'],
    [/^ECOSPORT\b/i, 'ECOSPORT'],
    [/^FALCON\b/i, 'FALCON'],
    [/^FIESTA\b/i, 'FIESTA'],
    [/^FOCUS\b/i, 'FOCUS'],
    [/^RANGER\b/i, 'RANGER'],
    [/^KA\+?\b/i, 'KA'],
    [/^F-?100\b/i, 'F-100'],
    [/^F-?150\b/i, 'F-150'],
    [/^F-?1000\b/i, 'F-1000'],
    [/^F-?14000\b/i, 'F-14000'],
    [/^F-?4000\b/i, 'F-4000'],
    [/^CARGO\b/i, 'CARGO'],
    [/^TRANSIT\b/i, 'TRANSIT'],
    [/^MONDEO\b/i, 'MONDEO'],
    [/^KUGA\b/i, 'KUGA'],
    [/^TERRITORY\b/i, 'TERRITORY'],
    [/^TAUNUS\b/i, 'TAUNUS'],
    [/^SIERRA\b/i, 'SIERRA'],
    [/^ORION\b/i, 'ORION'],
    [/^GALAXY\b/i, 'GALAXY'],
    [/^COURIER\b/i, 'COURIER'],
    [/^EXPLORER?\b/i, 'EXPLORER'],
    [/^FUSION\b/i, 'FUSION'],

    // CHEVROLET
    [/^CORSA\b|^CLASSIC\b/i, 'CORSA'],
    [/^ONIX\b/i, 'ONIX'],
    [/^PRISMA\b/i, 'PRISMA'],
    [/^CRUZE\b/i, 'CRUZE'],
    [/^S-?10\b/i, 'S10'],
    [/^TRACKER\b/i, 'TRACKER'],
    [/^SPIN\b/i, 'SPIN'],
    [/^AGILE\b/i, 'AGILE'],
    [/^CELTA\b/i, 'CELTA'],
    [/^ASTRA\b/i, 'ASTRA'],
    [/^VECTRA\b/i, 'VECTRA'],
    [/^MERIVA\b/i, 'MERIVA'],
    [/^ZAFIRA\b/i, 'ZAFIRA'],
    [/^AVEO\b/i, 'AVEO'],
    [/^SONIC\b/i, 'SONIC'],
    [/^COBALT\b/i, 'COBALT'],
    [/^MONTANA\b/i, 'MONTANA'],
    [/^BLAZER\b/i, 'BLAZER'],
    [/^SILVERADO\b/i, 'SILVERADO'],
    [/^SPARK\b/i, 'SPARK'],
    [/^CAPTIVA\b/i, 'CAPTIVA'],
    [/^EQUINOX\b/i, 'EQUINOX'],
    [/^MONZA\b/i, 'MONZA'],
    [/^KADETT\b/i, 'KADETT'],
    [/^IPANEMA\b/i, 'IPANEMA'],
    [/^CHEVETTE\b/i, 'CHEVETTE'],

    // FIAT
    [/^CRONOS\b/i, 'CRONOS'],
    [/^ARGO\b/i, 'ARGO'],
    [/^TORO\b/i, 'TORO'],
    [/^STRADA\b/i, 'STRADA'],
    [/^PALIO\b/i, 'PALIO'],
    [/^SIENA\b|^GRAND SIENA\b/i, 'SIENA'],
    [/^UNO\b/i, 'UNO'],
    [/^MOBI\b/i, 'MOBI'],
    [/^PULSE\b/i, 'PULSE'],
    [/^FASTBACK\b/i, 'FASTBACK'],
    [/^FIORINO\b/i, 'FIORINO'],
    [/^DUCATO\b/i, 'DUCATO'],
    [/^DOBLO\b|^DOBLÒ\b/i, 'DOBLO'],
    [/^QUBO\b/i, 'QUBO'],
    [/^PUNTO\b/i, 'PUNTO'],
    [/^LINEA\b/i, 'LINEA'],
    [/^STILO\b/i, 'STILO'],
    [/^IDEA\b/i, 'IDEA'],
    [/^BRAVA\b/i, 'BRAVA'],
    [/^BRAVO\b/i, 'BRAVO'],
    [/^MAREA\b/i, 'MAREA'],
    [/^DUNA\b/i, 'DUNA'],
    [/^REGATTA\b|^REGATA\b/i, 'REGATTA'],
    [/^TEMPRA\b/i, 'TEMPRA'],
    [/^TIPO\b/i, 'TIPO'],
    [/^SPAZIO\b|^147\b/i, '147'],
    [/^128\b/i, '128'],
    [/^125\b/i, '125'],
    [/^600\b/i, '600'],
    [/^500\b/i, '500'],

    // RENAULT
    [/^CLIO\b/i, 'CLIO'],
    [/^KANGOO\b/i, 'KANGOO'],
    [/^SANDERO\b|^STEPWAY\b/i, 'SANDERO'],
    [/^LOGAN\b/i, 'LOGAN'],
    [/^DUSTER\b/i, 'DUSTER'],
    [/^OROCH\b/i, 'OROCH'],
    [/^CAPTUR\b/i, 'CAPTUR'],
    [/^KWID\b/i, 'KWID'],
    [/^FLUENCE\b/i, 'FLUENCE'],
    [/^MEGANE\b|^MÉGANE\b/i, 'MEGANE'],
    [/^SCENIC\b|^SCÉNIC\b/i, 'SCENIC'],
    [/^SYMBOL\b/i, 'SYMBOL'],
    [/^MASTER\b/i, 'MASTER'],
    [/^TRAFIC\b/i, 'TRAFIC'],
    [/^TWINGO\b/i, 'TWINGO'],
    [/^KOLEOS\b/i, 'KOLEOS'],
    [/^ALASKAN\b/i, 'ALASKAN'],
    [/^19\b/i, '19'],
    [/^18\b/i, '18'],
    [/^12\b/i, '12'],
    [/^11\b/i, '11'],
    [/^9\b/i, '9'],
    [/^4\b/i, '4'],
    [/^TORINO\b/i, 'TORINO'],
    [/^EXPRESS\b/i, 'EXPRESS'],
    [/^LAGUNA\b/i, 'LAGUNA'],

    // PEUGEOT
    [/^206\b/i, '206'],
    [/^207\b/i, '207'],
    [/^208\b/i, '208'],
    [/^307\b/i, '307'],
    [/^308\b/i, '308'],
    [/^408\b/i, '408'],
    [/^2008\b/i, '2008'],
    [/^3008\b/i, '3008'],
    [/^5008\b/i, '5008'],
    [/^PARTNER\b/i, 'PARTNER'],
    [/^EXPERT\b/i, 'EXPERT'],
    [/^BOXER\b/i, 'BOXER'],
    [/^205\b/i, '205'],
    [/^306\b/i, '306'],
    [/^405\b/i, '405'],
    [/^406\b/i, '406'],
    [/^407\b/i, '407'],
    [/^504\b/i, '504'],
    [/^505\b/i, '505'],

    // CITROEN
    [/^BERLINGO\b/i, 'BERLINGO'],
    [/^C3\b/i, 'C3'],
    [/^C4\b/i, 'C4'],
    [/^C5\b/i, 'C5'],
    [/^C-?ELYSEE\b/i, 'C-ELYSEE'],
    [/^AIRCROSS\b/i, 'AIRCROSS'],
    [/^XSARA\b/i, 'XSARA'],
    [/^JUMPER\b/i, 'JUMPER'],

    // TOYOTA
    [/^HILUX\b|^SW4\b/i, 'HILUX'],
    [/^COROLLA\b/i, 'COROLLA'],
    [/^ETIOS\b/i, 'ETIOS'],
    [/^YARIS\b/i, 'YARIS'],
    [/^RAV-?4\b/i, 'RAV4'],
    [/^HIACE\b/i, 'HIACE'],
    [/^LAND CRUISER\b|^PRADO\b/i, 'LAND CRUISER'],
    [/^CAMRY\b/i, 'CAMRY'],
    [/^CORONA\b/i, 'CORONA'],

    // NISSAN
    [/^FRONTIER\b/i, 'FRONTIER'],
    [/^KICKS\b/i, 'KICKS'],
    [/^VERSA\b/i, 'VERSA'],
    [/^MARCH\b/i, 'MARCH'],
    [/^NOTE\b/i, 'NOTE'],
    [/^SENTRA\b/i, 'SENTRA'],
    [/^TIIDA\b/i, 'TIIDA'],
    [/^X-?TRAIL\b/i, 'X-TRAIL'],

    // JEEP / RAM
    [/^RENEGADE\b/i, 'RENEGADE'],
    [/^COMPASS\b/i, 'COMPASS'],
    [/^COMMANDER\b/i, 'COMMANDER'],
    [/^CHEROKEE\b|^GRAND CHEROKEE\b/i, 'CHEROKEE'],
    [/^WRANGLER\b/i, 'WRANGLER'],
    [/^RAMPAGE\b/i, 'RAMPAGE'],
    [/^RAM\b/i, 'RAM'],

    // MERCEDES-BENZ
    [/^SPRINTER\b/i, 'SPRINTER'],
    [/^VITO\b/i, 'VITO'],
    [/^ACCELO\b/i, 'ACCELO'],
    [/^ATEGO\b/i, 'ATEGO'],
    [/^AXOR\b/i, 'AXOR'],
    [/^ACTROS\b/i, 'ACTROS'],
    [/^1114\b/i, '1114'],
    [/^1620\b/i, '1620'],
    [/^710\b/i, '710'],

    // AUDI
    [/^A1\b/i, 'A1'],
    [/^A3\b/i, 'A3'],
    [/^A4\b/i, 'A4'],
    [/^A5\b/i, 'A5'],
    [/^A6\b/i, 'A6'],
    [/^A7\b/i, 'A7'],
    [/^A8\b/i, 'A8'],
    [/^Q2\b/i, 'Q2'],
    [/^Q3\b/i, 'Q3'],
    [/^Q5\b/i, 'Q5'],
    [/^Q7\b/i, 'Q7'],
    [/^TT\b/i, 'TT'],
    [/^ALLROAD\b/i, 'ALLROAD'],

    // HONDA
    [/^CIVIC\b/i, 'CIVIC'],
    [/^FIT\b/i, 'FIT'],
    [/^CITY\b/i, 'CITY'],
    [/^HR-?V\b/i, 'HR-V'],
    [/^CR-?V\b/i, 'CR-V'],
    [/^ACCORD\b/i, 'ACCORD'],

    // HYUNDAI / KIA
    [/^H-?100\b/i, 'H-100'],
    [/^H-?1\b/i, 'H-1'],
    [/^TUCSON\b/i, 'TUCSON'],
    [/^SANTA FE\b/i, 'SANTA FE'],
    [/^K-?2500\b/i, 'K-2500'],
    [/^K-?2700\b/i, 'K-2700'],
    [/^K-?2900\b/i, 'K-2900'],
    [/^SPORTAGE\b/i, 'SPORTAGE'],
    [/^SORENTO\b/i, 'SORENTO'],
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

  // 3. Limpieza general para modelos no contemplados en familias fijas
  let baseCandidate = clean;

  // Quitar paréntesis cerrados y también cualquier paréntesis/corchete sin cerrar hasta el final
  baseCandidate = baseCandidate.replace(/\s*\(.*?\)/g, '').trim();
  baseCandidate = baseCandidate.replace(/\s*\[.*?\]/g, '').trim();
  baseCandidate = baseCandidate.replace(/\s*[\(\[].*$/, '').trim();

  // Quitar cosas después de guión o barra con espacio: "ESCORT - FIESTA OVALADO" -> "ESCORT"
  baseCandidate = baseCandidate.replace(/\s+[-/]\s+.*$/, '').trim();
  // Quitar "+ CABRIOLET..."
  baseCandidate = baseCandidate.replace(/\s*\+.*$/, '').trim();

  // Quitar descriptores comunes al final (motores, combustibles, carrocerías)
  const descRegex = /\s+(NAFTA|DIESEL|TURBO|TDI|HDI|GTI|GLI|TD|D|GSI|CDI|COMMON RAIL|MOTOR\s+.*|CABRIOLET|COUPE|COUPÉ|SEDAN|SEDÁN|HATCHBACK|HATCH|RURAL|FAMILIAR|METALICO|METÁLICO|MAXI|PLUS|CROSS|STEPWAY|ADVENTURE|WAY|SPORTWAGON|MULTI\s*WAGON|BREAK|AVANT|SW|EASY|EVO|TREND|HIGHLINE|COMFORTLINE|CONFORT|FULL|BASE|ESTANDAR|ESTÁNDAR|AUTOMATICO|AUTOMÁTICO|MANUAL|4X4|4X2|6X4|6X2|8X4|16V|8V|V6|V8|24V|12V)\b.*$/i;
  if (descRegex.test(baseCandidate)) {
    const stripped = baseCandidate.replace(descRegex, '').trim();
    if (stripped.length >= 2) baseCandidate = stripped;
  }

  // Quitar cilindradas o números al final: "QUBO 1.4" -> "QUBO", "TERRITORY 1,5..." -> "TERRITORY"
  const cilRegex = /\s+([0-9],[0-9]|[0-9]\.[0-9]|[0-9]{2,4})\b.*$/i;
  if (cilRegex.test(baseCandidate)) {
    const stripped = baseCandidate.replace(cilRegex, '').trim();
    if (stripped.length >= 2) baseCandidate = stripped;
  }

  // Quitar números romanos al final: "LAGUNA I" -> "LAGUNA", "ALLROAD III" -> "ALLROAD"
  const romanRegex = /\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i;
  if (romanRegex.test(baseCandidate)) {
    const stripped = baseCandidate.replace(romanRegex, '').trim();
    if (stripped.length >= 2) baseCandidate = stripped;
  }

  const baseModel = baseCandidate.toUpperCase().trim() || 'GENERAL';
  let restTokens = '';
  if (clean.toUpperCase().startsWith(baseCandidate.toUpperCase())) {
    restTokens = clean.slice(baseCandidate.length).trim();
  } else {
    restTokens = clean.replace(baseCandidate, '').trim();
  }

  return {
    baseModel,
    subVersion: restTokens || clean,
  };
}

/**
 * Retorna directamente el modelo base canónico normalizado.
 */
export function canonizarModelo(modeloRaw: string, marcaRaw?: string): string {
  return normalizarModeloBase(modeloRaw, marcaRaw).baseModel;
}

export * from './argentinaMarket';
