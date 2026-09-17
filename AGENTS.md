# Reglas del Proyecto y Directivas para Agentes — FiltrAr Catálogo

## 🇦🇷 Invariante Crítica de Negocio: Enfoque Exclusivo en el Mercado Argentino

### 1. Principio Fundamental
En todas las tareas de **scraping**, **importación masiva**, **sincronización** o **alta manual/automática** de vehículos y aplicaciones en `vehiculos_filtrar`, se debe respetar **estrictamente el mercado de la República Argentina** (parque automotor liviano, transporte pesado y maquinaria agrícola/vial que realmente se comercializa, circula u opera en el país).

### 2. Reglas Mandatorias de Extracción y Scraping
1. **Marcas Prohibidas (No Argentinas):**
   - Queda estrictamente prohibido incorporar marcas exclusivamente foráneas sin presencia comercial ni parque rodante en Argentina.
   - Ejemplos de marcas prohibidas: `VDL BUS + COACH`, `GINAF`, `OPEL`, `VAUXHALL`, `DACIA`, `KRAMER ALLRAD`, `EVOBUS`, `VAN HOOL`, `DAF TRUCKS`, `SKODA`, `MAN TRUCK`, `ANTONIO CARRARO`, `PEGASO`, `TEMSA`, `AHLMANN`, `BAUTZ`, `BARREIROS`, `AVELING BARFORD`, `ASTRA`, `MACK`, etc.
   - *Validación obligatoria con:* `normalizarMarcaMercadoArgentino(marca)` en `lib/argentinaMarket.ts`.

2. **Modelos Prohibidos (No Comercializados en Argentina):**
   - Aunque una marca tenga presencia en Argentina (ej: Renault, Volkswagen, Fiat, Ford, Peugeot, Citroën, Toyota, Mercedes-Benz), se deben **excluir los modelos que nunca fueron comercializados en el país**:
     - **Renault:** `TALISMAN`, `MODUS`, `AVANTIME`, `VEL SATIS`, `WIND`, `ESPACE`, `DOKKER`, `LODGY`, `KAPTUR (RUSSIA)`, `ARKANA`, `LATITUDE`, `SAFRANE`.
     - **Volkswagen:** `LUPO`, `PHAETON`, `XL1`, `TOURAN`, `CORRADO`, `ARTEON`, `ID.3`, `ID.4`, `EOS`, `FOX (5Z1)` (código europeo).
     - **Fiat:** `MULTIPLA`, `SEDICI`, `CROMA`, `BARCHETTA`, `CINQUECENTO`, `PANDA`, `SEICENTO`, `TALENTO`, `FREEMONT`, `TIPO (356 europeo)`, `ALBEA`, `RITMO`.
     - **Ford:** `B-MAX`, `C-MAX`, `S-MAX`, `SCORPIO`, `STREETKA`, `TOURNEO CONNECT`, `TOURNEO COURIER`, `PUMA (Europeo)`, `FUSION (Europeo)`, `PROBE`.
     - **Peugeot:** `1007`, `107`, `108`, `4007`, `4008`, `806`, `807`, `BIPPER`, `ION`.
     - **Citroën:** `C1`, `C2`, `C6`, `C8`, `NEMO`, `EVASIÓN`, `DISPATCH`, `RELAY`.
     - **Toyota:** `AYGO`, `CENTURY`, `PROACE`, `TOYOACE`, `CARINA E`.
     - **Mercedes-Benz:** `CITAN`, `VIANO`, `W100 PULLMAN`, `W110`, `W120 PONTON`, `MB TRAC`.
     - **Nissan:** `CUBE`, `MICRA V`, `PULSAR`, `INTERSTAR`, `KUBISTAR`, `NV200`, `NV300`, `NV400`, `TIIDA III RUSSIA`.
     - **Chevrolet:** `LUMINA`, `LUMINA APV`, `OPTRA`, `FRONTERA`.

3. **Cero Basura de Catálogos y Números de Pieza:**
   - Nunca almacenar como modelo textos de notas de taller o códigos de repuestos (ej: `17801-62010`, `FAPA8240`, `DESGASIFICADOR`, `DIRECCION HIDRAULICA REEMPLAZADO`, `BALDWIN`, `FLEETGUARD`, `MANN WK`, `TAPA CON REBAJE`).
   - Nunca almacenar modelos con múltiples marcas mezcladas (ej: `VOLKSWAGEN GACEL / VW CARAT / REGATTA MOTOR 1.6`).

4. **Estándar Canónico WEGA:**
   - Toda aplicación vehicular debe almacenarse con la estructura canónica:
     - `marca`: En mayúsculas y canonizada (ej: `VOLKSWAGEN`, `FORD`, `SCANIA`, `JOHN DEERE`).
     - `modelo`: Nombre base del vehículo (ej: `GOL`, `HILUX`, `RANGER`, `CRONOS`).
     - `version`: Motorización o versión específica (ej: `1.6 8v MSI (EA211)`).
     - `año`: Rango de años normalizado (ej: `2016 →`, `2008 → 2012`).
     - `tipo_vehiculo`: `'LIVIANO'` o `'PESADO'`.

5. **Módulo de Referencia de Código:**
   - Utilizar siempre `lib/argentinaMarket.ts` (re-exportado en `lib/normalization.ts`) antes de insertar cualquier registro en `vehiculos_filtrar`:
     ```ts
     import { sanitizarAplicacionMercadoArgentino } from '@/lib/normalization';
     
     const limpio = sanitizarAplicacionMercadoArgentino(marca, modelo, version, año, tipo);
     if (limpio) {
       // Insertar en base de datos
     }
     ```
