# Documentación Técnica: Re-Catalogación de Vehículos y Optimización del Buscador

Esta documentación detalla las modificaciones arquitectónicas, de base de datos y de interfaz de usuario implementadas para resolver la clasificación entre vehículos livianos y pesados, la precisión del buscador y la experiencia de usuario.

---

## 1. Re-Catalogación de Vehículos: Livianos vs. Pesados

### Diagnóstico Inicial
- **Catálogo total**: 13.849 filas en `vehiculos_filtrar` (69 marcas activas en Argentina).
- **Problema detectado**: Un gran número de marcas 100% pesadas/agrícolas (como *DIMEX, PAUNY, RENAULT TRUCKS, EL DETALLE, VASALLI, DON ROQUE*) estaban erróneamente etiquetadas como `LIVIANO`. Adicionalmente, marcas con producción mixta (*Mercedes-Benz, Ford, Chevrolet, Renault, Toyota, Volvo*) no discriminaban adecuadamente los camiones pesados de los autos o utilitarios livianos.

### Solución Implementada
1. **Script de Reclasificación Automatizada**: [scripts/reclassify_vehicle_types.py](file:///e:/FiltrArCatalogo/scripts/reclassify_vehicle_types.py)
   - Implementación con soporte `--dry-run` y ejecución por lotes atómicos (batches de 100 registros con `PATCH` a la API REST de Supabase).
   - Creación previa de un backup completo de seguridad en [backups/backup_vehiculos_before_classification_1788481595.json](file:///e:/FiltrArCatalogo/backups/backup_vehiculos_before_classification_1788481595.json).

2. **Criterios de Clasificación**:
   - **Pesadas puras (27 marcas)**: `AGCO, AGRALE, BOBCAT, CASE, CATERPILLAR, CLAAS, DEUTZ-AGRALE, DIMEX, DON ROQUE, EL DETALLE, HELI, INTERNATIONAL, IVECO, JCB, JOHN DEERE, KOMATSU, KUBOTA, LIEBHERR, MASSEY FERGUSON, NEW HOLLAND, PAUNY, PUMA, RENAULT TRUCKS, SCANIA, VALTRA, VASALLI, ZANELLO`.
   - **Livianas puras (28 marcas)**: `ALFA ROMEO, ASIA, AUDI, BMW, CHERY, CHRYSLER, CITROEN, DAEWOO, DAIHATSU, DS, GEELY, HONDA, JAC, JAGUAR, JEEP, KIA, LAND ROVER, LIFAN, MAZDA, MINI, PEUGEOT, PORSCHE, RAM, SEAT, SMART, SSANG YONG, SUBARU, SUZUKI`.
   - **Marcas Mixtas (14 marcas)**: Segregación mediante regex por modelo:
     - **Mercedes-Benz**: Modelos pesados (1114, 1620, Actros, Axor, Atego, chasis de ómnibus OF/OH) pasan a `PESADO`. Sprinter, Vito y Clase A/B/C/E/GLA permanecen en `LIVIANO`.
     - **Ford**: Línea Cargo (1723, 1933, 2042), F-14000, F-4000 a `PESADO`. Ranger, EcoSport, Focus, Ka permanecen en `LIVIANO`.
     - **Chevrolet**: Camiones Kodiak, 14000, NPR a `PESADO`. Corsa, Onix, Tracker, S-10 permanecen en `LIVIANO`.
     - **Volvo**: Autos (S40, V40, XC60, XC90, 850) corregidos a `LIVIANO`. Camiones FH, FM, FMX, VM a `PESADO`.
     - **Toyota**: Camiones Dyna, minibús Coaster y autoelevadores a `PESADO`. Hilux, Corolla, Yaris permanecen en `LIVIANO`.

3. **Resultados de la Migración**:
   - **1.782 registros actualizados** en la base de datos de Supabase.
   - Livianos: **8.493 (61,3%)**.
   - Pesados: **5.356 (38,7%)**.
   - Sin clasificar (NULL): **0**.

4. **Reglas en Código**:
   - Se sincronizó la función `classifyVehicleType(marca, modelo)` en [lib/validation.ts](file:///e:/FiltrArCatalogo/lib/validation.ts) para futuras inserciones o sincronizaciones.

---

## 2. Precisión en el Buscador Unificado (`BuscadorUnificado.tsx`)

### A. Corrección de Conjunción de Términos (AND vs OR)
- **Problema previo**: Al escribir `fiat 147`, el buscador unía las condiciones con un operador `OR` general. Esto traía cualquier vehículo que tuviera "fiat" en la marca/modelo O que tuviera "147" en la versión/modelo, saturando el resultado con Cronos, Toro, Palio y Alfa 147.
- **Solución técnica**:
  ```typescript
  // En vehiculosPromise dentro de BuscadorUnificado.tsx:
  if (tokens.length > 1) {
    tokens.forEach((t) => {
      q = q.or(
        `marca.ilike.%${t}%,modelo.ilike.%${t}%,version.ilike.%${t}%,año.ilike.%${t}%`
      );
    });
  }
  ```
  Al encadenar múltiples llamadas a `.or()` por cada token separado por espacio o guión, PostgREST interpreta cada condición como obligatoria (`AND` entre tokens), garantizando que **todos** los términos ingresados deben coincidir.
- **Comprobación**:
  - Consulta `fiat 147` $\rightarrow$ Devuelve **únicamente Fiat 147**.
  - Consulta `peugeot 206` $\rightarrow$ Devuelve **únicamente Peugeot 206**.

### B. Auto-Detección de Códigos vs Modelos de Vehículos
- **Problema previo**: La regex `looksLikeCode` usaba `/^(wo|ph|w|c|...)/i`. Dado que las letras `c` y `w` estaban sueltas, términos comunes de vehículos como *Corsa, Corolla, Clio, Cronos, Cruze, Civic, C3, Wrangler* eran catalogados como códigos de filtro técnicos y forzaban el cambio a la pestaña de equivalencias o productos vacía.
- **Solución técnica**:
  ```typescript
  const looksLikeCode = /^(wo[- ]?\d{2,}|ph[- ]?\d{3,}|w[- ]?\d{3,}|c[- ]\d{2,}|c\d{4,}|cuk[- ]?\d|cu[- ]?\d{3,}|cf[- ]?\d{2,}|wk[- ]?\d{2,}|akx[- ]?\d|fcd[- ]?\d|sc[- ]?\d|ea[- ]?\d|af[- ]?\d|of[- ]?\d|ff[- ]?\d|mif[- ]?\d|efpa[- ]?\d|ul[- ]?\d|ox[- ]?\d|lx[- ]?\d|hu[- ]?\d|\d{3,}[a-z]|\d+[-/]\d+)/i.test(cleanInput);
  ```
  Exige dígitos numéricos o prefijos industriales precisos (`W 712`, `WO-180`, `PH10904`, `C 29 198`), permitiendo que cualquier modelo o marca abra directamente la pestaña de **Vehículos**.

### C. Fichas de Arriba (Pestañas de Contexto)
- **Problema previo**: Si una pestaña tenía 0 resultados o no estaba seleccionada, las clases `cursor-not-allowed` y `opacity-50` daban la sensación de interfaz rota o inoperable.
- **Solución técnica**:
  - Las 3 pestañas (*En Vehículos*, *En Equivalencias*, *En Productos*) son siempre clickeables y accesibles.
  - Indicadores numéricos claros con resaltado activo azul y badges contrastados.

---

## 3. Rediseño de la Pestaña de Equivalencias

- **Miniatura verificada de producto**: Renderizado del thumbnail real del repuesto FiltrAr a la izquierda de la tarjeta.
- **Badges por fabricante**:
  - **MANN**: Verde esmeralda (`bg-emerald-500/20 text-emerald-300 border-emerald-500/40`).
  - **FRAM**: Naranja (`bg-orange-500/20 text-orange-300 border-orange-500/40`).
  - **WEGA**: Celeste (`bg-sky-500/20 text-sky-300 border-sky-500/40`).
  - **OEM**: Púrpura (`bg-purple-500/20 text-purple-300 border-purple-500/40`).
- **Pills de categoría**: Identificación cromática para *Aceite, Aire, Combustible, Habitáculo*.
- **Información técnica**: Muestra aplicaciones compatibles, precio actualizado formateado (respetando la configuración de precios) y botón con micro-interacción.

---

## 4. Optimización de UI y Navegación en el Hero (`app/page.tsx`)

1. **Eliminación de Elementos Redundantes**:
   - Se removió el selector superior doble que competía con el buscador.
   - Se eliminaron las 3 tarjetas de servicio inferiores (*Venta Mayorista*, *Cruces Directos*, *Atención Directa*) para reducir la altura de la página y aproximar el buscador guiado.
2. **Acceso Rápido al Asistente Guiado**:
   - Se ubicó un único botón tipo píldora centrado justo debajo del buscador:
     - Ícono de auto SVG (`Car`).
     - Mensaje: *"¿No conocés el código? Elegí tu auto en el Asistente Guiado"*.
     - Flecha animada (`ArrowDown`).
     - Enlace al ancla `#buscador-guiado`.
3. **Anclaje en [BuscadorGuiado.tsx](file:///e:/FiltrArCatalogo/app/componentes/BuscadorGuiado.tsx)**:
   - Se agregó `id="buscador-guiado"` y la clase `scroll-mt-24` para que el scroll automático deje el wizard perfectamente encuadrado debajo de la barra de navegación superior.
4. **Banners Contextuales en Resultados**:
   - Dentro del panel de resultados de vehículos en `BuscadorUnificado`, se integró un banner informativo para derivar al usuario al asistente guiado si prefiere filtrar por año o versión.

---

## 5. Validación y Pruebas Realizadas

| Prueba | Comando / Herramienta | Resultado |
| :--- | :--- | :--- |
| **Chequeo de Tipos TypeScript** | `npx tsc --noEmit` | **0 errores** (código 0) |
| **Prueba de Consultas a Supabase** | `node scratch_verify.js` | `fiat 147` devuelve solo 147; `corsa`, `corolla` y `c3` abren vehículos |
| **Disponibilidad Servidor Web** | `curl.exe -I http://localhost:3000` | **HTTP/1.1 200 OK** |
