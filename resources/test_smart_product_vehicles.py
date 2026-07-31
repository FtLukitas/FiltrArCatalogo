"""
Test Smart Product Vehicle Resolution
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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get_product_vehicles(code):
    # 1. Collect all codes (product code + clean code + equivalences + clean equivalences)
    codes = set()
    codes.add(code)
    codes.add(code.replace('-', '').replace('_', '').replace(' ', ''))

    # Fetch product info
    p_data = supabase_get(f"productos_filtrar?select=equivalencias&codigo_filtrar=eq.{urllib.parse.quote(code)}")
    if p_data and p_data[0].get('equivalencias'):
        eq_text = p_data[0]['equivalencias']
        parts = eq_text.replace('|', ',').replace(';', ',').split(',')
        for pt in parts:
            c = pt.split(':')[-1].strip()
            if c:
                codes.add(c)
                codes.add(c.replace('-', '').replace('_', '').replace(' ', ''))

    # Fetch equivalencias_cruza
    eq_rows = supabase_get(f"equivalencias_cruza?select=codigo_competidor&producto_codigo=eq.{urllib.parse.quote(code)}")
    for r in eq_rows:
        c = r.get('codigo_competidor')
        if c:
            codes.add(c)
            codes.add(c.replace('-', '').replace('_', '').replace(' ', ''))

    # Filter out empty or short codes (<3 chars)
    valid_codes = [c for c in codes if len(c) >= 3]

    # Query vehiculos_filtrar
    codes_in = ",".join([urllib.parse.quote(c) for c in valid_codes[:30]])
    vehicles = supabase_get(f"vehiculos_filtrar?select=*&filtro_asociado=in.({codes_in})&limit=200")

    return valid_codes, vehicles

def main():
    test_codes = ['OF-03LV', 'AF-2H0V', 'FF-127V', 'MDH 253', 'OF-265C', '8930', 'UL390', 'EFPA587', 'KIT-01']
    for code in test_codes:
        vc, vehs = get_product_vehicles(code)
        print(f"\nProduct '{code}' -> Found {len(vehs)} vehicle applications!")
        for v in vehs[:3]:
            print(f"  * {v['marca']} {v['modelo']} {v.get('version', '')} ({v.get('año', '')})")

if __name__ == "__main__":
    main()
