"""
Find exact filtro_asociado for popular vehicles
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
    for m in ['Amarok', 'Hilux', 'Ranger', 'Gol', 'Corsa']:
        rows = supabase_get(f"vehiculos_filtrar?select=*&modelo=ilike.*{m}*&limit=10")
        print(f"\n=== VEHICLES MATCHING '{m}' ({len(rows)} found) ===")
        for r in rows:
            print(f"  [{r['marca']}] {r['modelo']} | Version: {r.get('version')} | Filtro: '{r.get('filtro_asociado')}'")

if __name__ == "__main__":
    main()
