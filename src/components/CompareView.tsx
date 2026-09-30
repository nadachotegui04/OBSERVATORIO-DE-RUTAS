import React, { useState, useMemo, useEffect } from 'react';
import { FlightRoute, Airport, FilterState, SavedMap, MapVisualizationMode } from '../types';
import { FlightMap, getAirlineColor } from './FlightMap';
import { AirportConnectionsModal } from './AirportConnectionsModal';
import { extractUniqueAirports } from '../utils/dataParser';
import { exportComparisonToImage, exportComparisonToStandaloneHtml, exportMapToImage, generateExportFilename, getAirlineIataCode } from '../utils/exporter';
import {
  Link2,
  Unlink,
  ArrowRightLeft,
  Building2,
  Plane,
  GitCommit,
  Download,
  Camera,
  Code2,
  Check,
  Loader2,
  Sparkles,
  RotateCcw,
  Palette,
  X,
} from 'lucide-react';

interface CompareViewProps {
  allRoutes: FlightRoute[];
  savedMaps?: SavedMap[];
  currentMainFilters?: FilterState;
  customAirlineColors?: Record<string, string>;
  activeMapMode?: MapVisualizationMode;
  onMapModeChange?: (mode: MapVisualizationMode) => void;
  onUpdateAirlineColor?: (airline: string, color: string) => void;
  showAirportLabels?: boolean;
  onToggleAirportLabels?: (show: boolean) => void;
  iataFontSize?: number;
  onChangeIataFontSize?: (size: number) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  allRoutes,
  customAirlineColors,
  activeMapMode = 'routes_by_airline',
  onMapModeChange,
  onUpdateAirlineColor,
  showAirportLabels = true,
  onToggleAirportLabels,
  iataFontSize = 11,
  onChangeIataFontSize,
}) => {
  // Sync state between both maps: default to FALSE for independent interaction
  const [syncMaps, setSyncMaps] = useState<boolean>(false);
  const [centerA, setCenterA] = useState<[number, number]>([23.6345, -102.5528]);
  const [zoomA, setZoomA] = useState<number>(5);
  const [centerB, setCenterB] = useState<[number, number]>([23.6345, -102.5528]);
  const [zoomB, setZoomB] = useState<number>(5);

  // Visualization mode for comparison: strictly synced with parent activeMapMode
  const [compareMapMode, setCompareMapMode] = useState<MapVisualizationMode>(activeMapMode);

  useEffect(() => {
    if (activeMapMode) {
      setCompareMapMode(activeMapMode);
    }
  }, [activeMapMode]);

  // Configuration for Map A (Left) - Independent airline & airport selection
  const [selectedAirlineA, setSelectedAirlineA] = useState<string>('all');
  const [selectedAirportA, setSelectedAirportA] = useState<string | null>(null);
  const [tileLayerA, setTileLayerA] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Configuration for Map B (Right) - Independent airline & airport selection
  const [selectedAirlineB, setSelectedAirlineB] = useState<string>('all');
  const [selectedAirportB, setSelectedAirportB] = useState<string | null>(null);
  const [tileLayerB, setTileLayerB] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Airport Connections Detail Tab / Modal State
  const [selectedAirportForConnections, setSelectedAirportForConnections] = useState<string | null>(null);
  const [connectionsModalRoutes, setConnectionsModalRoutes] = useState<FlightRoute[]>(allRoutes);

  // Individual Map export states
  const [isExportingPngA, setIsExportingPngA] = useState<boolean>(false);
  const [isExportingPngB, setIsExportingPngB] = useState<boolean>(false);

  // Export states
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngSuccess, setPngSuccess] = useState<boolean>(false);
  const [isExportingHtml, setIsExportingHtml] = useState<boolean>(false);
  const [htmlSuccess, setHtmlSuccess] = useState<boolean>(false);

  // Paleta de Colores Popover State
  const [showColorPalette, setShowColorPalette] = useState<boolean>(false);

  // Extract unique airlines with route counts for quick stats in dropdowns
  const airlineStatsList = useMemo(() => {
    const counts: Record<string, number> = {};
    allRoutes.forEach((r) => {
      if (r.airline && r.airline.trim()) {
        const a = r.airline.trim();
        counts[a] = (counts[a] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([airline, count]) => ({ airline, count }))
      .sort((a, b) => b.count - a.count || a.airline.localeCompare(b.airline));
  }, [allRoutes]);

  // Handle visualization mode change
  const handleModeChange = (mode: MapVisualizationMode) => {
    setCompareMapMode(mode);
    if (onMapModeChange) {
      onMapModeChange(mode);
    }
  };

  // Helper for matching airline reliably (handles casing, trimming and normalized names)
  const matchesAirline = (routeAirline: string, targetAirline: string) => {
    if (!targetAirline || targetAirline === 'all') return true;
    if (!routeAirline) return false;
    const rNorm = routeAirline.trim().toLowerCase();
    const tNorm = targetAirline.trim().toLowerCase();
    if (rNorm === tNorm) return true;
    const rClean = rNorm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tClean = tNorm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return rClean === tClean || rClean.includes(tClean) || tClean.includes(rClean);
  };

  // Filter routes for Map A
  const routesA = useMemo(() => {
    if (selectedAirlineA === 'all') return allRoutes;
    return allRoutes.filter((r) => matchesAirline(r.airline, selectedAirlineA));
  }, [allRoutes, selectedAirlineA]);

  // Filter routes for Map B
  const routesB = useMemo(() => {
    if (selectedAirlineB === 'all') return allRoutes;
    return allRoutes.filter((r) => matchesAirline(r.airline, selectedAirlineB));
  }, [allRoutes, selectedAirlineB]);

  const airportsA = useMemo(() => extractUniqueAirports(routesA), [routesA]);
  const airportsB = useMemo(() => extractUniqueAirports(routesB), [routesB]);

  // Metrics for comparison: strictly Rutas and Aeropuertos (NO pasajeros, NO vuelos)
  const statsA = useMemo(() => {
    return { count: routesA.length, airports: airportsA.length };
  }, [routesA, airportsA]);

  const statsB = useMemo(() => {
    return { count: routesB.length, airports: airportsB.length };
  }, [routesB, airportsB]);

  const routeDelta = statsB.count - statsA.count;
  const airportDelta = statsB.airports - statsA.airports;

  const handleMapMoveA = (center: [number, number], zoom: number) => {
    setCenterA(center);
    setZoomA(zoom);
    if (syncMaps) {
      setCenterB(center);
      setZoomB(zoom);
    }
  };

  const handleMapMoveB = (center: [number, number], zoom: number) => {
    setCenterB(center);
    setZoomB(zoom);
    if (syncMaps) {
      setCenterA(center);
      setZoomA(zoom);
    }
  };

  const handleExportMapA = async () => {
    try {
      setIsExportingPngA(true);
      const filename = generateExportFilename({
        prefix: 'mapa_A',
        routes: routesA,
        selectedAirlines: selectedAirlineA === 'all' ? [] : [selectedAirlineA],
        extension: 'png',
      });
      await exportMapToImage(
        'map-compare-a',
        filename,
        routesA,
        airportsA,
        customAirlineColors,
        compareMapMode
      );
    } catch (err: any) {
      console.error('Error exportando Mapa A:', err);
    } finally {
      setIsExportingPngA(false);
    }
  };

  const handleExportMapB = async () => {
    try {
      setIsExportingPngB(true);
      const filename = generateExportFilename({
        prefix: 'mapa_B',
        routes: routesB,
        selectedAirlines: selectedAirlineB === 'all' ? [] : [selectedAirlineB],
        extension: 'png',
      });
      await exportMapToImage(
        'map-compare-b',
        filename,
        routesB,
        airportsB,
        customAirlineColors,
        compareMapMode
      );
    } catch (err: any) {
      console.error('Error exportando Mapa B:', err);
    } finally {
      setIsExportingPngB(false);
    }
  };

  // Export Side-by-Side as PNG
  const handleExportComparisonPng = async () => {
    try {
      setIsExportingPng(true);
      const filename = generateExportFilename({
        prefix: 'comparativa_dual',
        airlineA: selectedAirlineA,
        airlineB: selectedAirlineB,
        isDual: true,
        extension: 'png',
      });
      await exportComparisonToImage(
        'compare-view-container',
        filename,
        routesA,
        routesB,
        airportsA,
        airportsB,
        selectedAirlineA === 'all' ? 'Todas las aerolíneas (A)' : selectedAirlineA,
        selectedAirlineB === 'all' ? 'Todas las aerolíneas (B)' : selectedAirlineB,
        customAirlineColors,
        compareMapMode
      );
      setPngSuccess(true);
      setTimeout(() => setPngSuccess(false), 2500);
    } catch (err: any) {
      alert('Error al exportar imagen comparativa: ' + (err?.message || err));
    } finally {
      setIsExportingPng(false);
    }
  };

  // Export Side-by-Side as standalone HTML
  const handleExportComparisonHtml = () => {
    try {
      setIsExportingHtml(true);
      exportComparisonToStandaloneHtml(
        routesA,
        routesB,
        airportsA,
        airportsB,
        selectedAirlineA === 'all' ? 'Todas las aerolíneas' : selectedAirlineA,
        selectedAirlineB === 'all' ? 'Todas las aerolíneas' : selectedAirlineB,
        `Comparativa GIS: ${selectedAirlineA === 'all' ? 'Todas' : selectedAirlineA} vs ${selectedAirlineB === 'all' ? 'Todas' : selectedAirlineB}`,
        customAirlineColors
      );
      setHtmlSuccess(true);
      setTimeout(() => setHtmlSuccess(false), 2500);
    } catch (err: any) {
      alert('Error al exportar HTML comparativo: ' + (err?.message || err));
    } finally {
      setIsExportingHtml(false);
    }
  };

  return (
    <div
      id="compare-view-container"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden"
    >
      {/* Top Comparison Analytics Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              Modo Comparativo Side-by-Side
              <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800 font-mono">
                Dual GIS
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Compara directamente 2 aerolíneas o redes aéreas con sus respectivos colores asignados
            </p>
          </div>
        </div>

        {/* Center: Linked Visualization Mode Switcher (1. Aeropuertos, 2. Rutas, 3. Rutas Únicas) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleModeChange('airports')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              compareMapMode === 'airports'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-850'
            }`}
            title="Comparar en Modo 1: Aeropuertos y Hubs con redes radiales"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">1. Aeropuertos y Hub</span>
            <span className="md:hidden">1. Hubs</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('routes_by_airline')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              compareMapMode === 'routes_by_airline'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-850'
            }`}
            title="Comparar en Modo 2: Rutas Autorizadas con arcos cromáticos por aerolínea"
          >
            <Plane className="w-3.5 h-3.5" />
            <span className="hidden md:inline">2. Rutas Autorizadas</span>
            <span className="md:hidden">2. Rutas</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('unique_routes')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              compareMapMode === 'unique_routes'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-850'
            }`}
            title="Comparar en Modo 3: Rutas Únicas y exclusividad de tramos"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span className="hidden md:inline">3. Rutas Únicas</span>
            <span className="md:hidden">3. Únicas</span>
          </button>
        </div>

        {/* Right Side: Strictly Rutas and Aeropuertos delta (NO pasajeros, NO vuelos) + Synchronize + Direct Exports */}
        <div className="flex items-center gap-2 text-xs">
          {/* Rutas Delta (Exclusivo, sin pasajeros ni vuelos) */}
          <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Rutas:</span>
            <span className="font-mono font-bold text-slate-200">
              {statsA.count} vs {statsB.count}
            </span>
            <span
              className={`text-[11px] font-bold ${
                routeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({routeDelta >= 0 ? `+${routeDelta}` : routeDelta})
            </span>
          </div>

          {/* Aeropuertos Delta */}
          <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 hidden lg:flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Aeropuertos:</span>
            <span className="font-mono font-bold text-slate-200">
              {statsA.airports} vs {statsB.airports}
            </span>
            <span
              className={`text-[11px] font-bold ${
                airportDelta >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              ({airportDelta >= 0 ? `+${airportDelta}` : airportDelta})
            </span>
          </div>

          {/* Synchronize Zoom/Pan Toggle */}
          <button
            type="button"
            onClick={() => setSyncMaps(!syncMaps)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              syncMaps
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Sincronizar desplazamiento y zoom entre ambos mapas"
          >
            {syncMaps ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{syncMaps ? 'Zoom Sincronizado' : 'Zoom Libre'}</span>
          </button>

          {/* Color Palette Popover Button */}
          <div className="relative">
            <button
              type="button"
              id="btn-toggle-compare-color-palette"
              onClick={() => setShowColorPalette(!showColorPalette)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                showColorPalette
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
              }`}
              title="Abrir selector y paleta de colores por aerolínea"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Colores de Aerolínea</span>
            </button>

            {showColorPalette && (
              <div className="absolute right-0 top-full mt-2 z-[600] w-80 sm:w-96 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Control de Colores por Aerolínea
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColorPalette(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 mb-3 leading-snug">
                  Modifica dinámicamente el color asignado a cada aerolínea. El cambio se refleja en tiempo real en la interfaz y en todas las descargas PNG/HTML.
                </p>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {airlineStatsList.map(({ airline, count }) => {
                    const currentColor = getAirlineColor(airline, customAirlineColors);
                    const iata = getAirlineIataCode(airline);
                    const isCustom = Boolean(customAirlineColors?.[airline]);

                    return (
                      <div
                        key={`palette-${airline}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => onUpdateAirlineColor?.(airline, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0 block shrink-0"
                            title={`Cambiar color de ${airline}`}
                          />
                          <span className="font-mono text-[10px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/80 font-bold shrink-0">
                            [{iata}]
                          </span>
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {airline}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-slate-400 uppercase">
                            {currentColor}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({count})
                          </span>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => onUpdateAirlineColor?.(airline, '')}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                              title="Restablecer color por defecto"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export Dual Comparison Buttons */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              type="button"
              id="btn-export-comparison-png"
              onClick={handleExportComparisonPng}
              disabled={isExportingPng}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar imagen PNG de la comparativa side-by-side con viñeta de colores"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : pngSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">PNG Dual</span>
            </button>

            <button
              type="button"
              id="btn-export-comparison-html"
              onClick={handleExportComparisonHtml}
              disabled={isExportingHtml}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              title="Descargar archivo HTML interactivo con ambos mapas en paralelo y viñeta cromática"
            >
              {isExportingHtml ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : htmlSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Code2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">HTML Dual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Map Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 relative overflow-hidden">
        {/* MAP A (LEFT PANE) */}
        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Header Controls for Map A */}
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="text-xs font-black text-white uppercase tracking-wider truncate">
                Mapa A:
              </span>
              {selectedAirlineA !== 'all' && (
                <span
                  className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                  style={{ backgroundColor: getAirlineColor(selectedAirlineA, customAirlineColors) }}
                  title={`Color asignado a ${selectedAirlineA}`}
                />
              )}
              <span className="text-xs font-bold text-cyan-300 truncate">
                {selectedAirlineA === 'all' ? 'Todas las aerolíneas' : selectedAirlineA}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {/* Airline Selector */}
              <div className="relative">
                <select
                  id="select-compare-airline-a"
                  value={selectedAirlineA}
                  onChange={(e) => setSelectedAirlineA(e.target.value)}
                  className="bg-slate-950 border border-cyan-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer max-w-[170px] truncate"
                  title="Seleccionar aerolínea para visualizar sus rutas en el Mapa A"
                >
                  <option value="all">Todas las aerolíneas ({allRoutes.length})</option>
                  {airlineStatsList.map(({ airline, count }) => (
                    <option key={`a-${airline}`} value={airline}>
                      [{getAirlineIataCode(airline)}] {airline} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Picker for selected airline in Map A */}
              {selectedAirlineA !== 'all' && (
                <div
                  className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-cyan-500/50 shadow-sm"
                  title={`Color asignado a ${selectedAirlineA}. Haz clic para modificarlo.`}
                >
                  <input
                    id="color-picker-compare-a"
                    type="color"
                    value={getAirlineColor(selectedAirlineA, customAirlineColors)}
                    onChange={(e) => onUpdateAirlineColor?.(selectedAirlineA, e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                    title={`Cambiar color de ${selectedAirlineA}`}
                  />
                  <span className="font-mono text-[10px] text-cyan-300 hidden sm:inline uppercase">
                    {getAirlineColor(selectedAirlineA, customAirlineColors)}
                  </span>
                  {customAirlineColors?.[selectedAirlineA] && (
                    <button
                      type="button"
                      onClick={() => onUpdateAirlineColor?.(selectedAirlineA, '')}
                      className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                      title="Restablecer color por defecto"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {compareMapMode === 'airports' && (
                <select
                  value={selectedAirportA || ''}
                  onChange={(e) => setSelectedAirportA(e.target.value || null)}
                  className="bg-slate-950 border border-cyan-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2 py-1 max-w-[150px] truncate cursor-pointer"
                  title="Seleccionar aeropuerto o hub para ver conexiones radiales en Mapa A"
                >
                  <option value="">Todos ({airportsA.length} aeropuertos)</option>
                  {airportsA.map(a => (
                    <option key={`sel-a-${a.code}`} value={a.code}>{a.code} - {a.name || a.city}</option>
                  ))}
                </select>
              )}

              {selectedAirlineA !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedAirlineA('all')}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Restablecer a todas las aerolíneas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <select
                value={tileLayerA}
                onChange={(e) => setTileLayerA(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 cursor-pointer"
              >
                <option value="dark">Radar Oscuro</option>
                <option value="light">Cartográfico Claro</option>
                <option value="satellite">Satélite</option>
                <option value="topo">Terreno</option>
              </select>

              <button
                type="button"
                id="btn-export-map-a-png"
                onClick={handleExportMapA}
                disabled={isExportingPngA}
                title="Descargar captura PNG únicamente del Mapa A"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isExportingPngA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">PNG A</span>
              </button>
            </div>
          </div>

          {/* Map A Component */}
          <div className="flex-1 relative">
            <FlightMap
              id="map-compare-a"
              routes={routesA}
              allRoutes={allRoutes}
              airports={airportsA}
              mapMode={compareMapMode}
              selectedAirportCode={selectedAirportA}
              onSelectAirport={(code) => setSelectedAirportA(prev => prev === code ? null : code)}
              onOpenAirportConnections={(code) => {
                setSelectedAirportForConnections(code);
                setConnectionsModalRoutes(routesA);
              }}
              tileLayerKey={tileLayerA}
              customAirlineColors={customAirlineColors}
              selectedAirlines={selectedAirlineA === 'all' ? [] : [selectedAirlineA]}
              syncCenter={syncMaps ? centerA : null}
              syncZoom={syncMaps ? zoomA : null}
              onMapMove={handleMapMoveA}
              onUpdateAirlineColor={onUpdateAirlineColor}
              isComparePane={true}
              compareAirlineColor={
                selectedAirlineA === 'all'
                  ? '#06b6d4'
                  : getAirlineColor(selectedAirlineA, customAirlineColors)
              }
              showAirportLabels={showAirportLabels}
              onToggleAirportLabels={onToggleAirportLabels}
              iataFontSize={iataFontSize}
              onChangeIataFontSize={onChangeIataFontSize}
            />

            {/* Selected Airline floating KPI card on Map A */}
            <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/60 text-xs shadow-xl flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70 shrink-0"
                style={{
                  backgroundColor:
                    selectedAirlineA === 'all'
                      ? '#06b6d4'
                      : getAirlineColor(selectedAirlineA, customAirlineColors),
                }}
              />
              <span className="font-bold text-white truncate max-w-[140px]">
                {selectedAirlineA === 'all' ? 'Red Completa' : selectedAirlineA}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-cyan-300 font-mono">{routesA.length}</span>
              <span className="text-slate-400 text-[10px]">rutas</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-200 font-mono">{airportsA.length}</span>
              <span className="text-slate-400 text-[10px]">aeropuertos</span>
            </div>
          </div>
        </div>

        {/* MAP B (RIGHT PANE) */}
        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Header Controls for Map B */}
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-purple-400 shrink-0"></span>
              <span className="text-xs font-black text-white uppercase tracking-wider truncate">
                Mapa B:
              </span>
              {selectedAirlineB !== 'all' && (
                <span
                  className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                  style={{ backgroundColor: getAirlineColor(selectedAirlineB, customAirlineColors) }}
                  title={`Color asignado a ${selectedAirlineB}`}
                />
              )}
              <span className="text-xs font-bold text-purple-300 truncate">
                {selectedAirlineB === 'all' ? 'Todas las aerolíneas' : selectedAirlineB}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {/* Airline Selector */}
              <div className="relative">
                <select
                  id="select-compare-airline-b"
                  value={selectedAirlineB}
                  onChange={(e) => setSelectedAirlineB(e.target.value)}
                  className="bg-slate-950 border border-purple-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-purple-400 focus:outline-none cursor-pointer max-w-[170px] truncate"
                  title="Seleccionar aerolínea para visualizar sus rutas en el Mapa B"
                >
                  <option value="all">Todas las aerolíneas ({allRoutes.length})</option>
                  {airlineStatsList.map(({ airline, count }) => (
                    <option key={`b-${airline}`} value={airline}>
                      [{getAirlineIataCode(airline)}] {airline} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Picker for selected airline in Map B */}
              {selectedAirlineB !== 'all' && (
                <div
                  className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-purple-500/50 shadow-sm"
                  title={`Color asignado a ${selectedAirlineB}. Haz clic para modificarlo.`}
                >
                  <input
                    id="color-picker-compare-b"
                    type="color"
                    value={getAirlineColor(selectedAirlineB, customAirlineColors)}
                    onChange={(e) => onUpdateAirlineColor?.(selectedAirlineB, e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 block"
                    title={`Cambiar color de ${selectedAirlineB}`}
                  />
                  <span className="font-mono text-[10px] text-purple-300 hidden sm:inline uppercase">
                    {getAirlineColor(selectedAirlineB, customAirlineColors)}
                  </span>
                  {customAirlineColors?.[selectedAirlineB] && (
                    <button
                      type="button"
                      onClick={() => onUpdateAirlineColor?.(selectedAirlineB, '')}
                      className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                      title="Restablecer color por defecto"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {compareMapMode === 'airports' && (
                <select
                  value={selectedAirportB || ''}
                  onChange={(e) => setSelectedAirportB(e.target.value || null)}
                  className="bg-slate-950 border border-purple-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2 py-1 max-w-[150px] truncate cursor-pointer"
                  title="Seleccionar aeropuerto o hub para ver conexiones radiales en Mapa B"
                >
                  <option value="">Todos ({airportsB.length} aeropuertos)</option>
                  {airportsB.map(b => (
                    <option key={`sel-b-${b.code}`} value={b.code}>{b.code} - {b.name || b.city}</option>
                  ))}
                </select>
              )}

              {selectedAirlineB !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedAirlineB('all')}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Restablecer a todas las aerolíneas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <select
                value={tileLayerB}
                onChange={(e) => setTileLayerB(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 cursor-pointer"
              >
                <option value="dark">Radar Oscuro</option>
                <option value="light">Cartográfico Claro</option>
                <option value="satellite">Satélite</option>
                <option value="topo">Terreno</option>
              </select>

              <button
                type="button"
                id="btn-export-map-b-png"
                onClick={handleExportMapB}
                disabled={isExportingPngB}
                title="Descargar captura PNG únicamente del Mapa B"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-purple-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isExportingPngB ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">PNG B</span>
              </button>
            </div>
          </div>

          {/* Map B Component */}
          <div className="flex-1 relative">
            <FlightMap
              id="map-compare-b"
              routes={routesB}
              allRoutes={allRoutes}
              airports={airportsB}
              mapMode={compareMapMode}
              selectedAirportCode={selectedAirportB}
              onSelectAirport={(code) => setSelectedAirportB(prev => prev === code ? null : code)}
              onOpenAirportConnections={(code) => {
                setSelectedAirportForConnections(code);
                setConnectionsModalRoutes(routesB);
              }}
              tileLayerKey={tileLayerB}
              customAirlineColors={customAirlineColors}
              selectedAirlines={selectedAirlineB === 'all' ? [] : [selectedAirlineB]}
              syncCenter={syncMaps ? centerB : null}
              syncZoom={syncMaps ? zoomB : null}
              onMapMove={handleMapMoveB}
              onUpdateAirlineColor={onUpdateAirlineColor}
              isComparePane={true}
              compareAirlineColor={
                selectedAirlineB === 'all'
                  ? '#c084fc'
                  : getAirlineColor(selectedAirlineB, customAirlineColors)
              }
              showAirportLabels={showAirportLabels}
              onToggleAirportLabels={onToggleAirportLabels}
              iataFontSize={iataFontSize}
              onChangeIataFontSize={onChangeIataFontSize}
            />

            {/* Selected Airline floating KPI card on Map B */}
            <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/60 text-xs shadow-xl flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70 shrink-0"
                style={{
                  backgroundColor:
                    selectedAirlineB === 'all'
                      ? '#a855f7'
                      : getAirlineColor(selectedAirlineB, customAirlineColors),
                }}
              />
              <span className="font-bold text-white truncate max-w-[140px]">
                {selectedAirlineB === 'all' ? 'Red Completa' : selectedAirlineB}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-purple-300 font-mono">{routesB.length}</span>
              <span className="text-slate-400 text-[10px]">rutas</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-200 font-mono">{airportsB.length}</span>
              <span className="text-slate-400 text-[10px]">aeropuertos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Airport Connections Detail Tab / Modal within Compare View */}
      <AirportConnectionsModal
        airportCode={selectedAirportForConnections}
        routes={connectionsModalRoutes}
        onClose={() => setSelectedAirportForConnections(null)}
        getAirlineColor={(airline) => getAirlineColor(airline, customAirlineColors)}
      />
    </div>
  );
};
