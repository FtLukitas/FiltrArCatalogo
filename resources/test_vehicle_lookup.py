"""
Test Vehicle Lookup for Product Detail Page
"""

import json
import urllib.request
import urllib.parse

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
            return json.loads(resp.read().decode())
    except Exception as e:
        print("Error:", e)
        return []

def get_vehicles_for_product(code):
    # 1. Collect target codes
    target_codes = set()
    target_codes.add(code)
    target_codes.add(code.replace('-', '').replace('_', '').replace(' ', ''))

    # 2. Get equivalences
    equivs = supabase_get(f"equivalencias_cruza?select=codigo_competidor&producto_codigo=eq.{urllib.parse.quote(code)}")
    for eq in equivs:
        c = eq.get('codigo_competidor')
        if c:
            target_codes.add(c)
            target_codes.add(c.replace('-', '').replace('_', '').replace(' ', ''))

    print(f"Product: {code} | Looking for {len(target_codes)} target codes: {list(target_codes)[:6]}")

    # 3. Query vehiculos_filtrar with IN operator
    codes_str = ",".join([urllib.parse.quote(c) for c in target_codes])
    vehicles = supabase_get(f"vehiculos_filtrar?select=*&filtro_asociado=in.({codes_str})&limit=100")
    print(f"Found {len(vehicles)} vehicles for product {code}!")

    for v in vehicles[:5]:
        print(f"  -> {v['marca']} {v['modelo']} {v.get('version', '')} ({v.get('año', '')}) [Matched via: {v['filtro_asociado']}]")

def main():
    test_products = ['OF-03LV', 'AF-2H0V', 'FF-127V', 'MDH 253', 'OF-265C', '8930', 'JFO-0211', 'WOE-680', 'UL300', 'KIT-01']
    for p in test_products:
        print("\n" + "-" * 60)
        get_vehicles_for_product(p)

if __name__ == "__main__":
    main()
