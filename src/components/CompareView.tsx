import React, { useState, useMemo } from 'react';
import { FlightRoute, Airport, FilterState, SavedMap, MapVisualizationMode } from '../types';
import { FlightMap, getAirlineColor } from './FlightMap';
import { extractUniqueAirports } from '../utils/dataParser';
import { exportComparisonToImage, exportComparisonToStandaloneHtml } from '../utils/exporter';
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
} from 'lucide-react';

interface CompareViewProps {
  allRoutes: FlightRoute[];
  savedMaps?: SavedMap[];
  currentMainFilters?: FilterState;
  customAirlineColors?: Record<string, string>;
  activeMapMode?: MapVisualizationMode;
  onMapModeChange?: (mode: MapVisualizationMode) => void;
  onUpdateAirlineColor?: (airline: string, color: string) => void;
  topAirportsRankMap?: Map<string, number>;
}

export const CompareView: React.FC<CompareViewProps> = ({
  allRoutes,
  customAirlineColors,
  activeMapMode = 'routes_by_airline',
  currentMainFilters,
  onMapModeChange,
  onUpdateAirlineColor,
  topAirportsRankMap,
}) => {
  // Sync state between both maps
  const [syncMaps, setSyncMaps] = useState<boolean>(true);
  const [sharedCenter, setSharedCenter] = useState<[number, number]>([23.6345, -102.5528]);
  const [sharedZoom, setSharedZoom] = useState<number>(5);

  // Visualization mode for comparison (synced with parent or local)
  const [compareMapMode, setCompareMapMode] = useState<MapVisualizationMode>(activeMapMode);

  // Configuration for Map A (Left) - Airline selection only (no "guardado")
  const [selectedAirlineA, setSelectedAirlineA] = useState<string>('all');
  const [tileLayerA, setTileLayerA] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Configuration for Map B (Right) - Airline selection only (no "guardado")
  const [selectedAirlineB, setSelectedAirlineB] = useState<string>('all');
  const [tileLayerB, setTileLayerB] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Export states
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngSuccess, setPngSuccess] = useState<boolean>(false);
  const [isExportingHtml, setIsExportingHtml] = useState<boolean>(false);
  const [htmlSuccess, setHtmlSuccess] = useState<boolean>(false);

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

  const handleMapMove = (center: [number, number], zoom: number) => {
    if (syncMaps) {
      setSharedCenter(center);
      setSharedZoom(zoom);
    }
  };

  // Export Side-by-Side as PNG
  const handleExportComparisonPng = async () => {
    try {
      setIsExportingPng(true);
      const modeLabel =
        compareMapMode === 'airports'
          ? 'Modo 1: Aeropuertos y Hubs'
          : compareMapMode === 'routes_by_airline'
          ? 'Modo 2: Rutas Autorizadas por Aerolínea'
          : 'Modo 3: Rutas Únicas y Operador Exclusivo';

      await exportComparisonToImage(
        'compare-view-container',
        `comparativa_dual_${selectedAirlineA}_vs_${selectedAirlineB}_${Date.now()}.png`,
        routesA,
        routesB,
        airportsA,
        airportsB,
        selectedAirlineA === 'all' ? 'Todas las aerolíneas (A)' : selectedAirlineA,
        selectedAirlineB === 'all' ? 'Todas las aerolíneas (B)' : selectedAirlineB,
        customAirlineColors,
        { modeName: modeLabel }
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
              {/* Airline Selector ONLY (No 'guardado', no sheets) */}
              <div className="relative">
                <select
                  id="select-compare-airline-a"
                  value={selectedAirlineA}
                  onChange={(e) => setSelectedAirlineA(e.target.value)}
                  className="bg-slate-950 border border-cyan-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer max-w-[220px] truncate"
                  title="Seleccionar aerolínea para visualizar sus rutas en el Mapa A"
                >
                  <option value="all">Todas las aerolíneas ({allRoutes.length} rutas)</option>
                  {airlineStatsList.map(({ airline, count }) => (
                    <option key={`a-${airline}`} value={airline}>
                      {airline} ({count} rutas)
                    </option>
                  ))}
                </select>
              </div>

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
              tileLayerKey={tileLayerA}
              customAirlineColors={customAirlineColors}
              selectedAirlines={selectedAirlineA === 'all' ? [] : [selectedAirlineA]}
              airportColorOverride={
                selectedAirlineA === 'all'
                  ? '#06b6d4'
                  : getAirlineColor(selectedAirlineA, customAirlineColors)
              }
              topAirportsRankMap={topAirportsRankMap}
              selectedTopN={currentMainFilters?.selectedTopN || null}
              syncCenter={syncMaps ? sharedCenter : null}
              syncZoom={syncMaps ? sharedZoom : null}
              onMapMove={handleMapMove}
              onUpdateAirlineColor={onUpdateAirlineColor}
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
              {/* Airline Selector ONLY (No 'guardado', no sheets) */}
              <div className="relative">
                <select
                  id="select-compare-airline-b"
                  value={selectedAirlineB}
                  onChange={(e) => setSelectedAirlineB(e.target.value)}
                  className="bg-slate-950 border border-purple-500/70 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-purple-400 focus:outline-none cursor-pointer max-w-[220px] truncate"
                  title="Seleccionar aerolínea para visualizar sus rutas en el Mapa B"
                >
                  <option value="all">Todas las aerolíneas ({allRoutes.length} rutas)</option>
                  {airlineStatsList.map(({ airline, count }) => (
                    <option key={`b-${airline}`} value={airline}>
                      {airline} ({count} rutas)
                    </option>
                  ))}
                </select>
              </div>

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
              tileLayerKey={tileLayerB}
              customAirlineColors={customAirlineColors}
              selectedAirlines={selectedAirlineB === 'all' ? [] : [selectedAirlineB]}
              airportColorOverride={
                selectedAirlineB === 'all'
                  ? '#a855f7'
                  : getAirlineColor(selectedAirlineB, customAirlineColors)
              }
              topAirportsRankMap={topAirportsRankMap}
              selectedTopN={currentMainFilters?.selectedTopN || null}
              syncCenter={syncMaps ? sharedCenter : null}
              syncZoom={syncMaps ? sharedZoom : null}
              onMapMove={handleMapMove}
              onUpdateAirlineColor={onUpdateAirlineColor}
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
    </div>
  );
};
