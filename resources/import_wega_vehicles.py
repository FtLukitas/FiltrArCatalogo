"""
ETL Script V2: Import Wega Vehicle Database into Supabase vehiculos_filtrar
=============================================================================
- Maps Wega vehicle filter codes to OUR OWN product codes (productos_filtrar.codigo_filtrar)
- ONLY imports vehicle rows that have at least one matching product in our catalog
- Uses own product code for filtro_asociado so FK constraint IS RESPECTED
- Populates equivalencias_cruza with WEGA mappings
"""

import csv
import json
import urllib.request
import urllib.error
import sys
import re

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://qrqqnutkldmtyljtgwxm.supabase.co"
SUPABASE_KEY = "sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln"

WEGA_VEHICLES_CSV = r"E:\FiltrAR_ListasV2\Wega DB\Wega_Tabla_B_Vehiculos.csv"
WEGA_EQUIV_CSV    = r"E:\FiltrAR_ListasV2\Wega DB\Wega_Tabla_Equivalencias.csv"

BATCH_SIZE = 400

HEADERS_JSON = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def supabase_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def supabase_get_all(table, select="*", extra_filters=""):
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        path = f"{table}?select={select}&limit={page_size}&offset={offset}{extra_filters}"
        status, data = supabase_get(path)
        if status != 200 or not isinstance(data, list):
            print(f"  ERROR fetching {table}: status={status}")
            break
        all_rows.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return all_rows


def supabase_post(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS_JSON, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def supabase_delete(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers=HEADERS_JSON, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def normalize_code(code):
    if not code:
        return ""
    return re.sub(r'[-_/\s]', '', code.strip().upper())


# ─── PHASE 1: Load Wega Vehicle CSV ──────────────────────────────────────────

def load_wega_vehicles():
    vehicles = []
    with open(WEGA_VEHICLES_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            marca = (row.get('marca') or '').strip()
            modelo = (row.get('modelo') or '').strip()
            version = (row.get('version') or '').strip() or None
            año = (row.get('año') or '').strip() or None
            filtro = (row.get('filtro_asociado') or '').strip()

            if not marca or not modelo or not filtro:
                continue

            if filtro.lower() in ('filtro_asociado', 'aceite', 'aire', 'combustible', 'habitaculo'):
                continue

            vehicles.append({
                "marca": marca,
                "modelo": modelo,
                "version": version,
                "año": año,
                "filtro_asociado": filtro,
            })
    return vehicles


# ─── PHASE 2: Load Wega Equivalences ─────────────────────────────────────────

def load_wega_equivalences():
    mapping = {}
    with open(WEGA_EQUIV_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            wega = (row.get('wega') or '').strip()
            if not wega:
                continue
            
            fram_codes = [c.strip() for c in (row.get('fram') or '').split('|') if c.strip()]
            mann_codes = [c.strip() for c in (row.get('mann') or '').split('|') if c.strip()]
            oem_codes  = [c.strip() for c in (row.get('oem') or '').split('|') if c.strip()]
            
            mapping[wega] = {
                'fram': fram_codes,
                'mann': mann_codes,
                'oem': oem_codes,
            }
    return mapping


# ─── PHASE 3: Build Wega→Product mapping ──────────────────────────────────────

def build_wega_to_product_map(wega_equiv, existing_equiv, existing_products):
    """
    Chain: 
    1. Check if Wega code matches existing_products directly
    2. Check if Wega code is in existing_equiv
    3. Check Wega equivalences table (FRAM, MANN, OEM) -> existing_equiv -> product_code
    """
    competitor_to_product = {}
    for eq in existing_equiv:
        comp_code = eq.get('codigo_competidor', '').strip()
        comp_norm = eq.get('codigo_competidor_normalizado', '').strip()
        prod_code = eq.get('producto_codigo', '').strip()
        if comp_code and prod_code:
            key = normalize_code(comp_code)
            if key not in competitor_to_product:
                competitor_to_product[key] = set()
            competitor_to_product[key].add(prod_code)
        if comp_norm and prod_code:
            key2 = normalize_code(comp_norm)
            if key2 not in competitor_to_product:
                competitor_to_product[key2] = set()
            competitor_to_product[key2].add(prod_code)

    product_codes = {p['codigo_filtrar'] for p in existing_products}
    
    wega_to_products = {}
    
    # Check all unique wega codes from equiv + vehicles
    all_wega_codes = set(wega_equiv.keys())

    matched = 0
    for wega_code in all_wega_codes:
        products = set()
        key_wega = normalize_code(wega_code)

        # 1. Direct match with own product code
        if wega_code in product_codes:
            products.add(wega_code)

        # 2. Direct match in existing equivalencias_cruza
        if key_wega in competitor_to_product:
            products.update(competitor_to_product[key_wega])

        # 3. Match via Wega equivalences table (FRAM, MANN, OEM)
        if wega_code in wega_equiv:
            eq = wega_equiv[wega_code]
            for fc in eq['fram']:
                k = normalize_code(fc)
                if k in competitor_to_product:
                    products.update(competitor_to_product[k])
            for mc in eq['mann']:
                k = normalize_code(mc)
                if k in competitor_to_product:
                    products.update(competitor_to_product[k])
            for oc in eq['oem']:
                k = normalize_code(oc)
                if k in competitor_to_product:
                    products.update(competitor_to_product[k])

        if products:
            wega_to_products[wega_code] = products
            matched += 1

    print(f"  Mapped {matched} Wega codes to own products")
    return wega_to_products


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  WEGA VEHICLE DATABASE → SUPABASE IMPORT (FILTERED FOR OWN PRODUCTS)")
    print("=" * 70)

    # ── Step 1: Load CSVs ────────────────────────────────────────────────────
    print("\n[1/6] Loading Wega vehicles CSV...")
    vehicles = load_wega_vehicles()
    print(f"  ✓ Loaded {len(vehicles)} vehicle rows")

    print("\n[2/6] Loading Wega equivalences CSV...")
    wega_equiv = load_wega_equivalences()
    print(f"  ✓ Loaded {len(wega_equiv)} Wega equivalence entries")

    # Add any vehicle filter codes to wega_equiv if not present
    for v in vehicles:
        f_code = v['filtro_asociado']
        if f_code not in wega_equiv:
            wega_equiv[f_code] = {'fram': [], 'mann': [], 'oem': []}

    # ── Step 2: Fetch existing data from Supabase ───────────────────────────
    print("\n[3/6] Fetching existing products & equivalencias from Supabase...")
    existing_products = supabase_get_all("productos_filtrar", select="codigo_filtrar")
    print(f"  ✓ Fetched {len(existing_products)} existing products")

    existing_equiv = supabase_get_all("equivalencias_cruza", 
        select="producto_codigo,marca_competidor,codigo_competidor,codigo_competidor_normalizado")
    print(f"  ✓ Fetched {len(existing_equiv)} existing equivalences")

    # ── Step 3: Build Wega→Product map ───────────────────────────────────────
    print("\n[4/6] Building Wega → Own Product mapping...")
    wega_to_products = build_wega_to_product_map(wega_equiv, existing_equiv, existing_products)

    # Prepare rows for vehiculos_filtrar using ONLY OWN PRODUCT CODES
    vehicle_rows_to_insert = []
    seen = set()

    for v in vehicles:
        wega_code = v['filtro_asociado']
        if wega_code in wega_to_products:
            for own_prod_code in wega_to_products[wega_code]:
                # Skip KIT codes (Kits are specific bundles for designated vehicle models)
                if own_prod_code.startswith('KIT'):
                    continue

                key = (v['marca'], v['modelo'], v['version'] or '', v['año'] or '', own_prod_code)
                if key not in seen:
                    seen.add(key)
                    vehicle_rows_to_insert.append({
                        "marca": v['marca'],
                        "modelo": v['modelo'],
                        "version": v['version'],
                        "año": v['año'],
                        "filtro_asociado": own_prod_code,
                    })

    print(f"  ✓ Generated {len(vehicle_rows_to_insert)} vehicle-product association rows")

    # Marcas & Modelos counts
    marcas_set = {r['marca'] for r in vehicle_rows_to_insert}
    modelos_set = {(r['marca'], r['modelo']) for r in vehicle_rows_to_insert}
    print(f"  ✓ Total unique Marcas with products: {len(marcas_set)}")
    print(f"  ✓ Total unique Modelos with products: {len(modelos_set)}")

    # ── Step 4: Delete existing vehiculos_filtrar ────────────────────────────
    print("\n[5/6] Replacing vehiculos_filtrar data...")
    print("  Deleting all existing rows...")
    status, body = supabase_delete("vehiculos_filtrar?id=gt.0")
    print(f"  DELETE status: {status}")

    # ── Step 5: Insert vehicle rows in batches ───────────────────────────────
    print(f"\n[6/6] Inserting {len(vehicle_rows_to_insert)} vehicle rows in batches of {BATCH_SIZE}...")
    inserted = 0
    errors = 0
    for i in range(0, len(vehicle_rows_to_insert), BATCH_SIZE):
        batch = vehicle_rows_to_insert[i:i + BATCH_SIZE]
        status, body = supabase_post("vehiculos_filtrar", batch)
        if status in (200, 201):
            inserted += len(batch)
        else:
            errors += 1
            print(f"\n  ✗ Batch {i//BATCH_SIZE+1} FAILED (status={status}): {body[:200]}")
        
        pct = (inserted * 100) // len(vehicle_rows_to_insert)
        sys.stdout.write(f"\r  Progress: {inserted}/{len(vehicle_rows_to_insert)} ({pct}%) inserted, {errors} errors")
        sys.stdout.flush()

    print(f"\n\n  ✓ DONE! Inserted {inserted} vehicle rows into vehiculos_filtrar")

    # ── Step 6: Insert WEGA equivalences into equivalencias_cruza ────────────
    print("\n[BONUS] Syncing Wega equivalences into equivalencias_cruza...")
    status, _ = supabase_delete("equivalencias_cruza?marca_competidor=eq.WEGA")

    new_equivs = []
    seen_eq = set()
    for wega_code, products in wega_to_products.items():
        norm = normalize_code(wega_code)
        for prod in products:
            eq_key = (prod, wega_code)
            if eq_key not in seen_eq:
                seen_eq.add(eq_key)
                new_equivs.append({
                    "producto_codigo": prod,
                    "marca_competidor": "WEGA",
                    "codigo_competidor": wega_code,
                    "codigo_competidor_normalizado": norm,
                })

    if new_equivs:
        eq_inserted = 0
        for i in range(0, len(new_equivs), BATCH_SIZE):
            batch = new_equivs[i:i + BATCH_SIZE]
            status, body = supabase_post("equivalencias_cruza", batch)
            if status in (200, 201):
                eq_inserted += len(batch)
        print(f"  ✓ Inserted {eq_inserted} WEGA equivalences")

    print("\n" + "=" * 70)
    print("  SUCCESSFULLY UPDATED VEHICLE DATABASE!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
