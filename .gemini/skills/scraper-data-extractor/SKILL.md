---
name: scraper-data-extractor
description: Skill para la extracción determinista de datos con Playwright en catálogos de repuestos (Wega, Mann, Fram). Maneja modales dinámicos (VER MÁS APLICACIONES) y navegación directa por slug.
---

# Skill: Scraper & Data Extractor (Playwright)

## 1. Reglas de Extracción Dinámica Aprendidas
1. **Manejo de Modales Ocultos**:
   - Catálogos como Wega (`wega.com.ar/catalogo`) muestran únicamente 4 aplicaciones por defecto y ocultan las demás tras el botón `VER MÁS APLICACIONES`.
   - **Regla Mandatoria**: Playwright debe hacer clic explícito en `text=/VER MÁS APLICACIONES/i` o `.btn-ver-mas` y esperar a que el contenedor `.modal.show` esté activo antes de extraer el DOM.

2. **Navegación Directa por Slug**:
   - Para acelerar la extracción en Wega, navegar directamente a `https://wega.com.ar/catalogo/filtros/detalle/${codigo.toLowerCase()}` evita redirecciones lentas del buscador principal.

## 2. Contrato de Salida Estricto
Devolver exclusivamente un objeto JSON estructurado con `{ producto, vehiculos, equivalencias }`.

## 3. CERO Escritura Directa en BD
El scraper nunca ejecuta consultas SQL ni escribe en Supabase. Pasa todo el payload a `validation-integrity-checker`.
