---
name: validation-integrity-checker
description: Skill de saneamiento y control de integridad basada en Zod y reglas de normalización automotriz para FiltrAr Catálogo.
---

# Skill: Validation & Integrity Checker

## 1. Misión
Garantizar que todo dato ingresado al sistema esté libre de errores de tipeo, marcas duplicadas o formatos incoherentes.

---

## 2. Reglas de Sanitización Obligatorias

1. **Marcas Competidoras**:
   - `"mann-filter"`, `"MANN+HUMMEL"`, `"MAN"` → **`Mann`**
   - `"wega sa"`, `"WEGA-FILTERS"` → **`Wega`**
   - `"sogefi fram"` → **`Fram`**

2. **Marcas Vehiculares (Regla de Oro de `marcas_unicas`)**:
   - `"vw"`, `"volks"`, `"v.w."` → **`VOLKSWAGEN`**
   - `"chevy"`, `"gm"` → **`CHEVROLET`**
   - `"cat"` → **`CATERPILLAR`**
   - **PROHIBICIÓN ESTRICTA**: `vehiculos_filtrar.marca` sólo admite nombres canónicos de fabricantes de vehículos. **Queda estrictamente prohibido guardar códigos de filtros** (`WO-346`, `AKX-1116`, `FCD-2058`), **cilindradas sueltas** (`1.4`, `1.9`, `2.0`), **combustibles** (`NAFTA`) o **texto web** (`PROVEEMOS`, `©`, `ACEITE`), ya que contaminan directamente las vistas dinámicas `marcas_unicas` y `modelos_unicos`.

3. **Códigos de Cruce Normalizados**:
   - Los espacios, guiones y barras son removidos para la búsqueda alfanumérica limpia (`"W 610/3"` → `"w6103"`).

4. **Saneamiento de Modelos y Versiones**:
   - Eliminar comas, guiones o paréntesis desbalanceados (`- 2` → `2.0L`).
   - Remover redundancias de marca en el modelo (`RENAULT Clio` → `CLIO`).
   - Extraer sufijos de generación romana a la versión (`Clio II` → Modelo `CLIO`, Versión `Gen II`).

---

## 3. Manejo de Errores y Reintentos
Si la validación detecta un campo ausente, un código de repuesto en el campo marca o una marca inválida, la Skill genera un reporte explícito permitiendo corregir el payload antes de tocar la base de datos.
