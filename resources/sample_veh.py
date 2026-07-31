"""
Inspect sample filtro_asociado in vehiculos_filtrar
"""

import json
import urllib.request

SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
SUPABASE_KEY = "sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

def supabase_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    print("--- SAMPLE ROWS FROM vehiculos_filtrar ---")
    rows = supabase_get("vehiculos_filtrar?select=id,marca,modelo,version,filtro_asociado&limit=30")
    for r in rows:
        print(f"  ID:{r['id']} | Marca:{r['marca']} | Modelo:{r['modelo']} | Version:{r.get('version')} -> Filtro:{r['filtro_asociado']}")

if __name__ == "__main__":
    main()
