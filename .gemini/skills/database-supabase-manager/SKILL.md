---
name: database-supabase-manager
description: Skill de base de datos transaccional para Supabase en FiltrAr Catálogo. Prohíbe consultas SQL crudas en favor de herramientas de dominio (createProduct, updateProduct, replaceProduct, linkVehicle, addEquivalence) y evaluación previa de riesgo mediante analyzeProductImpact().
---

# Skill: Database & Supabase Transactional Manager

## 1. Principio Fundamental: CERO SQL Crudo
Queda estrictamente prohibido que el LLM ejecute sentencias `INSERT`, `UPDATE` o `DELETE` directas sobre las tablas de Supabase.

Toda mutación debe pasar obligatoriamente por el siguiente flujo de 2 fases:

```
                  [ SOLICITUD DE CAMBIO ]
                             │
                             ▼
              Phase 1: analyzeProductImpact(codigo)
                             │
                             ▼
             ¿Riesgo Evaluado y Confirmado?
                             │
                             ▼
              Phase 2: Ejecución de RPC Atómica
    (replaceProduct / linkVehicle / addEquivalence)
```

---

## 2. Herramientas de Dominio Disponibles

- **`analyzeProductImpact(codigo)`**: Evalúa vehículos, equivalencias y relaciones afectadas antes de modificar un código. Deuelve `{ affectedVehicles, affectedRelations, affectedEquivalences, willBreakFK, risk }`.
- **`replaceProduct(oldCodigo, newCodigo)`**: Reemplaza y re-vincula un código de producto en todas las tablas asociadas en una transacción SQL atómica.
- **`linkVehicle(data)`**: Vincula una aplicación vehicular sanitizando marca y modelo.
- **`addEquivalence(data)`**: Registra un cruce con competidor (Wega, Mann, Fram, etc.).

---

## 3. Guía de Ejecución y Resguardo

1. **Protocolo Obligatorio de Backup**: Antes de ejecutar cualquier mutación masiva o script de normalización en Supabase, ejecutar `scripts/create_backup.ts` para resguardar copias JSON integrales en `backups/`.
2. **Evaluación de Impacto**: Antes de modificar o sustituir un código de producto, **SIEMPRE** invocar `analyzeProductImpact(codigo)`.
3. **Protección de Vistas `marcas_unicas` y `modelos_unicos`**: Al insertar en `vehiculos_filtrar`, el campo `marca` debe validarse contra `validateVehiclePayload`. Jamás insertar códigos de repuestos, marcas de la competencia o textos de scraping en `vehiculos_filtrar.marca`, ya que esto contamina las vistas SQL `marcas_unicas` y `modelos_unicos`.
4. **Campo Obligatorio `tipo_vehiculo`**: Toda inserción en `vehiculos_filtrar` debe incluir `tipo_vehiculo` (`'LIVIANO'` o `'PESADO'`).
5. **Registro de Auditoría (Audit Log)**: Toda mutación masiva (>10 registros) debe registrar un archivo JSON en `backups/audit_log_<timestamp>.json` con el detalle de registros insertados, modificados o eliminados.
6. **Ejecución Atómica**: Una vez verificado y confirmado el riesgo, ejecutar las herramientas RPC atómicas correspondientes.

