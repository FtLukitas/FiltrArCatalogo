"""
Paso 1: Enriquecimiento Oficial de Productos Maxfil
===================================================
Aplica a los 690 productos coincidentes:
- imagen_url: Imagen oficial WebP de Maxfil.
- dimensiones: Medidas técnicas estandarizadas de fábrica.
Descarta los 220 productos nuevos.
No modifica vehiculos_filtrar.
"""

import json
import urllib.request
import urllib.error
import re
import os
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycXFudXRrbGRtdHlsanRnd3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIwMjA5NywiZXhwIjoyMTAwNzc4MDk3fQ.x9bNcTRG0TNziJgcwm_53MFFl0DSPsRFb_x_4_LRxno"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def norm(code):
    return re.sub(r'[^A-Z0-9]', '', str(code).upper())

def format_dimensions(dim_dict):
    label_map = [
        ('largo', 'Largo'),
        ('ancho', 'Ancho'),
        ('alto', 'Alto'),
        ('alto 2', 'Alto 2'),
        ('Ø ext', 'Ø ext'),
        ('Ø int', 'Ø int'),
        ('Ø ext 2', 'Ø ext 2'),
        ('Ø int 2', 'Ø int 2'),
        ('rosca/agujero', 'Rosca/Agujero'),
        ('junta', 'Junta'),
        ('valvula', 'Válvula'),
        ('pico', 'Pico'),
        ('tipo', 'Tipo'),
        ('observacion', 'Obs'),
    ]
    parts = []
    for key, label in label_map:
        val = dim_dict.get(key)
        if val and str(val).strip() and str(val).strip() != '-':
            clean_val = str(val).strip()
            if re.match(r'^\d+(\.\d+)?$', clean_val) and label in ('Largo', 'Ancho', 'Alto', 'Alto 2', 'Ø ext', 'Ø int', 'Ø ext 2', 'Ø int 2'):
                clean_val += ' mm'
            parts.append(f"{label}: {clean_val}")
    return ' | '.join(parts)

def main():
    print("=== PASO 1: ENRIQUECIMIENTO DE PRODUCTOS COINCIDENTES MAXFIL ===")
    
    # 1. Cargar datos scrapeados
    scraped_file = "backups/maxfil_official_catalog_scraped_20260903_204032.json"
    with open(scraped_file, "r", encoding="utf-8") as f:
        scraped = json.load(f)
    print(f"Total productos en catálogo scrapeado: {len(scraped)}")

    # 2. Obtener productos de DB
    print("Descargando productos de Supabase...")
    all_db = []
    offset = 0
    while True:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/productos_filtrar?select=id,codigo_filtrar,categoria,dimensiones,imagen_url,marca_filtro&offset={offset}&limit=1000", headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            b = json.loads(resp.read().decode('utf-8'))
            all_db.extend(b)
            if len(b) < 1000:
                break
            offset += 1000
    print(f"Total productos en catálogo DB: {len(all_db)}")

    db_by_norm = {norm(p['codigo_filtrar']): p for p in all_db}

    # 3. Identificar coincidencias y preparar updates
    updates = []
    for sc in scraped:
        n = norm(sc['codigo'])
        if n in db_by_norm:
            db_p = db_by_norm[n]
            new_img = sc.get('imagen_url')
            new_dims = format_dimensions(sc.get('dimensiones', {}))
            
            payload = {}
            if new_img:
                payload['imagen_url'] = new_img
            if new_dims:
                payload['dimensiones'] = new_dims
                
            if payload:
                updates.append({
                    'id': db_p['id'],
                    'codigo': db_p['codigo_filtrar'],
                    'payload': payload,
                    'old_img': db_p.get('imagen_url'),
                    'old_dims': db_p.get('dimensiones')
                })

    print(f"\nTotal productos coincidentes a actualizar: {len(updates)} (descartando los 220 nuevos)")

    # 4. Guardar backup preventivo
    os.makedirs("backups", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"backups/backup_before_step1_enrichment_{ts}.json"
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump([{'id': u['id'], 'codigo': u['codigo'], 'old_img': u['old_img'], 'old_dims': u['old_dims']} for u in updates], f, ensure_ascii=False, indent=2)
    print(f"Backup preventivo guardado en: {backup_path}")

    # 5. Ejecutar actualizaciones en Supabase
    print("\nEjecutando actualizaciones en Supabase...")
    success = 0
    errors = []

    for i, item in enumerate(updates, start=1):
        item_id = item['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/productos_filtrar?id=eq.{item_id}"
        patch_body = json.dumps(item['payload']).encode('utf-8')
        patch_req = urllib.request.Request(patch_url, data=patch_body, headers=HEADERS, method="PATCH")
        
        try:
            with urllib.request.urlopen(patch_req) as resp:
                if resp.status in (200, 204):
                    success += 1
                else:
                    errors.append((item['codigo'], f"Status {resp.status}"))
        except urllib.error.HTTPError as e:
            errors.append((item['codigo'], f"HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')}"))
        except Exception as e:
            errors.append((item['codigo'], str(e)))

        if i % 50 == 0 or i == len(updates):
            print(f"  Progreso: {i}/{len(updates)} procesados ({success} exitosos, {len(errors)} errores)...")

    print(f"\n=== RESULTADO FINAL PASO 1 ===")
    print(f"Actualizaciones exitosas: {success}/{len(updates)}")
    if errors:
        print(f"Errores encontrados ({len(errors)}):")
        for code, err in errors[:10]:
            print(f"  - {code}: {err}")
    else:
        print("¡100% de los 690 productos enriquecidos exitosamente sin errores!")

if __name__ == "__main__":
    main()
