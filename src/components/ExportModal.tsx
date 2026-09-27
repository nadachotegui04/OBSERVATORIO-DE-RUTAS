import React, { useState } from 'react';
import { FlightRoute, Airport } from '../types';
import { exportMapToImage, exportMapToStandaloneHtml } from '../utils/exporter';
import { Download, Image, Code2, Check, Loader2, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: FlightRoute[];
  airports: Airport[];
  mapElementId: string;
  customAirlineColors?: Record<string, string>;
  isAdmin?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  routes,
  airports,
  mapElementId,
  customAirlineColors,
}) => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPNG = async () => {
    try {
      setLoadingType('png');
      await exportMapToImage(
        mapElementId,
        `mapa_rutas_mexico_${Date.now()}.png`,
        routes,
        airports,
        customAirlineColors
      );
      setSuccessType('png');
      setTimeout(() => setSuccessType(null), 2500);
    } catch (err: any) {
      alert('Error al generar imagen del mapa: ' + (err?.message || err));
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportHTML = () => {
    try {
      setLoadingType('html');
      exportMapToStandaloneHtml(routes, airports, 'Visualización de Rutas Aéreas México', customAirlineColors);
      setSuccessType('html');
      setTimeout(() => setSuccessType(null), 2500);
    } catch (err: any) {
      alert('Error al generar HTML interactivo: ' + (err?.message || err));
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Exportar Mapa Cartográfico</h2>
              <p className="text-xs text-slate-400">Descarga tu mapa interactivo en HTML o imagen PNG en alta resolución</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3.5">
          {/* Standalone HTML Option */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 mt-0.5">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  Mapa HTML Interactivo Autónomo
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">Recomendado</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Archivo `.html` listo para compartir. Se abre en cualquier navegador con Leaflet interactivo completo.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportHTML}
              disabled={loadingType === 'html'}
              className="ml-3 shrink-0 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingType === 'html' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : successType === 'html' ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {successType === 'html' ? '¡Descargado!' : 'Descargar HTML'}
            </button>
          </div>

          {/* PNG Image Option */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 hover:border-violet-500/50 rounded-xl transition flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20 mt-0.5">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Imagen PNG en Alta Resolución</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Captura del mapa visible actual con capas, arcos y leyendas para reportes ejecutivos.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportPNG}
              disabled={loadingType === 'png'}
              className="ml-3 shrink-0 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-700"
            >
              {loadingType === 'png' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : successType === 'png' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {successType === 'png' ? '¡Descargado!' : 'Exportar PNG'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
