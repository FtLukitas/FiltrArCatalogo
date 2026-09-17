/**
 * POLÍTICA DE MERCADO Y VALIDACIÓN AUTOMOTRIZ: MERCADO ARGENTINO
 * 
 * INVARIANTE FUNDAMENTAL DEL PROYECTO:
 * Al scrappear, importar o sincronizar aplicaciones vehiculares en FiltrAr Catálogo,
 * se debe respetar ESTRICTAMENTE el parque automotor, de transporte pesado y agroindustrial
 * comercializado y circulante en la REPÚBLICA ARGENTINA.
 * 
 * Quedan prohibidos:
 * 1. Marcas foráneas sin presencia en el país (ej: VDL Bus, GINAF, Opel, Vauxhall, Dacia, Kramer, etc.).
 * 2. Modelos exclusivamente europeos/asiáticos no vendidos en Argentina (ej: Renault Talisman, VW Lupo, Fiat Multipla, etc.).
 * 3. Textos residuales de manuales, números de repuestos o anotaciones técnicas como nombre de modelo.
 */

// 1. Whitelist Oficial de Marcas del Mercado Argentino (con canonización de alias)
export const ALIAS_MARCAS_ARGENTINAS: Record<string, string> = {
  // LÍNEA LIVIANA (Autos, Utilitarios, SUVs)
  'ALFA ROMEO': 'ALFA ROMEO',
  'AUDI': 'AUDI',
  'BMW': 'BMW',
  'CHERY': 'CHERY',
  'CHEVROLET': 'CHEVROLET',
  'CHEVY': 'CHEVROLET',
  'GM': 'CHEVROLET',
  'GENERAL MOTORS': 'CHEVROLET',
  'CHRYSLER': 'CHRYSLER',
  'CITROEN': 'CITROEN',
  'CITROËN': 'CITROEN',
  'DAEWOO': 'DAEWOO',
  'DAIHATSU': 'DAIHATSU',
  'DODGE': 'DODGE',
  'DS': 'DS',
  'FIAT': 'FIAT',
  'FORD': 'FORD',
  'GEELY': 'GEELY',
  'HAVAL': 'HAVAL',
  'HONDA': 'HONDA',
  'HYUNDAI': 'HYUNDAI',
  'ISUZU': 'ISUZU',
  'JAC': 'JAC',
  'JAGUAR': 'JAGUAR',
  'JEEP': 'JEEP',
  'KIA': 'KIA',
  'LAND ROVER': 'LAND ROVER',
  'LIFAN': 'LIFAN',
  'MAZDA': 'MAZDA',
  'MERCEDES-BENZ': 'MERCEDES-BENZ',
  'MERCEDES BENZ': 'MERCEDES-BENZ',
  'MERCEDES': 'MERCEDES-BENZ',
  'MB': 'MERCEDES-BENZ',
  'MINI': 'MINI',
  'MITSUBISHI': 'MITSUBISHI',
  'NISSAN': 'NISSAN',
  'PEUGEOT': 'PEUGEOT',
  'PORSCHE': 'PORSCHE',
  'RAM': 'RAM',
  'RENAULT': 'RENAULT',
  'ROVER': 'ROVER',
  'SEAT': 'SEAT',
  'SMART': 'SMART',
  'SSANG YONG': 'SSANG YONG',
  'SSANGYONG': 'SSANG YONG',
  'SUBARU': 'SUBARU',
  'SUZUKI': 'SUZUKI',
  'TATA': 'TATA',
  'TOYOTA': 'TOYOTA',
  'VOLKSWAGEN': 'VOLKSWAGEN',
  'VW': 'VOLKSWAGEN',
  'VOLVO': 'VOLVO',

  // LÍNEA PESADA (Camiones, Colectivos y Utilitarios Pesados)
  'AGRALE': 'AGRALE',
  'AGRALE-DEUTZ': 'AGRALE',
  'DEUTZ-AGRALE': 'AGRALE',
  'DIMEX': 'DIMEX',
  'EL DETALLE': 'EL DETALLE',
  'FOTON': 'FOTON',
  'INTERNATIONAL': 'INTERNATIONAL',
  'IVECO': 'IVECO',
  'RENAULT TRUCKS': 'RENAULT TRUCKS',
  'SCANIA': 'SCANIA',
  'SCANIA BUS / SCANIA-IRIZAR': 'SCANIA',
  'VOLVO TRUCKS': 'VOLVO',

  // AGRO, VIAL Y MAQUINARIA INDUSTRIAL (Parque Nacional)
  'AGCO': 'AGCO',
  'AGRINAR': 'AGRINAR',
  'ALLIS CHALMERS': 'ALLIS CHALMERS',
  'ALLIS-CHALMERS': 'ALLIS CHALMERS',
  'APACHE': 'APACHE',
  'ARAUS': 'ARAUS',
  'BERNARDIN': 'BERNARDIN',
  'BOBCAT': 'BOBCAT',
  'CASE': 'CASE',
  'CASE CONSTRUCTION': 'CASE',
  'CASE-IH': 'CASE',
  'CASE IH': 'CASE',
  'CATERPILLAR': 'CATERPILLAR',
  'CAT': 'CATERPILLAR',
  'CLAAS': 'CLAAS',
  'CUMMINS': 'CUMMINS',
  'DEUTZ': 'DEUTZ',
  'DEUTZ-FAHR': 'DEUTZ',
  'DON ROQUE': 'DON ROQUE',
  'FIAT ALLIS': 'FIAT ALLIS',
  'GHERARDI': 'GHERARDI',
  'HELI': 'HELI',
  'JCB': 'JCB',
  'JOHN DEERE': 'JOHN DEERE',
  'JOHNDEERE': 'JOHN DEERE',
  'JD': 'JOHN DEERE',
  'KOMATSU': 'KOMATSU',
  'KUBOTA': 'KUBOTA',
  'LIEBHERR': 'LIEBHERR',
  'LIUGONG': 'LIUGONG',
  'MAINERO': 'MAINERO',
  'MARANI': 'MARANI',
  'MASSEY FERGUSON': 'MASSEY FERGUSON',
  'MASSEY': 'MASSEY FERGUSON',
  'MF': 'MASSEY FERGUSON',
  'MICHIGAN': 'MICHIGAN',
  'NEW HOLLAND': 'NEW HOLLAND',
  'NEWHOLLAND': 'NEW HOLLAND',
  'NH': 'NEW HOLLAND',
  'PAUNY': 'PAUNY',
  'PLA': 'PLA',
  'PUMA': 'PUMA',
  'SULLAIR': 'SULLAIR',
  'VALTRA': 'VALTRA',
  'VALTRA VALMET': 'VALTRA',
  'VALTRA / VALMET': 'VALTRA',
  'VALMET': 'VALTRA',
  'VASSALLI': 'VASSALLI',
  'VASALLI': 'VASSALLI',
  'XCMG': 'XCMG',
  'ZANELLO': 'ZANELLO'
};

// 2. Blacklist de Modelos Exclusivamente Foráneos (No comercializados en Argentina)
export const MODELOS_FORANEOS_NO_ARGENTINOS: Set<string> = new Set([
  // RENAULT
  'TALISMAN', 'MODUS', 'MODUS / GRAND MODUS', 'AVANTIME', 'VEL SATIS', 'WIND', 'ESPACE', 'ESPACE IV / GRAND ESPACE IV',
  'DOKKER', 'LODGY', 'KAPTUR (RUSSIA)', 'ARKANA', 'LATITUDE', 'SAFRANE', 'SCÉNIC III / GRAND SCÉNIC',
  'GRAND SCÉNIC', 'KANGOO BE BOP', 'THALIA', 'SCALA',

  // VOLKSWAGEN
  'LUPO', 'PHAETON', 'XL1', 'TOURAN', 'CORRADO', 'ARTEON', 'ID.3', 'ID.4', 'EOS', 'FOX (5Z1)', 'MULTIVAN',

  // FIAT
  'MULTIPLA', 'SEDICI', 'SEDICI (189)', 'CROMA', 'BARCHETTA', 'BARCHETTA (183)', 'CINQUECENTO (170/270)',
  'PANDA I (141A)', 'PANDA II (169A)', 'PANDA', 'SEICENTO', 'TALENTO', 'FREEMONT', 'TIPO / EGEA (356)',
  'ALBEA', 'RITMO (138A)', 'ARGENTA (132A)', 'CAMPAGNOLA', 'LANCIA Y 10 FIRE', 'SCUDO II (272)',

  // FORD
  'B-MAX', 'C-MAX', 'S-MAX', 'SCORPIO', 'STREETKA', 'TOURNEO CONNECT', 'TOURNEO COURIER',
  'TRANSIT / TOURNEO COURIER (C4A)', 'TRANSIT CONNECT (TC7)', 'PUMA (EUROPEO)', 'FUSION / FUSION PLUS', 'PROBE',
  'KA+ (FIGO)',

  // PEUGEOT
  '1007', '107', '108', '4007', '4008', '806', '807', 'BIPPER', 'ION', 'RANCH', 'J7', '309', '605', '607',

  // CITROEN
  'C1', 'C10', 'C2', 'C6', 'C8', 'NEMO', 'EVASIÓN', 'DISPATCH', 'RELAY', 'DYANE / ACADIANE', 'VISA', 'CX',

  // TOYOTA
  'AYGO', 'CENTURY', 'PROACE', 'PROACE II / PROACE CITY / PROACE VERSO', 'TOYOACE', 'CARINA E',
  'STALLION, TUV', 'STOUT',

  // MERCEDES-BENZ
  'CITAN', 'VIANO', 'W100 - PULLMANN', 'W108/109', 'W110-112 LIMOUSINE', 'W111 COUPÉ/CABRIO',
  'W120, 121, W128, W105 / 180 (PONTON)', 'MB TRAC-SERIE',

  // NISSAN
  'CUBE', 'MICRA IV (K13)', 'MICRA V (K14F)', 'PULSAR', 'INTERSTAR', 'INTERSTAR (XDD, XDE)',
  'KUBISTAR', 'NV200 / EVALIA', 'NV300 / PRIMASTAR (X82)', 'NV400 / INTERSTAR (X62, X62B)',
  'TIIDA III (C13R / RUSSIA)', 'PRIMASTAR', 'PRIMERA III (P12)', 'ALMERA', 'ALTIMA', 'BLUEBIRD',

  // CHEVROLET
  'LUMINA', 'LUMINA APV', 'OPTRA', 'FRONTERA',

  // SEAT
  'AROSA', 'MII'
]);

// 3. Patrones de Basura de Catálogo / Números de Repuesto / OCR Sucio
export const REGEX_BASURA_MODELO = /(?:BALDWIN|FLEETGUARD|BOSCH|DESGASIFICADOR|DIRECCION HIDRAULICA|REEMPLAZADO|SE REEMPLAZA|SECUNDARIO|SEC\. DEL|SEGURIDAD PARA|PRIMARIO PARA|TAPA CON REBAJE|TAPAS DE GOMA|\bFRAM\b|\bWK\s*\d|\bALG\s*\d|\bORIG\b|PEUGEOT \d+.*XSARA|DIESEL CELULOSA|REFORMA HOLLEY|TUBULAR|\bCHICO\b|\bREDONDO\b|^\d+[\s-]*\d*$|^[A-Z]\s*\d+$|^[A-Z0-9-]{8,}$|^[0-9]+[A-Z)]*$)/i;

/**
 * Valida y obtiene el nombre canónico si la marca pertenece al mercado argentino.
 * Si es una marca foránea (VDL, GINAF, Opel, Vauxhall, etc.), devuelve null.
 */
export function normalizarMarcaMercadoArgentino(marcaRaw: string | null | undefined): string | null {
  if (!marcaRaw || !marcaRaw.trim()) return null;
  const clean = marcaRaw.trim().toUpperCase().replace(/\s+/g, ' ');
  return ALIAS_MARCAS_ARGENTINAS[clean] || null;
}

/**
 * Verifica si un modelo es admisible en el mercado argentino.
 */
export function esModeloAdmisibleMercadoArgentino(modeloRaw: string | null | undefined): boolean {
  if (!modeloRaw || !modeloRaw.trim()) return false;
  const m = modeloRaw.trim();
  if (m.length < 2) return false;

  // Filtrar basura de catálogo o números de pieza
  if (REGEX_BASURA_MODELO.test(m)) return false;

  // Filtrar cadenas con mezclas de marcas
  if (m.includes(' / ') && (
    m.includes('RENAULT') || m.includes('FIAT') || m.includes('VOLKSWAGEN') ||
    m.includes('PEUGEOT') || m.includes('FORD') || m.includes('CHEVROLET')
  )) {
    return false;
  }

  // Filtrar modelos extranjeros explícitos
  if (MODELOS_FORANEOS_NO_ARGENTINOS.has(m.toUpperCase())) return false;

  return true;
}

// 4. Patrones de Versiones y Motores Exclusivamente Europeos / No Comercializados en Argentina
export const REGEX_VERSIONES_FORANEAS = /\b(LPG|GPL|GLP|BiFuel|Bi-Fuel|EcoFuel|Natural Power|g-tron|BlueTDI|BlueMotion)\b/i;

/**
 * Valida si una versión vehicular es admisible en el mercado argentino.
 * Filtra combustibles europeos inexistentes en el país (LPG, EcoFuel) y motores no comercializados localmente.
 */
export function esVersionAdmisibleMercadoArgentino(
  marca: string | null | undefined,
  modelo: string | null | undefined,
  version: string | null | undefined
): boolean {
  if (!version || !version.trim()) return true;
  const v = version.trim();
  const m = (marca || '').toUpperCase().trim();
  const mod = (modelo || '').toUpperCase().trim();

  // 1. Combustibles foráneos de catálogo europeo
  if (REGEX_VERSIONES_FORANEAS.test(v)) return false;

  // 2. Basura de catálogo incrustada en versión
  if (/\b(Use for OE no\.?:?|Filtration system:?|For PR number:?|chassis no\.?:?|Left-hand drive)\b/i.test(v)) {
    return false;
  }

  // 3. Motores específicos no comercializados en Argentina por modelo
  if (m === 'VOLKSWAGEN') {
    if (/\b(1,4 FSI|1\.4 FSI|1,6 FSI|1\.6 FSI)\b/i.test(v)) return false;
    if (['GOLF', 'JETTA', 'PASSAT', 'BEETLE', 'CADDY'].includes(mod) && /\b(1,6 TDI|1\.6 TDI)\b/i.test(v)) return false;
  }

  if (m === 'RENAULT') {
    if (['CLIO', 'CAPTUR', 'DUSTER', 'LOGAN', 'SANDERO'].includes(mod) && /\b(0,9 TCe|0\.9 TCe|1,2 TCe|1\.2 TCe)\b/i.test(v)) return false;
    if (/\bBlue dCi\b/i.test(v)) return false;
  }

  if ((m === 'CITROEN' || m === 'CITROËN') && mod === 'C4') {
    if (/\b(PureTech|1,2 VTi|1\.2 VTi)\b/i.test(v)) return false;
  }

  return true;
}

/**
 * Sanitiza una aplicación vehicular asegurando cumplimiento estricto con el mercado argentino.
 * Devuelve null si la marca o el modelo no pertenecen al mercado nacional.
 */
export function sanitizarAplicacionMercadoArgentino(
  marcaRaw: string | null | undefined,
  modeloRaw: string | null | undefined,
  versionRaw?: string | null | undefined,
  añoRaw?: string | null | undefined,
  tipoVehiculoRaw?: string | null | undefined
): {
  marca: string;
  modelo: string;
  version: string;
  año: string | null;
  tipo_vehiculo: 'LIVIANO' | 'PESADO';
} | null {
  const marcaCanon = normalizarMarcaMercadoArgentino(marcaRaw);
  if (!marcaCanon) return null;

  if (!esModeloAdmisibleMercadoArgentino(modeloRaw)) return null;

  let modelo = (modeloRaw || '').trim();

  // Quitar marca si vino repetida como prefijo
  if (modelo.toUpperCase().startsWith(`${marcaCanon} `)) {
    modelo = modelo.slice(marcaCanon.length + 1).trim();
  }

  // Traducir términos de maquinaria extranjera
  modelo = modelo
    .replace(/\s*\(HYDRAULIKBAGGER \/ HYDRAULIC EXCAVATORS?\)/gi, ' (EXCAVADORA)')
    .replace(/\s*\(TELESKOPSTAPLER \/ TELESCOPIC FORKLIFTS?\)/gi, ' (MANIPULADOR TELESCÓPICO)')
    .replace(/\s*\(KOMPAKTLADER \/ SKID STEER LOADER\)/gi, ' (MINICARGADORA)')
    .replace(/\s*\(KOMPAKTRAUPENLADER \/ COMP\.TRACK LOADER\)/gi, ' (MINICARGADORA)')
    .replace(/\s*\(ASPHALTFERTIGER \/ ASPHALT PAVERS?\)/gi, ' (PAVIMENTADORA)')
    .replace(/\s*\(DELTALADER \/ COMPACT TRACK LOADERS?\)/gi, ' (MINICARGADORA)')
    .replace(/\s*\(MÄHDRESCHER \/ HARVESTERS?\)/gi, ' (COSECHADORA)')
    .replace(/\s*\(TRAKTOREN \/ TRACTORS?\)/gi, ' (TRACTOR)')
    .replace(/\s*\(PLANIERRAUPEN \/ BULLDOZERS?\)/gi, ' (TOPADORA)')
    .replace(/\s*\(BODENVERDICHTER \/ SOIL COMPACTORS?\)/gi, ' (COMPACTADOR)')
    .replace(/\s*\(FORSTMASCHINEN \/ FORESTRY MACHINES?\)/gi, ' (FORESTAL)')
    .trim();

  const version = (versionRaw || 'Estándar').trim();
  if (!esVersionAdmisibleMercadoArgentino(marcaCanon, modelo, version)) return null;

  const año = añoRaw ? añoRaw.trim() : null;
  const tipo_vehiculo = (tipoVehiculoRaw === 'PESADO') ? 'PESADO' : 'LIVIANO';

  return {
    marca: marcaCanon,
    modelo,
    version,
    año,
    tipo_vehiculo
  };
}
