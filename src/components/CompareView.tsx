import React, { useState, useMemo, useEffect } from 'react';
import { FlightRoute, Airport, FilterState, SavedMap, MapVisualizationMode } from '../types';
import { FlightMap, getAirlineColor } from './FlightMap';
import { AirportConnectionsModal } from './AirportConnectionsModal';
import { extractUniqueAirports } from '../utils/dataParser';
import { getTopAirports } from '../utils/hubHelper';
import {
  exportComparisonToImage,
  exportComparisonToStandaloneHtml,
  exportMapToImage,
  generateExportFilename,
  getAirlineIataCode,
} from '../utils/exporter';
import {
  Link2,
  Unlink,
  ArrowRightLeft,
  Building2,
  Plane,
  GitCommit,
  Camera,
  Code2,
  Check,
  Loader2,
  Sparkles,
  RotateCcw,
  Palette,
  X,
  Trophy,
  Sliders,
  Filter,
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
  onSelectRoute?: (route: FlightRoute) => void;
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
  onSelectRoute,
}) => {
  // Sync state between both maps: default to false for independent pan/zoom
  const [syncMaps, setSyncMaps] = useState<boolean>(false);
  const [centerA, setCenterA] = useState<[number, number]>([23.6345, -102.5528]);
  const [zoomA, setZoomA] = useState<number>(5);
  const [centerB, setCenterB] = useState<[number, number]>([23.6345, -102.5528]);
  const [zoomB, setZoomB] = useState<number>(5);

  // Global Hub and Airport metadata
  const allAirports = useMemo(() => extractUniqueAirports(allRoutes), [allRoutes]);
  const top15Airports = useMemo(() => getTopAirports(allRoutes, allAirports, 15), [allRoutes, allAirports]);
  const top4Hubs = useMemo(() => top15Airports.slice(0, 4), [top15Airports]);

  const topAirportsRankMap = useMemo(() => {
    const map = new Map<string, number>();
    top15Airports.forEach((hub, idx) => {
      map.set(hub.code, idx + 1);
    });
    return map;
  }, [top15Airports]);

  // Corridor airline count map (used for single vs shared corridors)
  const corridorAllAirlinesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allRoutes.forEach((r) => {
      const [a, b] = [r.originCode, r.destCode].sort();
      const key = `${a} <-> ${b}`;
      if (!map.has(key)) map.set(key, new Set<string>());
      map.get(key)!.add(r.airline.trim().toLowerCase());
    });
    return map;
  }, [allRoutes]);

  // Available unique airlines sorted
  const availableAirlines = useMemo(() => {
    return Array.from(new Set(allRoutes.map((r) => r.airline)))
      .filter((a): a is string => Boolean(a))
      .sort((a, b) => a.localeCompare(b));
  }, [allRoutes]);

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

  // =========================================================================
  // MAP A CONFIGURATION & INDEPENDENT STATE
  // =========================================================================
  const [modeA, setModeA] = useState<MapVisualizationMode>(activeMapMode === 'airports' ? 'airports' : 'unique_routes');
  const [uniqueAnalysisModeA, setUniqueAnalysisModeA] = useState<'general' | 'specific'>('general');
  const [selectedAirlinesA, setSelectedAirlinesA] = useState<string[]>([]);
  const [versusFilteredAirlinesA, setVersusFilteredAirlinesA] = useState<boolean>(false);
  const [selectedHubCodeA, setSelectedHubCodeA] = useState<string | null>(null);
  const [selectedTopNA, setSelectedTopNA] = useState<number | null>(null);
  const [selectedAirportCodeA, setSelectedAirportCodeA] = useState<string | null>(null);
  const [mode3GeneralShowSingleA, setMode3GeneralShowSingleA] = useState<boolean>(true);
  const [mode3GeneralShowMultiA, setMode3GeneralShowMultiA] = useState<boolean>(true);
  const [tileLayerA, setTileLayerA] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');
  const [showAirportLabelsA, setShowAirportLabelsA] = useState<boolean>(showAirportLabels);
  const [iataFontSizeA, setIataFontSizeA] = useState<number>(iataFontSize);

  // =========================================================================
  // MAP B CONFIGURATION & INDEPENDENT STATE
  // =========================================================================
  const [modeB, setModeB] = useState<MapVisualizationMode>(activeMapMode === 'airports' ? 'airports' : 'unique_routes');
  const [uniqueAnalysisModeB, setUniqueAnalysisModeB] = useState<'general' | 'specific'>('general');
  const [selectedAirlinesB, setSelectedAirlinesB] = useState<string[]>([]);
  const [versusFilteredAirlinesB, setVersusFilteredAirlinesB] = useState<boolean>(false);
  const [selectedHubCodeB, setSelectedHubCodeB] = useState<string | null>(null);
  const [selectedTopNB, setSelectedTopNB] = useState<number | null>(null);
  const [selectedAirportCodeB, setSelectedAirportCodeB] = useState<string | null>(null);
  const [mode3GeneralShowSingleB, setMode3GeneralShowSingleB] = useState<boolean>(true);
  const [mode3GeneralShowMultiB, setMode3GeneralShowMultiB] = useState<boolean>(true);
  const [tileLayerB, setTileLayerB] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');
  const [showAirportLabelsB, setShowAirportLabelsB] = useState<boolean>(showAirportLabels);
  const [iataFontSizeB, setIataFontSizeB] = useState<number>(iataFontSize);

  // Airport Connections Detail Tab / Modal State
  const [selectedAirportForConnections, setSelectedAirportForConnections] = useState<string | null>(null);
  const [connectionsModalRoutes, setConnectionsModalRoutes] = useState<FlightRoute[]>(allRoutes);

  // Individual Map export states
  const [isExportingPngA, setIsExportingPngA] = useState<boolean>(false);
  const [isExportingPngB, setIsExportingPngB] = useState<boolean>(false);

  // Dual Export states
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngSuccess, setPngSuccess] = useState<boolean>(false);
  const [isExportingHtml, setIsExportingHtml] = useState<boolean>(false);
  const [htmlSuccess, setHtmlSuccess] = useState<boolean>(false);

  // Paleta de Colores Popover State
  const [showColorPalette, setShowColorPalette] = useState<boolean>(false);

  // Generic pane route filter
  const filterPaneRoutes = (
    mode: MapVisualizationMode,
    uniqueAnalysisMode: 'general' | 'specific',
    selectedAirlines: string[],
    selectedHubCode: string | null,
    selectedTopN: number | null,
    selectedAirportCode: string | null,
    showSingle: boolean,
    showMulti: boolean
  ) => {
    const topNCodes = selectedTopN
      ? new Set(top15Airports.slice(0, selectedTopN).map((h) => h.code))
      : null;

    return allRoutes.filter((r) => {
      // Hub filter
      if (selectedHubCode) {
        if (r.originCode !== selectedHubCode && r.destCode !== selectedHubCode) {
          return false;
        }
      }

      // Top N filter
      if (topNCodes) {
        if (!topNCodes.has(r.originCode) || !topNCodes.has(r.destCode)) {
          return false;
        }
      }

      // Specific airport filter
      if (selectedAirportCode) {
        if (r.originCode !== selectedAirportCode && r.destCode !== selectedAirportCode) {
          return false;
        }
      }

      // Airline filter
      if (selectedAirlines.includes('__NONE__')) {
        return false;
      }
      if (selectedAirlines.length > 0 && !selectedAirlines.includes(r.airline)) {
        return false;
      }

      // Mode 2 General Analysis
      if (
        (mode === 'unique_routes' || mode === 'routes_by_airline') &&
        uniqueAnalysisMode === 'general'
      ) {
        const [a, b] = [r.originCode, r.destCode].sort();
        const key = `${a} <-> ${b}`;
        const totalAirlinesOnCorridor = corridorAllAirlinesMap.get(key)?.size || 1;
        const isSingleOp = totalAirlinesOnCorridor === 1;

        if (isSingleOp && !showSingle) return false;
        if (!isSingleOp && !showMulti) return false;
      }

      return true;
    });
  };

  // Filter routes for Map A
  const routesA = useMemo(() => {
    return filterPaneRoutes(
      modeA,
      uniqueAnalysisModeA,
      selectedAirlinesA,
      selectedHubCodeA,
      selectedTopNA,
      selectedAirportCodeA,
      mode3GeneralShowSingleA,
      mode3GeneralShowMultiA
    );
  }, [
    allRoutes,
    modeA,
    uniqueAnalysisModeA,
    selectedAirlinesA,
    selectedHubCodeA,
    selectedTopNA,
    selectedAirportCodeA,
    mode3GeneralShowSingleA,
    mode3GeneralShowMultiA,
    top15Airports,
    corridorAllAirlinesMap,
  ]);

  // Filter routes for Map B
  const routesB = useMemo(() => {
    return filterPaneRoutes(
      modeB,
      uniqueAnalysisModeB,
      selectedAirlinesB,
      selectedHubCodeB,
      selectedTopNB,
      selectedAirportCodeB,
      mode3GeneralShowSingleB,
      mode3GeneralShowMultiB
    );
  }, [
    allRoutes,
    modeB,
    uniqueAnalysisModeB,
    selectedAirlinesB,
    selectedHubCodeB,
    selectedTopNB,
    selectedAirportCodeB,
    mode3GeneralShowSingleB,
    mode3GeneralShowMultiB,
    top15Airports,
    corridorAllAirlinesMap,
  ]);

  const airportsA = useMemo(() => {
    const fromRoutes = extractUniqueAirports(routesA);
    if (selectedTopNA && modeA === 'airports') {
      const topNCodes = new Set(top15Airports.slice(0, selectedTopNA).map((h) => h.code));
      if (selectedAirlinesA.length > 0 && !selectedAirlinesA.includes('__NONE__')) {
        return fromRoutes.filter(a => topNCodes.has(a.code));
      }
      return top15Airports.slice(0, selectedTopNA);
    }
    return fromRoutes;
  }, [routesA, selectedTopNA, modeA, top15Airports, selectedAirlinesA]);

  const airportsB = useMemo(() => {
    const fromRoutes = extractUniqueAirports(routesB);
    if (selectedTopNB && modeB === 'airports') {
      const topNCodes = new Set(top15Airports.slice(0, selectedTopNB).map((h) => h.code));
      if (selectedAirlinesB.length > 0 && !selectedAirlinesB.includes('__NONE__')) {
        return fromRoutes.filter(a => topNCodes.has(a.code));
      }
      return top15Airports.slice(0, selectedTopNB);
    }
    return fromRoutes;
  }, [routesB, selectedTopNB, modeB, top15Airports, selectedAirlinesB]);

  // Metrics for comparison: strictly Rutas and Aeropuertos
  const statsA = useMemo(() => ({ count: routesA.length, airports: airportsA.length }), [routesA, airportsA]);
  const statsB = useMemo(() => ({ count: routesB.length, airports: airportsB.length }), [routesB, airportsB]);

  const routeDelta = statsB.count - statsA.count;
  const airportDelta = statsB.airports - statsA.airports;

  // Airline selection handlers for Map A
  const handleToggleAirlineA = (airline: string) => {
    setSelectedAirlinesA((prev) => {
      const isNone = prev.includes('__NONE__');
      const baseList = isNone ? [] : prev.length === 0 ? [...availableAirlines] : prev;
      if (baseList.includes(airline)) {
        const next = baseList.filter((a) => a !== airline);
        return next.length === 0 ? ['__NONE__'] : next;
      } else {
        return [...baseList, airline];
      }
    });
  };

  const handleSelectOnlyAirlineA = (airline: string) => {
    setSelectedAirlinesA([airline]);
  };

  const handleSelectAllAirlinesA = () => {
    setSelectedAirlinesA([]);
  };

  const handleDeselectAllAirlinesA = () => {
    setSelectedAirlinesA(['__NONE__']);
  };

  // Airline selection handlers for Map B
  const handleToggleAirlineB = (airline: string) => {
    setSelectedAirlinesB((prev) => {
      const isNone = prev.includes('__NONE__');
      const baseList = isNone ? [] : prev.length === 0 ? [...availableAirlines] : prev;
      if (baseList.includes(airline)) {
        const next = baseList.filter((a) => a !== airline);
        return next.length === 0 ? ['__NONE__'] : next;
      } else {
        return [...baseList, airline];
      }
    });
  };

  const handleSelectOnlyAirlineB = (airline: string) => {
    setSelectedAirlinesB([airline]);
  };

  const handleSelectAllAirlinesB = () => {
    setSelectedAirlinesB([]);
  };

  const handleDeselectAllAirlinesB = () => {
    setSelectedAirlinesB(['__NONE__']);
  };

  // Movement synchronization
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
        selectedAirlines: selectedAirlinesA,
        extension: 'png',
      });
      await exportMapToImage(
        'map-compare-a',
        filename,
        routesA,
        airportsA,
        customAirlineColors,
        modeA,
        uniqueAnalysisModeA,
        selectedAirlinesA,
        versusFilteredAirlinesA,
        allRoutes
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
        selectedAirlines: selectedAirlinesB,
        extension: 'png',
      });
      await exportMapToImage(
        'map-compare-b',
        filename,
        routesB,
        airportsB,
        customAirlineColors,
        modeB,
        uniqueAnalysisModeB,
        selectedAirlinesB,
        versusFilteredAirlinesB,
        allRoutes
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
      const labelA = selectedAirlinesA.length === 1
        ? selectedAirlinesA[0]
        : selectedHubCodeA
        ? `Hub: ${selectedHubCodeA}`
        : selectedTopNA
        ? `Top ${selectedTopNA}`
        : 'Mapa A (Personalizado)';
      const labelB = selectedAirlinesB.length === 1
        ? selectedAirlinesB[0]
        : selectedHubCodeB
        ? `Hub: ${selectedHubCodeB}`
        : selectedTopNB
        ? `Top ${selectedTopNB}`
        : 'Mapa B (Personalizado)';
      const filename = generateExportFilename({
        prefix: 'comparativa_dual',
        airlineA: labelA,
        airlineB: labelB,
        isDual: true,
        extension: 'png',
      });
      await exportComparisonToImage({
        containerId: 'compare-view-container',
        filename,
        routesA,
        routesB,
        airportsA,
        airportsB,
        labelA,
        labelB,
        customColors: customAirlineColors,
        modeA,
        modeB,
        uniqueAnalysisModeA,
        uniqueAnalysisModeB,
        selectedAirlinesA,
        selectedAirlinesB,
        versusFilteredAirlinesA,
        versusFilteredAirlinesB,
        selectedTopNA,
        selectedTopNB,
        allRoutes,
      });
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
      const labelA = selectedAirlinesA.length === 1 ? selectedAirlinesA[0] : 'Mapa A (Configurado)';
      const labelB = selectedAirlinesB.length === 1 ? selectedAirlinesB[0] : 'Mapa B (Configurado)';
      exportComparisonToStandaloneHtml(
        routesA,
        routesB,
        airportsA,
        airportsB,
        labelA,
        labelB,
        `Comparativa GIS: ${labelA} vs ${labelB}`,
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

  // Reset helpers
  const handleResetA = () => {
    setSelectedAirlinesA([]);
    setSelectedHubCodeA(null);
    setSelectedTopNA(null);
    setSelectedAirportCodeA(null);
    setVersusFilteredAirlinesA(false);
    setMode3GeneralShowSingleA(true);
    setMode3GeneralShowMultiA(true);
  };

  const handleResetB = () => {
    setSelectedAirlinesB([]);
    setSelectedHubCodeB(null);
    setSelectedTopNB(null);
    setSelectedAirportCodeB(null);
    setVersusFilteredAirlinesB(false);
    setMode3GeneralShowSingleB(true);
    setMode3GeneralShowMultiB(true);
  };

  return (
    <div
      id="compare-view-container"
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden"
    >
      {/* Top Comparison Analytics Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2.5 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 leading-none">
              Modo Comparativo Dual
              <span className="text-[9.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-800 font-mono">
                2 Mapas Independientes
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
              Cada mapa cuenta con todas las opciones de la vista individual (Hubs, Top 1-15, Cruces de Red, Aerolíneas).
            </p>
          </div>
        </div>

        {/* Right Side: Metrics delta + Synchronize + Palette + Direct Exports */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* Rutas Delta */}
          <div className="bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Rutas:</span>
            <span className="font-mono font-bold text-cyan-300">{statsA.count}</span>
            <span className="text-slate-600">vs</span>
            <span className="font-mono font-bold text-purple-300">{statsB.count}</span>
            <span
              className={`font-mono font-bold text-[10.5px] ${
                routeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({routeDelta >= 0 ? `+${routeDelta}` : routeDelta})
            </span>
          </div>

          {/* Aeropuertos Delta */}
          <div className="bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 hidden md:flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Aeropuertos:</span>
            <span className="font-mono font-bold text-cyan-300">{statsA.airports}</span>
            <span className="text-slate-600">vs</span>
            <span className="font-mono font-bold text-purple-300">{statsB.airports}</span>
            <span
              className={`font-mono font-bold text-[10.5px] ${
                airportDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({airportDelta >= 0 ? `+${airportDelta}` : airportDelta})
            </span>
          </div>

          {/* Synchronize Zoom/Pan Toggle */}
          <button
            type="button"
            onClick={() => setSyncMaps(!syncMaps)}
            className={`px-2 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1 cursor-pointer ${
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
              className={`px-2 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1 cursor-pointer ${
                showColorPalette
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
              }`}
              title="Abrir selector y paleta de colores por aerolínea"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Colores</span>
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
          <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5 sm:pl-2">
            <button
              type="button"
              id="btn-export-comparison-png"
              onClick={handleExportComparisonPng}
              disabled={isExportingPng}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Descargar imagen PNG de la comparativa side-by-side"
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
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-md"
              title="Descargar archivo HTML interactivo con ambos mapas"
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
        {/* ========================================================================= */}
        {/* MAP A (LEFT PANE) */}
        {/* ========================================================================= */}
        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Header Controls for Map A */}
          <div className="bg-slate-900/98 backdrop-blur-md px-2.5 sm:px-3 py-1.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 z-10 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Badge Identificador Mapa A */}
              <div className="flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/70">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                <span className="font-extrabold text-cyan-300 uppercase tracking-wider text-[11px]">
                  Mapa A
                </span>
                <span className="font-mono text-cyan-200 text-[10px] font-bold">
                  ({routesA.length} rutas)
                </span>
              </div>

              {/* Modo Switcher para Mapa A */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setModeA('airports')}
                  className={`px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    modeA === 'airports'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Modo 1: Aeropuertos y Hubs para Mapa A"
                >
                  <Building2 className="w-3 h-3" />
                  <span>1. Hubs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModeA('unique_routes')}
                  className={`px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    modeA === 'unique_routes' || modeA === 'routes_by_airline'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Modo 2: Rutas Autorizadas para Mapa A"
                >
                  <GitCommit className="w-3 h-3" />
                  <span>2. Rutas</span>
                </button>
              </div>

              {/* Sub-opciones de Modo 1: Hubs / Top 1-15 */}
              {modeA === 'airports' && (
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Hub selector */}
                  <select
                    value={selectedHubCodeA || ''}
                    onChange={(e) => {
                      setSelectedHubCodeA(e.target.value || null);
                      if (e.target.value) setSelectedTopNA(null);
                    }}
                    className="bg-slate-950 border border-cyan-500/70 text-slate-100 text-[10.5px] font-semibold rounded-lg px-2 py-1 max-w-[125px] truncate cursor-pointer"
                    title="Filtrar por Hub en Mapa A"
                  >
                    <option value="">Hubs: Todos</option>
                    {top4Hubs.map((h) => (
                      <option key={`hub-a-${h.code}`} value={h.code}>
                        {h.code} - {h.city || h.name}
                      </option>
                    ))}
                  </select>

                  {/* Top 1 al 15 selector */}
                  <select
                    value={selectedTopNA ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      setSelectedTopNA(val);
                      if (val) setSelectedHubCodeA(null);
                    }}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-[10.5px] font-semibold rounded-lg px-2 py-1 cursor-pointer"
                    title="Filtrar por Top 1 al 15 en Mapa A"
                  >
                    <option value="">Top Aeropuertos</option>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                      <option key={`top-a-${n}`} value={n}>
                        Top {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sub-opciones de Modo 2: Rutas Autorizadas */}
              {(modeA === 'unique_routes' || modeA === 'routes_by_airline') && (
                <div className="flex items-center gap-1 flex-wrap">
                  {/* General vs Específico */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUniqueAnalysisModeA('general')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        uniqueAnalysisModeA === 'general'
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Análisis General (1 sola aerolínea vs 2+ compartidas)"
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setUniqueAnalysisModeA('specific')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        uniqueAnalysisModeA === 'specific'
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Análisis Específico (filtro por aerolínea y cruces)"
                    >
                      Específico
                    </button>
                  </div>

                  {/* Si es Específico: Selector rápido de aerolínea */}
                  {uniqueAnalysisModeA === 'specific' && (
                    <select
                      value={selectedAirlinesA.length === 1 ? selectedAirlinesA[0] : selectedAirlinesA.includes('__NONE__') ? '__NONE__' : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) setSelectedAirlinesA([]);
                        else if (val === '__NONE__') setSelectedAirlinesA(['__NONE__']);
                        else setSelectedAirlinesA([val]);
                      }}
                      className="bg-slate-950 border border-cyan-500/70 text-slate-100 text-[10.5px] font-semibold rounded-lg px-2 py-1 max-w-[130px] truncate cursor-pointer"
                      title="Seleccionar aerolínea en Mapa A"
                    >
                      <option value="">Todas las aerolíneas</option>
                      <option value="__NONE__">Ninguna</option>
                      {airlineStatsList.map(({ airline, count }) => (
                        <option key={`opt-a-${airline}`} value={airline}>
                          [{getAirlineIataCode(airline)}] {airline} ({count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Botón Cruces de Red para Mapa A */}
                  <button
                    type="button"
                    onClick={() => setVersusFilteredAirlinesA(!versusFilteredAirlinesA)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                      versusFilteredAirlinesA
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/25 ring-1 ring-amber-400'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                    title="Activar o desactivar Cruces de Red (rutas únicas vs compartidas) en Mapa A"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Cruces de Red</span>
                  </button>
                </div>
              )}
            </div>

            {/* Acciones del mapa A: Tile layer, Reset, Captura */}
            <div className="flex items-center gap-1">
              <select
                value={tileLayerA}
                onChange={(e) => setTileLayerA(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-1.5 py-1 cursor-pointer"
                title="Capa cartográfica Mapa A"
              >
                <option value="dark">Radar Oscuro</option>
                <option value="light">Claro</option>
                <option value="satellite">Satélite</option>
                <option value="topo">Terreno</option>
              </select>

              {(selectedAirlinesA.length > 0 ||
                selectedHubCodeA ||
                selectedTopNA ||
                selectedAirportCodeA ||
                versusFilteredAirlinesA) && (
                <button
                  type="button"
                  onClick={handleResetA}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Restablecer filtros del Mapa A"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                id="btn-export-map-a-png"
                onClick={handleExportMapA}
                disabled={isExportingPngA}
                title="Descargar captura PNG del Mapa A"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-lg text-[10.5px] font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isExportingPngA ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <span>PNG A</span>
              </button>
            </div>
          </div>

          {/* Map A Component with Full Interactive Capabilities */}
          <div className="flex-1 relative">
            <FlightMap
              id="map-compare-a"
              routes={routesA}
              allRoutes={allRoutes}
              airports={airportsA}
              mapMode={modeA}
              onMapModeChange={setModeA}
              isAirportConnectionsOpen={Boolean(selectedAirportForConnections)}
              selectedAirportCode={selectedAirportCodeA}
              onSelectAirport={(code) => setSelectedAirportCodeA((prev) => (prev === code ? null : code))}
              onOpenAirportConnections={(code) => {
                setSelectedAirportForConnections(code);
                setConnectionsModalRoutes(routesA);
              }}
              onFilterAirportConnections={(code) => setSelectedAirportCodeA((prev) => (prev === code ? null : code))}
              onSelectRoute={onSelectRoute}
              tileLayerKey={tileLayerA}
              customAirlineColors={customAirlineColors}
              availableAirlines={availableAirlines}
              selectedAirlines={selectedAirlinesA}
              onToggleAirline={handleToggleAirlineA}
              onSelectOnlyAirline={handleSelectOnlyAirlineA}
              onSelectAllAirlines={handleSelectAllAirlinesA}
              onDeselectAllAirlines={handleDeselectAllAirlinesA}
              onUpdateAirlineColor={onUpdateAirlineColor}
              uniqueAnalysisMode={uniqueAnalysisModeA}
              onUniqueAnalysisModeChange={setUniqueAnalysisModeA}
              versusFilteredAirlines={versusFilteredAirlinesA}
              onToggleVersusFilteredAirlines={() => setVersusFilteredAirlinesA((prev) => !prev)}
              mode3GeneralShowSingle={mode3GeneralShowSingleA}
              onToggleMode3GeneralSingle={() => setMode3GeneralShowSingleA((prev) => !prev)}
              mode3GeneralShowMulti={mode3GeneralShowMultiA}
              onToggleMode3GeneralMulti={() => setMode3GeneralShowMultiA((prev) => !prev)}
              topAirportsRankMap={topAirportsRankMap}
              selectedTopN={selectedTopNA}
              syncCenter={syncMaps ? centerA : null}
              syncZoom={syncMaps ? zoomA : null}
              onMapMove={handleMapMoveA}
              isComparePane={true}
              showAirportLabels={showAirportLabelsA}
              onToggleAirportLabels={setShowAirportLabelsA}
              iataFontSize={iataFontSizeA}
              onChangeIataFontSize={setIataFontSizeA}
            />

            {/* Floating KPI badge on Map A */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyan-500/60 text-xs shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="font-bold text-white text-[11px] truncate max-w-[130px]">
                {selectedAirlinesA.length === 1
                  ? selectedAirlinesA[0]
                  : selectedHubCodeA
                  ? `Hub: ${selectedHubCodeA}`
                  : selectedTopNA
                  ? `Top ${selectedTopNA}`
                  : 'Red A'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-cyan-300 font-mono text-[11px]">{routesA.length}</span>
              <span className="text-slate-400 text-[9.5px]">rutas</span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-slate-200 font-mono text-[11px]">{airportsA.length}</span>
              <span className="text-slate-400 text-[9.5px]">aeps</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAP B (RIGHT PANE) */}
        {/* ========================================================================= */}
        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Header Controls for Map B */}
          <div className="bg-slate-900/98 backdrop-blur-md px-2.5 sm:px-3 py-1.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 z-10 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Badge Identificador Mapa B */}
              <div className="flex items-center gap-1 bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-500/70">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                <span className="font-extrabold text-purple-300 uppercase tracking-wider text-[11px]">
                  Mapa B
                </span>
                <span className="font-mono text-purple-200 text-[10px] font-bold">
                  ({routesB.length} rutas)
                </span>
              </div>

              {/* Modo Switcher para Mapa B */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setModeB('airports')}
                  className={`px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    modeB === 'airports'
                      ? 'bg-purple-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Modo 1: Aeropuertos y Hubs para Mapa B"
                >
                  <Building2 className="w-3 h-3" />
                  <span>1. Hubs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModeB('unique_routes')}
                  className={`px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    modeB === 'unique_routes' || modeB === 'routes_by_airline'
                      ? 'bg-purple-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Modo 2: Rutas Autorizadas para Mapa B"
                >
                  <GitCommit className="w-3 h-3" />
                  <span>2. Rutas</span>
                </button>
              </div>

              {/* Sub-opciones de Modo 1: Hubs / Top 1-15 */}
              {modeB === 'airports' && (
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Hub selector */}
                  <select
                    value={selectedHubCodeB || ''}
                    onChange={(e) => {
                      setSelectedHubCodeB(e.target.value || null);
                      if (e.target.value) setSelectedTopNB(null);
                    }}
                    className="bg-slate-950 border border-purple-500/70 text-slate-100 text-[10.5px] font-semibold rounded-lg px-2 py-1 max-w-[125px] truncate cursor-pointer"
                    title="Filtrar por Hub en Mapa B"
                  >
                    <option value="">Hubs: Todos</option>
                    {top4Hubs.map((h) => (
                      <option key={`hub-b-${h.code}`} value={h.code}>
                        {h.code} - {h.city || h.name}
                      </option>
                    ))}
                  </select>

                  {/* Top 1 al 15 selector */}
                  <select
                    value={selectedTopNB ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      setSelectedTopNB(val);
                      if (val) setSelectedHubCodeB(null);
                    }}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-[10.5px] font-semibold rounded-lg px-2 py-1 cursor-pointer"
                    title="Filtrar por Top 1 al 15 en Mapa B"
                  >
                    <option value="">Top Aeropuertos</option>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                      <option key={`top-b-${n}`} value={n}>
                        Top {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sub-opciones de Modo 2: Rutas Autorizadas */}
              {(modeB === 'unique_routes' || modeB === 'routes_by_airline') && (
                <div className="flex items-center gap-1 flex-wrap">
                  {/* General vs Específico */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUniqueAnalysisModeB('general')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        uniqueAnalysisModeB === 'general'
                          ? 'bg-purple-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Análisis General (1 sola aerolínea vs 2+ compartidas)"
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setUniqueAnalysisModeB('specific')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        uniqueAnalysisModeB === 'specific'
                          ? 'bg-purple-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Análisis Específico (filtro por aerolínea y cruces)"
                    >
                      Específico
                    </button>
                  </div>

                  {/* Si es Específico: Selector rápido de aerolínea */}
                  {uniqueAnalysisModeB === 'specific' && (
                    <select
                      value={selectedAirlinesB.length === 1 ? selectedAirlinesB[0] : selectedAirlinesB.includes('__NONE__') ? '__NONE__' : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) setSelectedAirlinesB([]);
                        else if (val === '__NONE__') setSelectedAirlinesB(['__NONE__']);
                        else setSelectedAirlinesB([val]);
                      }}
                      className="bg-slate-950 border border-purple-500/70 text-slate-100 text-[10.5px] font-semibold rounded-lg px-2 py-1 max-w-[130px] truncate cursor-pointer"
                      title="Seleccionar aerolínea en Mapa B"
                    >
                      <option value="">Todas las aerolíneas</option>
                      <option value="__NONE__">Ninguna</option>
                      {airlineStatsList.map(({ airline, count }) => (
                        <option key={`opt-b-${airline}`} value={airline}>
                          [{getAirlineIataCode(airline)}] {airline} ({count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Botón Cruces de Red para Mapa B */}
                  <button
                    type="button"
                    onClick={() => setVersusFilteredAirlinesB(!versusFilteredAirlinesB)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                      versusFilteredAirlinesB
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/25 ring-1 ring-amber-400'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                    title="Activar o desactivar Cruces de Red en Mapa B"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Cruces de Red</span>
                  </button>
                </div>
              )}
            </div>

            {/* Acciones del mapa B: Tile layer, Reset, Captura */}
            <div className="flex items-center gap-1">
              <select
                value={tileLayerB}
                onChange={(e) => setTileLayerB(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-1.5 py-1 cursor-pointer"
                title="Capa cartográfica Mapa B"
              >
                <option value="dark">Radar Oscuro</option>
                <option value="light">Claro</option>
                <option value="satellite">Satélite</option>
                <option value="topo">Terreno</option>
              </select>

              {(selectedAirlinesB.length > 0 ||
                selectedHubCodeB ||
                selectedTopNB ||
                selectedAirportCodeB ||
                versusFilteredAirlinesB) && (
                <button
                  type="button"
                  onClick={handleResetB}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Restablecer filtros del Mapa B"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                id="btn-export-map-b-png"
                onClick={handleExportMapB}
                disabled={isExportingPngB}
                title="Descargar captura PNG del Mapa B"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-purple-300 hover:text-white rounded-lg text-[10.5px] font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isExportingPngB ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <span>PNG B</span>
              </button>
            </div>
          </div>

          {/* Map B Component with Full Interactive Capabilities */}
          <div className="flex-1 relative">
            <FlightMap
              id="map-compare-b"
              routes={routesB}
              allRoutes={allRoutes}
              airports={airportsB}
              mapMode={modeB}
              onMapModeChange={setModeB}
              isAirportConnectionsOpen={Boolean(selectedAirportForConnections)}
              selectedAirportCode={selectedAirportCodeB}
              onSelectAirport={(code) => setSelectedAirportCodeB((prev) => (prev === code ? null : code))}
              onOpenAirportConnections={(code) => {
                setSelectedAirportForConnections(code);
                setConnectionsModalRoutes(routesB);
              }}
              onFilterAirportConnections={(code) => setSelectedAirportCodeB((prev) => (prev === code ? null : code))}
              onSelectRoute={onSelectRoute}
              tileLayerKey={tileLayerB}
              customAirlineColors={customAirlineColors}
              availableAirlines={availableAirlines}
              selectedAirlines={selectedAirlinesB}
              onToggleAirline={handleToggleAirlineB}
              onSelectOnlyAirline={handleSelectOnlyAirlineB}
              onSelectAllAirlines={handleSelectAllAirlinesB}
              onDeselectAllAirlines={handleDeselectAllAirlinesB}
              onUpdateAirlineColor={onUpdateAirlineColor}
              uniqueAnalysisMode={uniqueAnalysisModeB}
              onUniqueAnalysisModeChange={setUniqueAnalysisModeB}
              versusFilteredAirlines={versusFilteredAirlinesB}
              onToggleVersusFilteredAirlines={() => setVersusFilteredAirlinesB((prev) => !prev)}
              mode3GeneralShowSingle={mode3GeneralShowSingleB}
              onToggleMode3GeneralSingle={() => setMode3GeneralShowSingleB((prev) => !prev)}
              mode3GeneralShowMulti={mode3GeneralShowMultiB}
              onToggleMode3GeneralMulti={() => setMode3GeneralShowMultiB((prev) => !prev)}
              topAirportsRankMap={topAirportsRankMap}
              selectedTopN={selectedTopNB}
              syncCenter={syncMaps ? centerB : null}
              syncZoom={syncMaps ? zoomB : null}
              onMapMove={handleMapMoveB}
              isComparePane={true}
              showAirportLabels={showAirportLabelsB}
              onToggleAirportLabels={setShowAirportLabelsB}
              iataFontSize={iataFontSizeB}
              onChangeIataFontSize={setIataFontSizeB}
            />

            {/* Floating KPI badge on Map B */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-purple-500/60 text-xs shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
              <span className="font-bold text-white text-[11px] truncate max-w-[130px]">
                {selectedAirlinesB.length === 1
                  ? selectedAirlinesB[0]
                  : selectedHubCodeB
                  ? `Hub: ${selectedHubCodeB}`
                  : selectedTopNB
                  ? `Top ${selectedTopNB}`
                  : 'Red B'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-purple-300 font-mono text-[11px]">{routesB.length}</span>
              <span className="text-slate-400 text-[9.5px]">rutas</span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-slate-200 font-mono text-[11px]">{airportsB.length}</span>
              <span className="text-slate-400 text-[9.5px]">aeps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Airport Connections Detail Modal within Compare View */}
      <AirportConnectionsModal
        airportCode={selectedAirportForConnections}
        routes={connectionsModalRoutes}
        onClose={() => setSelectedAirportForConnections(null)}
        onSelectRoute={onSelectRoute}
        getAirlineColor={(airline) => getAirlineColor(airline, customAirlineColors)}
      />
    </div>
  );
};
