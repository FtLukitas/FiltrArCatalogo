'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  title: string;
  message?: string;
}

interface AdminToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export default function AdminToast({ toast, onClose }: AdminToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-md">
      <div className={`p-4 rounded-2xl border shadow-2xl flex items-start gap-3 bg-slate-900 ${
        isSuccess ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
      }`}>
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-white tracking-tight">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {toast.message}
            </p>
          )}
        </div>

        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
