"""
Full Maxfil Official Catalog Scraper
====================================
Scrapes all 910 products from https://www.maxfil.com.ar/productos
Extracts:
- Code, Category (Aire, Aceite, Combustible, Antipolen)
- Official WebP Image URL
- Detailed Vehicle & Equipment Applications
- Technical Dimensions Table (alto, ancho, largo, Ø ext, Ø int, rosca, tipo, observacion)
Saves structured JSON preview in backups/ without touching the database.
"""

import urllib.request
import urllib.error
from html.parser import HTMLParser
import re
import json
import concurrent.futures
import time
from datetime import datetime
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

CATEGORIES = [
    {'id': '174', 'name': 'AIRE', 'canon_cat': 'Filtros de Aire (Línea Pesada)'},
    {'id': '173', 'name': 'ACEITE', 'canon_cat': 'Filtros de Aceite'},
    {'id': '172', 'name': 'COMBUSTIBLE', 'canon_cat': 'Filtros de Combustible'},
    {'id': '183', 'name': 'ANTIPOLEN', 'canon_cat': 'Filtros de Habitáculo'}
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_cell = False
        self.current_cell = []
        self.current_row = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
        elif self.in_table and tag in ('td', 'th'):
            self.in_cell = True
            self.current_cell = []
        elif self.in_table and tag == 'tr':
            self.current_row = []

    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_table = False
        elif self.in_table and tag in ('td', 'th'):
            self.in_cell = False
            self.current_row.append(''.join(self.current_cell).strip())
        elif self.in_table and tag == 'tr':
            if self.current_row:
                self.rows.append(self.current_row)

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)

def fetch_product_detail(prod):
    pid = prod['id']
    url = prod['detalle_url']
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Extract applications
            m_app = re.search(r'APLICACIONES:([\s\S]*?)PRESUPUESTAR', html)
            apps = []
            if m_app:
                app_text = re.sub(r'<[^>]+>', '\n', m_app.group(1))
                raw_lines = [re.sub(r'\s+', ' ', l).strip() for l in app_text.split('\n')]
                apps = [l for l in raw_lines if l and not l.startswith('MAXFIL') and l != 'APLICACIONES:']

            # Extract dimensions table
            parser = TableParser()
            parser.feed(html)
            
            dimensions = {}
            if len(parser.rows) >= 2:
                headers = parser.rows[0]
                values = parser.rows[1]
                for h, v in zip(headers, values):
                    h_clean = h.strip()
                    v_clean = v.strip()
                    if v_clean and v_clean != '-':
                        dimensions[h_clean] = v_clean

            # Check for extra images (slider/nav)
            extra_imgs = re.findall(r'<img[^>]*src=["\'](https://www\.maxfil\.com\.ar/storage/productos/[^"\']+)["\']', html)
            all_imgs = list(dict.fromkeys([prod['imagen_url']] + extra_imgs))

            return {
                **prod,
                'status': 'OK',
                'aplicaciones': apps,
                'dimensiones': dimensions,
                'imagenes': all_imgs
            }
    except Exception as e:
        return {
            **prod,
            'status': 'ERROR',
            'error': str(e),
            'aplicaciones': [],
            'dimensiones': {},
            'imagenes': [prod['imagen_url']]
        }

def main():
    print("=========================================================")
    print("  MAXFIL SCRAPER OFICIAL — https://www.maxfil.com.ar")
    print("=========================================================")
    
    # 1. Collect product cards from 4 categories
    print("\n[1/3] Descargando listado de productos de las 4 categorías...")
    products = []
    
    for cat in CATEGORIES:
        url = f"https://www.maxfil.com.ar/productos/{cat['id']}"
        print(f"  -> Conectando a {cat['name']} ({url})...")
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        cards = re.findall(
            r'onclick=[\'"]window\.location=[\'"]https://www\.maxfil\.com\.ar/producto/(\d+)[\'"][\s\S]*?<img\s+src=[\'"]([^\'"]+)[\'"][\s\S]*?>([A-Za-z0-9/\.\-]+)</div>',
            html
        )
        print(f"     Encontrados: {len(cards)} repuestos")
        
        for pid, img_url, code in cards:
            code_clean = code.strip().replace('&nbsp;', '')
            if not code_clean:
                continue
            products.append({
                'id': pid,
                'codigo': code_clean,
                'categoria_web': cat['name'],
                'categoria_canon': cat['canon_cat'],
                'categoria_id': cat['id'],
                'imagen_url': img_url,
                'detalle_url': f"https://www.maxfil.com.ar/producto/{pid}"
            })

    # Deduplicate by product ID
    unique_prods = {}
    for p in products:
        unique_prods[p['id']] = p
    all_products = list(unique_prods.values())
    print(f"\nTotal productos únicos extraídos: {len(all_products)}")

    # 2. Scrape detail pages in parallel
    print(f"\n[2/3] Scrapeando fichas técnicas y aplicaciones de {len(all_products)} productos en paralelo (16 workers)...")
    start_time = time.time()
    
    detailed_results = []
    completed = 0
    total = len(all_products)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(fetch_product_detail, p): p for p in all_products}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            detailed_results.append(res)
            completed += 1
            if completed % 100 == 0 or completed == total:
                elapsed = time.time() - start_time
                print(f"  Progreso: {completed}/{total} completados ({elapsed:.1f}s, {completed/elapsed:.1f} req/s)...")

    total_time = time.time() - start_time
    print(f"\nScraping completado en {total_time:.2f} segundos!")

    # 3. Save raw output to backups/
    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = f"backups/maxfil_official_catalog_scraped_{timestamp}.json"
    
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(detailed_results, f, ensure_ascii=False, indent=2)
    print(f"\n[3/3] Archivo completo guardado en: {out_file}")

    # 4. Summary metrics
    ok_count = sum(1 for r in detailed_results if r['status'] == 'OK')
    err_count = sum(1 for r in detailed_results if r['status'] != 'OK')
    total_apps = sum(len(r['aplicaciones']) for r in detailed_results)
    prods_with_dims = sum(1 for r in detailed_results if len(r['dimensiones']) > 0)
    prods_with_imgs = sum(1 for r in detailed_results if len(r['imagenes']) > 0)
    
    print("\n================ MÉTRICAS OBTENIDAS ================")
    print(f"Total productos escaneados: {len(detailed_results)}")
    print(f"Fichas técnicas exitosas:   {ok_count} (Errores: {err_count})")
    print(f"Total aplicaciones extraídas: {total_apps}")
    print(f"Productos con dimensiones técnicas: {prods_with_dims}")
    print(f"Productos con imágenes oficiales WebP: {prods_with_imgs}")
    print("====================================================")

if __name__ == "__main__":
    main()
