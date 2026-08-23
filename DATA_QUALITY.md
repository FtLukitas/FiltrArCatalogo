# 📋 Estado de Calidad de Datos — FiltrAr Catálogo V2

> **Última auditoría:** 14/08/2026  
> **Herramienta de auditoría integral:** [`resources/audit_full_db.py`](file:///e:/FiltrArCatalogo/resources/audit_full_db.py)  
> **Integridad Referencial:** **100.00% (0 errores, 0 enlaces rotos)**  

---

## 📊 Balance General de la Base de Datos

| Dimensión | Estado Inicial | Estado Actual (Auditado) | Mejora Obtenida |
|---|---|---|---|
| **Títulos Descriptivos de Productos** | 117 (9.1%) | **1.288 (99.7%)** | +1.171 títulos enriquecidos comercialmente |
| **Registros en `vehiculos_filtrar`** | 10.004 | **12.219** | **+2.215 vehículos y maquinarias vinculadas** 🚀 |
| **Equivalencias Cruzadas en DB** | 4.115 | **5.662** | **+1.547 equivalencias oficiales (Wega, Mann, Fram, OEM)** |
| **Integridad Referencial FK** | 100% | **100% (12.219 / 12.219)** | **0 enlaces rotos** ✅ |
| **Duplicados/Redundancias Prevenidos** | - | **1.053 prevenidos** | Motor Anti-Duplicados Multi-Capa |
| **Marcas Canónicas Estandarizadas** | Fragmentadas | **100% Estandarizadas** | Citroën ➔ Citroen, John ➔ John Deere, etc. |

---

## 🧠 Arquitectura del Motor Anti-Duplicados en 4 Capas

Para garantizar que ninguna importación genere duplicados o registros redundantes, se implementó un motor de 4 capas de validación:

```
                       ┌──────────────────────────────────────────────┐
                       │  CANDIDATO: (MARCA, MODELO, FILTRO_ASOCIADO) │
                       └──────────────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────────┐
                    │ CAPA 1: Canonización de Marca                    │
                    │ VW / VOLKSWGEN -> VOLKSWAGEN                     │
                    │ MB / M.BENZ / MERCEDES -> MERCEDES-BENZ          │
                    │ CHEVY / GM / GMC -> CHEVROLET                    │
                    │ CITROËN -> CITROEN | JOHN -> JOHN DEERE          │
                    └─────────────────────────┬────────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────────┐
                    │ CAPA 2: Firma Compacta de Modelo (Exacta)        │
                    │ S-10 == S10 == S 10                              │
                    │ F-100 == F100 == F 100                           │
                    │ CR-V == CRV | ECOSPORT == ECOESPORT              │
                    └─────────────────────────┬────────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────────┐
                    │ CAPA 3: Stemming de Modelo Base / Troncal        │
                    │ Detecta si la raíz del modelo (ej: HILUX) ya     │
                    │ tiene asignado este filtro específico            │
                    └─────────────────────────┬────────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────────┐
                    │ CAPA 4: Validación Cruzada Inversa por Filtro    │
                    │ Compara contra modelos existentes del filtro     │
                    │ (ej: 'RUNNER' vs '4 RUNNER', 'FIESTA' vs         │
                    │ 'FIESTA-COURIER') para evitar sobre-declaraciones│
                    └─────────────────────────┬────────────────────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          ▼                                       ▼
                   [ 🛡️ DUPLICADO ]                        [ ✅ LEGÍTIMO ]
                  Filtrado / Descartado                   Aprobado para DB
```

---

## 🌟 Ingesta Maestra WEGA-Principal

Se cruzó la base oficial de WEGA (`Wega_Tabla_Equivalencias.csv` y `Wega_Tabla_B_Vehiculos.csv`) contra los 1.292 productos:

1. **Ingesta de 1.462 Aplicaciones Vehiculares Oficiales:**
   - Incorporación con **motorizaciones exactas (cilindrada, potencia cv, válvulas)** y **rangos de años precisos** (ej: *Audi A1 1.4 TFSI 16v 125cv 2016 →*, *Toyota Hilux 2.8 TD 204cv 2022 →*, *VW Amarok 3.0 V6 TDI 2017 →*).
2. **Ingesta de 1.535 Equivalencias Complementarias Homologadas:**
   - **`MANN-FILTER`:** *CUK 2842, CU 24006, PU 9009z Kit, CUK 26009*.
   - **`FRAM`:** *CFA 9881, CF 11548, PH 3614, CF 12018*.
   - **`OEM Originales`:** *164038899R, 04152YZZA6, 68247339AA*.

---

## 🏎️ Cobertura por Marcas Registradas en `vehiculos_filtrar` (Top 15)

| Marca | Variantes y Modelos Registrados |
|---|---|
| ⭐ **MERCEDES-BENZ** | **1.432** (Sprinter, Accelo, Atego, Axor, Actros, 1114, 1517, 1620, 1938) |
| 🔵 **FORD** | **1.032** (Falcon, Ranger, EcoSport, Focus, Fiesta, Transit, F-100, Cargo) |
| 🇮🇹 **FIAT** | **759** (147, Spazio, Vivace, Cronos, Argo, Toro, Mobi, Strada, Duna, Uno) |
| 🇩🇪 **VOLKSWAGEN** | **742** (Gol, Saveiro, Suran, Amarok, Bora, Vento, Polo, Fox, Constellation) |
| 🇫🇷 **RENAULT** | **696** (Clio, Sandero, Logan, Duster, Kangoo, Master, Megane, R12, R19) |
| 🚛 **IVECO** | **686** (Daily, Turbo Daily, Eurocargo, Stralis, Tector, Cursor) |
| 🚚 **SCANIA** | **634** (Serie 111, 112, 113, Serie 4: 94/114/124, Serie P/R/G) |
| 🦁 **PEUGEOT** | **597** (504, 505, 206, 207, 208, 307, 308, 408, Partner, Boxer, Hoggar) |
| 🇺🇸 **CHEVROLET** | **555** (Corsa, Classic, Onix, Cruze, Tracker, S-10, Blazer, Spin, Silverado) |
| 🇸🇪 **VOLVO** | **491** (FH12, FH13, FM, VM 210/260/310, NH12) |
| 🇯🇵 **UD TRUCKS** | **475** (Línea pesada y camiones) |
| 🇯🇵 **TOYOTA** | **359** (Hilux, Corolla, Etios, Yaris, RAV4, SW4, Dyna, Hiace, Land Cruiser) |
| ⚡ **CITROEN** | **358** (C3, C4, Berlingo, Xsara, Picasso, C4 Cactus, Jumper) |
| 🇯🇵 **NISSAN** | **275** (Frontier, NP300, Kicks, Versa, Note, March, Tiida, Pathfinder) |
| 🇩🇪 **AUDI** | **250** (A1, A3, A4, A6, Q5, Q7 TFSI / TDI) |

---

## 🗄️ Esquema de la Base de Datos

```
productos_filtrar
├── codigo_filtrar (TEXT, UNIQUE) ← Clave primaria funcional
├── titulo_producto (TEXT) ← 🟢 99.7% enriquecidos con nombres descriptivos
├── descripcion_aplicacion (TEXT) ← 🟢 Fuente de verdad técnica
├── categoria (TEXT) ← 🟢 100% categorizados
├── marca_filtro (TEXT)
├── precio (NUMERIC)
├── imagen_url (TEXT)
└── activo (BOOLEAN)

vehiculos_filtrar
├── filtro_asociado (TEXT, FK → productos_filtrar.codigo_filtrar)
├── marca (TEXT) ← 🟢 100% canónicas
├── modelo (TEXT) ← 🟢 100% normalizados
├── version (TEXT) ← 🟢 Enriquecidas con motorizaciones reales
└── año (TEXT) ← 🟢 Rangos de años estandarizados

equivalencias_cruza
├── producto_codigo (TEXT, FK → productos_filtrar.codigo_filtrar)
├── marca_competidor (TEXT) ← 🟢 WEGA, MANN, FRAM, OEM, etc.
├── codigo_competidor (TEXT)
└── codigo_competidor_normalizado (TEXT) ← Alfanumérico limpio para buscador
```

---

## ⚠️ Reglas Mandatorias para Agentes de IA

> [!CAUTION]
> **ANTES de modificar cualquier dato en la base, el agente DEBE:**
> 1. **Hacer backup** exportando los registros afectados a un archivo JSON local en `scratch/backups/`.
> 2. **Procesar en lotes de máximo 50 registros** para control y verificación.
> 3. **NO borrar nunca** el valor original de `descripcion_aplicacion`.
> 4. **Respetar la Regla de Oro de `marcas_unicas`:** Jamás guardar códigos de repuesto, cilindradas o texto web en `vehiculos_filtrar.marca`.
> 5. **CERO SQL Crudo:** Utilizar transaccionalidad atómica y evaluar impacto previo.

---

## 🔧 Skills y Herramientas del Proyecto (`.gemini/skills/`)

| Skill | Ubicación | Propósito y Reglas |
|---|---|---|
| **`scraper-data-extractor`** | `.gemini/skills/scraper-data-extractor/` | Extracción determinista con Playwright en catálogos de repuestos (Wega, Mann, Fram). Maneja modales ocultos (`VER MÁS APLICACIONES`) y navegación directa por slug (`/filtros/detalle/${codigo}`). CERO escritura directa en BD. |
| **`validation-integrity-checker`** | `.gemini/skills/validation-integrity-checker/` | Saneamiento y control de integridad basada en Zod y reglas de normalización automotriz. Protege las vistas dinámicas `marcas_unicas` y `modelos_unicos`. Prohíbe códigos de filtro en el campo `marca`. |
| **`database-supabase-manager`** | `.gemini/skills/database-supabase-manager/` | Gestión transaccional y atómica en Supabase. Prohíbe SQL crudo. Requiere evaluación previa de impacto y protocolo de backup obligatorio. |
| **`backend-supabase-manager`** | `.gemini/skills/backend-supabase-manager/` | Gestión y configuración de endpoints y funciones RPC backend para Supabase. |

### Herramientas de Auditoría Disponibles:

| Script | Ruta | Propósito |
|---|---|---|
| `audit_full_db.py` | `resources/` | Auditoría de integridad referencial de 100% de la DB |
| `diagnose_data_quality.py` | `scratch/` | Diagnóstico de títulos genéricos, categorías, vehículos y links |
| `test_advanced_duplicate_detector.py` | `scratch/` | Motor de detección anti-duplicados en 4 capas |
| `audit_product_titles_deep.py` | `scratch/` | Auditoría profunda de calidad en los 1,292 títulos de productos |
| `execute_wega_master_ingestion.py` | `scratch/` | Ingesta maestra oficial de aplicaciones WEGA |
| `import_wega_complementary_equivs.py` | `scratch/` | Ingesta de equivalencias Mann, Fram y OEM |
| `sync_wega_vehicles_for_381_products.py` | `scratch/` | Sincronización vehicular WEGA para productos huérfanos |
