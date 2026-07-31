# 🏗️ Arquitectura Técnica y Control Directo de Supabase — FiltrAr Catálogo V2

## 1. Principios Arquitectónicos

1. **Motor Anti-Errores de Tipeo y Canonización de Marcas (`lib/normalization.ts`)**: Sistema de normalización que elimina erratas de tipeo en marcas de competidores (`vw` → `VOLKSWAGEN`, `mann-filter` → `Mann`, `wega sa` → `Wega`, `mh` → `Mareno`) y normaliza códigos cruzados eliminando símbolos, guiones y barras (`W 610/3` → `w6103`, `JFA-0205` → `jfa0205`) tanto en carga manual como en importación masiva de planillas.
2. **Módulo de Importación Masiva Excel / CSV (`/admin/importar`)**: Motor cliente/servidor que lee archivos `.xlsx`, `.xls` y `.csv` usando `xlsx` (SheetJS). Permite descargar plantillas pre-configuradas de 1-clic, previsualizar datos antes de guardar, e importar en lotes de 50 ítems poblando `productos_filtrar`, `equivalencias_cruza` y `vehiculos_filtrar`.
3. **Control Automatizado de Supabase**: Capacidad de leer, actualizar, poblar e impactar la base de datos de Supabase de forma remota a través de la API REST / PostgREST mediante scripts Python en el entorno del asistente.
4. **Alta Dinámica de Marcas y Filtros en Tiempo Real**: Tanto la pantalla de alta (`/admin/producto/nuevo`) como la de edición (`/admin/producto/[codigo]`) permiten seleccionar marcas registradas o pulsar `+ Escribir otra marca...`. El listado de marcas en el catálogo público (`CatalogoProductos.tsx`) se consulta de forma dinámica contra la BD (`SELECT DISTINCT marca_filtro`), haciendo que cualquier marca nueva aparezca de inmediato en los filtros de todo el sitio.
5. **Sanitización de Imágenes y Manejo de Modos**: La función `normalizarImagenes` descarta automáticamente marcadores inválidos (`"preview"`, `"null"`, `"undefined"`, `"[]"`) y si un producto se queda sin fotos, se renderiza la cabecera industrial en modo **Plano Técnico Blueprint** en lugar de romper o mostrar imágenes rotas.
6. **Consolidador de Modelos de Vehículos**: Script ETL inteligente que unificó 1.187 registros de vehículos (Gol I, Gol II, Gol IV → Gol; Golf III..VII → Golf; Focus I..III → Focus; Hilux VI → Hilux; Clio II..IV → Clio), trasladando automáticamente el detalle de generación al campo de versión para evitar redundancias en los desplegables.
7. **Carga Paginada de 25 en 25 (Bypass de Carga de DOM)**: Paginación optimizada de 25 en 25 productos con indicador visual de progreso en `ResultadoBuscador.tsx`, `CatalogoProductos.tsx` y `/admin/productos`.
8. **Panel de Administración Dark Mode (`/admin`) con Live Preview**: Sistema integral de administración con login por JWT sin secretos hardcodeados, protección por middleware de Next.js, subida con compresión automática a WebP (≤100KB) en Supabase Storage, y **Live Preview Card Sidebar**.

---

## 2. Motor de Canonización y Anti-Tipeo (`lib/normalization.ts`)

```mermaid
graph TD
    INPUT["Entrada de Datos (Excel, CSV o Formulario Admin)"] --> PARSER["Sanitizador & Parser"]
    
    subgraph "Reglas de Canonización"
        PARSER -->|Marcas Competidor| CANON_COMP["Pro Filter, Wega, Mann, Mareno, Fram, Tecfil, Mahle, Bosch..."]
        PARSER -->|Marcas Vehículo| CANON_VEH["VOLKSWAGEN, TOYOTA, FORD, CHEVROLET, FIAT, PEUGEOT..."]
        PARSER -->|Códigos Cruzados| CANON_COD["Normalización Alfanumérica Sin Guiones (ej: w6103)"]
    end
    
    CANON_COMP --> UPSERT_PROD["productos_filtrar (Upsert por codigo_filtrar)"]
    CANON_COMP --> INSERT_EQUIV["equivalencias_cruza (Insert estructurado)"]
    CANON_VEH --> INSERT_VEH["vehiculos_filtrar (Insert estructurado)"]
```

---

## 3. Diagrama de Entidad-Relación

```mermaid
erDiagram
    productos_filtrar ||--o{ relaciones_productos : "producto_codigo = codigo_filtrar"
    productos_filtrar ||--o{ vehiculos_filtrar : "filtro_asociado = codigo_filtrar"
    productos_filtrar ||--o{ equivalencias_cruza : "producto_codigo = codigo_filtrar"

    productos_filtrar {
        bigint id PK
        text codigo_filtrar UK
        text codigo_normalizado
        text titulo_producto
        text categoria
        text marca_filtro
        numeric precio
        text dimensiones
        text descripcion_aplicacion
        text imagen_url
        boolean activo
        text reemplazo_codigo
    }

    relaciones_productos {
        bigint id PK
        text producto_codigo FK
        text tipo_relacion
        text codigo_relacionado FK
    }

    vehiculos_filtrar {
        bigint id PK
        text filtro_asociado FK
        text marca
        text modelo
        text version
        text año
    }

    equivalencias_cruza {
        bigint id PK
        text producto_codigo FK
        text marca_competidor
        text codigo_competidor
        text codigo_competidor_normalizado
    }
```
