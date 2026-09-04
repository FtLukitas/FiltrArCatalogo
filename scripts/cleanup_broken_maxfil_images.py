"""
Limpieza de Imágenes en Productos Maxfil
=======================================
- Conserva imagen_url exclusivamente para los 107 productos con foto real verificada.
- Restablece imagen_url a null para los 546 productos cuyas imágenes dan 404 en el servidor de origen.
"""

import json
import urllib.request
import urllib.error
import re
import sys
import os
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

def main():
    print("=== LIMPIEZA DE IMÁGENES VACÍAS/ROTAS EN PRODUCTOS MAXFIL ===")
    
    # 1. Cargar manifiesto de imágenes válidas
    with open("scratch/valid_images_manifest.json", "r", encoding="utf-8") as f:
        valid_list = json.load(f)

    valid_codes = set(norm(v['code']) for v in valid_list)
    print(f"Total códigos con foto real verificada: {len(valid_codes)}")

    # 2. Descargar productos Maxfil de DB
    all_db = []
    offset = 0
    while True:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/productos_filtrar?marca_filtro=eq.Maxfil&select=id,codigo_filtrar,imagen_url&offset={offset}&limit=1000", headers=HEADERS)
        with urllib.request.urlopen(req) as resp:
            b = json.loads(resp.read().decode('utf-8'))
            all_db.extend(b)
            if len(b) < 1000:
                break
            offset += 1000

    print(f"Total productos Maxfil en DB: {len(all_db)}")

    # 3. Identificar productos a limpiar
    to_nullify = []
    already_valid = []
    
    for p in all_db:
        n = norm(p['codigo_filtrar'])
        curr_img = p.get('imagen_url')
        if n in valid_codes:
            already_valid.append(p)
        else:
            if curr_img and 'maxfil.com.ar' in curr_img:
                to_nullify.append(p)

    print(f"Productos que mantendrán su foto real: {len(already_valid)}")
    print(f"Productos a limpiar (imagen_url -> null): {len(to_nullify)}")

    # 4. Guardar backup
    os.makedirs("backups", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backups/backup_before_image_cleanup_{ts}.json"
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(to_nullify, f, ensure_ascii=False, indent=2)
    print(f"Backup guardado en: {backup_file}")

    # 5. Ejecutar updates
    print("\nEjecutando limpieza en Supabase...")
    success = 0
    errors = []

    for i, item in enumerate(to_nullify, start=1):
        item_id = item['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/productos_filtrar?id=eq.{item_id}"
        patch_body = json.dumps({"imagen_url": None}).encode('utf-8')
        patch_req = urllib.request.Request(patch_url, data=patch_body, headers=HEADERS, method="PATCH")
        
        try:
            with urllib.request.urlopen(patch_req) as resp:
                if resp.status in (200, 204):
                    success += 1
                else:
                    errors.append((item['codigo_filtrar'], f"Status {resp.status}"))
        except urllib.error.HTTPError as e:
            errors.append((item['codigo_filtrar'], f"HTTP {e.code}"))
        except Exception as e:
            errors.append((item['codigo_filtrar'], str(e)))

        if i % 50 == 0 or i == len(to_nullify):
            print(f"  Progreso: {i}/{len(to_nullify)} procesados ({success} exitosos, {len(errors)} errores)...")

    print(f"\n=== RESULTADO FINAL DE LIMPIEZA ===")
    print(f"Productos limpiados exitosamente: {success}/{len(to_nullify)}")
    if errors:
        print(f"Errores: {errors[:5]}")
    else:
        print("¡Operación completada al 100% sin errores!")

if __name__ == "__main__":
    main()
