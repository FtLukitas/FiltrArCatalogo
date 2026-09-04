import urllib.request
import urllib.error
import json
import sys
import os
import re
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

# 1. PURE HEAVY BRANDS (27 brands)
PURE_HEAVY_BRANDS = {
    'AGCO', 'AGRALE', 'BOBCAT', 'CASE', 'CATERPILLAR', 'CLAAS',
    'DEUTZ-AGRALE', 'DEUTZ', 'DEUTZ AGRALE', 'DIMEX', 'DON ROQUE', 'EL DETALLE',
    'HELI', 'INTERNATIONAL', 'IVECO', 'JCB', 'JOHN DEERE', 'KOMATSU',
    'KUBOTA', 'LIEBHERR', 'MASSEY FERGUSON', 'NEW HOLLAND',
    'PAUNY', 'PUMA', 'RENAULT TRUCKS', 'SCANIA', 'VALTRA',
    'VASALLI', 'ZANELLO'
}

# 2. PURE LIGHT BRANDS (28 brands)
PURE_LIGHT_BRANDS = {
    'ALFA ROMEO', 'ASIA', 'AUDI', 'BMW', 'CHERY', 'CHRYSLER',
    'CITROEN', 'DAEWOO', 'DAIHATSU', 'DS', 'GEELY', 'HONDA',
    'JAC', 'JAGUAR', 'JEEP', 'KIA', 'LAND ROVER', 'LIFAN',
    'MAZDA', 'MINI', 'PEUGEOT', 'PORSCHE', 'RAM', 'SEAT',
    'SMART', 'SSANG YONG', 'SUBARU', 'SUZUKI'
}

MB_LIVIANO_REGEX = re.compile(
    r'\b(SPRINTER|VITO|VIANO|CITAN|CLASE\s+[ABCESGV]|GLA|GLB|GLC|GLE|GLS|GLK|ML|SLK|CLS|290\s*GD|300\s*GD|350\s*GD|300\s*TD\s*SERIE\s*S\s*124|V\s*230)\b',
    re.IGNORECASE
)

VOLVO_LIVIANO_MODELS = [
    'S40', 'V50', 'C30', 'V40', '850', '940', 'XC60', 'XC70', 'S70', 'S80',
    'V70', 'C70', 'C-S40', '240', '740', '760', '960'
]

def classify_vehicle(marca: str, modelo: str) -> str:
    m_clean = (marca or '').strip().upper()
    mod_clean = (modelo or '').strip().upper()

    if m_clean in PURE_HEAVY_BRANDS:
        return 'PESADO'
    if m_clean in PURE_LIGHT_BRANDS:
        return 'LIVIANO'

    if m_clean == 'MERCEDES-BENZ':
        return 'LIVIANO' if MB_LIVIANO_REGEX.search(mod_clean) else 'PESADO'

    if m_clean == 'VOLKSWAGEN':
        vw_heavy = [
            'CONSTELLATION', 'COSNTELLATION', 'DELIVERY', 'WORKER', 'METEOR', 'TITAN', 'VOLKSBUS', 'BUS',
            'SERIE 2000', 'CAMIÓN', '13.170', '13.180', '15.180', '15.190', '17.220', '17.230', '17.240',
            '17.250', '17.260', '18.310', '18.320', '19.320', '19.370', '24.220', '24.250',
            '26.260', '31.260', '31.320', '31.370', '8.150', '9.150', '16220', '17220', '26260'
        ]
        return 'PESADO' if any(k in mod_clean for k in vw_heavy) else 'LIVIANO'

    if m_clean == 'FORD':
        ford_heavy = [
            'CARGO', 'F-14000', 'F 14000', 'F14000', 'F-12000', 'F 12000', 'F12000',
            'F-4000', 'F 4000', 'F4000', 'F-600', 'F 600', 'F-700', 'F 700', 'F 6000', 'F 7000',
            'F-3500', 'F 350', 'F-350', '1723', '1933', '2042', '2842', 'CAMION', 'CAMIÓN', 'CUMMINS'
        ]
        return 'PESADO' if any(k in mod_clean for k in ford_heavy) else 'LIVIANO'

    if m_clean == 'CHEVROLET':
        chevy_heavy = [
            'CAMIÓN', 'CAMION', '14000', '14-190', '15-190', '16-220', '6-100', '6-150',
            'KODIAK', 'D 40', 'D-40', 'NPR', 'RACOR'
        ]
        return 'PESADO' if any(k in mod_clean for k in chevy_heavy) else 'LIVIANO'

    if m_clean == 'FIAT':
        fiat_heavy = ['AGRI', 'ALLIS', 'TRACTOR', 'TRACTORES', 'CAMIONES', 'SOMECA', ' 411', ' 66', '619', '697', 'IVECO']
        return 'PESADO' if any(k in mod_clean for k in fiat_heavy) else 'LIVIANO'

    if m_clean == 'RENAULT':
        ren_heavy = ['TRUCKS', 'KERAX', 'MAGNUM', 'MIDLINER', 'MIDLUM', 'PREMIUM', 'CAMION', 'CAMIONES']
        return 'PESADO' if any(k in mod_clean for k in ren_heavy) else 'LIVIANO'

    if m_clean == 'VOLVO':
        return 'LIVIANO' if any(k in mod_clean for k in VOLVO_LIVIANO_MODELS) else 'PESADO'

    if m_clean == 'TOYOTA':
        toy_heavy = ['AUTOELEVADOR', 'COASTER', 'DYNA']
        return 'PESADO' if any(k in mod_clean for k in toy_heavy) else 'LIVIANO'

    if m_clean == 'HYUNDAI':
        hyun_heavy = ['CAMION', 'H65', 'H72', 'H75', 'HD', 'MINIBUS COUNTRY']
        return 'PESADO' if any(k in mod_clean for k in hyun_heavy) else 'LIVIANO'

    if m_clean == 'ISUZU':
        isuzu_heavy = ['NKR', 'NPR', 'NQR', 'FORWARD', 'CAMION']
        return 'PESADO' if any(k in mod_clean for k in isuzu_heavy) else 'LIVIANO'

    if m_clean == 'MITSUBISHI':
        mits_heavy = ['CANTER', 'FUSO']
        return 'PESADO' if any(k in mod_clean for k in mits_heavy) else 'LIVIANO'

    if m_clean == 'NISSAN':
        nissan_heavy = ['AUTOELEVADOR', 'CAMIÓN', 'CATERPILLAR', 'CPB', 'CPPRIMARIO', 'CPSECUNDARIO', 'ISUZU-GMC']
        return 'PESADO' if any(k in mod_clean for k in nissan_heavy) else 'LIVIANO'

    if m_clean == 'DODGE':
        dodge_heavy = ['CAMIÓN C 38', 'C 38 T', 'FARGO']
        return 'PESADO' if any(k in mod_clean for k in dodge_heavy) else 'LIVIANO'

    if m_clean == 'TATA':
        tata_heavy = ['608', '609']
        return 'PESADO' if any(k in mod_clean for k in tata_heavy) else 'LIVIANO'

    return 'LIVIANO'

def update_batch(ids, target_type):
    if not ids:
        return 0
    id_list = ",".join(str(i) for i in ids)
    url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?id=in.({id_list})"
    payload = json.dumps({"tipo_vehiculo": target_type}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 204):
                return len(ids)
            else:
                print(f"Error HTTP {resp.status} actualizando {len(ids)} filas")
                return 0
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8', errors='replace')
        print(f"HTTPError {e.code}: {err_content}")
        raise e

def main():
    dry_run = "--dry-run" in sys.argv
    print(f"=== INICIANDO RE-CATALOGACIÓN DE VEHÍCULOS (Dry Run: {dry_run}) ===")
    
    # 1. Cargar todos los vehículos
    all_veh = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/vehiculos_filtrar?select=id,marca,modelo,tipo_vehiculo&offset={offset}&limit=1000"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as resp:
            b = json.loads(resp.read().decode('utf-8'))
            all_veh.extend(b)
            if len(b) < 1000:
                break
            offset += 1000

    print(f"Total vehículos cargados: {len(all_veh)}")

    to_pesado_ids = []
    to_liviano_ids = []

    for v in all_veh:
        m = v.get('marca', '')
        mod = v.get('modelo', '')
        curr = v.get('tipo_vehiculo')
        prop = classify_vehicle(m, mod)

        if curr != prop:
            if prop == 'PESADO':
                to_pesado_ids.append(v['id'])
            else:
                to_liviano_ids.append(v['id'])

    print(f"Filas a actualizar a PESADO : {len(to_pesado_ids)}")
    print(f"Filas a actualizar a LIVIANO: {len(to_liviano_ids)}")
    print(f"Total filas a actualizar    : {len(to_pesado_ids) + len(to_liviano_ids)}")

    if dry_run:
        print("Dry run finalizado con éxito. No se realizaron cambios.")
        return

    # 2. Ejecutar batches de actualización
    batch_size = 100
    
    print("\n--- Actualizando a PESADO ---")
    pesado_updated = 0
    for i in range(0, len(to_pesado_ids), batch_size):
        chunk = to_pesado_ids[i:i + batch_size]
        cnt = update_batch(chunk, 'PESADO')
        pesado_updated += cnt
        print(f"  Progreso PESADO: {pesado_updated}/{len(to_pesado_ids)} actualizados...")

    print("\n--- Actualizando a LIVIANO ---")
    liviano_updated = 0
    for i in range(0, len(to_liviano_ids), batch_size):
        chunk = to_liviano_ids[i:i + batch_size]
        cnt = update_batch(chunk, 'LIVIANO')
        liviano_updated += cnt
        print(f"  Progreso LIVIANO: {liviano_updated}/{len(to_liviano_ids)} actualizados...")

    print(f"\n¡ÉXITO TOTAL! Registros actualizados: {pesado_updated + liviano_updated}")

if __name__ == '__main__':
    main()
