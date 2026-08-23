---
name: scraper-data-extractor
description: Skill para la extracción determinista de datos con Playwright en catálogos de repuestos (Wega, Mann, Fram). Maneja modales dinámicos (VER MÁS APLICACIONES), slugs canónicos, patrones de texto lineal y adaptabilidad multicatálogo.
---

# Skill: Scraper & Data Extractor (Playwright)

## 1. Reglas de Extracción Dinámica Aprendidas

1. **Manejo de Modales Ocultos**:
   - Catálogos como Wega (`wega.com.ar/catalogo`) muestran únicamente 4 aplicaciones por defecto y ocultan las demás tras el botón `VER MÁS APLICACIONES`.
   - **Regla Mandatoria**: Playwright debe hacer clic explícito en `button:has-text("VER MÁS APLICACIONES"), .btn.style3, .btn-ver-mas` y esperar a que el contenedor `.modal-body, .modal.show` esté activo antes de extraer el DOM.

2. **Navegación Directa por Slug Canónico (`wegaSlug`)**:
   - Para navegar directamente a los detalles de Wega (`https://wega.com.ar/catalogo/filtros/detalle/${slug}`), el slug debe formatearse en minúsculas reemplazando barras (`/`) y puntos (`.`) por guiones (`-`), **conservando los guiones del código**:
     ```typescript
     function wegaSlug(code: string): string {
       return code.toLowerCase().trim().replace(/[/\\.]/g, '-').replace(/--+/g, '-');
     }
     ```
   - *Importante*: Quitar guiones (ej: `wo180` en vez de `wo-180`) provoca error HTTP 500 en el servidor de Wega.

3. **Desconcatenación Atómica de Celdas Multimarca**:
   - Al procesar listas con celdas que contienen múltiples marcas embebidas (ej: `PH4847A MANN: WP 1144 OEM: 71713782`) o múltiples códigos divididos por guiones/saltos de línea, deben desglosarse en registros individuales para la tabla `equivalencias_cruza`.

---

## 2. Contrato de Salida Estricto
Devolver exclusivamente un objeto JSON estructurado con `{ producto, vehiculos, equivalencias }`.

---

## 3. Modo Dry-Run Obligatorio
Todo proceso de extracción o scraping debe generar un archivo JSON de vista previa en `backups/wega_preview_<timestamp>.json` ANTES de cualquier intento de ingesta. El agente debe revisar y validar métricas de calidad (nuevos vs actualizados vs descartados).

---

## 4. Reglas de Enriquecimiento y Asignación Segura

1. **Política Estricta No-Merge para Filtros WEGA**:
   - Todo filtro de catálogo que posea equivalencia con WEGA debe tener **única y exclusivamente las aplicaciones oficiales extraídas de WEGA** (sitio web oficial + catálogo oficial Wega).
   - Queda terminantemente prohibido hacer *merge* con registros heredados antiguos de la base de datos para filtros WEGA, a fin de evitar arrastrar descripciones de medidas o vehículos erróneos.
2. **Filtros Sin Asociación WEGA**:
   - Para filtros que no tengan ninguna asociación con Wega, se preservan sus aplicaciones vehiculares legítimas una vez validadas y saneadas por `validation-integrity-checker`.
3. **CERO Escritura Directa en BD**:
   - El scraper nunca ejecuta consultas SQL ni escribe en Supabase directamente. Pasa todo el payload normalizado a `validation-integrity-checker`.

---

## 5. Patrones de Estructura y Adaptabilidad Multicatálogo

Al scrapear diferentes portales de repuestos, los datos pueden presentarse en dos formatos principales:

### Formato A: Texto Lineal en Una Sola Cadena (Ej: WEGA)
- **Estructura**: `[MARCA] [MODELO] [VERSIÓN / MOTOR] [AÑO]`
  - Ejemplos:
    - `"CHRYSLER PT Cruiser 2,4 16v 152cv 2004 →"`
    - `"FORD Fiesta V - Max / One - 1,6 8V 100cv ZETEC 2005 →"`
    - `"AUDI A3 II - 1,8 TFSI 160cv 2006 → 2012"`
    - `"MERCEDES-BENZ Sprinter 313 CDI - 2,2 16v 129cv 2002 → 2012"`

- **Algoritmo de Parseo de 3 Fases (Cola $\rightarrow$ Cabeza $\rightarrow$ Centro)**:
  ```typescript
  function parseLinearVehicleString(rawLine: string) {
    let clean = rawLine.trim().replace(/\s+/g, ' ');

    // 1. Extraer Año al final (Cola)
    let anioRaw = '';
    const yearMatch = clean.match(/(?:(?:\d{2,4}\s*(?:→|->|-|\/)\s*\d{0,4})|(?:\d{4})|(?:→\s*\d{4}))\s*$/);
    if (yearMatch) {
      anioRaw = yearMatch[0].trim();
      clean = clean.slice(0, clean.length - yearMatch[0].length).trim();
    }

    // 2. Extraer Marca al inicio (Cabeza) contra lista de marcas conocidas
    let marca = '';
    for (const b of KNOWN_BRANDS) {
      if (clean.toUpperCase().startsWith(b + ' ') || clean.toUpperCase() === b) {
        marca = b;
        clean = clean.slice(b.length).trim();
        break;
      }
    }
    if (!marca) {
      const firstWord = clean.split(' ')[0];
      marca = firstWord;
      clean = clean.slice(firstWord.length).trim();
    }

    // 3. Separar Modelo y Versión (Centro)
    let modelo = '';
    let version = '';
    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      modelo = parts[0].trim();
      version = parts.slice(1).join(' - ').trim();
    } else {
      const motorMatch = clean.match(/^(.+?)\s+(\d+[,.]\d+.*|[IVX]+\s+.*|V[68].*|CDI.*|TDI.*|HD.*|Turbo.*|D.*|Diesel.*)$/i);
      if (motorMatch) {
        modelo = motorMatch[1].trim();
        version = motorMatch[2].trim();
      } else {
        modelo = clean;
        version = 'Estándar';
      }
    }

    return { marca, modelo, version, año: anioRaw };
  }
  ```

---

### Formato B: Tablas HTML / Estructuradas en Columnas (Ej: MANN-FILTER, FRAM, MAHLE)
- **Estructura en DOM**:
  ```html
  <tr>
    <td class="marca">VOLKSWAGEN</td>
    <td class="modelo">Golf VII</td>
    <td class="motor">1.4 TSI 16V (150 cv)</td>
    <td class="anio">08/14 -></td>
  </tr>
  ```
- **Algoritmo de Extracción**:
  - Extraer los campos directamente por selector de columna `td` sin necesidad de regex de separación de texto lineal:
    ```typescript
    const rows = await page.$$eval('table.applications-table tr', (trs) => {
      return trs.map(tr => {
        const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        if (tds.length >= 4) {
          return {
            marca: tds[0],
            modelo: tds[1],
            version: tds[2],
            año: tds[3]
          };
        }
        return null;
      }).filter(Boolean);
    });
    ```
  - Pasar el resultado directamente a `validation-integrity-checker` para normalización canónica de modelos y años.
