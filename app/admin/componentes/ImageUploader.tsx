'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, X, CheckCircle2 } from 'lucide-react';

interface ImageUploaderProps {
  currentUrl?: string | null;
  codigo: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
}

export default function ImageUploader({
  currentUrl,
  codigo,
  onImageUploaded,
  onImageRemoved,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [fileInfo, setFileInfo] = useState<{ name: string; sizeKb: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local de previsualización si la prop currentUrl cambia desde el padre
  useEffect(() => {
    const validUrl = (currentUrl && currentUrl !== 'preview' && currentUrl !== '[]' && currentUrl !== 'null') ? currentUrl : null;
    setPreview(validUrl);
  }, [currentUrl]);

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('codigo', codigo || 'PRODUCTO');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error subiendo la imagen');
      }

      setPreview(data.url);
      setFileInfo({ name: data.fileName, sizeKb: data.sizeKb });
      onImageUploaded(data.url);
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError(err.message || 'Error al procesar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onImageRemoved) onImageRemoved();
  };

  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
        IMAGEN DEL PRODUCTO (COMPRESIÓN AUTOMÁTICA WEBP ≤ 100KB)
      </label>

      {preview ? (
        <div className="relative group bg-slate-950 border border-slate-800 rounded-3xl p-4 flex items-center gap-4 overflow-hidden">
          <div className="w-24 h-24 rounded-2xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Imagen subida correctamente</span>
            </div>
            {fileInfo && (
              <p className="text-[11px] font-mono text-slate-400 truncate">
                {fileInfo.name} ({fileInfo.sizeKb} KB - WebP)
              </p>
            )}
            <p className="text-[10px] text-slate-500 truncate max-w-sm">
              {preview}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl border border-red-500/20 transition-all shrink-0"
            title="Quitar imagen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
            uploading
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-slate-800 bg-slate-950/60 hover:border-blue-500/50 hover:bg-slate-950'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-xs font-bold text-slate-300">
                Optimizando y convirtiendo a WebP...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Arrastrá una imagen o hacé click para seleccionar
                </span>
                <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                  Soporta JPG, PNG, WEIC, BMP. Se comprime a WebP automáticamente.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs font-bold text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
