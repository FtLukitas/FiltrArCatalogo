# 🚗 FiltrAr Catálogo V2 - Sistema de Catálogo y Búsqueda de Filtros Automotores

Un sistema de catálogo web de alta performance, diseño industrial moderno y motor de búsqueda inteligente para la exploración de filtros de automotor, sustituciones, equivalencias cruzadas y kits de mantenimiento.

---

## 📐 Tecnologías Utilizadas

- **Core Framework**: Next.js 15.1 (App Router) + React 19 + TypeScript
- **Base de Datos & Backend**: Supabase (PostgreSQL con API REST autenticada)
- **Control Directo de Supabase**: Motor ETL en Python 3.11 para sincronización en caliente vía REST API
- **Branding & UI**: Logo oficial vectorial (`/public/logo.png`) en tamaño prominente sobre fondos de alto contraste
- **Buscador Dinámico por Vehículo**: Autocompletado inteligente en tiempo real (`BuscadorVehiculo.tsx`) + Filtro por Kit de Service
- **Estilos & Layout**: Vanilla CSS + Tailwind CSS (Modo Blueprint, bordes industriales `rounded-xl`, grilla fluida)
- **Iconografía**: Lucide React Icons

---

## 🗄️ Esquema de Base de Datos Canónica (Supabase V2)

### 1. `productos_filtrar`
Contiene los **1,290 productos** del catálogo oficial (incluyendo la línea completa Picborg `N-250` a `N-273` con descripciones enriquecidas):
- `id` (BIGINT, Identity)
- `codigo_filtrar` (TEXT, UNIQUE): Código oficial (ej: `KIT-01`, `AF-010T`, `N-256`, `142`).
- `codigo_normalizado` (TEXT): Código alfanumérico sin guiones ni espacios para búsqueda ultrarrápida.
- `titulo_producto` (TEXT): Título del producto o repuesto (ej: `"Kit de Filtros HILUX 2005-2015"`, `"Filtro Inyección Picborg N-256"`).
- `categoria` (TEXT): Categoría unificada (`Filtros de Aire`, `Filtros de Aceite`, `Filtros de Combustible`, `Filtros de Habitáculo`, `Kits de Filtros`).
- `marca_filtro` (TEXT): Marca oficial (`Pro Filter`, `Maxfil`, `MDH`, `Picborg`, `Common Rail`, `Genérico`).
- `precio` (NUMERIC): Precio de lista en pesos ARS (cobertura del 98.9% del catálogo).
- `dimensiones` (TEXT): Medidas nominales (Largo, Ancho, Alto, picos con traba).
- `descripcion_aplicacion` (TEXT): Aplicación detallada de vehículos.
- `imagen_url` (TEXT): Ruta local a la imagen (`/imagenes_productos/...`) o `NULL` para modo Plano Técnico Blueprint.
- `activo` (BOOLEAN): Estado del producto (`true` / `false`).
- `reemplazo_codigo` (TEXT): Código de reemplazo sugerido.

### 2. `relaciones_productos`
Contiene **249 relaciones internas legítimas** entre productos y sus componentes (ej: `KIT-01` ➔ `AF-010T`, `OF-711T`, `FF-010T`, `CF-390T`).

### 3. `vehiculos_filtrar`
Contiene **4,327 asociaciones de vehículos** a filtros específicos (abarcando 2,098 modelos de vehículos).

### 4. `equivalencias_cruza`
Contiene **6,547 equivalencias cruzadas** con competidores (MANN, FRAM, WEGA, OEM, MARENO, MASTERFILT, TECNECO, MAHLE, SAKURA, etc.).

---

## ⚡ Control Directo de Supabase desde la Consola del Agente

Para actualizar o sincronizar la base de datos de Supabase sin necesidad de copiar scripts SQL manualmente:

```bash
# Sincronización completa directa a Supabase (Productos, Precios, Relaciones, Vehículos y Equivalencias)
python scratch/push_all_to_supabase.py

# Enriquecimiento y actualización específica de la línea Picborg
python scratch/enrich_picborg_data.py

# Normalización de categorías y corrección de typos en marcas
python scratch/phase4_normalize_categories.py
python scratch/phase5_fix_brand_typos.py
```

---

## 🎨 Características Destacadas de UX/UI

- **Logo e Identidad de Marca**: Integración directa de `/public/logo.png` en tamaño prominente (`h-20`) sin cajas contenedoras en el Navbar y con píldora blanca de alto contraste en el Footer.
- **Buscador Dinámico por Vehículo**: Búsqueda por modelo con autocompletado en tiempo real y desplegable de coincidencia directa.
- **Smart Search Unificado**: Buscador principal que analiza Códigos, Títulos, Vehículos y Competencia.
- **Grilla de Componentes de Kits Adosada**: Despliegue continuo dentro del mismo contenedor del producto para Kits.
- **Carga en Bloques (Paginated Chunks)**: Supera el límite de 1.000 filas por defecto de Supabase descargando iterativamente todo el catálogo.
