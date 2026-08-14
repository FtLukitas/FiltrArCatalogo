# 📋 Estado de Calidad de Datos — FiltrAr Catálogo V2

> **Última auditoría:** 14/08/2026
> **Herramienta de diagnóstico:** [`scratch/diagnose_data_quality.py`](file:///e:/FiltrArCatalogo/scratch/diagnose_data_quality.py)

---

## 🔴 Problema Principal: Títulos Genéricos (90.9% del catálogo)

De los **1.292 productos** en `productos_filtrar`, **1.175 (90.9%)** tienen títulos genéricos auto-generados del tipo:

```
"Filtro Aire AF-590T"
"Filtro Panel 2019"
"Filtro Aceite OF-840F"
"Filtro EFPA724"
```

Estos títulos **no aportan información útil al usuario final** (el autopartista que busca el filtro para un Fiat 147 o una Hilux). No dicen para qué vehículo es ni qué motor lleva.

### Dato clave: el 99.7% tiene `descripcion_aplicacion` con datos reales

| Métrica | Valor |
|---|---|
| Productos con `descripcion_aplicacion` llena | **1.288 de 1.292 (99.7%)** |
| Productos sin ninguna descripción | **4 (0.3%)** |

Ejemplos de lo que ya hay en `descripcion_aplicacion`:

| `codigo_filtrar` | `titulo_producto` (actual) | `descripcion_aplicacion` (dato real ya existente) |
|---|---|---|
| `142` | Filtro Aire Redondo 142 | Peugeot 504 / Dodge 1.8 - Plato Aro Plastisol |
| `2005` | Filtro Panel 2005 | PEUGEOT307 2006 NAF COMPAC HOGGAR 1,6 |
| `2019` | Filtro Panel 2019 | VW AMAROK 2.0 TDI 2010 |
| `AF-590T` | Filtro Aire AF-590T | Toyota Hilux 2.4 2.8 Diesel |
| `OF-840F` | Filtro OF-840F | Ford Falcon / Toyota Hilux |

**Conclusión:** La información EXISTE en la base de datos pero está en el campo equivocado. El campo `titulo_producto` repite genéricamente "Filtro [tipo] [código]" cuando debería incorporar el vehículo/motor de `descripcion_aplicacion`.

---

## 🟡 Problema Secundario: Subcategorías Fragmentadas

Actualmente hay **9 categorías distintas**, algunas de las cuales son subdivisiones de `Filtros de Aire`:

| Categoría | Cantidad |
|---|---|
| Filtros de Aire (Línea Pesada) | 620 |
| Filtros de Aire | 204 |
| Filtros de Habitáculo | 111 |
| Filtros de Aceite | 103 |
| Filtros de Aire (Paneles) | 68 |
| Filtros de Aire (Redondos) | 61 |
| Filtros de Combustible | 58 |
| Filtros de Inyección | 47 |
| Kits de Filtros | 20 |

**Decisión pendiente del cliente:** ¿Unificar todas las sub-familias de Aire (`Línea Pesada`, `Paneles`, `Redondos`) en una sola categoría `Filtros de Aire`, o mantener la distinción?

---

## 🟢 Datos que ESTÁN Bien

| Métrica | Valor | Estado |
|---|---|---|
| Links rotos (vehículo → producto inexistente) | **0** | ✅ Perfecto |
| Vehículos sin marca | **0** | ✅ |
| Vehículos sin modelo | **0** | ✅ |
| Equivalencias únicas cargadas | **4.115** | ✅ |
| Registros vehiculares totales | **10.004** | ✅ |
| Integridad referencial vehículos | **100%** | ✅ |

---

## 🗄️ Esquema de la Base de Datos Relevante

```
productos_filtrar
├── codigo_filtrar (TEXT, UNIQUE) ← Clave primaria funcional
├── titulo_producto (TEXT) ← 🔴 90.9% genéricos, OBJETIVO DE ENRIQUECIMIENTO
├── descripcion_aplicacion (TEXT) ← 🟢 99.7% con datos reales del vehículo/motor
├── categoria (TEXT)
├── marca_filtro (TEXT)
├── precio (NUMERIC)
├── imagen_url (TEXT)
└── activo (BOOLEAN)

vehiculos_filtrar
├── filtro_asociado (TEXT, FK → codigo_filtrar)
├── marca (TEXT) ← 🟢 100% completado
├── modelo (TEXT) ← 🟢 100% completado
├── version (TEXT) ← 🟡 7.6% vacío (765 registros)
└── año (TEXT)

equivalencias_cruza
├── producto_codigo (TEXT, FK → codigo_filtrar)
├── marca_competidor (TEXT)
├── codigo_competidor (TEXT)
└── codigo_competidor_normalizado (TEXT)
```

---

## ⚠️ Reglas para Agentes de IA que Modifiquen Datos

> [!CAUTION]
> **ANTES de modificar cualquier dato en la base, el agente DEBE:**
> 1. **Hacer backup** exportando los registros afectados a un archivo JSON local.
> 2. **Procesar en lotes de máximo 50 registros** para poder auditar resultados.
> 3. **NO borrar nunca** el valor original de `descripcion_aplicacion` — es la fuente de verdad.
> 4. **NO inventar datos.** Si `descripcion_aplicacion` está vacío, dejar el título como está y marcarlo como "pendiente de revisión manual".

> [!IMPORTANT]
> **Credenciales de Supabase (solo lectura pública):**
> - URL: `https://qrqqnutkldmtyljtgwxm.supabase.co`
> - Anon Key: `sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln`
> - Escritura: Requiere `sbp_052dc17226388702805e11b495c6b528df0eb5a3` (Service Role Key)

---

## 🔧 Herramientas de Auditoría Disponibles

| Script | Ruta | Propósito |
|---|---|---|
| `diagnose_data_quality.py` | `scratch/` | Auditoría completa: títulos genéricos, categorías, vehículos, links rotos |
| `audit_full_db.py` | `resources/` | Auditoría de integridad referencial de 100% de la DB |
| `audit_products.py` | `resources/` | Auditoría específica de productos y campos vacíos |
| `audit_veracity.py` | `resources/` | Verificación de veracidad de datos cargados |

---

## 📌 Próximos Pasos Sugeridos

1. **Enriquecer `titulo_producto`** usando `descripcion_aplicacion` como fuente (ver plan de implementación).
2. **Decidir con el cliente** si unificar las sub-categorías de Aire.
3. **Completar las 765 versiones/motores faltantes** en `vehiculos_filtrar`.
4. **Validar cruces WEGA** contra la página oficial de WEGA (scraping selectivo de a lotes de 10-20).
