import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { FlightRoute, Airport, MapVisualizationMode, UniqueRouteCorridor, UniqueRoutesAnalysisMode } from '../types';
import { generateGreatCircleArc } from '../utils/geodesic';
import { exportMapToImage, generateExportFilename, MEXICO_MAINLAND_OUTLINE, BAJA_PENINSULA_OUTLINE } from '../utils/exporter';
import { getUniqueRouteCorridors, getAirportConnections } from '../utils/dataParser';
import { resolveAirport, findAirportByCoordinates, isCoordinateLike } from '../data/mexicoDemoData';
import mexicoStatesData from '../data/mexicoStates.json';
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
  Tag,
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
  onFilterAirportConnections?: (airportCode: string) => void;
  tileLayerKey?: 'dark' | 'light' | 'osm' | 'satellite' | 'topo';
  arcCurvature?: number;
  colorScheme?: 'airline' | 'density' | 'cyan' | 'traffic';
  showAirportLabels?: boolean;
  onToggleAirportLabels?: (show: boolean) => void;
  iataFontSize?: number;
  onChangeIataFontSize?: (size: number) => void;
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
  mode3GeneralShowSingle?: boolean;
  onToggleMode3GeneralSingle?: () => void;
  mode3GeneralShowMulti?: boolean;
  onToggleMode3GeneralMulti?: () => void;
  onSetMode3GeneralFilter?: (showSingle: boolean, showMulti: boolean) => void;
  availableAirlines?: string[];
  selectedAirlines?: string[];
  onToggleAirline?: (airline: string) => void;
  onSelectOnlyAirline?: (airline: string) => void;
  onSelectAllAirlines?: () => void;
  onDeselectAllAirlines?: () => void;
  onUpdateAirlineColor?: (airline: string, color: string) => void;
  versusFilteredAirlines?: boolean;
  onToggleVersusFilteredAirlines?: () => void;
  // Specific analysis for Mode 1 (passed from Sidebar or local)
  mode1AnalysisMode?: 'standard' | 'specific';
  mode1SpecificAirline?: string;
  mode1SpecificAirlineColor?: string;
  // For comparison mode coloring in Mode 1
  isComparePane?: boolean;
  compareAirlineColor?: string;
  className?: string;
  isAirportConnectionsOpen?: boolean;
}

export const TILE_LAYERS = {
  dark: {
    name: 'Radar Oscuro (Esri Aeronáutico)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; HERE, Garmin, USGS',
    maxZoom: 16,
  },
  light: {
    name: 'Cartográfico Claro (Esri Canvas)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; HERE, Garmin, USGS',
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
  'vivaaerobus': '#10b981', // Emerald Green
  'viva aerobus': '#10b981',
  'viva': '#10b981',
  'aeroenlaces nacionales': '#10b981',
  'aeroenlaces': '#10b981',
  'aerolitoral': '#1d4ed8', // Royal Deep Blue (Aeroméxico Connect - distinct from Aeroméxico)
  'link conexion aerea': '#6366f1', // Electric Indigo (TAR) - completely distinct from 2+ airlines amber
  'link conexion': '#6366f1',
  'tar aerolineas': '#6366f1',
  'tar': '#6366f1',
  'aereo calafia': '#ec4899', // Bright Pink
  'calafia': '#ec4899',
  'estafeta carga aerea': '#dc2626', // Crimson Red
  'estafeta': '#dc2626',
  'aerotransportes rafilher': '#14b8a6', // Deep Teal
  'rafilher': '#14b8a6',
  'aerotransportes mas de carga': '#8b5cf6', // Indigo Violet (MasAir)
  'mas de carga': '#8b5cf6',
  'masair': '#8b5cf6',
  'tm aerolineas': '#64748b', // Slate Steel - completely distinct from 2+ airlines amber
  'tm': '#64748b',
  'aerotransporte de carga union': '#e11d48', // Ruby Rose
  'carga union': '#e11d48',
  'aerolinea del estado mexicano': '#06b6d4', // Pure Cyan (Mexicana)
  'mexicana': '#06b6d4',
  'magnicharters': '#c026d3', // Deep Fuchsia (distinct from red, amber and gold)
  'interjet': '#3b82f6', // Cobalt Blue
  'aerus': '#84cc16', // Lime Green (distinct from emerald)
  'aeromar': '#4f46e5', // Deep Indigo
  'delta': '#b91c1c',
  'united': '#0369a1',
  'american': '#475569',
  'copa': '#0ea5e9',
};

const DYNAMIC_PALETTE = [
  '#0284c7', // Sky
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#6366f1', // Indigo (replacing Amber so never clashes with 2+ aerolíneas)
  '#dc2626', // Crimson Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#8b5cf6', // Violet
  '#64748b', // Slate Steel (replacing Orange)
  '#84cc16', // Lime
  '#1d4ed8', // Royal Blue
  '#d946ef', // Fuchsia
  '#e11d48', // Rose
  '#0d9488', // Dark Teal (replacing Yellow)
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

  const sortedKeys = Object.keys(KNOWN_AIRLINE_COLORS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean === key || clean.includes(key)) {
      return KNOWN_AIRLINE_COLORS[key];
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
  onFilterAirportConnections,
  tileLayerKey = 'dark',
  arcCurvature = 0.14,
  colorScheme = 'airline',
  showAirportLabels = true,
  onToggleAirportLabels,
  iataFontSize = 11,
  onChangeIataFontSize,
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
  mode3GeneralShowSingle = true,
  onToggleMode3GeneralSingle,
  mode3GeneralShowMulti = true,
  onToggleMode3GeneralMulti,
  onSetMode3GeneralFilter,
  availableAirlines = [],
  selectedAirlines = [],
  onToggleAirline,
  onSelectOnlyAirline,
  onSelectAllAirlines,
  onDeselectAllAirlines,
  onUpdateAirlineColor,
  versusFilteredAirlines = false,
  onToggleVersusFilteredAirlines,
  mode1AnalysisMode = 'standard',
  mode1SpecificAirline,
  mode1SpecificAirlineColor,
  isComparePane = false,
  compareAirlineColor,
  className = '',
  isAirportConnectionsOpen = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const referenceTileLayerRef = useRef<L.TileLayer | null>(null);
  const mexicoGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const airportsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersByCodeRef = useRef<Map<string, L.Marker>>(new Map());
  const activeOpenPopupCodeRef = useRef<string | null>(null);
  const onOpenAirportConnectionsRef = useRef(onOpenAirportConnections);
  onOpenAirportConnectionsRef.current = onOpenAirportConnections;
  const onFilterAirportConnectionsRef = useRef(onFilterAirportConnections);
  onFilterAirportConnectionsRef.current = onFilterAirportConnections;
  const lastClickedAirportRef = useRef<{ code: string; time: number } | null>(null);
  const lastFilterTriggerTimeRef = useRef<number>(0);
  const onSelectAirportRef = useRef(onSelectAirport);
  onSelectAirportRef.current = onSelectAirport;
  const onSelectRouteRef = useRef(onSelectRoute);
  onSelectRouteRef.current = onSelectRoute;
  const isMovingFromSyncRef = useRef<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureSuccess, setCaptureSuccess] = useState<boolean>(false);
  const [isRightLegendExpanded, setIsRightLegendExpanded] = useState<boolean>(true);

  // Local fallback state for IATA Font Size and Label Visibility
  const [localIataFontSize, setLocalIataFontSize] = useState<number>(11);
  const activeIataFontSize = iataFontSize ?? localIataFontSize;

  // Immediate CSS custom property sync for zero-latency IATA font size adjustments
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.style.setProperty('--iata-font-size', `${activeIataFontSize}px`);
    }
  }, [activeIataFontSize]);

  // Global bridge for airport connection detail modal trigger
  useEffect(() => {
    (window as any).__gis_open_connections = (code: string) => {
      if (onOpenAirportConnections) {
        onOpenAirportConnections(code);
      }
    };
  }, [onOpenAirportConnections]);

  const [localShowAirportLabels, setLocalShowAirportLabels] = useState<boolean>(true);
  const activeShowAirportLabels = showAirportLabels ?? localShowAirportLabels;
  const [showIataPopover, setShowIataPopover] = useState<boolean>(false);

  const handleToggleLabels = (show: boolean) => {
    setLocalShowAirportLabels(show);
    if (onToggleAirportLabels) onToggleAirportLabels(show);
  };

  const handleChangeIataFontSize = (size: number) => {
    const clamped = Math.max(8, Math.min(18, size));
    setLocalIataFontSize(clamped);
    if (mapContainerRef.current) {
      mapContainerRef.current.style.setProperty('--iata-font-size', `${clamped}px`);
    }
    if (onChangeIataFontSize) onChangeIataFontSize(clamped);
  };

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
    activeOpenPopupCodeRef.current = null;
    if (mapMode !== 'routes_by_airline') {
      setMode2SelectedAirport(null);
    }
  }, [mapMode]);

  // Open popup when selectedAirportCode is changed externally (e.g. from CompareView selector in Mode 1)
  useEffect(() => {
    if (mapMode === 'airports' && selectedAirportCode) {
      activeOpenPopupCodeRef.current = selectedAirportCode;
      const targetMarker = markersByCodeRef.current.get(selectedAirportCode);
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  }, [selectedAirportCode, mapMode]);

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

  const selectedMode1AirportProfile = useMemo(() => {
    if (!selectedAirportCode) return null;
    const resolved = resolveAirport(selectedAirportCode);
    if (resolved) return resolved;
    const match = airports.find(a => a.code === selectedAirportCode);
    return match || {
      code: selectedAirportCode,
      name: `Aeropuerto ${selectedAirportCode}`,
      city: '',
      state: '',
      lat: 0,
      lng: 0,
    };
  }, [selectedAirportCode, airports]);

  // Draggable Legend Mouse & Touch Event Listeners
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

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0] || !mapContainerRef.current || !legendContainerRef.current) return;
      const touch = e.touches[0];
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const legendRect = legendContainerRef.current.getBoundingClientRect();

      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;

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

    const onTouchEnd = () => {
      setIsDraggingLegend(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
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

  const handleDragTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.no-drag')) {
      return;
    }
    if (!e.touches[0] || !legendContainerRef.current || !mapContainerRef.current) return;

    const touch = e.touches[0];
    const legendRect = legendContainerRef.current.getBoundingClientRect();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
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
    setLockToastMessage('🔒 Vista bloqueada en República Mexicana (Movimiento limitado a México. Da 2 clics en el botón para desbloquear).');
    setTimeout(() => setLockToastMessage(null), 4500);
  };

  const unlockMexicoView = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setMaxBounds(null as any);
    map.setMinZoom(3);
    setIsMexicoLocked(false);
    setLockToastMessage('🔓 Vista desbloqueada: Ahora puedes moverte y visualizar los demás países libremente.');
    setTimeout(() => setLockToastMessage(null), 4500);
  };

  const handleMexicoButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Master corridor airlines set map for identifying shared (2+ airlines) vs exclusive corridors
  const masterCorridorAirlinesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    baseRoutesForAirlines.forEach(r => {
      const [c1, c2] = [r.originCode, r.destCode].sort();
      const key = `${c1} <-> ${c2}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(r.airline.trim().toLowerCase());
    });
    return map;
  }, [baseRoutesForAirlines]);

  // Corridor airlines set map for active routes
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

  // Effective active airlines set for filtering & versus comparison mode
  const activeAirlineSet = useMemo(() => {
    if (selectedAirlines.includes('__NONE__')) return new Set<string>();
    if (selectedAirlines.length > 0) {
      return new Set(selectedAirlines.map(a => a.trim().toLowerCase()));
    }
    const all = availableAirlines && availableAirlines.length > 0
      ? availableAirlines
      : Array.from(new Set(baseRoutesForAirlines.map(r => r.airline)));
    return new Set(all.map(a => a.trim().toLowerCase()));
  }, [selectedAirlines, availableAirlines, baseRoutesForAirlines]);

  const isNoneAirline = selectedAirlines.includes('__NONE__');
  const hasActiveAirlineFilter = !isNoneAirline && selectedAirlines.length > 0;
  const isSoleFilteredAirline = hasActiveAirlineFilter && selectedAirlines.length === 1;
  const soleFilteredAirlineName = isSoleFilteredAirline ? selectedAirlines[0] : '';
  const activeFilteredAirlinesCount = hasActiveAirlineFilter
    ? selectedAirlines.length
    : (availableAirlines && availableAirlines.length > 0 ? availableAirlines.length : 13);

  // Count of shared routes currently in active routes
  const specificSharedRoutesCount = useMemo(() => {
    return routes.filter(r => {
      const [c1, c2] = [r.originCode, r.destCode].sort();
      const key = `${c1} <-> ${c2}`;
      const corridorAirlines = masterCorridorAirlinesMap.get(key) || new Set([r.airline.toLowerCase()]);
      if (versusFilteredAirlines) {
        if (activeAirlineSet.size <= 1) return false;
        let matches = 0;
        corridorAirlines.forEach(a => {
          if (activeAirlineSet.has(a.trim().toLowerCase())) matches++;
        });
        return matches >= 2;
      }
      return corridorAirlines.size >= 2;
    }).length;
  }, [routes, masterCorridorAirlinesMap, versusFilteredAirlines, activeAirlineSet]);

  // Shared routes/corridors count displayed in the card:
  // When versusFilteredAirlines is active:
  // - If 1 airline is filtered: 0
  // - If 2+ airlines are filtered: number of corridors shared among the filtered airlines
  // When versusFilteredAirlines is inactive: standard multiCorridorsCount
  const displaySharedRoutesCount = useMemo(() => {
    if (!versusFilteredAirlines) return multiCorridorsCount;
    if (activeAirlineSet.size <= 1) return 0;
    let count = 0;
    masterCorridorAirlinesMap.forEach((allOnCorridor) => {
      let matches = 0;
      allOnCorridor.forEach(a => {
        if (activeAirlineSet.has(a)) matches++;
      });
      if (matches >= 2) count++;
    });
    return count;
  }, [versusFilteredAirlines, multiCorridorsCount, activeAirlineSet, masterCorridorAirlinesMap]);

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

  // Desglose de Cruces de Red por cada aerolínea seleccionada
  const crucesDeRedBreakdown = useMemo(() => {
    if (!versusFilteredAirlines) return [];

    let airlinesToAnalyze: string[] = [];
    if (selectedAirlines.includes('__NONE__')) {
      return [];
    } else if (selectedAirlines.length > 0) {
      airlinesToAnalyze = selectedAirlines;
    } else {
      airlinesToAnalyze = mode2AirlinesCount.map(([name]) => name);
    }

    const activeSet = new Set(airlinesToAnalyze.map((a) => a.trim().toLowerCase()));
    const isSingle = activeSet.size <= 1;

    return airlinesToAnalyze.map((airlineName) => {
      const aLower = airlineName.trim().toLowerCase();
      // Routes of this airline in base dataset
      const airlineRoutes = baseRoutesForAirlines.filter(
        (r) => r.airline.trim().toLowerCase() === aLower
      );

      let sharedRoutesCount = 0;
      let uniqueRoutesCount = 0;
      const sharedWithOtherAirlines = new Set<string>();

      airlineRoutes.forEach((r) => {
        const [c1, c2] = [r.originCode, r.destCode].sort();
        const corridorKey = `${c1} <-> ${c2}`;
        const allOnCorridor = masterCorridorAirlinesMap.get(corridorKey) || new Set([aLower]);

        if (isSingle) {
          // If only 1 airline is selected, all its routes are unique (no cross with other selected airlines)
          uniqueRoutesCount++;
        } else {
          let hasIntersection = false;
          allOnCorridor.forEach((otherA) => {
            if (otherA !== aLower && activeSet.has(otherA)) {
              hasIntersection = true;
              sharedWithOtherAirlines.add(otherA);
            }
          });

          if (hasIntersection) {
            sharedRoutesCount++;
          } else {
            uniqueRoutesCount++;
          }
        }
      });

      return {
        airline: airlineName,
        totalRoutes: airlineRoutes.length,
        uniqueRoutesCount,
        sharedRoutesCount,
        sharedWithCount: sharedWithOtherAirlines.size,
      };
    });
  }, [versusFilteredAirlines, selectedAirlines, mode2AirlinesCount, baseRoutesForAirlines, masterCorridorAirlinesMap]);

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

  // Mode 1: Count of airports operated by 2+ airlines vs 1 airline, and airports count per airline respecting active filters
  const mode1AirportColorStats = useMemo(() => {
    const isNone = selectedAirlines.includes('__NONE__');
    if (isNone) {
      return {
        multiAirports: 0,
        singleAirports: 0,
        airportsPerAirline: {},
        totalAirports: 0,
        totalAirlines: 0,
        targetAirports: new Set<string>()
      };
    }

    const effectiveAirlinesSet = selectedAirlines.length > 0 ? new Set(selectedAirlines) : null;
    const targetRoutes = routes.filter(r => !effectiveAirlinesSet || effectiveAirlinesSet.has(r.airline));

    const airportAirlinesMap = new Map<string, Set<string>>();
    targetRoutes.forEach(r => {
      if (!r.airline) return;
      if (r.originCode) {
        if (!airportAirlinesMap.has(r.originCode)) airportAirlinesMap.set(r.originCode, new Set());
        airportAirlinesMap.get(r.originCode)!.add(r.airline);
      }
      if (r.destCode) {
        if (!airportAirlinesMap.has(r.destCode)) airportAirlinesMap.set(r.destCode, new Set());
        airportAirlinesMap.get(r.destCode)!.add(r.airline);
      }
    });

    if (selectedTopN && topAirportsRankMap) {
      Array.from(airportAirlinesMap.keys()).forEach(code => {
        const rank = topAirportsRankMap.get(code);
        if (!rank || rank > selectedTopN) {
          airportAirlinesMap.delete(code);
        }
      });
    }

    let multiAirports = 0;
    let singleAirports = 0;
    const airportsPerAirline: Record<string, number> = {};

    airportAirlinesMap.forEach((airlineSet) => {
      if (airlineSet.size >= 2) {
        multiAirports++;
      } else if (airlineSet.size === 1) {
        singleAirports++;
      }
      airlineSet.forEach(a => {
        airportsPerAirline[a] = (airportsPerAirline[a] || 0) + 1;
      });
    });

    const totalAirports = airportAirlinesMap.size;
    const totalAirlines = isNone
      ? 0
      : selectedAirlines.length > 0
      ? selectedAirlines.length
      : (availableAirlines && availableAirlines.length > 0 ? availableAirlines.length : mode2AirlinesCount.length);
    const targetAirports = new Set(airportAirlinesMap.keys());

    return { multiAirports, singleAirports, airportsPerAirline, totalAirports, totalAirlines, targetAirports };
  }, [routes, selectedAirlines, selectedTopN, topAirportsRankMap, availableAirlines, mode2AirlinesCount.length]);

  // Compute active airport connections for Mode 1 if an airport is selected
  const activeAirportConnections = useMemo(() => {
    if (mapMode === 'airports' && selectedAirportCode) {
      return getAirportConnections(selectedAirportCode, routes);
    }
    return [];
  }, [selectedAirportCode, routes, mapMode]);

  const getMexicoGeoJsonStyle = (theme: string) => {
    if (theme === 'light') {
      return {
        color: '#0284c7',
        weight: 1.4,
        opacity: 0.7,
        fillColor: '#38bdf8',
        fillOpacity: 0.05,
      };
    }
    if (theme === 'satellite' || theme === 'topo') {
      return {
        color: '#38bdf8',
        weight: 1.6,
        opacity: 0.85,
        fillColor: '#000000',
        fillOpacity: 0,
      };
    }
    // Dark mode (radar)
    return {
      color: '#38bdf8',
      weight: 1.3,
      opacity: 0.75,
      fillColor: '#0e7490',
      fillOpacity: 0.08,
    };
  };

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
      crossOrigin: 'anonymous',
    }).addTo(map);

    // Add Reference Layer if available (e.g. Esri Dark Reference for political borders and labels)
    if (activeTileConfig.referenceUrl) {
      const refLayer = L.tileLayer(activeTileConfig.referenceUrl, {
        maxZoom: activeTileConfig.maxZoom,
        crossOrigin: 'anonymous',
      }).addTo(map);
      referenceTileLayerRef.current = refLayer;
    }

    // Republic of Mexico 32 States Vector Overlay: guarantees clear, beautiful Mexican territory visibility in ALL modes
    const mexicoLayer = L.geoJSON(mexicoStatesData as any, {
      style: getMexicoGeoJsonStyle(tileLayerKey),
      interactive: false,
    }).addTo(map);
    mexicoGeoJsonLayerRef.current = mexicoLayer;

    const routesGroup = L.layerGroup().addTo(map);
    const airportsGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    routesLayerGroupRef.current = routesGroup;
    airportsLayerGroupRef.current = airportsGroup;
    mapInstanceRef.current = map;
    if (mapContainerRef.current) {
      (mapContainerRef.current as any)._leaflet_map = map;
    }
    (window as any)[`__leaflet_map_${id}`] = map;

    map.on('click', () => {
      activeOpenPopupCodeRef.current = null;
      setMode2SelectedAirport(null);
    });

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
      delete (window as any)[`__leaflet_map_${id}`];
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
    if (referenceTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(referenceTileLayerRef.current);
      referenceTileLayerRef.current = null;
    }

    const newTileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: activeTileConfig.maxZoom,
      crossOrigin: true,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;

    if (activeTileConfig.referenceUrl) {
      const newRefLayer = L.tileLayer(activeTileConfig.referenceUrl, {
        maxZoom: activeTileConfig.maxZoom,
        crossOrigin: true,
      }).addTo(mapInstanceRef.current);
      referenceTileLayerRef.current = newRefLayer;
    }

    if (mexicoGeoJsonLayerRef.current) {
      mexicoGeoJsonLayerRef.current.setStyle(getMexicoGeoJsonStyle(tileLayerKey));
    }
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
    markersByCodeRef.current.clear();

    // ==========================================
    // MODE 1: VISUALIZACIÓN GENERAL DE AEROPUERTOS Y HUBS
    // ==========================================
    // En el Modo 1 no se dibujan rutas/arcos en el mapa (ni al dar clic ni al seleccionar una aerolínea).
    // El mapa visualiza exclusivamente los aeropuertos y sus datos institucionales.
    if (mapMode === 'airports') {
      // Intentionally clear routes in Mode 1 - no flight arcs or radial connection lines on the map
    }

    // ==========================================
    // MODO COMBINADO: RUTAS ÚNICAS (ANÁLISIS GENERAL Y ESPECÍFICO)
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

    if ((mapMode === 'unique_routes' || mapMode === 'routes_by_airline') && showFlightArcs) {
      const topNCodesSet = selectedTopN && topAirportsRankMap
        ? new Set(
            Array.from(topAirportsRankMap.entries())
              .filter(([_, rank]) => rank <= selectedTopN)
              .map(([code]) => code)
          )
        : null;

      if (uniqueAnalysisMode === 'general') {
        // ==========================================
        // SUBMODO A: ANÁLISIS GENERAL (346 RUTAS CONSOLIDADAS)
        // ==========================================
        const corridorsToRender = topNCodesSet
          ? uniqueCorridors.filter(c => topNCodesSet.has(c.originCode) && topNCodesSet.has(c.destCode))
          : uniqueCorridors;

        corridorsToRender.forEach(corridor => {
          const arcPoints = generateGreatCircleArc(
            [corridor.originLat, corridor.originLng],
            [corridor.destLat, corridor.destLng],
            35,
            arcCurvature
          );

          const isSingleOp = corridor.airlines.length === 1;
          const singleOpAirline = isSingleOp ? corridor.airlines[0].airline : null;
          const isMultiCarrier = corridor.airlines.length > 1;

          // In General Analysis, respect single and multi airline toggles
          if (isSingleOp && mode3GeneralShowSingle === false) return;
          if (isMultiCarrier && mode3GeneralShowMulti === false) return;

          // 1 sole airline -> uniqueSingleColor; 2+ airlines -> uniqueMultiColor
          const strokeColor = isSingleOp ? (uniqueSingleColor || '#06b6d4') : (uniqueMultiColor || '#f59e0b');
          const baseWeight = Math.min(5.5, Math.max(2.2, corridor.totalFlights / 600));

          const polyline = L.polyline(arcPoints, {
            color: strokeColor,
            weight: isMultiCarrier ? baseWeight + 0.6 : baseWeight,
            opacity: 0.88,
            dashArray: animateFlow ? '6, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round',
          });

          // Popup for Unique Corridor (Modo: Rutas Únicas - Análisis General)
          const badgeTitle = isSingleOp ? '1 Sola Aerolínea' : '2+ Aerolíneas Autorizadas';
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

              ${isSingleOp ? `
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
                  <span class="text-slate-400 block">Aerolíneas autorizadas:</span>
                  <span class="font-bold text-emerald-400 font-mono text-xs">${corridor.airlines.length}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-400 block">Distancia:</span>
                  <span class="font-bold text-slate-200 font-mono text-xs">${Math.round(corridor.distanceKm).toLocaleString()} km</span>
                </div>
              </div>
              <div class="mt-2 text-[10px] text-cyan-400 italic">
                * Haz clic en la ruta para ver el desglose en la pestaña de detalles
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
              opacity: 0.86,
              color: strokeColor,
            });
          });

          polyline.on('click', () => {
            if (onSelectRouteRef.current) {
              const matchedRoute = (allRoutes && allRoutes.length > 0 ? allRoutes : routes).find(
                r => (r.originCode === corridor.originCode && r.destCode === corridor.destCode) ||
                     (r.originCode === corridor.destCode && r.destCode === corridor.originCode)
              );
              if (matchedRoute) {
                onSelectRouteRef.current(matchedRoute);
              }
            }
          });

          routesLayerGroupRef.current?.addLayer(polyline);
        });
      } else {
        // ==========================================
        // SUBMODO B: ANÁLISIS ESPECÍFICO (655 RUTAS AUTORIZADAS, 13 AEROLÍNEAS)
        // Rutas compartidas en DORADO (personalizable), rutas exclusivas por aerolínea.
        // Sujeto a los filtros establecidos de selección de aerolíneas.
        // ==========================================
        let routesToRender = mode2SelectedAirport
          ? routes.filter(r => r.originCode === mode2SelectedAirport || r.destCode === mode2SelectedAirport)
          : routes;

        if (topNCodesSet) {
          routesToRender = routesToRender.filter(
            r => topNCodesSet.has(r.originCode) && topNCodesSet.has(r.destCode)
          );
        }

        routesToRender.forEach(route => {
          const arcPoints = generateGreatCircleArc(
            [route.originLat, route.originLng],
            [route.destLat, route.destLng],
            35,
            arcCurvature
          );

          const [c1, c2] = [route.originCode, route.destCode].sort();
          const corridorKey = `${c1} <-> ${c2}`;
          const corridorAirlines = masterCorridorAirlinesMap.get(corridorKey) || new Set([route.airline.toLowerCase()]);
          
          let isShared = corridorAirlines.size >= 2;
          if (versusFilteredAirlines) {
            // When versusFilteredAirlines is active:
            // If only 1 airline is filtered: no comparison exists, so isShared is ALWAYS FALSE!
            // All routes appear in that airline's own color, none in gold.
            if (activeAirlineSet.size <= 1) {
              isShared = false;
            } else {
              // If 2 or more airlines are filtered:
              // Only mark as shared (gold) if at least 2 of the FILTERED airlines operate this corridor.
              let matches = 0;
              corridorAirlines.forEach(a => {
                if (activeAirlineSet.has(a.trim().toLowerCase())) {
                  matches++;
                }
              });
              isShared = matches >= 2;
            }
          }

          // Rutas compartidas se marcan con color dorado claro y sutil (personalizable con uniqueMultiColor)
          // Las demás rutas con colores propios de acuerdo a cada aerolínea
          const goldColor = uniqueMultiColor || '#fbbf24';
          let strokeColor = isShared
            ? goldColor
            : getAirlineColor(route.airline, customAirlineColors);

          if (colorScheme === 'cyan') {
            strokeColor = '#06b6d4';
          }

          const isSelected = selectedRouteId === route.id;
          const baseWeight = Math.min(3.8, Math.max(1.8, route.flightsCount / 700));
          const lineWeight = isSelected ? baseWeight + 2.5 : isShared ? baseWeight + 0.5 : mode2SelectedAirport ? baseWeight + 1 : baseWeight;
          const lineOpacity = isSelected ? 1 : isShared ? 0.82 : mode2SelectedAirport ? 0.9 : 0.76;

          const polyline = L.polyline(arcPoints, {
            color: isSelected ? '#ffffff' : strokeColor,
            weight: lineWeight,
            opacity: lineOpacity,
            dashArray: animateFlow ? '6, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round',
          });

          // Interactive Popup
          const popupBadgeText = isShared
            ? (versusFilteredAirlines ? 'Ruta Compartida (Cruces de Red)' : 'Ruta Compartida (2+ aerolíneas)')
            : (versusFilteredAirlines && activeAirlineSet.size === 1 ? 'Ruta Filtrada (Color propio)' : 'Autorización Única');

          const popupHtml = `
            <div class="p-1 text-slate-100 min-w-[240px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                <span class="text-xs font-mono font-bold text-white px-2 py-0.5 rounded border" style="background-color: ${strokeColor}33; border-color: ${strokeColor};">
                  ${route.originCode} ➔ ${route.destCode}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isShared
                    ? 'bg-amber-950/90 text-amber-300 border-amber-600'
                    : 'bg-cyan-950/90 text-cyan-300 border-cyan-600'
                }">
                  ${popupBadgeText}
                </span>
              </div>
              <div class="text-xs font-medium text-slate-200 mb-1">
                ${route.originName} <span class="text-slate-400">➔</span> ${route.destName}
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] mt-2 pt-2 border-t border-slate-800">
                <div>
                  <span class="text-slate-400 block text-[10px]">Aerolínea</span>
                  <span class="font-bold" style="color: ${getAirlineColor(route.airline, customAirlineColors)}">${route.airline}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Fecha de Autorización</span>
                  <span class="font-bold text-emerald-400">${route.authorizationDate || 'Registrada'}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Distancia</span>
                  <span class="font-semibold text-slate-200">${Math.round(route.distanceKm).toLocaleString()} km</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Identificación cromática</span>
                  <span class="font-semibold flex items-center gap-1">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${strokeColor}"></span>
                    <span class="text-[10px] ${isShared ? 'text-amber-300' : 'text-slate-200'}">${isShared ? 'Dorado (Compartida)' : 'Color de Aerolínea'}</span>
                  </span>
                </div>
              </div>
              <div class="mt-2 text-[10px] text-cyan-400 italic">
                * Haz clic en la ruta para ver todas las aerolíneas autorizadas
              </div>
            </div>
          `;

          polyline.bindPopup(popupHtml, { closeButton: true, autoPan: true });

          polyline.on('mouseover', () => {
            if (!isSelected) {
              polyline.setStyle({
                weight: lineWeight + 1.2,
                opacity: 1,
                color: isShared ? '#fde047' : '#38bdf8',
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
            if (onSelectRouteRef.current) onSelectRouteRef.current(route);
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

    // Helper to dynamically filter routes in Specific Mode on airport hover / popup
    let activeMode2PopupAirport: string | null = null;
    let activeMode2HoveredAirport: string | null = null;

    const applyMode2AirportFilter = (targetCode: string | null, alternateCode?: string) => {
      if (!routesLayerGroupRef.current || (mapMode !== 'routes_by_airline' && mapMode !== 'unique_routes')) return;
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
        const isTopSelected = Boolean(selectedTopN);

        // Point 5: When a Top is selected, strictly filter the map to only show the Top N airports
        if (isTopSelected && (!isRanked || (rankNum as number) > (selectedTopN as number))) {
          return;
        }

        const isMode1 = mapMode === 'airports';
        if (isMode1) {
          const isNone = selectedAirlines.includes('__NONE__');
          if (isNone) return;
          // When 1 or more airlines are selected in Mode 1, only show airports served by those airlines
          if (selectedAirlines.length > 0) {
            const hasMatch = mode1AirportColorStats.targetAirports.has(officialCode) || mode1AirportColorStats.targetAirports.has(airport.code);
            if (!hasMatch) return;
          }
        }

        const isSelectedOrigin = isMode1 && (selectedAirportCode === airport.code || selectedAirportCode === officialCode);
        const isMajorHub = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(officialCode);

        // Compute airport connections and operating airlines (use allRoutes pool so airport metadata is complete)
        const airportMatchCodes = new Set([officialCode, airport.code].filter(Boolean));
        const effectiveRoutesForAirport = (allRoutes && allRoutes.length > 0 ? allRoutes : routes);
        const airportMode2Routes = effectiveRoutesForAirport.filter(
          r => airportMatchCodes.has(r.originCode) || airportMatchCodes.has(r.destCode)
        );

        // Airlines list computation for airport
        const airlinesAtAirport = new Map<string, number>();
        airportMode2Routes.forEach(r => {
          airlinesAtAirport.set(r.airline, (airlinesAtAirport.get(r.airline) || 0) + 1);
        });
        const airlinesList = Array.from(airlinesAtAirport.entries()).sort((a, b) => b[1] - a[1]);

        // Active routes at this airport in the current filtered view
        const activeAirportRoutes = routes.filter(
          r => airportMatchCodes.has(r.originCode) || airportMatchCodes.has(r.destCode)
        );
        const activeAirlinesAtAirport: string[] = Array.from(
          new Set(activeAirportRoutes.map(r => r.airline).filter((a): a is string => Boolean(a)))
        );

        const isMode2 = mapMode === 'routes_by_airline';
        const isMode2Selected = isMode2 && (mode2SelectedAirport === officialCode || mode2SelectedAirport === airport.code);
        const isMode2Connected = isMode2 && Boolean(mode2SelectedAirport) && (mode2ConnectedAirportCodes.has(officialCode) || mode2ConnectedAirportCodes.has(airport.code));
        const isMode2Dimmed = isMode2 && Boolean(mode2SelectedAirport) && !isMode2Selected && !isMode2Connected;

        // Radius and pin color calculation
        let radius = 7;
        let pinColor = '#06b6d4';
        let shadowGlow = '8px #06b6d4';

        if (isMode1) {
          if (isComparePane && compareAirlineColor) {
            pinColor = compareAirlineColor;
            shadowGlow = `10px ${compareAirlineColor}`;
            radius = isSelectedOrigin ? 10 : 8;
          } else {
            // Mode 1: Color específico para 2 o más aerolíneas que tengan ese aeropuerto,
            // y color diferente para cada aerolínea con posibilidad de cambiarlo
            const effectiveAirlines: string[] = activeAirlinesAtAirport.length > 0
              ? activeAirlinesAtAirport
              : airlinesList.map(([a]) => a);

            if (effectiveAirlines.length >= 2) {
              pinColor = uniqueMultiColor || '#f59e0b';
              shadowGlow = `12px ${pinColor}`;
              radius = 8.5;
            } else if (effectiveAirlines.length === 1) {
              const soleAirline = effectiveAirlines[0];
              const aColor = getAirlineColor(soleAirline || '', customAirlineColors);
              pinColor = aColor;
              shadowGlow = `12px ${aColor}`;
              radius = 8;
            } else {
              pinColor = '#06b6d4';
              shadowGlow = '8px #06b6d4';
              radius = 7.5;
            }
          }
        } else if (isMode2) {
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
            radius = 7.5;
            pinColor = '#06b6d4';
            shadowGlow = '8px #06b6d4';
          }
        } else {
          // Mode 3 (Unique routes): Clean cyan, no automatic gold for hub
          radius = 7.5;
          pinColor = '#06b6d4';
          shadowGlow = '8px #06b6d4';
        }

        const hasPulseRing = isSelectedOrigin || isMode2Selected || isMode2Connected;
        const pulseBorder = isMode2Selected
          ? '2px solid rgba(16, 185, 129, 0.9)'
          : isMode2Connected
          ? '2px solid rgba(245, 158, 11, 0.9)'
          : '2px solid rgba(6, 182, 212, 0.9)';

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

        // Points 4, 5, 6: Airport IATA Label with Single Clean Frame and Dynamic Font Size
        // - Single frame (no double box)
        // - Homologated without '#rank' when no top is selected (shows plain 'CUL', 'MEX')
        // - Shows '#rank' ONLY when a top is explicitly selected (shows 'CUL #11')
        // - Default visible across all modes unless toggled to 'Sin nombres'
        if (activeShowAirportLabels) {
          let badgeText = officialCode;
          let rankBadge = '';
          if (isTopSelected && isRanked) {
            rankBadge = `<span style="font-size:0.8em; margin-left:3px; opacity:0.9; color:#38bdf8; font-weight:700;">#${rankNum}</span>`;
          }

          const singleBoxHtml = `
            <div class="airport-iata-badge" style="
              font-family: 'JetBrains Mono', 'Plus Jakarta Sans', monospace, sans-serif;
              font-size: ${activeIataFontSize}px;
              font-weight: 800;
              line-height: 1;
              padding: 2.5px 5.5px;
              border-radius: 6px;
              background: rgba(11, 15, 25, 0.95);
              color: ${isMode1 ? pinColor : '#38bdf8'};
              border: 1px solid ${isMode1 ? pinColor : 'rgba(56, 189, 248, 0.65)'};
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.65);
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              letter-spacing: 0.04em;
              pointer-events: none;
            ">
              <span>${badgeText}</span>${rankBadge}
            </div>
          `;

          let tooltipDirection: 'top' | 'bottom' | 'left' | 'right' = 'top';
          let tooltipOffset: [number, number] = [0, -radius - 4];
          if (officialCode === 'CSL') {
            tooltipDirection = 'bottom';
            tooltipOffset = [0, radius + 4];
          } else if (officialCode === 'SJD') {
            tooltipDirection = 'top';
            tooltipOffset = [0, -radius - 4];
          }

          marker.bindTooltip(singleBoxHtml, {
            permanent: true,
            direction: tooltipDirection,
            offset: tooltipOffset,
            className: 'permanent-iata-tooltip',
          });
        }

        // Points 7.1 & 7.2: Standardized First Tab Summary Popup for all Visualization Modes
        // Displays: Name, IATA, Assigned Routes count, Authorized Airlines count, Airline list with colors,
        // and button "Ver destinos y conexiones directas"
        const airportPopupHtml = `
          <div class="p-1 text-slate-100 min-w-[280px]">
            <div class="border-b border-slate-700/80 pb-2 mb-2">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-mono font-black text-cyan-300 bg-cyan-950/90 px-2.5 py-0.5 rounded border border-cyan-700">
                  ${officialCode}
                </span>
                ${isTopSelected && isRanked ? `<span class="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">#${rankNum} TOP</span>` : isMajorHub ? '<span class="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">HUB PRINCIPAL</span>' : '<span class="text-[9px] text-slate-400 uppercase font-semibold">Aeropuerto Autorizado</span>'}
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
              type="button"
              id="btn-open-connections-${officialCode}"
              data-airport-code="${officialCode || airport.code}"
              onclick="window.__gis_open_connections && window.__gis_open_connections('${officialCode || airport.code}'); return false;"
              class="btn-open-connections w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
            >
              <span>Ver destinos y conexiones directas</span>
            </button>
          </div>
        `;

        marker.bindPopup(airportPopupHtml, { closeButton: true, autoPan: true });

        marker.on('popupopen', (e) => {
          const popupEl = (e as any)?.popup?.getElement?.() || document.getElementById(`btn-open-connections-${officialCode}`)?.closest('.leaflet-popup');
          const btn = popupEl?.querySelector('.btn-open-connections') as HTMLElement | null || document.getElementById(`btn-open-connections-${officialCode}`);
          if (btn) {
            btn.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const targetCode = btn.getAttribute('data-airport-code') || officialCode;
              if (onOpenAirportConnectionsRef.current) onOpenAirportConnectionsRef.current(targetCode);
              marker.closePopup();
            };
          }
        });

        // Click handlers: 1 click opens popup with general info; in Mode 2, second click on same airport closes popup and filters connections in the map
        marker.on('click', (e) => {
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
          }

          const isMode2 = mapMode === 'unique_routes' || mapMode === 'routes_by_airline';
          const now = Date.now();
          const lastClick = lastClickedAirportRef.current;

          // Check if this is the 2nd click on the SAME airport in Mode 2:
          // Either the popup is currently open for this airport,
          // OR this same airport was clicked recently (within 4000ms)
          const isSecondClickOnSame =
            isMode2 &&
            lastClick?.code === officialCode &&
            (activeOpenPopupCodeRef.current === officialCode || (now - lastClick.time < 4000));

          if (isSecondClickOnSame) {
            marker.closePopup();
            activeOpenPopupCodeRef.current = null;
            lastClickedAirportRef.current = null;
            lastFilterTriggerTimeRef.current = now;

            if (onFilterAirportConnectionsRef.current) {
              onFilterAirportConnectionsRef.current(officialCode);
            }
            return;
          }

          // First click: opens popup with general information
          activeOpenPopupCodeRef.current = officialCode;
          lastClickedAirportRef.current = { code: officialCode, time: now };
          if (mapMode === 'routes_by_airline') {
            setMode2SelectedAirport(officialCode);
          }
          marker.openPopup();
        });

        marker.on('dblclick', (e) => {
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
            L.DomEvent.preventDefault(e.originalEvent);
          }

          const isMode2 = mapMode === 'unique_routes' || mapMode === 'routes_by_airline';
          if (isMode2) {
            const now = Date.now();
            marker.closePopup();
            activeOpenPopupCodeRef.current = null;
            lastClickedAirportRef.current = null;
            if (now - lastFilterTriggerTimeRef.current > 400) {
              lastFilterTriggerTimeRef.current = now;
              if (onFilterAirportConnectionsRef.current) {
                onFilterAirportConnectionsRef.current(officialCode);
              }
            }
          } else {
            if (onOpenAirportConnectionsRef.current) {
              onOpenAirportConnectionsRef.current(officialCode);
            }
          }
        });

        marker.on('popupclose', () => {
          if (activeOpenPopupCodeRef.current === officialCode) {
            activeOpenPopupCodeRef.current = null;
          }
        });

        airportsLayerGroupRef.current?.addLayer(marker);
        markersByCodeRef.current.set(officialCode, marker);
        if (airport.code && airport.code !== officialCode) {
          markersByCodeRef.current.set(airport.code, marker);
        }

        if (
          activeOpenPopupCodeRef.current &&
          (activeOpenPopupCodeRef.current === officialCode || activeOpenPopupCodeRef.current === airport.code)
        ) {
          setTimeout(() => {
            if (mapInstanceRef.current && airportsLayerGroupRef.current?.hasLayer(marker)) {
              marker.openPopup();
            }
          }, 0);
        }
      });
    }
  }, [
    routes,
    allRoutes,
    airports,
    mapMode,
    uniqueCorridors,
    arcCurvature,
    colorScheme,
    showAirportLabels,
    activeShowAirportLabels,
    iataFontSize,
    activeIataFontSize,
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
    mode2SelectedAirport,
    mode2ShowConnectedLabels,
    mode2ConnectedAirportCodes,
    mode1AnalysisMode,
    mode1SpecificAirline,
    mode1SpecificAirlineColor,
    isComparePane,
    compareAirlineColor,
    versusFilteredAirlines,
    activeAirlineSet,
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
      const filename = generateExportFilename({
        prefix: `mapa_rutas_mexico_${mapMode}`,
        routes,
        selectedAirlines,
        extension: 'png',
      });
      await exportMapToImage(id, filename, routes, airports, customAirlineColors, mapMode);
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
      <div className={`absolute ${isComparePane ? 'top-4' : 'top-14'} right-4 ${
        isAirportConnectionsOpen ? 'z-10 opacity-20 pointer-events-none' : 'z-[400]'
      } flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl transition-all duration-200`}>
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
          onClick={handleMexicoButtonClick}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (mexicoClickTimerRef.current) {
              clearTimeout(mexicoClickTimerRef.current);
              mexicoClickTimerRef.current = null;
            }
            unlockMexicoView();
          }}
          title={
            isMexicoLocked
              ? '🔒 Vista Bloqueada en República Mexicana (Da 2 clics para desbloquear y explorar otros países)'
              : 'Centrar y Bloquear en República Mexicana (1 clic: Bloquear en México | 2 clics: Desbloquear)'
          }
          className={`p-2 rounded-lg transition flex items-center justify-center relative cursor-pointer ${
            isMexicoLocked
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'hover:bg-slate-800 text-slate-200 hover:text-cyan-400'
          }`}
        >
          {isMexicoLocked ? (
            <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Compass className="w-4 h-4" />
          )}
          {isMexicoLocked && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-slate-900 animate-ping" />
          )}
        </button>
        {/* Quick IATA Claves button in floating toolbar */}
        <div className="relative">
          <button
            id={`${id}-btn-quick-iata`}
            type="button"
            onClick={() => setShowIataPopover(!showIataPopover)}
            title="Configurar etiquetas IATA (Con nombres / Sin nombres y tamaño)"
            className={`p-2 rounded-lg transition flex items-center justify-center relative cursor-pointer ${
              showIataPopover
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : activeShowAirportLabels
                ? 'hover:bg-slate-800 text-cyan-300'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Tag className="w-4 h-4" />
          </button>

          {showIataPopover && (
            <div className="absolute right-full top-0 mr-2 z-[500] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 shadow-2xl w-60 text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Claves IATA
                </span>
                <button
                  type="button"
                  onClick={() => setShowIataPopover(false)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs mb-2.5">
                <button
                  type="button"
                  onClick={() => handleToggleLabels(true)}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center cursor-pointer ${
                    activeShowAirportLabels
                      ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Con nombres
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLabels(false)}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center cursor-pointer ${
                    !activeShowAirportLabels
                      ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sin nombres
                </button>
              </div>

              {activeShowAirportLabels && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Tamaño de la clave IATA:</span>
                    <span className="text-cyan-300 font-mono font-bold">{activeIataFontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeIataFontSize <= 8}
                      onClick={() => handleChangeIataFontSize(Math.max(8, activeIataFontSize - 1))}
                      className="px-2 py-0.5 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded text-xs font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      A-
                    </button>
                    <input
                      type="range"
                      min={8}
                      max={18}
                      step={1}
                      value={activeIataFontSize}
                      onChange={(e) => handleChangeIataFontSize(Number(e.target.value))}
                      className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={activeIataFontSize >= 18}
                      onClick={() => handleChangeIataFontSize(Math.min(18, activeIataFontSize + 1))}
                      className="px-2 py-0.5 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded text-xs font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      A+
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* Toast Alert for Mexico View Lock / Unlock */}
      {lockToastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/70 shadow-2xl text-white text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
          {isMexicoLocked ? (
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Unlock className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{lockToastMessage}</span>
          <button
            onClick={() => setLockToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Colors Legend: Draggable & Resizable for Modes 1, 2 & 3 */}
      {(
        <div
          ref={legendContainerRef}
          style={
            legendPos
              ? {
                  position: 'absolute',
                  left: `${legendPos.x}px`,
                  top: `${legendPos.y}px`,
                  right: 'auto',
                  bottom: 'auto',
                  zIndex: isAirportConnectionsOpen ? 10 : 400,
                }
              : {
                  position: 'absolute',
                  top: isComparePane ? '1rem' : '3.5rem',
                  right: '4.25rem',
                  zIndex: isAirportConnectionsOpen ? 10 : 400,
                }
          }
          className={`flex flex-col items-end ${isDraggingLegend ? 'cursor-grabbing opacity-95 select-none' : ''} ${
            isAirportConnectionsOpen ? 'pointer-events-none opacity-20' : ''
          } transition-opacity duration-200`}
        >
          {!isRightLegendExpanded ? (
            <div className="flex items-center gap-1 bg-slate-900/95 hover:bg-slate-850 text-cyan-300 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
              <div
                onMouseDown={handleDragMouseDown}
                onTouchStart={handleDragTouchStart}
                title="Arrastrar para mover este botón a cualquier parte de la pantalla"
                className="p-1.5 text-slate-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing rounded hover:bg-slate-800 transition"
              >
                <Move className="w-3.5 h-3.5" />
              </div>
              <button
                id={`${id}-btn-expand-legend`}
                onClick={() => setIsRightLegendExpanded(true)}
                title={
                  mapMode === 'airports'
                    ? 'Ver Nomenclatura y Código Cromático de Aeropuertos'
                    : 'Ver Nomenclatura y Código Cromático de Rutas Autorizadas'
                }
                className="px-2.5 py-1.5 flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-white transition cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>{mapMode === 'airports' ? 'Nomenclatura y Código Cromático' : 'Rutas Autorizadas'}</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              </button>
            </div>
          ) : (
            <div
              className={`bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-3 flex flex-col text-slate-100 overflow-hidden ${
                legendSize === 'compact'
                  ? 'w-72 max-h-[82vh]'
                  : legendSize === 'large'
                  ? 'w-96 sm:w-[420px] max-h-[88vh]'
                  : 'w-80 sm:w-84 max-h-[85vh]'
              }`}
            >
              {/* Top Drag & Control Bar */}
              <div
                onMouseDown={handleDragMouseDown}
                onTouchStart={handleDragTouchStart}
                className="w-full flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400 cursor-grab active:cursor-grabbing hover:text-cyan-300 transition select-none group"
                title="Haz clic y arrastra para mover y colocar esta pestaña en cualquier parte de la pantalla"
              >
                <div className="flex items-center gap-1.5">
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <span className="font-semibold tracking-wide">Mover pestaña</span>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {legendPos && (
                    <button
                      type="button"
                      onClick={handleResetLegendPosition}
                      title="Restablecer posición a esquina superior derecha"
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restablecer</span>
                    </button>
                  )}
                  {/* Size Switcher Buttons: [P] [M] [G] */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px] font-mono">
                    <button
                      type="button"
                      onClick={() => setLegendSize('compact')}
                      className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        legendSize === 'compact'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tamaño Pequeño / Compacto (reduce texto para visualizar todas las opciones sin desplazamiento)"
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => setLegendSize('normal')}
                      className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        legendSize === 'normal'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tamaño Mediano / Estándar"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => setLegendSize('large')}
                      className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        legendSize === 'large'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tamaño Grande / Amplio"
                    >
                      G
                    </button>
                  </div>
                  <button
                    id={`${id}-btn-collapse-legend`}
                    onClick={() => setIsRightLegendExpanded(false)}
                    title="Minimizar panel cromático"
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer ml-1"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Stats */}
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800 shrink-0">
                <div className="p-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                  {mapMode === 'unique_routes' ? (
                    <GitCommit className="w-3.5 h-3.5" />
                  ) : mapMode === 'airports' ? (
                    <Building2 className="w-3.5 h-3.5" />
                  ) : (
                    <Plane className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-black text-white tracking-wide truncate ${legendSize === 'compact' ? 'text-[11px]' : 'text-xs'}`}>
                    {mapMode === 'airports'
                      ? 'Código Cromático de Aeropuertos'
                      : 'Rutas Autorizadas'}
                  </div>
                  <div className="text-[9px] text-cyan-300 font-mono truncate">
                    {mapMode === 'airports'
                      ? (() => {
                          const activeAirports = mode1AirportColorStats.totalAirports;
                          const activeAirlines = mode1AirportColorStats.totalAirlines;
                          return `${activeAirports} aeropuerto${activeAirports === 1 ? '' : 's'} • ${activeAirlines} aerolínea${activeAirlines === 1 ? '' : 's'}`;
                        })()
                      : uniqueAnalysisMode === 'general'
                      ? `${uniqueCorridors.length || 346} rutas consolidadas (${singleCorridorsCount} exclusivas • ${multiCorridorsCount} compartidas)`
                      : `${routes.length} rutas autorizadas • ${mode2AirlinesCount.length} aerolíneas`}
                  </div>
                </div>
              </div>

              {/* Subtitle / Description (Only for airports mode; analyses descriptions are in the left sidebar) */}
              {mapMode === 'airports' && (
                <div className={`text-slate-400 mt-1.5 mb-1 leading-tight shrink-0 ${legendSize === 'compact' ? 'text-[9.5px]' : 'text-[10px]'}`}>
                  Color específico para aeropuertos con 2 o más aerolíneas y color distinto editable para cada aerolínea.
                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 1 BODY: AEROPUERTOS Y HUB (2+ AEROLÍNEAS + CADA AEROLÍNEA) */}
              {/* ======================================================== */}
              {mapMode === 'airports' && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                  {/* Color específico para 2 o más aerolíneas que tengan ese aeropuerto */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-amber-500/50">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center shrink-0">
                        <input
                          type="color"
                          value={uniqueMultiColor || '#f59e0b'}
                          onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                          className="w-6 h-6 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                          title="Cambiar color para aeropuertos con 2 o más aerolíneas autorizadas"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/70 shadow-sm"
                          style={{ backgroundColor: uniqueMultiColor || '#f59e0b' }}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-300">2 o Más Aerolíneas</div>
                        <div className="text-[10px] text-slate-400">Aeropuerto compartido</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {mode1AirportColorStats.multiAirports} aeropuertos
                    </span>
                  </div>

                  {/* Header for individual airlines */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                    <span>
                      Aerolíneas ({selectedAirlines.includes('__NONE__') ? 0 : selectedAirlines.length > 0 ? selectedAirlines.length : mode2AirlinesCount.length}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onSelectAllAirlines}
                        className="text-[10px] text-cyan-400 hover:text-white underline cursor-pointer"
                        title="Marcar todas las aerolíneas"
                      >
                        Todas
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={onDeselectAllAirlines}
                        className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                        title="Deseleccionar todas las aerolíneas"
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>

                  <div className={`text-cyan-300/90 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-800/50 leading-tight ${legendSize === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
                    🎨 <strong>Color personalizable:</strong> Haz clic en el círculo de color de cualquier aerolínea para cambiarlo.
                  </div>

                  <div
                    className={`space-y-1 overflow-y-auto pr-0.5 ${
                      legendSize === 'compact'
                        ? 'max-h-[50vh]'
                        : legendSize === 'large'
                        ? 'max-h-[66vh]'
                        : 'max-h-[58vh]'
                    }`}
                  >
                    {mode2AirlinesCount.map(([airline, routeCount]) => {
                      const color = getAirlineColor(airline, customAirlineColors);
                      const isNoneSelected = selectedAirlines.includes('__NONE__');
                      const isChecked = !isNoneSelected && (selectedAirlines.length === 0 || selectedAirlines.includes(airline));
                      const airportCount = mode1AirportColorStats.airportsPerAirline[airline] || 0;
                      return (
                        <div
                          key={airline}
                          onClick={() => onToggleAirline && onToggleAirline(airline)}
                          className={`flex items-center justify-between rounded-lg border transition cursor-pointer select-none ${
                            legendSize === 'compact' ? 'py-1 px-1.5' : legendSize === 'large' ? 'py-1.5 px-2.5' : 'py-1 px-2'
                          } ${
                            isChecked
                              ? 'bg-slate-950/90 border-cyan-500/60 shadow-sm'
                              : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleAirline && onToggleAirline(airline)}
                                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                title={isChecked ? `Desmarcar ${airline}` : `Marcar casilla de ${airline}`}
                              />
                            </label>

                            <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                                className="w-4 h-4 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                title={`Cambiar color asignado a ${airline}`}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/70 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span
                              className={`font-medium truncate hover:text-white ${
                                legendSize === 'compact' ? 'text-[10px]' : legendSize === 'large' ? 'text-xs' : 'text-[11px]'
                              } text-slate-200`}
                              title={airline}
                            >
                              {airline}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className="font-mono text-[9px] font-bold text-cyan-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                              {airportCount} {airportCount === 1 ? 'aerop.' : 'aerop.'} ({routeCount} {routeCount === 1 ? 'ruta' : 'rutas'})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 2 BODY: TODAS LAS RUTAS AUTORIZADAS (MODO ESTÁNDAR) */}
              {/* ======================================================== */}
              {mapMode === 'routes_by_airline' && (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-0.5">
                    <span>Aerolíneas ({mode2AirlinesCount.length}):</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onSelectAllAirlines}
                        className="text-[10px] text-cyan-400 hover:text-white underline cursor-pointer"
                        title="Marcar todas las aerolíneas"
                      >
                        Todas
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={onDeselectAllAirlines}
                        className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                        title="Deseleccionar todas para elegir con las casillas"
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>

                  <div className={`text-cyan-300/90 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-800/50 leading-tight ${legendSize === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
                    ☑ <strong>Selección múltiple:</strong> Marca 2 o más aerolíneas para verlas simultáneamente con sus propios colores.
                  </div>

                  {/* List of all airlines with compact rows so all fit on screen */}
                  <div
                    className={`space-y-1 overflow-y-auto pr-0.5 ${
                      legendSize === 'compact'
                        ? 'max-h-[58vh]'
                        : legendSize === 'large'
                        ? 'max-h-[72vh]'
                        : 'max-h-[64vh]'
                    }`}
                  >
                    {mode2AirlinesCount.map(([airline, count]) => {
                      const color = getAirlineColor(airline, customAirlineColors);
                      const isNoneSelected = selectedAirlines.includes('__NONE__');
                      const isChecked = !isNoneSelected && (selectedAirlines.length === 0 || selectedAirlines.includes(airline));
                      return (
                        <div
                          key={airline}
                          onClick={() => onToggleAirline && onToggleAirline(airline)}
                          className={`flex items-center justify-between rounded-lg border transition cursor-pointer select-none ${
                            legendSize === 'compact' ? 'py-1 px-1.5' : legendSize === 'large' ? 'py-1.5 px-2.5' : 'py-1 px-2'
                          } ${
                            isChecked
                              ? 'bg-slate-950/90 border-cyan-500/60 shadow-sm'
                              : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onToggleAirline && onToggleAirline(airline)}
                                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                title={isChecked ? `Desmarcar ${airline}` : `Marcar casilla de ${airline}`}
                              />
                            </label>

                            <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                                className="w-4 h-4 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                title={`Cambiar color asignado a ${airline}`}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/70 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span
                              className={`font-medium truncate hover:text-white ${
                                legendSize === 'compact' ? 'text-[10px]' : legendSize === 'large' ? 'text-xs' : 'text-[11px]'
                              } text-slate-200`}
                              title={airline}
                            >
                              {airline}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className="font-mono text-[9px] font-bold text-cyan-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                              {count} {count === 1 ? 'ruta' : 'rutas'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[9.5px] text-slate-400 flex items-center justify-between">
                    <span>Total de autorizaciones:</span>
                    <span className="font-mono font-bold text-white">{routes.length}</span>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 3 BODY: RUTAS ÚNICAS */}
              {/* ======================================================== */}
              {mapMode === 'unique_routes' && (
                <>
                  {/* Modalidad de Análisis Indicador Activo */}
                  <div className="my-1.5 flex items-center justify-between shrink-0 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Modalidad de Análisis:
                    </span>
                    <span className="text-[10px] font-black text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-800 uppercase tracking-wide">
                      {uniqueAnalysisMode === 'general' ? 'Análisis general' : 'Análisis específico'}
                    </span>
                  </div>

                  {/* Mode 3 Submode A: Análisis General */}
                  {uniqueAnalysisMode === 'general' ? (
                    <div className="space-y-2 py-1 overflow-y-auto">
                      {/* Interactive toggle checkboxes / cards (No 3-button bar) */}

                      {/* Option 1: 1 sola aerolínea (Autorización única) */}
                      <div
                        onClick={() => onToggleMode3GeneralSingle && onToggleMode3GeneralSingle()}
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                          mode3GeneralShowSingle !== false
                            ? 'bg-slate-950/90 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                            : 'bg-slate-950/40 border-slate-850 opacity-50 hover:opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={mode3GeneralShowSingle !== false}
                              onChange={() => onToggleMode3GeneralSingle && onToggleMode3GeneralSingle()}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                              title={mode3GeneralShowSingle !== false ? 'Ocultar rutas de 1 aerolínea' : 'Mostrar rutas de 1 aerolínea'}
                            />
                          </label>

                          <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="color"
                              value={uniqueSingleColor}
                              onChange={(e) => onChangeUniqueSingleColor && onChangeUniqueSingleColor(e.target.value)}
                              className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Click para cambiar color para 1 aerolínea"
                            />
                            <span
                              className="w-4 h-4 rounded-full border-2 border-white/80 shadow-sm inline-block"
                              style={{ backgroundColor: uniqueSingleColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white leading-tight">1 Aerolínea</div>
                            <div className="text-[9.5px] text-cyan-300">Autorización única exclusiva</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {singleCorridorsCount} rutas
                        </span>
                      </div>

                      {/* Option 2: 2 o más aerolíneas */}
                      <div
                        onClick={() => onToggleMode3GeneralMulti && onToggleMode3GeneralMulti()}
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                          mode3GeneralShowMulti !== false
                            ? 'bg-slate-950/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950/40 border-slate-850 opacity-50 hover:opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={mode3GeneralShowMulti !== false}
                              onChange={() => onToggleMode3GeneralMulti && onToggleMode3GeneralMulti()}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                              title={mode3GeneralShowMulti !== false ? 'Ocultar rutas de 2 o más aerolíneas' : 'Mostrar rutas de 2 o más aerolíneas'}
                            />
                          </label>

                          <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="color"
                              value={uniqueMultiColor}
                              onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                              className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Click para cambiar color para 2 o más aerolíneas"
                            />
                            <span
                              className="w-4 h-4 rounded-full border-2 border-white/80 shadow-sm inline-block"
                              style={{ backgroundColor: uniqueMultiColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white leading-tight">2 o Más Aerolíneas</div>
                            <div className="text-[9.5px] text-amber-300">Ruta compartida / concurrente</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {multiCorridorsCount} rutas
                        </span>
                      </div>

                      {/* Summary footer */}
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
                        <span>En pantalla:</span>
                        <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {mode3GeneralShowSingle !== false && mode3GeneralShowMulti !== false
                            ? `${uniqueCorridors.length} rutas (ambas juntas)`
                            : mode3GeneralShowSingle !== false
                            ? `${uniqueCorridors.length} rutas (solo 1 aerolínea)`
                            : mode3GeneralShowMulti !== false
                            ? `${uniqueCorridors.length} rutas (solo 2+ aerolíneas)`
                            : '0 rutas seleccionadas'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Mode 3 Submode B: Análisis Específico (655 rutas autorizadas y 13 aerolíneas) */
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                      {/* Rutas compartidas en color DORADO (personalizable con selector de color) */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-amber-500/60 shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <input
                              type="color"
                              value={uniqueMultiColor || '#f59e0b'}
                              onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                              className="w-6 h-6 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                              title="Cambiar color dorado para rutas compartidas"
                            />
                            <span
                              className="w-4 h-4 rounded-full border-2 border-white/80 shadow-sm"
                              style={{ backgroundColor: uniqueMultiColor || '#f59e0b' }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-amber-300 leading-tight">
                              Rutas Compartidas {versusFilteredAirlines && activeFilteredAirlinesCount >= 2 ? '(Cruces de Red)' : '(2+ aerolíneas)'}
                            </div>
                            <div className="text-[9.5px] text-slate-400">
                              {versusFilteredAirlines
                                ? isSoleFilteredAirline
                                ? '0 compartidas (1 sola aerolínea filtrada)'
                                : `${displaySharedRoutesCount} compartidas entre las aerolíneas filtradas`
                                : 'Identificadas en color dorado'}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          {displaySharedRoutesCount} {displaySharedRoutesCount === 1 ? 'ruta' : 'rutas'}
                        </span>
                      </div>

                      {/* Botón condicional: Cruces de Red */}
                      <button
                        type="button"
                        onClick={() => onToggleVersusFilteredAirlines && onToggleVersusFilteredAirlines()}
                        className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          versusFilteredAirlines
                            ? 'bg-cyan-950/85 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/50'
                            : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                        title={
                          versusFilteredAirlines
                            ? 'Clic para deseleccionar Cruces de Red'
                            : 'Clic para seleccionar Cruces de Red'
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={Boolean(versusFilteredAirlines)}
                            onChange={() => onToggleVersusFilteredAirlines && onToggleVersusFilteredAirlines()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-bold leading-tight ${versusFilteredAirlines ? 'text-cyan-200' : 'text-slate-200'}`}>
                                Cruces de Red
                              </span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-0.5 leading-snug">
                              {versusFilteredAirlines
                                ? isSoleFilteredAirline
                                  ? `1 aerolínea filtrada (${soleFilteredAirlineName}): en su color propio sin dorado (sin Cruces de Red).`
                                  : activeFilteredAirlinesCount >= 2
                                  ? `Comparando ${activeFilteredAirlinesCount} aerolíneas: dorado solo en compartidas entre ellas; demás en color propio.`
                                  : 'Compara rutas compartidas solo entre las aerolíneas filtradas.'
                                : 'Activar para comparar concurrencia y Cruces de Red únicamente entre las aerolíneas seleccionadas.'}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                            versusFilteredAirlines
                              ? 'bg-cyan-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {versusFilteredAirlines ? 'Activo' : 'Inactivo'}
                        </span>
                      </button>

                      {/* Apartado condicional: Desglose de Cruces de Red por cada aerolínea seleccionada */}
                      {versusFilteredAirlines && crucesDeRedBreakdown.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/60 space-y-2 shadow-lg">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-[10.5px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              Desglose de Cruces de Red
                            </span>
                            <span className="font-mono text-[9px] font-bold text-cyan-200 bg-slate-900 px-2 py-0.5 rounded border border-cyan-800">
                              {crucesDeRedBreakdown.length} {crucesDeRedBreakdown.length === 1 ? 'aerolínea' : 'aerolíneas'}
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-[34vh] overflow-y-auto pr-0.5 custom-scrollbar">
                            {crucesDeRedBreakdown.map((item) => {
                              const color = getAirlineColor(item.airline, customAirlineColors);
                              return (
                                <div
                                  key={item.airline}
                                  className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-xs font-bold text-white truncate" title={item.airline}>
                                        {item.airline}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[10px] font-semibold text-slate-300 shrink-0">
                                      {item.totalRoutes} {item.totalRoutes === 1 ? 'ruta' : 'rutas'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="bg-slate-950/90 p-1.5 rounded border border-slate-800 flex items-center justify-between">
                                      <span className="text-slate-400">Total rutas únicas:</span>
                                      <span className="font-mono font-bold text-cyan-300 ml-1">
                                        {item.uniqueRoutesCount}
                                      </span>
                                    </div>
                                    <div className="bg-slate-950/90 p-1.5 rounded border border-amber-950/60 flex items-center justify-between">
                                      <span className="text-amber-300/90">Total rutas compartidas:</span>
                                      <span className="font-mono font-bold text-amber-400 ml-1">
                                        {item.sharedRoutesCount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Header for 13 Airlines */}
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1 flex items-center justify-between">
                        <span>Aerolíneas ({mode2AirlinesCount.length}):</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={onSelectAllAirlines}
                            className="text-[10px] text-cyan-400 hover:text-white underline cursor-pointer"
                            title="Marcar todas las aerolíneas"
                          >
                            Todas
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={onDeselectAllAirlines}
                            className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                            title="Deseleccionar todas para elegir con las casillas"
                          >
                            Ninguna
                          </button>
                        </div>
                      </div>

                      <div className={`text-cyan-300/90 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-800/50 leading-tight ${legendSize === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
                        ☑ <strong>Filtros por aerolínea:</strong> Selecciona las aerolíneas a visualizar. Cada aerolínea muestra su color propio para rutas exclusivas.
                      </div>

                      {/* 13 Airlines List with Checkboxes, Colors, and Route Counts */}
                      <div
                        className={`space-y-1 overflow-y-auto pr-0.5 ${
                          legendSize === 'compact'
                            ? 'max-h-[50vh]'
                            : legendSize === 'large'
                            ? 'max-h-[66vh]'
                            : 'max-h-[58vh]'
                        }`}
                      >
                        {mode2AirlinesCount.map(([airline, count]) => {
                          const color = getAirlineColor(airline, customAirlineColors);
                          const isNoneSelected = selectedAirlines.includes('__NONE__');
                          const isChecked = !isNoneSelected && (selectedAirlines.length === 0 || selectedAirlines.includes(airline));
                          return (
                            <div
                              key={airline}
                              onClick={() => onToggleAirline && onToggleAirline(airline)}
                              className={`flex items-center justify-between rounded-lg border transition cursor-pointer select-none ${
                                legendSize === 'compact' ? 'py-1 px-1.5' : legendSize === 'large' ? 'py-1.5 px-2.5' : 'py-1 px-2'
                              } ${
                                isChecked
                                  ? 'bg-slate-950/90 border-cyan-500/60 shadow-sm'
                                  : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-90'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <label className="flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onToggleAirline && onToggleAirline(airline)}
                                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                    title={isChecked ? `Desmarcar ${airline}` : `Marcar casilla de ${airline}`}
                                  />
                                </label>

                                <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                                    className="w-4 h-4 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                    title={`Cambiar color asignado a ${airline}`}
                                  />
                                  <span
                                    className="w-3 h-3 rounded-full border border-white/70 shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                </div>
                                <span
                                  className={`font-medium truncate hover:text-white ${
                                    legendSize === 'compact' ? 'text-[10px]' : legendSize === 'large' ? 'text-xs' : 'text-[11px]'
                                  } text-slate-200`}
                                  title={airline}
                                >
                                  {airline}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <span className="font-mono text-[9px] font-bold text-cyan-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                                  {count} {count === 1 ? 'ruta' : 'rutas'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[9.5px] text-slate-400 flex items-center justify-between">
                        <span>Total de autorizaciones:</span>
                        <span className="font-mono font-bold text-white">
                          {routes.length} activas ({baseRoutesForAirlines.length} en catálogo)
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
