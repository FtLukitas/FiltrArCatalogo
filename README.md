# 🚗 FiltrAr Catálogo V2 - Sistema de Catálogo y Búsqueda de Filtros Automotores

Un sistema de catálogo web de alta performance, diseño industrial moderno y motor de búsqueda inteligente para la exploración de filtros de automotor, sustituciones, equivalencias cruzadas y kits de mantenimiento.

---

## 📐 Tecnologías Utilizadas

- **Core Framework**: Next.js 15.1 (App Router) + React 19 + TypeScript
- **Base de Datos & Backend**: Supabase (PostgreSQL con API REST autenticada y RLS)
- **Control Directo de Supabase**: Motor ETL en Python 3.11 para sincronización y auditoría remota vía REST API
- **Branding & UI**: SaaS Executive Dark Mode (`slate-950`, `slate-900`, `slate-800`), bordes nítidos (`rounded-xl`, `rounded-lg`) y colores semánticos
- **Buscador Dinámico por Vehículo**: Autocompletado inteligente en tiempo real (`BuscadorVehiculo.tsx`) + Filtro por Kit de Service
- **Panel de Administración Completo (`/admin`)**:
  - Matriz de Equivalencias con diagnóstico de cobertura (`/admin/equivalencias`)
  - Explorador Jerárquico de Vehículos en 3 niveles (*Marca → Modelo → Versiones*) (`/admin/vehiculos`)
  - Catálogo de Productos con Segmented Nav de 1 línea y badges de color (`/admin/productos`)
  - Ficha de Producto con Live Preview y Smart Autocomplete Linkers (`/admin/producto/[codigo]`)
  - Módulo de Importación Masiva con plantillas 1-clic (`/admin/importar`)
- **Iconografía**: Lucide React Icons

---

## 🗄️ Esquema de Base de Datos Canónica (Supabase V2)

### 1. `productos_filtrar` (1.292 registros únicos)
- `id` (BIGINT, Identity PK)
- `codigo_filtrar` (TEXT, UNIQUE): Código oficial (ej: `KIT-01`, `AF-010T`, `OF-719V`, `MDH411`).
- `codigo_normalizado` (TEXT): Código alfanumérico sin guiones ni espacios (índice GIN para búsqueda ultrarrápida).
- `titulo_producto` (TEXT): Título del producto o repuesto (ej: `"Kit de Filtros HILUX 2005-2015"`, `"Filtro de Aceite Amarok 2.0"`).
- `categoria` (TEXT): Familia de repuesto (`Filtros de Aire`, `Filtros de Aceite`, `Filtros de Combustible`, `Filtros de Habitáculo`, `Filtros de Inyección`, `Kits de Filtros`, `Filtros Varios`).
- `marca_filtro` (TEXT): Marca oficial (`Pro Filter`, `Maxfil`, `MDH`, `Picborg`, `Mareno`, etc.).
- `precio` (NUMERIC): Precio de lista en pesos ARS.
- `dimensiones` (TEXT): Medidas nominales (Largo, Ancho, Alto, picos con traba).
- `descripcion_aplicacion` (TEXT): Aplicación detallada de vehículos.
- `imagen_url` (TEXT): URL pública en Supabase Storage o `NULL` para modo Plano Técnico Blueprint.
- `activo` (BOOLEAN): Estado del producto (`true` / `false`).
- `reemplazo_codigo` (TEXT): Código de reemplazo sugerido.

### 2. `relaciones_productos` (177 componentes de kits)
Contiene las relaciones legítimas entre kits y sus componentes individuales (ej: `KIT-01` ➔ `AF-010T`, `OF-711T`, `FF-010T`, `CF-390T`).

### 3. `vehiculos_filtrar` (10.004 aplicaciones vehiculares)
Contiene las compatibilidades de vehículos a filtros específicos (81 marcas, ~1.800 modelos y 10.004 motorizaciones).

### 4. `equivalencias_cruza` (4.115 cruces únicos)
Contiene las equivalencias cruzadas directas con competidores (WEGA, MANN, FRAM, OEM, MARENO, TECNECO, MASTERFILT, MAHLE, SAKURA, etc.) con índice trigram sobre `codigo_competidor_normalizado`.

---

## ⚡ Control Directo de Supabase desde la Consola del Agente

Para actualizar o sincronizar la base de datos de Supabase sin necesidad de copiar scripts SQL manualmente:

```bash
# Sincronización completa directa a Supabase
python scratch/push_all_to_supabase.py

# Normalización de marcas y categorías
python scratch/phase4_normalize_categories.py
python scratch/phase5_fix_brand_typos.py

# Typecheck y compilación del proyecto Next.js
npx tsc --noEmit
npm run build
```
