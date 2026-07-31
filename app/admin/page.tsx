'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowLeftRight,
  Car,
  Plus,
  Loader2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Tag,
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
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs font-bold text-slate-400">Cargando métricas del panel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            DASHBOARD DE ADMINISTRACIÓN
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Resumen general del catálogo y acceso rápido a tareas.
          </p>
        </div>

        <Link
          href="/admin/producto/nuevo"
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </Link>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PRODUCTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Total Productos
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.totalProductos.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stats.activos} activos
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {stats.inactivos} inactivos
            </span>
          </div>
        </div>

        {/* EQUIVALENCIAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Equivalencias
            </span>
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.totalEquivalencias.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold text-slate-400 pt-1 border-t border-slate-800/80">
            WEGA, FRAM, MANN, OEM
          </div>
        </div>

        {/* VEHÍCULOS ASOCIADOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Vehículos Asociados
            </span>
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.totalVehiculos.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold text-slate-400 pt-1 border-t border-slate-800/80">
            61 marcas · 1,276 modelos
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-3">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Acciones Rápidas
          </span>
          <div className="space-y-2">
            <Link
              href="/admin/productos"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center justify-between transition-all"
            >
              <span>Gestionar Productos</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/equivalencias"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center justify-between transition-all"
            >
              <span>Gestionar Equivalencias</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT PRODUCTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              ÚLTIMOS PRODUCTOS REGISTRADOS
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Los productos agregados o modificados recientemente.
            </p>
          </div>

          <Link
            href="/admin/productos"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ultimosProductos.map((p) => (
            <Link
              key={p.id}
              href={`/admin/producto/${encodeURIComponent(p.codigo_filtrar)}`}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 hover:border-blue-500/50 hover:bg-slate-950 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-black text-blue-400 group-hover:text-blue-300 block">
                    {p.codigo_filtrar}
                  </span>
                  <h3 className="text-xs font-bold text-white truncate max-w-[180px] mt-0.5">
                    {p.titulo_producto || p.marca_filtro}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  p.activo !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.activo !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-xs">
                <span className="font-bold text-slate-400 text-[11px] truncate max-w-[120px]">
                  {p.categoria || 'Sin cat.'}
                </span>
                <span className="font-black text-white">
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
