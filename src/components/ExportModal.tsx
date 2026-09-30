import React, { useState } from 'react';
import { FlightRoute, Airport, MapVisualizationMode } from '../types';
import {
  exportMapToImage,
  exportMapToStandaloneHtml,
  exportComparisonToImage,
  exportComparisonToStandaloneHtml,
  generateExportFilename,
} from '../utils/exporter';
import { getAirlineColor } from './FlightMap';
import {
  Download,
  Image,
  Code2,
  Check,
  Loader2,
  X,
  Palette,
  ArrowRightLeft,
  Building2,
  Plane,
  GitCommit,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: FlightRoute[];
  allRoutes?: FlightRoute[];
  airports: Airport[];
  activeView?: 'single' | 'compare' | 'table';
  activeMapMode?: MapVisualizationMode;
  mapElementId?: string;
  customAirlineColors?: Record<string, string>;
  selectedAirlines?: string[];
  isAdmin?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  routes,
  allRoutes = [],
  airports,
  activeView = 'single',
  activeMapMode = 'routes_by_airline',
  mapElementId = 'main-flight-map',
  customAirlineColors,
  selectedAirlines = [],
}) => {
  const [selectedExportScope, setSelectedExportScope] = useState<'current' | 'compare' | 'mode1' | 'mode2' | 'mode3'>(
    activeView === 'compare' ? 'compare' : 'current'
  );
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<string | null>(null);

  if (!isOpen) return null;

  const datasetRoutes = allRoutes && allRoutes.length > 0 ? allRoutes : routes;
  const uniqueAirlines: string[] = Array.from(new Set(datasetRoutes.map((r) => r.airline))).filter(Boolean) as string[];

  const handleExportPNG = async () => {
    try {
      setLoadingType('png');

      if (selectedExportScope === 'compare' || (activeView === 'compare' && selectedExportScope === 'current')) {
        // Export Dual Comparison View
        const filename = generateExportFilename({
          prefix: 'comparativa_side_by_side',
          routes,
          selectedAirlines,
          extension: 'png',
          isDual: true,
        });
        await exportComparisonToImage(
          'compare-view-container',
          filename,
          routes,
          datasetRoutes,
          airports,
          airports,
          'Mapa A',
          'Mapa B',
          customAirlineColors,
          activeMapMode
        );
      } else {
        // Single map export for chosen visualization mode
        const targetElement = document.getElementById('main-flight-map') ? 'main-flight-map' : mapElementId;
        const filename = generateExportFilename({
          prefix: `mapa_rutas_mexico_${selectedExportScope}`,
          routes,
          selectedAirlines,
          extension: 'png',
        });
        await exportMapToImage(
          targetElement,
          filename,
          routes,
          airports,
          customAirlineColors,
          activeMapMode
        );
      }

      setSuccessType('png');
      setTimeout(() => setSuccessType(null), 2500);
    } catch (err: any) {
      alert('Error al generar imagen PNG: ' + (err?.message || err));
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportHTML = () => {
    try {
      setLoadingType('html');

      if (selectedExportScope === 'compare' || (activeView === 'compare' && selectedExportScope === 'current')) {
        // Export Standalone HTML for Dual Comparison
        exportComparisonToStandaloneHtml(
          routes,
          datasetRoutes,
          airports,
          airports,
          'Mapa A',
          'Mapa B',
          'Comparativa Side-by-Side de Rutas Aéreas México',
          customAirlineColors
        );
      } else {
        // Export Standalone HTML for Single Map
        let titleMode = 'Visualización de Rutas Aéreas México';
        if (selectedExportScope === 'mode1' || activeMapMode === 'airports') titleMode = '1. Aeropuertos y Hubs - México';
        else if (selectedExportScope === 'mode2' || activeMapMode === 'routes_by_airline') titleMode = '2. Rutas Autorizadas por Aerolínea - México';
        else if (selectedExportScope === 'mode3' || activeMapMode === 'unique_routes') titleMode = '3. Rutas Únicas y Exclusividad - México';

        exportMapToStandaloneHtml(routes, airports, titleMode, customAirlineColors, selectedAirlines);
      }

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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Exportar y Descargar Mapa</h2>
              <p className="text-xs text-slate-400">
                Descarga en HTML interactivo autónomo o imagen PNG en alta definición con viñeta cromática
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope / Mode Selector */}
        <div className="px-6 pt-4 pb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Selecciona el modo de visualización a descargar:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedExportScope('current')}
              className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                selectedExportScope === 'current'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Descargar exactamente la vista actual en pantalla"
            >
              <span>Vista Actual</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedExportScope('mode1')}
              className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                selectedExportScope === 'mode1'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="1. Aeropuertos y Hub"
            >
              <Building2 className="w-3 h-3 shrink-0" />
              <span>1. Hubs</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedExportScope('mode2')}
              className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                selectedExportScope === 'mode2'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="2. Rutas Autorizadas por Aerolínea"
            >
              <Plane className="w-3 h-3 shrink-0" />
              <span>2. Rutas</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedExportScope('compare')}
              className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                selectedExportScope === 'compare'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Comparativo Side-by-Side: Ambos mapas en paralelo"
            >
              <ArrowRightLeft className="w-3 h-3 shrink-0" />
              <span>Comparativa</span>
            </button>
          </div>
        </div>

        {/* Color Vignette Guarantee Notice */}
        <div className="px-6 py-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
            <Palette className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-200 block">
                Viñeta Cromática Incluida ({uniqueAirlines.length} Aerolíneas):
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Cada aerolínea cuenta con un color único e individual para distinguir claramente sus rutas en la descarga.
              </p>
              {/* Mini color swatches preview */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {uniqueAirlines.slice(0, 10).map((airline) => {
                  const color = getAirlineColor(airline, customAirlineColors);
                  return (
                    <span
                      key={airline}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate max-w-[80px]">{airline}</span>
                    </span>
                  );
                })}
                {uniqueAirlines.length > 10 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{uniqueAirlines.length - 10} más
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 py-3 space-y-3">
          {/* Standalone HTML Option */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 mt-0.5 shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  Mapa HTML Interactivo Autónomo
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                    Recomendado
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedExportScope === 'compare'
                    ? 'Archivo HTML con los dos mapas side-by-side en paralelo, zoom sincronizado y viñeta cromática completa.'
                    : 'Archivo .html completo con mapa Leaflet, arcos geodésicos interactivos, popups y viñeta de aerolíneas.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleExportHTML}
              disabled={loadingType === 'html'}
              className="ml-3 shrink-0 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
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
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-violet-500/50 rounded-xl transition flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20 mt-0.5 shrink-0">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Imagen PNG en Alta Resolución (2K / 3.2K)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedExportScope === 'compare'
                    ? 'Captura en ultra alta resolución de ambos mapas lado a lado con títulos, métricas y viñeta cromática.'
                    : 'Captura cartográfica nítida con arcos de vuelo, nodos aeroportuarios y viñeta de colores para reportes ejecutivos.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleExportPNG}
              disabled={loadingType === 'png'}
              className="ml-3 shrink-0 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-700"
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
