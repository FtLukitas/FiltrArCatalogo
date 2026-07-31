"""
Inspect filtro_asociado in vehiculos_filtrar
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
    print("--- AMAROK VEHICLES IN vehiculos_filtrar ---")
    amarok = supabase_get("vehiculos_filtrar?select=*&marca=eq.VOLKSWAGEN&modelo=ilike.Amarok*&limit=20")
    for v in amarok:
        print(f"  {v['marca']} | {v['modelo']} | {v.get('version')} | filtro_asociado = '{v['filtro_asociado']}'")

    print("\n--- HILUX VEHICLES IN vehiculos_filtrar ---")
    hilux = supabase_get("vehiculos_filtrar?select=*&marca=eq.TOYOTA&modelo=ilike.Hilux*&limit=20")
    for v in hilux:
        print(f"  {v['marca']} | {v['modelo']} | {v.get('version')} | filtro_asociado = '{v['filtro_asociado']}'")

if __name__ == "__main__":
    main()
