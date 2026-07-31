import { Loader2 } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Cargando catálogo...
        </span>
      </div>
    </div>
  );
}
