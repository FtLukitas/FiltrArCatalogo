"""
Veracity Audit Script for FiltrAR Catalog
=========================================
Audits vehicle-to-product associations in Supabase `vehiculos_filtrar`
against catalog entries in `productos_filtrar` and `equivalencias_cruza`.
"""

import json
import urllib.request
import urllib.error
import sys

SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
SUPABASE_KEY = "sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

def supabase_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def supabase_get_all(table):
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if not data or not isinstance(data, list):
                    break
                all_rows.extend(data)
                if len(data) < page_size:
                    break
                offset += page_size
        except Exception as e:
            print(f"Error fetching {table}: {e}")
            break
    return all_rows

def main():
    print("=" * 70)
    print("  FILTRAR CATALOG DATA VERACITY AUDIT")
    print("=" * 70)

    # 1. Total counts
    veh_data = supabase_get_all("vehiculos_filtrar")
    prod_data = supabase_get_all("productos_filtrar")
    equiv_data = supabase_get_all("equivalencias_cruza")

    print(f"\n[1] Total Records Loaded from Supabase:")
    print(f"    - vehiculos_filtrar: {len(veh_data)} entries")
    print(f"    - productos_filtrar: {len(prod_data)} entries")
    print(f"    - equivalencias_cruza: {len(equiv_data)} entries")

    prod_map = {p['codigo_filtrar']: p for p in prod_data}
    equiv_map = {}
    for eq in equiv_data:
        p_code = eq['producto_codigo']
        if p_code not in equiv_map:
            equiv_map[p_code] = []
        equiv_map[p_code].append(f"{eq['marca_competidor']}:{eq['codigo_competidor']}")

    # 2. Check for broken links (filtro_asociado not in productos_filtrar)
    orphans = [v for v in veh_data if v['filtro_asociado'] not in prod_map]
    print(f"\n[2] Association Integrity Check:")
    print(f"    - Valid associations: {len(veh_data) - len(orphans)} / {len(veh_data)}")
    print(f"    - Orphan/Broken links: {len(orphans)}")

    # 3. Sample verification for top popular vehicles
    popular_samples = [
        ("VOLKSWAGEN", "AMAROK"),
        ("TOYOTA", "HILUX"),
        ("FORD", "RANGER"),
        ("CHEVROLET", "S10"),
        ("CHEVROLET", "CORSA"),
        ("VOLKSWAGEN", "GOL"),
        ("PEUGEOT", "208"),
        ("RENAULT", "KANGOO"),
        ("FIAT", "TORO"),
    ]

    print(f"\n[3] Popular Vehicle Application Breakdown:")
    sample_report = []

    for marca_target, modelo_target in popular_samples:
        matches = [v for v in veh_data if v['marca'] == marca_target and (v['modelo'] or '').upper().startswith(modelo_target)]
        sample_report.append(f"\n--- {marca_target} {modelo_target} (Total matches: {len(matches)}) ---")
        
        # Group by version
        ver_map = {}
        for m in matches:
            ver = f"{m['modelo']} {m['version'] or ''}".strip()
            if ver not in ver_map:
                ver_map[ver] = []
            ver_map[ver].append(m['filtro_asociado'])

        for ver, codes in list(ver_map.items())[:3]: # show top 3 versions
            sample_report.append(f"  * Version: {ver}")
            for c in codes[:4]: # show up to 4 filters
                prod_info = prod_map.get(c, {})
                cat = prod_info.get('categoria', 'Sin Categoria')
                title = prod_info.get('titulo_producto', 'Sin Titulo')
                eqs = ", ".join(equiv_map.get(c, [])[:3])
                sample_report.append(f"    -> [{cat}] Code: {c} ({title}) | Cross-Equivs: [{eqs}]")

    print("\n".join(sample_report[:45]))

    print("\n" + "=" * 70)
    print("  VERACITY AUDIT COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()
