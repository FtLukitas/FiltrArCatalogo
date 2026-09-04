import urllib.request
import urllib.error
import json
import re
import sys
import os
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
# Using service_role key to ensure full write permissions bypassing RLS
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycXFudXRrbGRtdHlsanRnd3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIwMjA5NywiZXhwIjoyMTAwNzc4MDk3fQ.x9bNcTRG0TNziJgcwm_53MFFl0DSPsRFb_x_4_LRxno"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def clean_base_desc(title, code, app_desc):
    t = title or ''
    patterns = [
        r'^Filtro de Aire Pesado\s*[—\-•:]*\s*',
        r'^Filtro de Aire\s*[—\-•:]*\s*',
        r'^Filtro de Aceite\s*[—\-•:]*\s*',
        r'^Filtro de Combustible\s*[—\-•:]*\s*',
        r'^Filtro Inyecci[óo]n\s*[—\-•:]*\s*',
        r'^Filtro\s*[—\-•:]*\s*',
    ]
    for p in patterns:
        t = re.sub(p, '', t, flags=re.IGNORECASE).strip()
    
    # Strip any consecutive repeated "Filtro ..."
    t = re.sub(r'^(?:Filtro\s*[—\-•:]*\s*)+', '', t, flags=re.IGNORECASE).strip()
    
    if t.upper() == code.upper():
        t = ''
        
    if not t and app_desc:
        t = app_desc.strip()
    return t

def main():
    print("=== PASO 1: Descargando registros actuales de Maxfil ===")
    url = f"{SUPABASE_URL}/rest/v1/productos_filtrar?marca_filtro=eq.Maxfil&select=*&limit=2000"
    req = urllib.request.Request(url, headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
    with urllib.request.urlopen(req) as resp:
        products = json.loads(resp.read().decode('utf-8'))
    
    print(f"Total productos Maxfil recuperados: {len(products)}")

    # Crear backup
    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"backups/backup_maxfil_before_correction_{timestamp}.json"
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"Backup preventivo guardado exitosamente en: {backup_path}")

    # Procesar modificaciones
    print("\n=== PASO 2: Calculando correcciones de categoría y título ===")
    updates = []
    for p in products:
        code = p['codigo_filtrar'].strip().upper()
        curr_cat = p['categoria']
        curr_tit = p['titulo_producto'] or ''
        app_desc = p.get('descripcion_aplicacion') or ''
        equiv = p.get('equivalencias') or ''
        base_desc = clean_base_desc(curr_tit, code, app_desc)
        
        new_cat = curr_cat
        new_tit = curr_tit

        if code == 'TEST001':
            continue
        elif code.startswith('EFPA'):
            new_cat = 'Filtros de Aire (Línea Pesada)'
            if not curr_tit.startswith('Filtro de Aire Pesado'):
                new_tit = f"Filtro de Aire Pesado — {base_desc}" if base_desc else f"Filtro de Aire Pesado {p['codigo_filtrar']}"
        elif code.startswith('EA'):
            new_cat = 'Filtros de Aceite'
            new_tit = f"Filtro de Aceite (Cartucho) — {base_desc}" if base_desc else f"Filtro de Aceite (Cartucho) {p['codigo_filtrar']}"
        elif code.startswith('EC'):
            new_cat = 'Filtros de Combustible'
            new_tit = f"Filtro de Combustible (Cartucho) — {base_desc}" if base_desc else f"Filtro de Combustible (Cartucho) {p['codigo_filtrar']}"
        elif code.startswith('UC'):
            new_cat = 'Filtros de Combustible'
            new_tit = f"Filtro de Combustible (Blindado) — {base_desc}" if base_desc else f"Filtro de Combustible (Blindado) {p['codigo_filtrar']}"
        elif code.startswith('UL'): # covers UL, ULF, ULH
            new_cat = 'Filtros de Aceite'
            new_tit = f"Filtro de Aceite (Blindado) — {base_desc}" if base_desc else f"Filtro de Aceite (Blindado) {p['codigo_filtrar']}"
        elif code.startswith('MIF') or code.startswith('FN'):
            new_cat = 'Filtros de Inyección'
            new_tit = curr_tit

        if new_cat != curr_cat or new_tit != curr_tit:
            updates.append({
                'id': p['id'],
                'codigo': p['codigo_filtrar'],
                'payload': {
                    'categoria': new_cat,
                    'titulo_producto': new_tit,
                },
                'old_cat': curr_cat,
                'new_cat': new_cat,
                'old_tit': curr_tit,
                'new_tit': new_tit
            })

    print(f"Total productos que requieren actualización: {len(updates)}")

    # Ejecutar PATCH individual / batch
    print("\n=== PASO 3: Ejecutando actualizaciones en Supabase ===")
    success_count = 0
    errors = []

    for i, item in enumerate(updates, start=1):
        item_id = item['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/productos_filtrar?id=eq.{item_id}"
        patch_body = json.dumps(item['payload']).encode('utf-8')
        patch_req = urllib.request.Request(patch_url, data=patch_body, headers=HEADERS, method="PATCH")
        
        try:
            with urllib.request.urlopen(patch_req) as patch_resp:
                if patch_resp.status in (200, 204):
                    success_count += 1
                else:
                    errors.append((item['codigo'], f"Status {patch_resp.status}"))
        except urllib.error.HTTPError as e:
            errors.append((item['codigo'], f"HTTPError {e.code}: {e.read().decode('utf-8', errors='ignore')}"))
        except Exception as e:
            errors.append((item['codigo'], str(e)))

        if i % 25 == 0 or i == len(updates):
            print(f"  Progreso: {i}/{len(updates)} procesados ({success_count} exitosos, {len(errors)} errores)...")

    print(f"\nResultado final de la migración:")
    print(f"  Total exitosos: {success_count}/{len(updates)}")
    if errors:
        print(f"  Errores ({len(errors)}):")
        for err_code, err_msg in errors[:10]:
            print(f"    - {err_code}: {err_msg}")
    else:
        print("  Todos los registros se actualizaron correctamente sin errores.")

if __name__ == "__main__":
    main()
