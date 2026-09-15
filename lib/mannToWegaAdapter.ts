import { normalizarMarcaVehiculo, sanitizarVehiculo } from './normalization';
import { classifyVehicleType } from './validation';

export interface RawMannApplication {
  brand: string;
  model: string;
  modelType?: string;
  engineCode?: string;
  ccm?: string | number;
  kw?: string | number;
  hp?: string | number;
  year?: string;
}

export interface WegaStandardApplication {
  marca: string;
  modelo: string;
  version: string;
  año: string | null;
  tipo_vehiculo: 'LIVIANO' | 'PESADO';
}

/**
 * Convierte un año de formato MANN ("09/17 →", "11/95 → 08/02", "01/00 → 06/05", "2015 →")
 * al formato estándar de WEGA ("2017 →", "1995 → 2002", "2000 → 2005").
 */
export function formatMannYear(rawYear?: string): string | null {
  if (!rawYear || typeof rawYear !== 'string') return null;
  const clean = rawYear.trim();
  if (!clean || clean === '-') return null;

  // Pattern "MM/YY → MM/YY" or "MM/YYYY → MM/YYYY"
  const rangeMatch = clean.match(/(\d{1,2})\/(\d{2,4})\s*(?:→|->|-)\s*(?:(\d{1,2})\/(\d{2,4}))?/);
  if (rangeMatch) {
    let fromYear = parseInt(rangeMatch[2], 10);
    if (fromYear < 100) fromYear += fromYear >= 50 ? 1900 : 2000;

    if (rangeMatch[4]) {
      let toYear = parseInt(rangeMatch[4], 10);
      if (toYear < 100) toYear += toYear >= 50 ? 1900 : 2000;
      return `${fromYear} → ${toYear}`;
    }
    return `${fromYear} →`;
  }

  // Direct 4-digit year "2015 →"
  const directMatch = clean.match(/(\d{4})\s*(?:→|->|-)?\s*(\d{4})?/);
  if (directMatch) {
    if (directMatch[2]) return `${directMatch[1]} → ${directMatch[2]}`;
    return `${directMatch[1]} →`;
  }

  return clean;
}

/**
 * Convierte las especificaciones técnicas de motor de MANN al formato de versión de WEGA.
 * Ejemplo: modelType="1.5T", ccm="1498", hp="156", engineCode="SQRE4T15C" -> "1,5 T 156cv (SQRE4T15C)"
 */
export function formatMannVersion(app: RawMannApplication): string {
  const parts: string[] = [];

  // 1. Cilindrada / Tipo base
  if (app.modelType && app.modelType !== '-' && !app.modelType.toLowerCase().includes('oil filter')) {
    // Limpiar saltos de línea y espacios múltiples
    let cleanMt = app.modelType.replace(/\s+/g, ' ').trim();
    // Reemplazar punto decimal por coma: 1.5 -> 1,5
    cleanMt = cleanMt.replace(/\b(\d+)\.(\d+)\b/g, '$1,$2');
    parts.push(cleanMt);
  } else if (app.ccm && app.ccm !== '-') {
    const ccmNum = typeof app.ccm === 'number' ? app.ccm : parseInt(String(app.ccm), 10);
    if (!isNaN(ccmNum) && ccmNum > 500) {
      const litros = (ccmNum / 1000).toFixed(1).replace('.', ',');
      parts.push(litros);
    }
  }

  // 2. Potencia en cv / HP
  if (app.hp && app.hp !== '-') {
    const hpNum = parseInt(String(app.hp), 10);
    if (!isNaN(hpNum) && hpNum > 10) {
      // Si la cilindrada ya no incluye cv
      if (!parts.some(p => p.toLowerCase().includes('cv') || p.toLowerCase().includes('hp'))) {
        parts.push(`${hpNum}cv`);
      }
    }
  }

  // 3. Código de motor entre paréntesis
  if (app.engineCode && app.engineCode !== '-' && app.engineCode.length >= 2) {
    const cleanCode = app.engineCode.replace(/\s+/g, ' ').trim();
    parts.push(`(${cleanCode})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'Estándar';
}

/**
 * Transforma una aplicación cruda de MANN-FILTER a la estructura y nomenclatura canónica de WEGA.
 */
export function adaptMannToWega(raw: RawMannApplication): WegaStandardApplication {
  // Limpiar nombre de marca (remover subtítulos como "DEUTZ-FAHR (SAME DEUTZ-FAHR)" -> "DEUTZ")
  let cleanBrand = raw.brand.replace(/\s+/g, ' ').trim();
  cleanBrand = cleanBrand.replace(/\s*\([^)]*\)/g, '').trim();
  if (cleanBrand.toUpperCase().startsWith('VW')) cleanBrand = 'VOLKSWAGEN';

  const normMarca = normalizarMarcaVehiculo(cleanBrand);

  // Limpiar nombre de modelo (remover paréntesis de descripciones si los tiene y espacios)
  let cleanModel = raw.model.replace(/\s+/g, ' ').trim();
  cleanModel = cleanModel.replace(/\s*\([^)]*(?:Crawler|Backhoe|Teleskoplader|Wheel|Kettenbagger)[^)]*\)/gi, '').trim();

  // Armar versión en formato WEGA
  const version = formatMannVersion(raw);

  // Formatear año
  const año = formatMannYear(raw.year);

  // Sanitizar con las utilidades centrales del proyecto
  const sanitized = sanitizarVehiculo(normMarca, cleanModel, version);

  // Clasificar LIVIANO vs PESADO
  const tipo_vehiculo = classifyVehicleType(sanitized.marca, sanitized.modelo);

  return {
    marca: sanitized.marca,
    modelo: sanitized.modelo,
    version: sanitized.version,
    año,
    tipo_vehiculo
  };
}
