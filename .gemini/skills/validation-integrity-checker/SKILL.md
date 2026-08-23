---
name: validation-integrity-checker
description: Skill de saneamiento, control de integridad, unificación canónica de modelos y corrección de marcas para FiltrAr Catálogo.
---

# Skill: Validation & Integrity Checker

## 1. Misión
Garantizar que todo dato ingresado al sistema esté libre de errores de tipeo, marcas duplicadas, modelos fragmentados o formatos incoherentes.

---

## 2. Reglas de Sanitización Obligatorias

### 1. Marcas Competidoras y Diccionario de Typos
Todo nombre de marca competidora u OEM debe normalizarse contra el estándar del catálogo:
- `"MARTERFILT"`, `"MASTERFILD"`, `"MASATERFILT"`, `"MASTERFIL"` → **`MASTERFILT`**
- `"MARFENO"`, `"MARANO"` → **`MARENO`**
- `"EQUIV"`, `"ORIGINAL"`, `"ORIGINALES"` → **`OEM`**
- `"KNECHT"` → **`MAHLE`**
- `"MAN"`, `"mann-filter"`, `"MANN+HUMMEL"` → **`MANN`**
- `"wega sa"`, `"WEGA-FILTERS"` → **`WEGA`**
- `"sogefi fram"` → **`FRAM`**

### 2. Marcas Vehiculares Canónicas (Regla de Oro)
- `"vw"`, `"volks"`, `"v.w."` → **`VOLKSWAGEN`**
- `"chevy"`, `"gm"` → **`CHEVROLET`**
- `"MERCEDES BENZ"`, `"MERCEDES"`, `"MERCEDES- BENZ"` → **`MERCEDES-BENZ`**
- `"CITROËN"` → **`CITROEN`**
- `"DEUTZ AGRALE"` → **`DEUTZ-AGRALE`**
- `"cat"` → **`CATERPILLAR`**
- **PROHIBICIÓN ESTRICTA**: `vehiculos_filtrar.marca` sólo admite nombres canónicos de fabricantes de vehículos. **Queda estrictamente prohibido guardar códigos de repuestos, cilindradas sueltas, combustibles o texto web**, ya que contaminan directamente las vistas dinámicas `marcas_vehiculos_tipo`.

### 3. Unificación Canónica de Modelos y Reconexión de Versiones Huérfanas
- Todo modelo de vehículo debe unificarse a su modelo base canónico:
  - **Volkswagen**: `GOL TREND / POWER / G3 / COUNTRY` → **`GOL`**; `GOLF IV / GTI` → **`GOLF`**; `VENTO 2.0 TSI / TFSI` → **`VENTO`**
  - **Ford**: `FIESTA KINETIC / MAX / ONE` → **`FIESTA`**; `F 100` → **`F-100`**; `F 150` → **`F-150`**; `F 250` → **`F-250`**; `F 4000` → **`F-4000`**; `ECOSPORT KINETIC` → **`ECOSPORT`**
  - **Toyota**: `HI-LUX / HILUX 4X4` → **`HILUX`**; `4 RUNNER L/L4` → **`4RUNNER`**; `RAV-4` → **`RAV4`**; `COROLLA CROSS` → **`COROLLA CROSS`**
  - **Chevrolet**: `S 10 / S-10 4X4` → **`S-10`**; `ASTRA 1.8 / 2.0` → **`ASTRA`**; `AVEO LS / LT` → **`AVEO`**
  - **Renault**: `CLIO II / RT / RL` → **`CLIO`**; `MEGANE II` → **`MEGANE`**
  - **Peugeot**: `206 HDI / GTI / SW` → **`206`**; `307 CC CABRIOLET` → **`307`**
  - **Mercedes-Benz**: `SPRINTER 313 CDI / 415 / 515` → **`SPRINTER`**
  - **Iveco**: `DAILY 35.10 / 59.12` → **`DAILY`**
- **Reconexión de Versiones Huérfanas**:
  - Toda versión extraída del modelo (`Weekend`, `Kinetic`, `Trend`, `Power`, `GTI`, `HDI`, `TDI`, `CDI`, `Gen II`, `Gen IV`) se anexa de forma limpia al campo `version` del vehículo sin pérdida de datos.

### 4. Detección y Purga de Textos de Especificación / Basura
- Se deben descartar automáticamente los registros donde el modelo contenga descripciones de productos (`"BAR"`, `"MEDIDAS"`, `"165*"`, `"MULTIMARCA"`, `"SD"`).

### 5. Validación Estricta de Año
- Sólo se admiten años de 4 dígitos (entre 1950 y 2030), rangos válidos (ej: `"2010-2020"`, `"2015-2019"`) o rangos abiertos (ej: `"2015 →"`, `"2018 ->"`). Los años en formato `"97 →"` se normalizan automáticamente a `"1997 →"`.
- **PROHIBICIÓN ESTRICTA**: Rechazar o sanitizar como nulo potencias (`160cv`, `140hp`), cilindradas (`1.4`, `1.6`), años absurdos (`12`, `70`, `1223`) o texto libre.

### 6. Clasificación Mandatoria de Tipo de Vehículo (`tipo_vehiculo`)
- Todo vehículo debe clasificarse como `'LIVIANO'` o `'PESADO'` usando `classifyVehicleType(marca, modelo)`.
- Marcas y modelos pesados: SCANIA, VOLVO, IVECO, MERCEDES camiones/colectivos, JOHN DEERE, CATERPILLAR, CASE, NEW HOLLAND, AGRALE, DEUTZ-AGRALE, etc.

---

## 3. Manejo de Errores y Reintentos
Si la validación detecta un campo ausente o corrupto, la Skill genera un reporte explícito permitiendo corregir el payload antes de tocar la base de datos.
