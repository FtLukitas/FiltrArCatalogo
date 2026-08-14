'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowLeftRight,
  Car,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Filtro } from '@/lib/types';
import { formatearPrecio } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProductos: 0,
    activos: 0,
    inactivos: 0,
    totalEquivalencias: 0,
    totalVehiculos: 0,
  });
  const [ultimosProductos, setUltimosProductos] = useState<Filtro[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch products count
        const { count: totalProds } = await supabase
          .from('productos_filtrar')
          .select('*', { count: 'exact', head: true });

        const { count: activosCount } = await supabase
          .from('productos_filtrar')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true);

        // Fetch equivalences count
        const { count: totalEquivs } = await supabase
          .from('equivalencias_cruza')
          .select('*', { count: 'exact', head: true });

        // Fetch vehicles count
        const { count: totalVehs } = await supabase
          .from('vehiculos_filtrar')
          .select('*', { count: 'exact', head: true });

        // Fetch latest 6 products
        const { data: latestProds } = await supabase
          .from('productos_filtrar')
          .select('*')
          .order('id', { ascending: false })
          .limit(6);

        setStats({
          totalProductos: totalProds || 0,
          activos: activosCount || 0,
          inactivos: (totalProds || 0) - (activosCount || 0),
          totalEquivalencias: totalEquivs || 0,
          totalVehiculos: totalVehs || 0,
        });

        if (latestProds) {
          setUltimosProductos(latestProds as Filtro[]);
        }
      } catch (err) {
        console.error('Error cargando métricas dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-xs font-medium text-slate-400">Cargando métricas del panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Dashboard de Administración
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Resumen operativo del catálogo y acceso rápido a módulos.
          </p>
        </div>

        <Link
          href="/admin/producto/nuevo"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </Link>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* TOTAL PRODUCTOS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Productos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats.totalProductos.toLocaleString()}
          </div>
          <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-400 pt-2 border-t border-slate-800">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stats.activos.toLocaleString()} activos
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {stats.inactivos} inactivos
            </span>
          </div>
        </div>

        {/* EQUIVALENCIAS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Equivalencias
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats.totalEquivalencias.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Cruces cruzados con competidores
          </div>
        </div>

        {/* VEHÍCULOS ASOCIADOS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Aplicaciones Vehiculares
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats.totalVehiculos.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Compatibilidades y aplicaciones
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-2.5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Accesos Rápidos
          </span>
          <div className="space-y-1.5">
            <Link
              href="/admin/productos"
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-xs px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors border border-slate-700/60"
            >
              <span>Gestionar Productos</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/equivalencias"
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-xs px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors border border-slate-700/60"
            >
              <span>Gestionar Equivalencias</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT PRODUCTS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Últimos Productos Registrados
            </h2>
            <p className="text-xs text-slate-400">
              Repuestos agregados o editados recientemente.
            </p>
          </div>

          <Link
            href="/admin/productos"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ultimosProductos.map((p) => (
            <Link
              key={p.id}
              href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 hover:border-blue-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400 group-hover:text-blue-300 block">
                    {p.codigo_filtrar}
                  </span>
                  <h3 className="text-xs font-medium text-white truncate max-w-[180px] mt-0.5">
                    {p.titulo_producto || p.marca_filtro}
                  </h3>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  p.activo !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.activo !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
                <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                  {p.categoria || 'Sin categoría'}
                </span>
                <span className="font-semibold text-white">
                  {formatearPrecio(p.precio)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
