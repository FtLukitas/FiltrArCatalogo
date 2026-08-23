---
name: backend-supabase-manager
description: Skill avanzada de backend para la arquitectura de FiltrAr Catálogo V2. Cubre esquemas de datos PostgreSQL (productos_filtrar, equivalencias_cruza, vehiculos_filtrar, relaciones_productos, configuracion_catalogo), políticas RLS, normalización de códigos y optimizaciones para Supabase PostgREST.
---

# Skill: FiltrAr Catálogo V2 & Supabase Manager

Esta skill proporciona las pautas, esquemas y buenas prácticas específicas para mantener, consultar y extender la base de datos de **FiltrAr Catálogo** en **Supabase**.

---

## 1. Esquema Principal de Tablas (`FiltrAr`)

### Tablas Core:
- **`productos_filtrar`**: Catálogo principal de repuestos (`codigo_filtrar` como UK).
- **`equivalencias_cruza`**: Tabla de cruces de códigos con marcas competidoras (Wega, Mann, Fram, etc.).
- **`vehiculos_filtrar`**: 12.000+ aplicaciones vehiculares asignadas a filtros (`filtro_asociado`, `marca`, `modelo`, `version`, `año`, `tipo_vehiculo`: `'PESADO'` | `'LIVIANO'`).
- **`relaciones_productos`**: Relaciones N:M para Kits (`CONTIENE_COMPONENTE`) y sustitutos.
- **`configuracion_catalogo`**: Ajustes globales key-value (ej: `ocultar_precios_global`).


---

## 2. Reglas de Normalización y Seguridad Mandatorias

1. **Sanitización de Códigos**: Toda consulta contra `productos_filtrar` o `equivalencias_cruza` debe utilizar `lib/normalization.ts` para canonizar marcas y limpiar códigos alfanuméricos.
2. **Batch Range Fetching**: Las consultas masivas sobre `vehiculos_filtrar` deben paginarse en lotes de 1.000 usando `.range(offset, offset + 999)`.
3. **Seguridad y RLS**:
   - Acceso `SELECT` público mediante `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Escritura y modificación (`INSERT`, `UPDATE`, `DELETE`) restringidas a sesiones autenticadas `/admin` verificadas vía `middleware.ts`.

---

## 3. Documentación y Plantillas

- **Documentación Técnica Completa**: [`C:/Users/lukit/Desktop/documentacion_tecnica_supabase.md`](file:///C:/Users/lukit/Desktop/documentacion_tecnica_supabase.md)
- **Esquema Inicial DDL**: [`E:/FiltrArCatalogo/INICIALIZAR_SUPABASE.sql`](file:///E:/FiltrArCatalogo/INICIALIZAR_SUPABASE.sql)
- **Normalización**: [`E:/FiltrArCatalogo/lib/normalization.ts`](file:///E:/FiltrArCatalogo/lib/normalization.ts)
