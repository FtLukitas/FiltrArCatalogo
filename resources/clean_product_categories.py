"""
Clean & Normalize Product Categories in Supabase productos_filtrar
"""

import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
SUPABASE_KEY = "sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def supabase_patch(table, id_val, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{id_val}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    url = f"{SUPABASE_URL}/rest/v1/productos_filtrar?select=id,categoria,codigo_filtrar&limit=5000"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        prods = json.loads(resp.read().decode())

    fixed = 0
    cat_map = {
        'aceite': 'Filtros de Aceite',
        'habitaculo': 'Filtros de Habitáculo',
        'HABITACULO': 'Filtros de Habitáculo',
        'Inyección Common Rail': 'Filtros de Inyección',
    }

    for p in prods:
        c = p.get('categoria')
        if c in cat_map:
            new_cat = cat_map[c]
            status, body = supabase_patch('productos_filtrar', p['id'], {'categoria': new_cat})
            if status in (200, 204):
                fixed += 1
                print(f"Fixed product {p['codigo_filtrar']}: '{c}' -> '{new_cat}'")

    print(f"Total product categories normalized: {fixed}")

if __name__ == "__main__":
    main()
