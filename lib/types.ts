export interface Filtro {
  id: number;
  codigo_filtrar: string;
  codigo_normalizado?: string;
  titulo_producto: string | null;
  categoria: string | null;
  marca_filtro: string | null;
  equivalencias: string | null;
  dimensiones: string | null;
  descripcion_aplicacion: string | null;
  precio: number | null;
  imagen_url: string | string[] | null;
  buscador_unificado?: string | null;
  activo?: boolean;
  reemplazo_codigo?: string | null;
  ocultar_precio?: boolean | null;
}

// Interface para los resultados de la búsqueda por vehículo (Tabla B)
export interface ResultadoVehiculo {
  id?: number;
  marca?: string;
  modelo?: string;
  version: string | null;
  año: string | null;
  filtro_asociado: string;
}

// Opciones de filtrado para el explorador del catálogo
export interface FiltrosEstado {
  categoria: string;
  marca_filtro: string;
  busqueda: string;
  orden: 'relevancia' | 'codigo-asc' | 'codigo-desc' | 'precio-asc' | 'precio-desc';
}
