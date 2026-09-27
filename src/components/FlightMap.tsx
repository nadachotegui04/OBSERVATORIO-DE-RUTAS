import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { FlightRoute, Airport, MapVisualizationMode, UniqueRouteCorridor, UniqueRoutesAnalysisMode } from '../types';
import { generateGreatCircleArc } from '../utils/geodesic';
import { exportMapToImage } from '../utils/exporter';
import { getUniqueRouteCorridors, getAirportConnections } from '../utils/dataParser';
import { resolveAirport, findAirportByCoordinates, isCoordinateLike } from '../data/mexicoDemoData';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Camera,
  Check,
  Loader2,
  Building2,
  Plane,
  GitCommit,
  Info,
  Calendar,
  Sparkles,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Unlock,
  GripHorizontal,
  RotateCcw,
  Move,
} from 'lucide-react';

interface FlightMapProps {
  id: string;
  routes: FlightRoute[];
  allRoutes?: FlightRoute[];
  airports: Airport[];
  mapMode?: MapVisualizationMode;
  onMapModeChange?: (mode: MapVisualizationMode) => void;
  selectedAirportCode?: string | null;
  onSelectAirport?: (airportCode: string) => void;
  onOpenAirportConnections?: (airportCode: string) => void;
  tileLayerKey?: 'dark' | 'light' | 'osm' | 'satellite' | 'topo';
  arcCurvature?: number;
  colorScheme?: 'airline' | 'density' | 'cyan' | 'traffic';
  showAirportLabels?: boolean;
  showFlightArcs?: boolean;
  showAirports?: boolean;
  animateFlow?: boolean;
  selectedRouteId?: string | null;
  customAirlineColors?: Record<string, string>;
  onSelectRoute?: (route: FlightRoute | null) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  syncCenter?: [number, number] | null;
  syncZoom?: number | null;
  topAirportsRankMap?: Map<string, number>;
  selectedTopN?: number | null;
  uniqueAnalysisMode?: UniqueRoutesAnalysisMode;
  onUniqueAnalysisModeChange?: (mode: UniqueRoutesAnalysisMode) => void;
  uniqueSingleColor?: string;
  onChangeUniqueSingleColor?: (color: string) => void;
  uniqueMultiColor?: string;
  onChangeUniqueMultiColor?: (color: string) => void;
  availableAirlines?: string[];
  selectedAirlines?: string[];
  onToggleAirline?: (airline: string) => void;
  onSelectOnlyAirline?: (airline: string) => void;
  onSelectAllAirlines?: () => void;
  onDeselectAllAirlines?: () => void;
  onUpdateAirlineColor?: (airline: string, color: string) => void;
  className?: string;
}

export const TILE_LAYERS = {
  dark: {
    name: 'Radar Oscuro (Esri Dark Canvas)',
    url: 'https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; OpenStreetMap contributors',
    maxZoom: 16,
  },
  light: {
    name: 'Cartográfico Claro (Esri Light Canvas)',
    url: 'https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; OpenStreetMap contributors',
    maxZoom: 16,
  },
  osm: {
    name: 'OpenStreetMap Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satélite Aeronáutico (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Earthstar Geographics',
    maxZoom: 18,
  },
  topo: {
    name: 'Topográfico / Relieve (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; DeLorme, NAVTEQ',
    maxZoom: 18,
  },
};

const KNOWN_AIRLINE_COLORS: Record<string, string> = {
  'aeromexico': '#0284c7', // Sky Blue
  'aerovias de mexico': '#0284c7',
  'aerovias': '#0284c7',
  'volaris': '#a855f7', // Purple
  'concesionaria vuela': '#a855f7',
  'vivaaerobus': '#10b981', // Emerald
  'viva aerobus': '#10b981',
  'viva': '#10b981',
  'aeroenlaces': '#10b981',
  'aeroenlaces nacionales': '#10b981',
  'aerolitoral': '#0369a1', // Deep Blue (Aeroméxico Connect)
  'link conexion aerea': '#f59e0b', // Amber (TAR)
  'tar': '#f59e0b',
  'tar aerolineas': '#f59e0b',
  'calafia': '#ec4899', // Pink
  'aereo calafia': '#ec4899',
  'estafeta carga aerea': '#ef4444', // Red
  'estafeta': '#ef4444',
  'aerotransportes rafilher': '#14b8a6', // Teal
  'rafilher': '#14b8a6',
  'aerotransportes mas de carga': '#8b5cf6', // Violet (MasAir)
  'mas de carga': '#8b5cf6',
  'tm aerolineas': '#f97316', // Orange
  'aerotransporte de carga union': '#e11d48', // Rose
  'carga union': '#e11d48',
  'aerolinea del estado mexicano': '#06b6d4', // Cyan (Mexicana)
  'mexicana': '#06b6d4',
  'magnicharters': '#ef4444',
  'interjet': '#3b82f6',
  'aerus': '#14b8a6',
  'aeromar': '#84cc16',
  'delta': '#b91c1c',
  'united': '#1d4ed8',
  'american': '#64748b',
  'copa': '#0284c7',
};

const DYNAMIC_PALETTE = [
  '#0284c7', // Sky
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#84cc16', // Lime
  '#3b82f6', // Blue
  '#d946ef', // Fuchsia
  '#e11d48', // Rose
];

export function getAirlineColor(airline: string, customColors?: Record<string, string>): string {
  if (!airline) return '#06b6d4';

  if (customColors) {
    if (customColors[airline]) return customColors[airline];
    const lower = airline.toLowerCase().trim();
    for (const [k, v] of Object.entries(customColors)) {
      if (k.toLowerCase().trim() === lower) return v;
    }
  }

  const clean = airline.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [key, color] of Object.entries(KNOWN_AIRLINE_COLORS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return color;
    }
  }

  let hash = 0;
  for (let i = 0; i < airline.length; i++) {
    hash = (hash << 5) - hash + airline.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[index];
}

export const FlightMap: React.FC<FlightMapProps> = ({
  id,
  routes,
  allRoutes,
  airports,
  mapMode = 'routes_by_airline',
  onMapModeChange,
  selectedAirportCode,
  onSelectAirport,
  onOpenAirportConnections,
  tileLayerKey = 'dark',
  arcCurvature = 0.14,
  colorScheme = 'airline',
  showAirportLabels = true,
  showFlightArcs = true,
  showAirports = true,
  animateFlow = false,
  selectedRouteId,
  customAirlineColors,
  onSelectRoute,
  onMapMove,
  syncCenter,
  syncZoom,
  topAirportsRankMap,
  selectedTopN,
  uniqueAnalysisMode = 'general',
  onUniqueAnalysisModeChange,
  uniqueSingleColor = '#06b6d4',
  onChangeUniqueSingleColor,
  uniqueMultiColor = '#f59e0b',
  onChangeUniqueMultiColor,
  availableAirlines = [],
  selectedAirlines = [],
  onToggleAirline,
  onSelectOnlyAirline,
  onSelectAllAirlines,
  onDeselectAllAirlines,
  onUpdateAirlineColor,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const airportsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const isMovingFromSyncRef = useRef<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureSuccess, setCaptureSuccess] = useState<boolean>(false);
  const [isRightLegendExpanded, setIsRightLegendExpanded] = useState<boolean>(true);

  // Mode 2 Airport Selection and labels toggle ("con nombres" vs "sin nombres")
  const [mode2SelectedAirport, setMode2SelectedAirport] = useState<string | null>(null);
  const [mode2ShowConnectedLabels, setMode2ShowConnectedLabels] = useState<boolean>(true);

  // Draggable Legend State & Resize
  const [legendPos, setLegendPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLegend, setIsDraggingLegend] = useState<boolean>(false);
  const [legendSize, setLegendSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const legendContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Mexico Map View Lock State
  const [isMexicoLocked, setIsMexicoLocked] = useState<boolean>(false);
  const [lockToastMessage, setLockToastMessage] = useState<string | null>(null);
  const mexicoClickTimerRef = useRef<any>(null);

  // Clear Mode 2 selected airport if mapMode changes away from routes_by_airline
  useEffect(() => {
    if (mapMode !== 'routes_by_airline') {
      setMode2SelectedAirport(null);
    }
  }, [mapMode]);

  // Compute connected routes and airports for Mode 2 when an airport is selected
  const mode2ConnectedRoutes = useMemo(() => {
    if (mapMode !== 'routes_by_airline' || !mode2SelectedAirport) return [];
    return routes.filter(
      r => r.originCode === mode2SelectedAirport || r.destCode === mode2SelectedAirport
    );
  }, [routes, mapMode, mode2SelectedAirport]);

  const mode2ConnectedAirportCodes = useMemo(() => {
    const set = new Set<string>();
    mode2ConnectedRoutes.forEach(r => {
      if (r.originCode === mode2SelectedAirport) set.add(r.destCode);
      if (r.destCode === mode2SelectedAirport) set.add(r.originCode);
    });
    return set;
  }, [mode2ConnectedRoutes, mode2SelectedAirport]);

  const selectedMode2AirportProfile = useMemo(() => {
    if (!mode2SelectedAirport) return null;
    const resolved = resolveAirport(mode2SelectedAirport);
    if (resolved) return resolved;
    const match = airports.find(a => a.code === mode2SelectedAirport);
    return match || {
      code: mode2SelectedAirport,
      name: `Aeropuerto ${mode2SelectedAirport}`,
      city: '',
      state: '',
      lat: 0,
      lng: 0,
    };
  }, [mode2SelectedAirport, airports]);

  // Draggable Legend Mouse Event Listeners
  useEffect(() => {
    if (!isDraggingLegend) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!mapContainerRef.current || !legendContainerRef.current) return;
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const legendRect = legendContainerRef.current.getBoundingClientRect();

      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      let nextX = dragStartRef.current.posX + dx;
      let nextY = dragStartRef.current.posY + dy;

      const minX = 8;
      const maxX = Math.max(8, mapRect.width - legendRect.width - 8);
      const minY = 8;
      const maxY = Math.max(8, mapRect.height - 70);

      nextX = Math.max(minX, Math.min(maxX, nextX));
      nextY = Math.max(minY, Math.min(maxY, nextY));

      setLegendPos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      setIsDraggingLegend(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingLegend]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.no-drag')) {
      return;
    }
    if (!legendContainerRef.current || !mapContainerRef.current) return;
    e.preventDefault();

    const legendRect = legendContainerRef.current.getBoundingClientRect();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: legendRect.left - mapRect.left,
      posY: legendRect.top - mapRect.top,
    };
    setIsDraggingLegend(true);
  };

  const handleResetLegendPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLegendPos(null);
  };

  const MEXICO_BOUNDS: L.LatLngBoundsLiteral = [
    [13.8, -119.5], // Suroeste
    [33.2, -85.5],  // Noreste
  ];

  const lockMexicoView = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setView([23.6345, -102.5528], 5, { animate: true });
    map.setMaxBounds(MEXICO_BOUNDS);
    map.setMinZoom(5);
    map.panInsideBounds(MEXICO_BOUNDS, { animate: true });
    setIsMexicoLocked(true);
    setLockToastMessage('🔒 Vista bloqueada en México (No se puede mover fuera de México. Da 2 clics para desbloquear).');
    setTimeout(() => setLockToastMessage(null), 4000);
  };

  const unlockMexicoView = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setMaxBounds(null as any);
    map.setMinZoom(3);
    setIsMexicoLocked(false);
    setLockToastMessage('🔓 Vista desbloqueada. Ahora puedes visualizar los demás países libremente.');
    setTimeout(() => setLockToastMessage(null), 4000);
  };

  const handleMexicoButtonClick = () => {
    if (mexicoClickTimerRef.current) {
      // 2 clics (double click)
      clearTimeout(mexicoClickTimerRef.current);
      mexicoClickTimerRef.current = null;
      unlockMexicoView();
    } else {
      // 1 clic (single click) with debounce
      mexicoClickTimerRef.current = setTimeout(() => {
        mexicoClickTimerRef.current = null;
        lockMexicoView();
      }, 280);
    }
  };

  // Compute unique route corridors for Mode 3 (rendered on map)
  const uniqueCorridors: UniqueRouteCorridor[] = useMemo(() => {
    if (mapMode === 'unique_routes') {
      return getUniqueRouteCorridors(routes);
    }
    return [];
  }, [routes, mapMode]);

  // Base routes to ensure airlines in Mode 2 and Mode 3 right panels are never removed upon deselection
  const baseRoutesForAirlines = useMemo(() => {
    return allRoutes && allRoutes.length > 0 ? allRoutes : routes;
  }, [allRoutes, routes]);

  // Compute base unique route corridors across full dataset so exclusive airlines don't vanish
  const baseUniqueCorridors: UniqueRouteCorridor[] = useMemo(() => {
    return getUniqueRouteCorridors(baseRoutesForAirlines);
  }, [baseRoutesForAirlines]);

  // Corridor airlines set map for Mode 2 to identify exclusive vs shared corridors
  const corridorAirlinesSetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    routes.forEach(r => {
      const [c1, c2] = [r.originCode, r.destCode].sort();
      const key = `${c1} <-> ${c2}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(r.airline.trim());
    });
    return map;
  }, [routes]);

  // Statistics for Right-Side Legend
  const singleCorridorsCount = useMemo(() => {
    return baseUniqueCorridors.filter(c => c.airlines.length === 1).length;
  }, [baseUniqueCorridors]);

  const multiCorridorsCount = useMemo(() => {
    return baseUniqueCorridors.filter(c => c.airlines.length > 1).length;
  }, [baseUniqueCorridors]);

  // Mode 3: Exclusive airlines list that retains all airlines even when unselected
  const exclusiveAirlinesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    baseUniqueCorridors.forEach(c => {
      if (c.airlines.length === 1) {
        const a = c.airlines[0].airline;
        counts[a] = (counts[a] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [baseUniqueCorridors]);

  // Mode 2: Airlines list that retains all airlines even when unselected
  const mode2AirlinesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    baseRoutesForAirlines.forEach(r => {
      if (r.airline) {
        counts[r.airline] = (counts[r.airline] || 0) + 1;
      }
    });
    if (availableAirlines && availableAirlines.length > 0) {
      availableAirlines.forEach(a => {
        if (counts[a] === undefined) {
          counts[a] = 0;
        }
      });
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [baseRoutesForAirlines, availableAirlines]);

  const mode2GeneralCounts = useMemo(() => {
    let single = 0;
    let multi = 0;
    routes.forEach(r => {
      const [c1, c2] = [r.originCode, r.destCode].sort();
      const key = `${c1} <-> ${c2}`;
      const size = corridorAirlinesSetMap.get(key)?.size || 1;
      if (size === 1) single++;
      else multi++;
    });
    return { single, multi };
  }, [routes, corridorAirlinesSetMap]);

  // Compute active airport connections for Mode 1 if an airport is selected
  const activeAirportConnections = useMemo(() => {
    if (mapMode === 'airports' && selectedAirportCode) {
      return getAirportConnections(selectedAirportCode, routes);
    }
    return [];
  }, [selectedAirportCode, routes, mapMode]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [23.6345, -102.5528], // Mexico Republic Center
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
    });

    const activeTileConfig = TILE_LAYERS[tileLayerKey] || TILE_LAYERS.dark;
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: activeTileConfig.maxZoom,
      crossOrigin: true,
    }).addTo(map);

    const routesGroup = L.layerGroup().addTo(map);
    const airportsGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    routesLayerGroupRef.current = routesGroup;
    airportsLayerGroupRef.current = airportsGroup;
    mapInstanceRef.current = map;

    map.on('moveend', () => {
      if (isMovingFromSyncRef.current) {
        isMovingFromSyncRef.current = false;
        return;
      }
      if (onMapMove) {
        const center = map.getCenter();
        onMapMove([center.lat, center.lng], map.getZoom());
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer if changed
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const activeTileConfig = TILE_LAYERS[tileLayerKey] || TILE_LAYERS.dark;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newTileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: activeTileConfig.maxZoom,
      crossOrigin: true,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [tileLayerKey]);

  // Handle external sync pan/zoom
  useEffect(() => {
    if (!mapInstanceRef.current || !syncCenter || syncZoom === undefined || syncZoom === null) return;
    const currentCenter = mapInstanceRef.current.getCenter();
    const currentZoom = mapInstanceRef.current.getZoom();

    const dLat = Math.abs(currentCenter.lat - syncCenter[0]);
    const dLng = Math.abs(currentCenter.lng - syncCenter[1]);
    const dZ = Math.abs(currentZoom - syncZoom);

    if (dLat > 0.001 || dLng > 0.001 || dZ > 0) {
      isMovingFromSyncRef.current = true;
      mapInstanceRef.current.flyTo(syncCenter, syncZoom, { duration: 0.9 });
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    }
  }, [syncCenter, syncZoom]);

  // Main Render Effect for Routes, Corridors, and Airport Markers based on mapMode
  useEffect(() => {
    if (!mapInstanceRef.current || !routesLayerGroupRef.current || !airportsLayerGroupRef.current) return;

    routesLayerGroupRef.current.clearLayers();
    airportsLayerGroupRef.current.clearLayers();

    // ==========================================
    // MODE 1: VISUALIZACIÓN GENERAL DE AEROPUERTOS Y CONEXIONES
    // ==========================================
    if (mapMode === 'airports') {
      // If an airport is selected, draw its radial connection arcs to its destinations
      if (selectedAirportCode && showFlightArcs) {
        const originAirport = airports.find(a => a.code === selectedAirportCode);
        if (originAirport) {
          activeAirportConnections.forEach(conn => {
            const arcPoints = generateGreatCircleArc(
              [originAirport.lat, originAirport.lng],
              [conn.destLat, conn.destLng],
              35,
              arcCurvature
            );

            const polyline = L.polyline(arcPoints, {
              color: '#06b6d4',
              weight: Math.min(5, Math.max(2, conn.totalFlights / 400)),
              opacity: 0.85,
              dashArray: animateFlow ? '5, 8' : undefined,
              lineCap: 'round',
            });

            // Popup on the radial connection arc
            const popupHtml = `
              <div class="p-1 text-slate-100 min-w-[210px]">
                <div class="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-1.5">
                  <span class="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    ${selectedAirportCode} ➔ ${conn.destCode}
                  </span>
                  <span class="text-[10px] text-slate-400">${conn.flightType}</span>
                </div>
                <div class="text-xs font-bold text-white">${conn.destName}</div>
                <div class="text-[11px] text-slate-300 mt-1">
                  Distancia: ${Math.round(conn.distanceKm).toLocaleString()} km (${Math.round(conn.distanceNm)} NM)
                </div>
                <div class="text-[11px] text-cyan-300 mt-0.5 font-semibold">
                  ${conn.airlines.length} aerolíneas autorizadas
                </div>
              </div>
            `;
            polyline.bindPopup(popupHtml);

            polyline.on('mouseover', () => {
              polyline.setStyle({ weight: 6, color: '#38bdf8', opacity: 1 });
            });
            polyline.on('mouseout', () => {
              polyline.setStyle({ weight: Math.min(5, Math.max(2, conn.totalFlights / 400)), color: '#06b6d4', opacity: 0.85 });
            });

            routesLayerGroupRef.current?.addLayer(polyline);
          });
        }
      }
    }

    // ==========================================
    // MODE 2: VISUALIZACIÓN DE RUTAS POR AEROLÍNEA
    // ==========================================
    interface Mode2RouteEntry {
      originCode: string;
      destCode: string;
      polyline: L.Polyline;
      strokeColor: string;
      baseWeight: number;
      baseOpacity: number;
      isSelected: boolean;
    }
    const mode2RouteEntries: Mode2RouteEntry[] = [];

    if (mapMode === 'routes_by_airline') {
      if (showFlightArcs) {
        // If an airport is selected in Mode 2, only render its connected routes
        const routesToRender = mode2SelectedAirport
          ? routes.filter(r => r.originCode === mode2SelectedAirport || r.destCode === mode2SelectedAirport)
          : routes;

        routesToRender.forEach(route => {
          const arcPoints = generateGreatCircleArc(
            [route.originLat, route.originLng],
            [route.destLat, route.destLng],
            35,
            arcCurvature
          );

          let strokeColor = getAirlineColor(route.airline, customAirlineColors);
          if (colorScheme === 'cyan') {
            strokeColor = '#06b6d4';
          } else if (colorScheme === 'density') {
            strokeColor = route.flightsCount > 2000 ? '#f43f5e' : route.flightsCount > 1000 ? '#eab308' : '#06b6d4';
          } else if (colorScheme === 'traffic') {
            strokeColor = route.passengers > 300000 ? '#ec4899' : route.passengers > 150000 ? '#3b82f6' : '#10b981';
          }

          const isSelected = selectedRouteId === route.id;
          const baseWeight = Math.min(6, Math.max(1.8, route.flightsCount / 500));
          const lineWeight = isSelected ? baseWeight + 3 : mode2SelectedAirport ? baseWeight + 1.5 : baseWeight;
          const lineOpacity = isSelected ? 1 : mode2SelectedAirport ? 0.95 : 0.72;

          const polyline = L.polyline(arcPoints, {
            color: isSelected ? '#ffffff' : strokeColor,
            weight: lineWeight,
            opacity: lineOpacity,
            dashArray: animateFlow ? '6, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round',
          });

          // Interactive Popup displaying airline and authorization date
          const popupHtml = `
            <div class="p-1 text-slate-100 min-w-[220px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  ${route.originCode} ➔ ${route.destCode}
                </span>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">${route.flightType}</span>
              </div>
              <div class="text-xs font-medium text-slate-200 mb-1">
                ${route.originName} <span class="text-slate-400">➔</span> ${route.destName}
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] mt-2 pt-2 border-t border-slate-800">
                <div>
                  <span class="text-slate-400 block text-[10px]">Aerolínea</span>
                  <span class="font-bold text-slate-100" style="color:${strokeColor}">${route.airline}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Fecha de Autorización</span>
                  <span class="font-bold text-emerald-400">${route.authorizationDate || 'Registrada'}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Distancia</span>
                  <span class="font-semibold text-slate-200">${Math.round(route.distanceKm).toLocaleString()} km</span>
                </div>
              </div>
              <div class="mt-2 text-[10px] text-cyan-400 italic">
                * Haz clic en la ruta para ver todas las aerolíneas que la operan
              </div>
            </div>
          `;

          polyline.bindPopup(popupHtml, { closeButton: true, autoPan: true });

          polyline.on('mouseover', () => {
            if (!isSelected) {
              polyline.setStyle({
                weight: lineWeight + 2.5,
                opacity: 1,
                color: '#38bdf8',
              });
            }
          });

          polyline.on('mouseout', () => {
            if (!isSelected) {
              polyline.setStyle({
                weight: lineWeight,
                opacity: lineOpacity,
                color: strokeColor,
              });
            }
          });

          polyline.on('click', () => {
            if (onSelectRoute) onSelectRoute(route);
          });

          mode2RouteEntries.push({
            originCode: route.originCode,
            destCode: route.destCode,
            polyline,
            strokeColor: isSelected ? '#ffffff' : strokeColor,
            baseWeight: lineWeight,
            baseOpacity: lineOpacity,
            isSelected,
          });

          routesLayerGroupRef.current?.addLayer(polyline);
        });
      }
    }

    // Helper to dynamically filter routes in Mode 2 on airport hover / popup
    let activeMode2PopupAirport: string | null = null;
    let activeMode2HoveredAirport: string | null = null;

    const applyMode2AirportFilter = (targetCode: string | null, alternateCode?: string) => {
      if (!routesLayerGroupRef.current || mapMode !== 'routes_by_airline') return;
      if (!targetCode) {
        mode2RouteEntries.forEach((entry) => {
          if (!routesLayerGroupRef.current?.hasLayer(entry.polyline)) {
            routesLayerGroupRef.current?.addLayer(entry.polyline);
          }
          entry.polyline.setStyle({
            opacity: entry.baseOpacity,
            weight: entry.baseWeight,
            color: entry.strokeColor,
          });
        });
        return;
      }

      const matchCodes = new Set([targetCode, alternateCode].filter(Boolean) as string[]);

      mode2RouteEntries.forEach((entry) => {
        const isConnected = matchCodes.has(entry.originCode) || matchCodes.has(entry.destCode);
        if (isConnected) {
          if (!routesLayerGroupRef.current?.hasLayer(entry.polyline)) {
            routesLayerGroupRef.current?.addLayer(entry.polyline);
          }
          entry.polyline.setStyle({
            opacity: 0.96,
            weight: Math.max(entry.baseWeight + 1.2, 3),
            color: entry.strokeColor,
          });
          entry.polyline.bringToFront();
        } else {
          if (routesLayerGroupRef.current?.hasLayer(entry.polyline)) {
            routesLayerGroupRef.current?.removeLayer(entry.polyline);
          }
        }
      });
    };

    // ==========================================
    // MODE 3: VISUALIZACIÓN DE RUTAS ÚNICAS DESDUPLICADAS
    // ==========================================
    if (mapMode === 'unique_routes') {
      if (showFlightArcs) {
        uniqueCorridors.forEach(corridor => {
          const arcPoints = generateGreatCircleArc(
            [corridor.originLat, corridor.originLng],
            [corridor.destLat, corridor.destLng],
            35,
            arcCurvature
          );

          // Corridor styling based on analysis mode (General vs Específico):
          const isSingleOp = corridor.airlines.length === 1;
          const singleOpAirline = isSingleOp ? corridor.airlines[0].airline : null;
          const isMultiCarrier = corridor.airlines.length > 1;

          let strokeColor = uniqueSingleColor || '#06b6d4';
          if (uniqueAnalysisMode === 'general') {
            // Option a) General analysis: 1 sole airline -> uniqueSingleColor; 2+ airlines -> uniqueMultiColor
            strokeColor = isSingleOp ? (uniqueSingleColor || '#06b6d4') : (uniqueMultiColor || '#f59e0b');
          } else {
            // Option b) Specific analysis: 1 sole airline -> airline's specific color; 2+ airlines -> uniqueMultiColor
            if (isSingleOp && singleOpAirline) {
              strokeColor = getAirlineColor(singleOpAirline, customAirlineColors);
            } else {
              strokeColor = uniqueMultiColor || '#f59e0b';
            }
          }
          const baseWeight = Math.min(6.5, Math.max(2.4, corridor.totalFlights / 600));

          const polyline = L.polyline(arcPoints, {
            color: strokeColor,
            weight: baseWeight,
            opacity: 0.86,
            dashArray: animateFlow ? '6, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round',
          });

          // Popup for Unique Corridor (Mode 3: Rutas Únicas)
          const isSingleCarrierView = Boolean(singleOpAirline);
          const badgeTitle = uniqueAnalysisMode === 'general'
            ? (isSingleOp ? '1 Sola Aerolínea' : '2+ Aerolíneas Autorizadas')
            : (isSingleCarrierView ? `Ruta Única: ${singleOpAirline}` : 'Ruta Compartida (2+)');
          const popupHtml = `
            <div class="p-1.5 text-slate-100 min-w-[280px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-1.5">
                <span class="text-xs font-mono font-black text-white px-2.5 py-0.5 rounded border" style="background-color: ${strokeColor}33; border-color: ${strokeColor};">
                  ${corridor.originCode} ⇄ ${corridor.destCode}
                </span>
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style="color: ${strokeColor}; border-color: ${strokeColor}88; background-color: rgba(15, 23, 42, 0.9);">
                  ${badgeTitle}
                </span>
              </div>
              <div class="text-xs font-bold text-slate-100 mb-2">
                ${corridor.originName} ⇄ ${corridor.destName}
              </div>

              ${isSingleCarrierView ? `
                <div class="p-2 mb-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Aerolínea Autorizada:</span>
                    <span class="font-bold text-white flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${strokeColor}"></span>
                      ${singleOpAirline}
                    </span>
                  </div>
                  ${corridor.airlines[0]?.authorizationDate ? `
                    <div class="flex items-center justify-between pt-0.5">
                      <span class="text-slate-400">Fecha de Autorización:</span>
                      <span class="font-mono font-bold text-amber-300">${corridor.airlines[0].authorizationDate}</span>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div class="text-[11px] text-amber-300 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Aerolíneas Autorizadas:</span>
                  <span class="font-mono text-xs text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">${corridor.airlines.length}</span>
                </div>

                <div class="space-y-1 max-h-[140px] overflow-y-auto mb-2 pr-0.5">
                  ${corridor.airlines.map(a => `
                    <div class="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                      <span class="font-bold text-white truncate max-w-[140px]">${a.airline}</span>
                      <span class="text-cyan-300 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                        ${a.authorizationDate ? `Aut: ${a.authorizationDate}` : 'Aut. Registrada'}
                      </span>
                    </div>
                  `).join('')}
                </div>
              `}

              <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div>
                  <span class="text-slate-400 block">Número de Autorizaciones:</span>
                  <span class="font-bold text-amber-400 font-mono text-xs">${corridor.airlines.length}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Operadores:</span>
                  <span class="font-bold text-emerald-400 font-mono text-xs">${corridor.airlines.length}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-400 block">Distancia:</span>
                  <span class="font-bold text-slate-200 font-mono text-xs">${Math.round(corridor.distanceKm).toLocaleString()} km</span>
                </div>
              </div>
            </div>
          `;

          polyline.bindPopup(popupHtml, { closeButton: true, autoPan: true });

          polyline.on('mouseover', () => {
            polyline.setStyle({
              weight: baseWeight + 2.5,
              opacity: 1,
              color: '#ffffff',
            });
          });

          polyline.on('mouseout', () => {
            polyline.setStyle({
              weight: baseWeight,
              opacity: 0.82,
              color: strokeColor,
            });
          });

          polyline.on('click', () => {
            if (onSelectRoute) {
              // Construct or match first route for details modal
              const matchedRoute = routes.find(
                r => r.originCode === corridor.originCode && r.destCode === corridor.destCode
              );
              if (matchedRoute) {
                onSelectRoute(matchedRoute);
              }
            }
          });

          routesLayerGroupRef.current?.addLayer(polyline);
        });
      }
    }

    // ==========================================
    // DRAW AIRPORT MARKERS
    // ==========================================
    if (showAirports) {
      airports.forEach(airport => {
        // Resolve official airport metadata to guarantee no raw coordinates are ever displayed
        const resolvedProfile = resolveAirport(airport.code, airport.lat, airport.lng) || findAirportByCoordinates(airport.lat, airport.lng);
        
        let officialName = '';
        if (resolvedProfile?.name) {
          officialName = resolvedProfile.name;
        } else if (airport.name && !isCoordinateLike(airport.name) && airport.name !== airport.code && !/^aeropuerto\s+[a-z0-9_-]{1,4}$/i.test(airport.name)) {
          officialName = airport.name;
        } else {
          officialName = `Aeropuerto de ${airport.city || airport.code}`;
        }

        let officialCode = '';
        if (resolvedProfile?.code) {
          officialCode = resolvedProfile.code;
        } else if (airport.code && !isCoordinateLike(airport.code)) {
          officialCode = airport.code;
        } else {
          officialCode = 'AER';
        }

        const officialCity = resolvedProfile?.city || (!isCoordinateLike(airport.city) ? airport.city : '') || '';
        const officialState = resolvedProfile?.state || (!isCoordinateLike(airport.state) ? airport.state : '') || '';

        const rankNum = topAirportsRankMap?.get(officialCode) ?? topAirportsRankMap?.get(airport.code);
        const isRanked = rankNum !== undefined;
        const isMode1 = mapMode === 'airports';
        const isSelectedOrigin = isMode1 && (selectedAirportCode === airport.code || selectedAirportCode === officialCode);
        const isMajorHub = isRanked ? rankNum <= 4 : ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(officialCode);

        const isMode2 = mapMode === 'routes_by_airline';
        const isMode2Selected = isMode2 && (mode2SelectedAirport === officialCode || mode2SelectedAirport === airport.code);
        const isMode2Connected = isMode2 && Boolean(mode2SelectedAirport) && (mode2ConnectedAirportCodes.has(officialCode) || mode2ConnectedAirportCodes.has(airport.code));
        const isMode2Dimmed = isMode2 && Boolean(mode2SelectedAirport) && !isMode2Selected && !isMode2Connected;

        // Radius and pin color calculation
        let radius = 7;
        let pinColor = '#06b6d4';
        let shadowGlow = '8px #06b6d4';

        if (isMode2) {
          if (isMode2Selected) {
            radius = 10;
            pinColor = '#10b981'; // Emerald for selected origin
            shadowGlow = '16px #10b981';
          } else if (isMode2Connected) {
            radius = 8.5;
            pinColor = '#f59e0b'; // Amber/Gold for connected destinations
            shadowGlow = '14px #f59e0b';
          } else if (isMode2Dimmed) {
            radius = 4.5;
            pinColor = '#475569'; // Dimmed slate for non-connected
            shadowGlow = 'none';
          } else {
            radius = isMajorHub ? 8.5 : 7;
            pinColor = '#06b6d4';
            shadowGlow = '8px #06b6d4';
          }
        } else if (isMode1) {
          radius = isSelectedOrigin ? 10 : 8;
          pinColor = '#06b6d4';
          shadowGlow = '8px #06b6d4';
        } else {
          radius = isRanked ? (rankNum === 1 ? 11 : rankNum <= 4 ? 9 : 7.5) : isMajorHub ? 8.5 : 6;
          pinColor = rankNum === 1 ? '#f59e0b' : isMajorHub ? '#38bdf8' : '#0ea5e9';
          shadowGlow = rankNum === 1 ? '14px #f59e0b' : isMajorHub ? '12px #38bdf8' : '6px #0ea5e9';
        }

        const hasPulseRing = isSelectedOrigin || isMode2Selected || isMode2Connected || (!isMode1 && !isMode2 && (isMajorHub || isRanked));
        const pulseBorder = isMode2Selected
          ? '2px solid rgba(16, 185, 129, 0.9)'
          : isMode2Connected
          ? '2px solid rgba(245, 158, 11, 0.9)'
          : isMode1
          ? '2px solid rgba(6, 182, 212, 0.9)'
          : isSelectedOrigin
          ? '2px solid rgba(16, 185, 129, 0.8)'
          : '2px solid rgba(56, 189, 248, 0.7)';

        const iconHtml = `
          <div class="airport-marker-hitbox flex items-center justify-center" style="width: 28px; height: 28px; cursor: pointer;">
            <div class="airport-pin" style="width:${radius * 2}px; height:${radius * 2}px; background-color:${pinColor}; border: ${isMode2Dimmed ? '1px solid #64748b' : '2px solid #ffffff'}; box-shadow: 0 0 ${shadowGlow}; opacity: ${isMode2Dimmed ? 0.35 : 1};">
              ${hasPulseRing ? `<div class="pulse-ring" style="border: ${pulseBorder};"></div>` : ''}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-airport-div-icon',
          html: iconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([airport.lat, airport.lng], {
          icon: customIcon,
          title: `${officialCode} - ${officialName}`,
        });

        // Airport Tooltip & Label Logic
        // Requirements:
        // - Mode 1 (Aeropuertos y Hub):
        //   * ALWAYS display the IATA code above the airport point by default without needing hover.
        //   * When a Top is selected (selectedTopN is active), also display the airport name by default.
        // - Mode 2 (Rutas Autorizadas):
        //   * On hover: display ONLY the IATA code!
        //   * When 1 click: selected airport displays full name + IATA; connected airports are highlighted in amber.
        //   * If "con nombres": connected airports show permanent IATA badges reflected on the map.
        //   * If "sin nombres": connected airports hide permanent IATA badges.
        //   * On 2 clicks (double click): directly open "ver destinos y conexiones directas".
        // - Mode 3: Display on hover.
        if (showAirportLabels) {
          const isTopSelected = Boolean(selectedTopN);

          let isPermanent = false;
          let tooltipHtml = '';
          let tooltipClass = 'custom-airport-tooltip';

          if (isMode1) {
            isPermanent = true;
            if (isTopSelected) {
              tooltipClass = 'custom-airport-tooltip permanent-top-tooltip';
              tooltipHtml = `
                <div class="airport-tooltip-box text-center font-sans px-2.5 py-1 rounded-lg bg-slate-950/95 text-white border border-cyan-500/70 shadow-xl pointer-events-none">
                  <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
                    ${isRanked ? `<span class="text-[10px] text-cyan-300 font-black font-mono bg-cyan-950/90 border border-cyan-600/70 px-1 py-0.5 rounded">#${rankNum}</span>` : ''}
                    <span class="font-bold text-xs text-white">${officialName}</span>
                    <span class="text-[11px] text-cyan-300 font-mono font-black bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">(${officialCode})</span>
                  </div>
                </div>
              `;
            } else {
              tooltipClass = 'custom-airport-tooltip permanent-iata-tooltip';
              tooltipHtml = `
                <div class="airport-iata-badge font-sans font-mono font-black text-[11px] px-1.5 py-0.5 rounded-md bg-slate-950/95 text-cyan-300 border border-cyan-500/80 shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1">
                  <span class="tracking-wider">${officialCode}</span>
                  ${isRanked ? `<span class="text-[9px] text-cyan-400 font-mono font-bold bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-600/50">#${rankNum}</span>` : ''}
                </div>
              `;
            }
          } else if (isMode2) {
            if (mode2SelectedAirport) {
              if (isMode2Selected) {
                // Single click on this airport: displays full name + IATA
                isPermanent = true;
                tooltipClass = 'custom-airport-tooltip permanent-top-tooltip';
                tooltipHtml = `
                  <div class="airport-tooltip-box text-center font-sans px-3 py-1.5 rounded-xl bg-slate-950/95 text-white border-2 border-emerald-400 shadow-2xl pointer-events-none">
                    <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <span class="font-black text-xs text-white">${officialName}</span>
                      <span class="text-xs text-emerald-300 font-mono font-black bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-700">(${officialCode})</span>
                    </div>
                  </div>
                `;
              } else if (isMode2Connected) {
                // Connected airport: If "con nombres", display IATA badge permanently on map
                if (mode2ShowConnectedLabels) {
                  isPermanent = true;
                  tooltipClass = 'custom-airport-tooltip permanent-iata-tooltip';
                  tooltipHtml = `
                    <div class="airport-iata-badge font-sans font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-slate-950/95 text-amber-300 border border-amber-400/90 shadow-xl pointer-events-none whitespace-nowrap flex items-center justify-center">
                      <span class="tracking-wider">${officialCode}</span>
                    </div>
                  `;
                } else {
                  // "sin nombres": only on hover show IATA code
                  isPermanent = false;
                  tooltipClass = 'custom-airport-tooltip';
                  tooltipHtml = `
                    <div class="airport-iata-badge font-sans font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-950/95 text-amber-300 border border-amber-400/80 shadow-lg pointer-events-none whitespace-nowrap">
                      <span>${officialCode}</span>
                    </div>
                  `;
                }
              } else {
                // Dimmed airport: hover shows IATA code
                isPermanent = false;
                tooltipClass = 'custom-airport-tooltip';
                tooltipHtml = `
                  <div class="airport-iata-badge font-sans font-mono font-black text-xs px-1.5 py-0.5 rounded-md bg-slate-950/95 text-slate-400 border border-slate-700 shadow pointer-events-none whitespace-nowrap">
                    <span>${officialCode}</span>
                  </div>
                `;
              }
            } else {
              // Default in Mode 2: on hover ONLY display the IATA code!
              isPermanent = false;
              tooltipClass = 'custom-airport-tooltip';
              tooltipHtml = `
                <div class="airport-iata-badge font-sans font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-950/95 text-cyan-300 border border-cyan-500/80 shadow-lg pointer-events-none whitespace-nowrap">
                  <span>${officialCode}</span>
                </div>
              `;
            }
          } else {
            // Mode 3: Hover displays full name + IATA
            isPermanent = false;
            tooltipClass = 'custom-airport-tooltip';
            tooltipHtml = `
              <div class="airport-tooltip-box text-center font-sans px-2.5 py-1 rounded-lg bg-slate-950/95 text-white border border-slate-700 shadow-xl pointer-events-none">
                <span class="font-bold text-xs whitespace-nowrap">${officialName}</span>
                <span class="text-[11px] text-cyan-400 font-mono font-black ml-1.5 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">(${officialCode})</span>
                ${isRanked ? `<span class="text-[10px] text-amber-300 font-black ml-1 font-mono bg-amber-950/90 border border-amber-600/60 px-1 py-0.5 rounded">#${rankNum}</span>` : ''}
              </div>
            `;
          }

          marker.bindTooltip(tooltipHtml, {
            permanent: isPermanent,
            direction: 'top',
            offset: [0, -14],
            opacity: 0.98,
            className: tooltipClass,
          });
        }

        // Click & Double-Click Handler for Airport Marker
        // 1 click in Mode 2: Selects airport, highlights connected airports in amber, provides "con nombres" / "sin nombres"
        // 2 clicks (double click): Directly opens "Ver destinos y conexiones directas" (onOpenAirportConnections)
        let airportMarkerClickTimer: any = null;

        marker.on('click', () => {
          if (airportMarkerClickTimer) {
            // 2 clics (double click)
            clearTimeout(airportMarkerClickTimer);
            airportMarkerClickTimer = null;
            if (onOpenAirportConnections) {
              onOpenAirportConnections(officialCode);
            }
          } else {
            airportMarkerClickTimer = setTimeout(() => {
              airportMarkerClickTimer = null;
              // 1 clic (single click)
              if (mapMode === 'routes_by_airline') {
                if (mode2SelectedAirport === officialCode) {
                  // Toggle off if clicking the already selected origin
                  setMode2SelectedAirport(null);
                } else {
                  setMode2SelectedAirport(officialCode);
                }
              } else if (mapMode === 'airports') {
                if (onSelectAirport) onSelectAirport(officialCode);
                if (onOpenAirportConnections) onOpenAirportConnections(officialCode);
              }
            }, 260);
          }
        });

        marker.on('dblclick', (e) => {
          L.DomEvent.stopPropagation(e);
          if (airportMarkerClickTimer) {
            clearTimeout(airportMarkerClickTimer);
            airportMarkerClickTimer = null;
          }
          if (onOpenAirportConnections) {
            onOpenAirportConnections(officialCode);
          }
        });

        // Compute airport connections and operating airlines for popup
        const airportMatchCodes = new Set([officialCode, airport.code].filter(Boolean));
        const airportMode2Routes = routes.filter(
          r => airportMatchCodes.has(r.originCode) || airportMatchCodes.has(r.destCode)
        );

        const airlinesAtAirport = new Map<string, number>();
        airportMode2Routes.forEach(r => {
          airlinesAtAirport.set(r.airline, (airlinesAtAirport.get(r.airline) || 0) + 1);
        });
        const airlinesList = Array.from(airlinesAtAirport.entries()).sort((a, b) => b[1] - a[1]);

        // Popup for Airport: Full assigned airport name, code, metrics, and operating airlines
        const airportPopupHtml = `
          <div class="p-1 text-slate-100 min-w-[280px]">
            <div class="border-b border-slate-700 pb-2 mb-2">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-mono font-black text-cyan-300 bg-cyan-950/90 px-2.5 py-0.5 rounded border border-cyan-700">
                  ${officialCode}
                </span>
                ${isRanked ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded uppercase font-bold tracking-wider">#${rankNum} TOP RUTAS</span>` : isMajorHub ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">HUB PRINCIPAL</span>' : '<span class="text-[9px] text-slate-400 uppercase font-semibold">Aeropuerto Nacional</span>'}
              </div>
              <div class="text-sm font-black text-white leading-snug">${officialName}</div>
              <div class="text-[11px] text-cyan-200/90 mt-0.5 font-medium">${officialCity}${officialState && officialState !== officialCity ? `, ${officialState}` : ''}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2 rounded-xl border border-slate-800 mb-2">
              <div>
                <span class="text-slate-400 text-[10px] block font-medium">Rutas Asignadas:</span>
                <span class="font-bold text-amber-400 font-mono text-xs">${airportMode2Routes.length > 0 ? airportMode2Routes.length : ((airport.outgoingRoutes || 0) + (airport.incomingRoutes || 0))} ruta${(airportMode2Routes.length || (airport.outgoingRoutes || 0) + (airport.incomingRoutes || 0)) === 1 ? '' : 's'}</span>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block font-medium">Aerolíneas Autorizadas:</span>
                <span class="font-bold text-cyan-300 font-mono text-xs">${airlinesList.length}</span>
              </div>
            </div>

            ${airlinesList.length > 0 ? `
              <div class="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Aerolíneas y Rutas:</span>
              </div>
              <div class="space-y-1 max-h-[110px] overflow-y-auto mb-2.5 pr-0.5">
                ${airlinesList.map(([airline, count]) => {
                  const aColor = getAirlineColor(airline, customAirlineColors);
                  return `
                    <div class="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                      <div class="flex items-center gap-1.5 truncate">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${aColor}"></span>
                        <span class="font-semibold text-slate-200 truncate">${airline}</span>
                      </div>
                      <span class="font-mono text-cyan-300 font-bold shrink-0 text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">${count} ruta${count > 1 ? 's' : ''}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <button 
              id="btn-open-connections-${officialCode}"
              class="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
            >
              <span>Ver Destinos y Conexiones Directas</span>
            </button>
          </div>
        `;

        marker.bindPopup(airportPopupHtml);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-open-connections-${officialCode}`);
          if (btn) {
            btn.onclick = () => {
              if (onOpenAirportConnections) onOpenAirportConnections(officialCode);
              marker.closePopup();
            };
          }
        });

        airportsLayerGroupRef.current?.addLayer(marker);
      });
    }
  }, [
    routes,
    airports,
    mapMode,
    selectedAirportCode,
    activeAirportConnections,
    uniqueCorridors,
    arcCurvature,
    colorScheme,
    showAirportLabels,
    showFlightArcs,
    showAirports,
    animateFlow,
    selectedRouteId,
    customAirlineColors,
    selectedTopN,
    topAirportsRankMap,
    uniqueAnalysisMode,
    uniqueSingleColor,
    uniqueMultiColor,
    corridorAirlinesSetMap,
  ]);

  // Unique airlines for legend
  const activeAirlines: string[] = useMemo(() => {
    return Array.from(new Set(routes.map(r => r.airline))).filter(Boolean) as string[];
  }, [routes]);

  const handleResetMexicoView = () => {
    mapInstanceRef.current?.setView([23.6345, -102.5528], 5, { animate: true });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleQuickCapturePNG = async () => {
    try {
      setIsCapturing(true);
      await exportMapToImage(id, `mapa_rutas_mexico_${mapMode}_${Date.now()}.png`, routes, airports, customAirlineColors);
      setCaptureSuccess(true);
      setTimeout(() => setCaptureSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error al capturar PNG:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Map Container */}
      <div id={id} ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Navigation Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
        <button
          id={`${id}-btn-zoom-in`}
          onClick={handleZoomIn}
          title="Acercar (Zoom In)"
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 rounded-lg transition cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id={`${id}-btn-zoom-out`}
          onClick={handleZoomOut}
          title="Alejar (Zoom Out)"
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 rounded-lg transition cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button
          id={`${id}-btn-reset-mexico`}
          onClick={handleResetMexicoView}
          title="Centrar en República Mexicana"
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 rounded-lg transition flex items-center justify-center cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button
          id={`${id}-btn-quick-png`}
          onClick={handleQuickCapturePNG}
          disabled={isCapturing}
          title="Descargar captura rápida en PNG de este mapa"
          className="p-2 hover:bg-cyan-950/80 text-cyan-300 hover:text-cyan-200 rounded-lg transition flex items-center justify-center relative cursor-pointer disabled:opacity-50"
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : captureSuccess ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Floating Right-Side Colors Legend (Visualizaciones 2 y 3) */}
      {(mapMode === 'routes_by_airline' || mapMode === 'unique_routes') && (
        <div className="absolute top-4 right-16 z-[400] flex flex-col items-end">
          {!isRightLegendExpanded ? (
            <button
              id={`${id}-btn-expand-legend`}
              onClick={() => setIsRightLegendExpanded(true)}
              title={
                mapMode === 'unique_routes'
                  ? 'Ver Nomenclatura y Atribución Cromática (Rutas Únicas)'
                  : 'Ver Nomenclatura y Atribución Cromática por Aerolínea'
              }
              className="bg-slate-900/95 hover:bg-slate-850 text-cyan-300 hover:text-white border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2 text-xs font-bold transition backdrop-blur-md cursor-pointer group"
            >
              <Palette className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Nomenclatura y Código Cromático</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            </button>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-3.5 w-76 sm:w-84 max-h-[calc(100vh-120px)] flex flex-col text-slate-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                    {mapMode === 'unique_routes' ? <GitCommit className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white tracking-wide truncate">
                      {mapMode === 'unique_routes'
                        ? 'Nomenclatura y Clasificación de Tramos Únicos'
                        : 'Atribución Cromática por Operador Aéreo'}
                    </div>
                    <div className="text-[10px] text-cyan-300 font-mono truncate">
                      {mapMode === 'unique_routes'
                        ? `${uniqueCorridors.length} tramos únicos consolidados`
                        : `${routes.length} autorizaciones activas • ${mode2AirlinesCount.length} aerolíneas`}
                    </div>
                  </div>
                </div>
                <button
                  id={`${id}-btn-collapse-legend`}
                  onClick={() => setIsRightLegendExpanded(false)}
                  title="Minimizar panel cromático"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer shrink-0 ml-1"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle / Description */}
              <div className="text-[10px] text-slate-400 mt-2 mb-1.5 leading-snug shrink-0">
                {mapMode === 'unique_routes'
                  ? 'Identificación cromática por operador exclusivo y concurrencia de tramos.'
                  : 'Correspondencia cromática y volumen de rutas autorizadas por aerolínea en México.'}
              </div>

              {/* ======================================================== */}
              {/* MODE 2 BODY: TODAS LAS RUTAS AUTORIZADAS (MODO ESTÁNDAR) */}
              {/* ======================================================== */}
              {mapMode === 'routes_by_airline' && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                    <span>Aerolíneas Autorizadas ({mode2AirlinesCount.length}):</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onSelectAllAirlines}
                        className="text-[10px] text-cyan-400 hover:text-white underline cursor-pointer"
                        title="Marcar todas las aerolíneas"
                      >
                        Marcar todas
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={onDeselectAllAirlines}
                        className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                        title="Deseleccionar todas para elegir 2 o más con las casillas"
                      >
                        Deseleccionar todas
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-cyan-300/90 bg-cyan-950/40 p-2 rounded-xl border border-cyan-800/50 leading-tight">
                    ☑ <strong>Selección múltiple con casillas:</strong> Marca 2 o más aerolíneas para visualizarlas simultáneamente con sus propios colores.
                  </div>

                  {/* List of all airlines with their colors, counts and checkboxes */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {mode2AirlinesCount.map(([airline, count]) => {
                      const color = getAirlineColor(airline, customAirlineColors);
                      const isNoneSelected = selectedAirlines.includes('__NONE__');
                      const isChecked = !isNoneSelected && (selectedAirlines.length === 0 || selectedAirlines.includes(airline));
                      return (
                        <div
                          key={airline}
                          onClick={() => onToggleAirline && onToggleAirline(airline)}
                          className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                            isChecked
                              ? 'bg-slate-950/90 border-cyan-500/60 shadow-sm'
                              : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleAirline && onToggleAirline(airline)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                title={isChecked ? `Desmarcar ${airline}` : `Marcar casilla de ${airline}`}
                              />
                            </label>

                            <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                                className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                title={`Cambiar color asignado a ${airline}`}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-white/70 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span
                              className="text-xs text-slate-200 font-medium truncate hover:text-white"
                              title={airline}
                            >
                              {airline}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[10px] font-bold text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {count} {count === 1 ? 'ruta' : 'rutas'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Total de autorizaciones registradas:</span>
                    <span className="font-mono font-bold text-white">{routes.length}</span>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 3 BODY: RUTAS ÚNICAS */}
              {/* ======================================================== */}
              {mapMode === 'unique_routes' && (
                <>
                  {/* Mode 3 Active Indicator */}
                  <div className="my-1.5 flex items-center justify-between shrink-0 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Modalidad Activa:
                    </span>
                    <span className="text-[10px] font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-800">
                      {uniqueAnalysisMode === 'general' ? 'Análisis general' : 'Análisis específico'}
                    </span>
                  </div>

                  {/* Mode 3 Submode A: Análisis General */}
                  {uniqueAnalysisMode === 'general' ? (
                    <div className="space-y-2 py-1 overflow-y-auto">
                      <div className="text-[10px] text-slate-400 leading-snug">
                        En el <strong>Análisis general</strong> no se muestran aerolíneas individuales. Todos los 346 tramos consolidados se diferencian únicamente por si cuentan con 1 sola aerolínea autorizada o 2 o más:
                      </div>

                      {/* Color 1: 1 sola aerolínea */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex items-center justify-center shrink-0">
                            <input
                              type="color"
                              value={uniqueSingleColor}
                              onChange={(e) => onChangeUniqueSingleColor && onChangeUniqueSingleColor(e.target.value)}
                              className="w-6 h-6 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Click para cambiar color para 1 sola aerolínea"
                            />
                            <span
                              className="w-5 h-5 rounded-full border-2 border-white/70 shadow-sm"
                              style={{ backgroundColor: uniqueSingleColor }}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">1 Sola Aerolínea</div>
                            <div className="text-[10px] text-cyan-300">Operador único exclusivo</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {singleCorridorsCount} rutas
                        </span>
                      </div>

                      {/* Color 2: 2 o más aerolíneas */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex items-center justify-center shrink-0">
                            <input
                              type="color"
                              value={uniqueMultiColor}
                              onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                              className="w-6 h-6 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Click para cambiar color para 2 o más aerolíneas"
                            />
                            <span
                              className="w-5 h-5 rounded-full border-2 border-white/70 shadow-sm"
                              style={{ backgroundColor: uniqueMultiColor }}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">2 o Más Aerolíneas</div>
                            <div className="text-[10px] text-amber-300">Ruta compartida / concurrente</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {multiCorridorsCount} rutas
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Total de tramos consolidados:</span>
                        <span className="font-mono font-bold text-white">{uniqueCorridors.length}</span>
                      </div>
                    </div>
                  ) : (
                    /* Mode 3 Submode B: Análisis Específico */
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      <div className="text-[10px] text-slate-400 leading-snug">
                        En el <strong>Análisis específico</strong> se resalta a cada aerolínea con su propio color cuando es el único operador de la ruta, y se asigna un color compartido para 2 o más aerolíneas:
                      </div>

                      {/* Multi-carrier color option */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-amber-500/50">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center shrink-0">
                            <input
                              type="color"
                              value={uniqueMultiColor}
                              onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                              className="w-6 h-6 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Cambiar color para rutas compartidas por 2 o más aerolíneas"
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white/70 shadow-sm"
                              style={{ backgroundColor: uniqueMultiColor }}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-300">2 o Más Aerolíneas</div>
                            <div className="text-[10px] text-slate-400">Rutas compartidas</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {multiCorridorsCount} rutas
                        </span>
                      </div>

                      {/* Header for individual exclusive airlines */}
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1 flex items-center justify-between">
                        <span>Aerolíneas Autorizadas ({exclusiveAirlinesCount.length}):</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={onSelectAllAirlines}
                            className="text-[10px] text-cyan-400 hover:text-white underline cursor-pointer"
                            title="Marcar todas las aerolíneas"
                          >
                            Marcar todas
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={onDeselectAllAirlines}
                            className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                            title="Deseleccionar todas para elegir 2 o más con las casillas"
                          >
                            Deseleccionar todas
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-cyan-300/90 bg-cyan-950/40 p-2 rounded-xl border border-cyan-800/50 leading-tight">
                        ☑ <strong>Selección múltiple con casillas:</strong> Marca 2 o más operadores exclusivos para compararlos simultáneamente.
                      </div>

                      {/* Exclusive Airlines List with Checkboxes */}
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {exclusiveAirlinesCount.map(([airline, count]) => {
                          const color = getAirlineColor(airline, customAirlineColors);
                          const isNoneSelected = selectedAirlines.includes('__NONE__');
                          const isChecked = !isNoneSelected && (selectedAirlines.length === 0 || selectedAirlines.includes(airline));
                          return (
                            <div
                              key={airline}
                              onClick={() => onToggleAirline && onToggleAirline(airline)}
                              className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-slate-950/90 border-cyan-500/60 shadow-sm'
                                  : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-90'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onToggleAirline && onToggleAirline(airline)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                    title={isChecked ? `Desmarcar ${airline}` : `Marcar casilla de ${airline}`}
                                  />
                                </label>

                                <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                                    className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                    title={`Cambiar color de ${airline}`}
                                  />
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/70 shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                </div>
                                <span
                                  className="text-xs text-slate-200 font-medium truncate hover:text-white"
                                  title={airline}
                                >
                                  {airline}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[10px] font-bold text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {count} {count === 1 ? 'ruta' : 'rutas'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Tramos totales:</span>
                        <span className="font-mono font-bold text-white">
                          {singleCorridorsCount} exclusivas + {multiCorridorsCount} compartidas = {uniqueCorridors.length}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
