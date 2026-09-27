import React, { useState, useMemo } from 'react';
import { FlightRoute, Airport, FilterState, SavedMap } from '../types';
import { FlightMap } from './FlightMap';
import { extractUniqueAirports } from '../utils/dataParser';
import { Layers, Link2, Unlink, ArrowRightLeft, TrendingUp, TrendingDown, Plane, Users, Sliders } from 'lucide-react';

interface CompareViewProps {
  allRoutes: FlightRoute[];
  savedMaps: SavedMap[];
  currentMainFilters: FilterState;
  customAirlineColors?: Record<string, string>;
}

export const CompareView: React.FC<CompareViewProps> = ({
  allRoutes,
  savedMaps,
  currentMainFilters,
  customAirlineColors,
}) => {
  // Sync state between both maps
  const [syncMaps, setSyncMaps] = useState<boolean>(true);
  const [sharedCenter, setSharedCenter] = useState<[number, number]>([23.6345, -102.5528]);
  const [sharedZoom, setSharedZoom] = useState<number>(5);

  // Configuration for Map A (Left)
  const [presetA, setPresetA] = useState<string>('all');
  const [customAirlineA, setCustomAirlineA] = useState<string>('all');
  const [tileLayerA, setTileLayerA] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Configuration for Map B (Right)
  const [presetB, setPresetB] = useState<string>('all');
  const [customAirlineB, setCustomAirlineB] = useState<string>('all');
  const [tileLayerB, setTileLayerB] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');

  // Extract unique airlines
  const availableAirlines = useMemo(() => {
    return Array.from(new Set(allRoutes.map((r) => r.airline))).filter(Boolean);
  }, [allRoutes]);

  // Filter routes for Map A
  const routesA = useMemo(() => {
    return allRoutes.filter((r) => {
      // Preset logic
      if (presetA.startsWith('airline-')) {
        const targetAirline = presetA.replace('airline-', '');
        if (r.airline !== targetAirline) return false;
      } else if (presetA.startsWith('sheet-')) {
        const targetSheet = presetA.replace('sheet-', '');
        if (r.sheetName !== targetSheet) return false;
      } else if (presetA.startsWith('saved-')) {
        const savedId = presetA.replace('saved-', '');
        const saved = savedMaps.find((m) => m.id === savedId);
        if (saved) {
          if (saved.filters.selectedAirlines.length && !saved.filters.selectedAirlines.includes(r.airline)) return false;
        }
      }

      // Airline specific override
      if (customAirlineA !== 'all' && r.airline !== customAirlineA) {
        return false;
      }

      return true;
    });
  }, [allRoutes, presetA, customAirlineA, savedMaps]);

  // Filter routes for Map B
  const routesB = useMemo(() => {
    return allRoutes.filter((r) => {
      // Preset logic
      if (presetB.startsWith('airline-')) {
        const targetAirline = presetB.replace('airline-', '');
        if (r.airline !== targetAirline) return false;
      } else if (presetB.startsWith('sheet-')) {
        const targetSheet = presetB.replace('sheet-', '');
        if (r.sheetName !== targetSheet) return false;
      } else if (presetB.startsWith('saved-')) {
        const savedId = presetB.replace('saved-', '');
        const saved = savedMaps.find((m) => m.id === savedId);
        if (saved) {
          if (saved.filters.selectedAirlines.length && !saved.filters.selectedAirlines.includes(r.airline)) return false;
        }
      }

      // Airline specific override
      if (customAirlineB !== 'all' && r.airline !== customAirlineB) {
        return false;
      }

      return true;
    });
  }, [allRoutes, presetB, customAirlineB, savedMaps]);

  const airportsA = useMemo(() => extractUniqueAirports(routesA), [routesA]);
  const airportsB = useMemo(() => extractUniqueAirports(routesB), [routesB]);

  // Metrics for comparison
  const statsA = useMemo(() => {
    const totalFlights = routesA.reduce((sum, r) => sum + r.flightsCount, 0);
    const totalPax = routesA.reduce((sum, r) => sum + r.passengers, 0);
    return { count: routesA.length, totalFlights, totalPax, airports: airportsA.length };
  }, [routesA, airportsA]);

  const statsB = useMemo(() => {
    const totalFlights = routesB.reduce((sum, r) => sum + r.flightsCount, 0);
    const totalPax = routesB.reduce((sum, r) => sum + r.passengers, 0);
    return { count: routesB.length, totalFlights, totalPax, airports: airportsB.length };
  }, [routesB, airportsB]);

  const flightDelta = statsB.totalFlights - statsA.totalFlights;
  const paxDelta = statsB.totalPax - statsA.totalPax;
  const routeDelta = statsB.count - statsA.count;

  const handleMapMove = (center: [number, number], zoom: number) => {
    if (syncMaps) {
      setSharedCenter(center);
      setSharedZoom(zoom);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Comparison Analytics Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Modo Comparativo Side-by-Side
              <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800 font-mono">
                Split View
              </span>
            </h2>
            <p className="text-xs text-slate-400">Analiza simultáneamente dos aerolíneas o mapas filtrados</p>
          </div>
        </div>

        {/* Comparison Delta KPI Badges */}
        <div className="flex items-center gap-3 text-xs">
          {/* Rutas Delta */}
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Rutas:</span>
            <span className="font-mono font-bold text-slate-200">{statsA.count} vs {statsB.count}</span>
            <span className={`text-[11px] font-bold flex items-center ${routeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({routeDelta >= 0 ? `+${routeDelta}` : routeDelta})
            </span>
          </div>

          {/* Vuelos Delta */}
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Vuelos:</span>
            <span className="font-mono font-bold text-cyan-300">{statsA.totalFlights.toLocaleString()} vs {statsB.totalFlights.toLocaleString()}</span>
            <span className={`text-[11px] font-bold flex items-center ${flightDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({flightDelta >= 0 ? `+${flightDelta.toLocaleString()}` : flightDelta.toLocaleString()})
            </span>
          </div>

          {/* Pasajeros Delta */}
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Pasajeros:</span>
            <span className="font-mono font-bold text-emerald-300">
              {(statsA.totalPax / 1000000).toFixed(2)}M vs {(statsB.totalPax / 1000000).toFixed(2)}M
            </span>
            <span className={`text-[11px] font-bold flex items-center ${paxDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({paxDelta >= 0 ? `+${(paxDelta / 1000000).toFixed(2)}M` : `${(paxDelta / 1000000).toFixed(2)}M`})
            </span>
          </div>

          {/* Synchronize Toggle */}
          <button
            onClick={() => setSyncMaps(!syncMaps)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              syncMaps
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Sincronizar desplazamiento y zoom entre ambos mapas"
          >
            {syncMaps ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
            {syncMaps ? 'Zoom Sincronizado' : 'Zoom Independiente'}
          </button>
        </div>
      </div>

      {/* Side-by-Side Dual Map Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 relative overflow-hidden">
        {/* MAP A (LEFT PANE) */}
        <div className="relative flex flex-col h-full">
          {/* Header Controls for Map A */}
          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Mapa A (Vista Principal)</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={presetA}
                onChange={(e) => setPresetA(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">Todas las Rutas</option>
                {availableAirlines.map((al) => (
                  <option key={`a-${al}`} value={`airline-${al}`}>
                    Aerolínea: {al}
                  </option>
                ))}
                {savedMaps.map((sm) => (
                  <option key={sm.id} value={`saved-${sm.id}`}>
                    Guardado: {sm.name}
                  </option>
                ))}
              </select>

              <select
                value={tileLayerA}
                onChange={(e) => setTileLayerA(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1"
              >
                <option value="dark">Fondo Oscuro</option>
                <option value="light">Fondo Claro</option>
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
              airports={airportsA}
              tileLayerKey={tileLayerA}
              customAirlineColors={customAirlineColors}
              syncCenter={syncMaps ? sharedCenter : null}
              syncZoom={syncMaps ? sharedZoom : null}
              onMapMove={handleMapMove}
            />

            <div className="absolute top-4 left-4 z-[400] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-cyan-400">{routesA.length}</span> rutas &bull;{' '}
              <span className="font-bold text-slate-200">{airportsA.length}</span> aeropuertos
            </div>
          </div>
        </div>

        {/* MAP B (RIGHT PANE) */}
        <div className="relative flex flex-col h-full">
          {/* Header Controls for Map B */}
          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Mapa B (Comparativa)</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={presetB}
                onChange={(e) => setPresetB(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">Todas las Rutas</option>
                {availableAirlines.map((al) => (
                  <option key={`b-${al}`} value={`airline-${al}`}>
                    Aerolínea: {al}
                  </option>
                ))}
                {savedMaps.map((sm) => (
                  <option key={sm.id} value={`saved-${sm.id}`}>
                    Guardado: {sm.name}
                  </option>
                ))}
              </select>

              <select
                value={tileLayerB}
                onChange={(e) => setTileLayerB(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1"
              >
                <option value="dark">Fondo Oscuro</option>
                <option value="light">Fondo Claro</option>
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
              airports={airportsB}
              tileLayerKey={tileLayerB}
              customAirlineColors={customAirlineColors}
              syncCenter={syncMaps ? sharedCenter : null}
              syncZoom={syncMaps ? sharedZoom : null}
              onMapMove={handleMapMove}
            />

            <div className="absolute top-4 left-4 z-[400] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-purple-400">{routesB.length}</span> rutas &bull;{' '}
              <span className="font-bold text-slate-200">{airportsB.length}</span> aeropuertos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
