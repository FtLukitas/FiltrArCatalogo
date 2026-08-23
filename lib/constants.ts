// Constantes centralizadas del proyecto FiltrAr Catálogo
// Fuente única de verdad para categorías, marcas y configuración general.

export const WHATSAPP_NUMBER = '5491132881901';

export const CATEGORIAS_FILTRO = [
  'Filtros de Aceite',
  'Filtros de Aire',
  'Filtros de Aire (Línea Pesada)',
  'Filtros de Aire (Paneles)',
  'Filtros de Aire (Redondos)',
  'Filtros de Combustible',
  'Filtros de Habitáculo',
  'Filtros de Inyección',
  'Kits de Filtros',
  'Filtros Varios',
];

// Categorías simplificadas para los filtros de la UI pública (sin subcategorías de aire)
export const CATEGORIAS_UI = [
  'TODOS',
  'Filtros de Aceite',
  'Filtros de Aire',
  'Filtros de Combustible',
  'Filtros de Habitáculo',
  'Filtros de Inyección',
  'Kits de Filtros',
  'Filtros Varios',
];

// Tipos de vehículo para el buscador guiado
export const TIPOS_VEHICULO = [
  {
    id: 'LIVIANO',
    nombre: 'Auto / Camioneta / SUV',
    subtitulo: 'Línea liviana, utilitarios y pickups',
    icon: 'Car',
  },
  {
    id: 'PESADO',
    nombre: 'Camión / Maquinaria / Agro',
    subtitulo: 'Línea pesada, colectivos y tractores',
    icon: 'Truck',
  },
] as const;

export type TipoVehiculo = (typeof TIPOS_VEHICULO)[number]['id'];

