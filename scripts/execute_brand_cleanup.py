"""
Script de Depuración y Saneamiento de Marcas en vehiculos_filtrar
================================================================
1. Realiza backup completo de la tabla vehiculos_filtrar.
2. Elimina marcas de herramientas, motosierras, basura y marcas sin presencia en Argentina.
3. Reasigna los 403 camiones de UD TRUCKS a VOLKSWAGEN (PESADO).
4. Unifica typos y marcas fragmentadas (REANULT -> RENAULT, SSANG -> SSANG YONG, etc.).
5. Verifica el resultado final en la base de datos.
"""

import json
import urllib.request
import urllib.parse
import urllib.error
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
    "Prefer": "return=representation"
}

# 1. Marcas a ELIMINAR
BRANDS_TO_DELETE = [
    # Herramientas / Motosierras / Compresores / Basura (33)
    'HOMELITE', 'MC', 'JO-BU', 'PARTNER', 'ATLAS', 'CK', 'KAWASAKI', 'APLICACIONES:',
    # Marcas exóticas / sin presencia en Argentina (64)
    'CADILLAC', 'PETERBILT', 'SAAB', 'PROTON', 'ZOTYE', 'BYD', 'DFM',
    'PEGASO', 'PEGASO (ENASA)', 'DACIA', 'LADA', 'SKODA',
    # Fabricantes de motores sueltos (30)
    'CUMMINS', 'PERKINS'
]

# 2. Reasignaciones y Unificaciones
REASSIGNMENTS = [
    {
        'description': 'Reasignar UD TRUCKS a VOLKSWAGEN (Pesado)',
        'filter_marca': 'UD TRUCKS',
        'patch_data': {'marca': 'VOLKSWAGEN', 'tipo_vehiculo': 'PESADO'}
    },
    {
        'description': 'Corregir typo REANULT -> RENAULT',
        'filter_marca': 'REANULT',
        'patch_data': {'marca': 'RENAULT'}
    },
    {
        'description': 'Unificar SSANG -> SSANG YONG',
        'filter_marca': 'SSANG',
        'patch_data': {'marca': 'SSANG YONG'}
    },
    {
        'description': 'Unificar TATA MOTORS -> TATA',
        'filter_marca': 'TATA MOTORS',
        'patch_data': {'marca': 'TATA'}
    },
    {
        'description': 'Unificar EL -> EL DETALLE',
        'filter_marca': 'EL',
        'patch_data': {'marca': 'EL DETALLE'}
    },
    {
        'description': 'Unificar DON -> DON ROQUE',
        'filter_marca': 'DON',
        'patch_data': {'marca': 'DON ROQUE'}
    }
]

def main():
    print("=================================================================")
    print("  EJECUCIÓN: DEPURACIÓN Y SANEAMIENTO DE MARCAS VEHICULARES")
    print("=================================================================")

    # PASO 1: Backup completo de vehiculos_filtrar
    print("\n[1/4] Realizando backup completo de vehiculos_filtrar...")
    all_veh = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?select=*&offset={offset}&limit=1000"
        req = urllib.request.Request(url, headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            b = json.loads(resp.read().decode('utf-8'))
            all_veh.extend(b)
            if len(b) < 1000:
                break
            offset += 1000
    
    print(f"  Total registros descargados: {len(all_veh)}")
    os.makedirs("backups", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backups/backup_vehiculos_before_brand_cleanup_{ts}.json"
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(all_veh, f, ensure_ascii=False, indent=2)
    print(f"  Backup preventivo guardado en: {backup_file}")

    # PASO 2: Eliminar marcas innecesarias
    print("\n[2/4] Eliminando marcas de herramientas, motosierras, motores y exóticas...")
    deleted_total = 0
    for brand in BRANDS_TO_DELETE:
        quoted_brand = urllib.parse.quote(brand)
        del_url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?marca=eq.{quoted_brand}"
        del_req = urllib.request.Request(del_url, headers=HEADERS, method="DELETE")
        try:
            with urllib.request.urlopen(del_req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                count = len(data)
                deleted_total += count
                if count > 0:
                    print(f"  - [{brand}]: Eliminados {count} registros")
        except urllib.error.HTTPError as e:
            print(f"  Error al eliminar {brand}: HTTP {e.code} {e.read().decode('utf-8', errors='ignore')}")

    print(f"Total registros eliminados: {deleted_total}")

    # PASO 3: Reasignar UD TRUCKS y unificar fragmentos/typos
    print("\n[3/4] Reasignando y unificando marcas...")
    for item in REASSIGNMENTS:
        quoted_filter = urllib.parse.quote(item['filter_marca'])
        patch_url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?marca=eq.{quoted_filter}"
        body = json.dumps(item['patch_data']).encode('utf-8')
        patch_req = urllib.request.Request(patch_url, data=body, headers=HEADERS, method="PATCH")
        try:
            with urllib.request.urlopen(patch_req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                print(f"  - {item['description']}: {len(data)} registros actualizados exitosamente")
        except urllib.error.HTTPError as e:
            print(f"  Error en {item['description']}: HTTP {e.code} {e.read().decode('utf-8', errors='ignore')}")

    # PASO 4: Verificación final
    print("\n[4/4] Verificando estado final en la base de datos...")
    verify_veh = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?select=id,marca&offset={offset}&limit=1000"
        req = urllib.request.Request(url, headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            b = json.loads(resp.read().decode('utf-8'))
            verify_veh.extend(b)
            if len(b) < 1000:
                break
            offset += 1000

    from collections import Counter
    final_brands = Counter(v['marca'].strip() for v in verify_veh)

    print(f"Total vehículos ahora en DB: {len(verify_veh)} (Antes: {len(all_veh)}, Diferencia: -{len(all_veh) - len(verify_veh)})")
    print(f"Total marcas únicas ahora: {len(final_brands)} (Antes: 97, Diferencia: -{97 - len(final_brands)})")

    # Comprobar que las marcas eliminadas tienen 0
    still_present = [b for b in BRANDS_TO_DELETE if b in final_brands]
    if not still_present:
        print("  Todas las marcas eliminadas tienen 0 registros.")
    else:
        print(f"  Atención: Aún presentes: {still_present}")

    print(f"  VOLKSWAGEN cuenta ahora con: {final_brands['VOLKSWAGEN']} registros (incluyendo los camiones antes en UD TRUCKS)")
    print(f"  RENAULT cuenta ahora con: {final_brands['RENAULT']} registros (incluyendo los del typo REANULT)")

if __name__ == "__main__":
    main()
