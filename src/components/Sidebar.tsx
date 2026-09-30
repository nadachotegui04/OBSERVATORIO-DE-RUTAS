import React, { useState, useRef, useMemo } from 'react';
import {
  FlightRoute,
  FilterState,
  SavedMap,
  ValidationIssue,
  ColumnMapping,
  MapVisualizationMode,
  HubViewItem,
  UniqueRoutesAnalysisMode,
} from '../types';
import { getAirlineColor } from './FlightMap';
import {
  Upload,
  FileSpreadsheet,
  Filter,
  Layers,
  Bookmark,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plane,
  Eye,
  Settings2,
  FileText,
  SlidersHorizontal,
  Palette,
  Lock,
  ShieldCheck,
  KeyRound,
  Cloud,
  Building2,
  GitCommit,
  PanelLeftClose,
  ArrowLeftRight,
  X,
  Trophy,
  Award,
  CheckCircle2,
  Calendar,
  Tag,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  availableAirlines: string[];
  availableSheets?: string[];
  availableOrigins: { code: string; name: string }[];
  availableDestinations: { code: string; name: string }[];
  allRoutes?: FlightRoute[];
  availableYears: number[];
  availablePeriods: string[];
  maxFlightsPossible: number;
  maxPassengersPossible: number;
  mapMode?: MapVisualizationMode;
  onMapModeChange?: (mode: MapVisualizationMode) => void;
  mode1AnalysisMode?: 'standard' | 'specific';
  onMode1AnalysisModeChange?: (mode: 'standard' | 'specific') => void;
  mode1SpecificAirline?: string;
  onMode1SpecificAirlineChange?: (airline: string) => void;
  mode1SpecificAirlineColor?: string;
  onMode1SpecificAirlineColorChange?: (color: string) => void;
  iataFontSize?: number;
  onChangeIataFontSize?: (size: number) => void;
  tileLayer: 'dark' | 'light' | 'osm' | 'satellite' | 'topo';
  onTileLayerChange: (layer: 'dark' | 'light' | 'osm' | 'satellite' | 'topo') => void;
  arcCurvature: number;
  onArcCurvatureChange: (val: number) => void;
  colorScheme: 'airline' | 'density' | 'cyan' | 'traffic';
  onColorSchemeChange: (val: 'airline' | 'density' | 'cyan' | 'traffic') => void;
  customAirlineColors?: Record<string, string>;
  onUpdateAirlineColor?: (airline: string, color: string) => void;
  onResetAirlineColors?: () => void;
  showAirportLabels: boolean;
  onToggleAirportLabels: (val: boolean) => void;
  showFlightArcs: boolean;
  onToggleFlightArcs: (val: boolean) => void;
  showAirports: boolean;
  onToggleAirports: (val: boolean) => void;
  savedMaps: SavedMap[];
  onSaveCurrentMap: (name: string, description: string) => void;
  onLoadSavedMap: (map: SavedMap) => void;
  onDeleteSavedMap: (id: string) => void;
  onFileUpload: (file: File) => void;
  validationIssues: ValidationIssue[];
  fileName: string | null;
  onOpenColumnMapper: () => void;
  onDownloadTemplate: () => void;
  isAdmin?: boolean;
  onOpenAuthModal?: () => void;
  onManualPublishCloud?: () => void;
  isCloudSyncing?: boolean;
  topAirports?: HubViewItem[];
  top4Hubs?: HubViewItem[];
  selectedHubCode?: string | null;
  onSelectHub?: (hub: HubViewItem) => void;
  onClearHubFilter?: () => void;
  uniqueAnalysisMode?: UniqueRoutesAnalysisMode;
  onUniqueAnalysisModeChange?: (mode: UniqueRoutesAnalysisMode) => void;
  uniqueSingleColor?: string;
  onChangeUniqueSingleColor?: (color: string) => void;
  uniqueMultiColor?: string;
  onChangeUniqueMultiColor?: (color: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  filters,
  onFilterChange,
  onResetFilters,
  availableAirlines,
  availableSheets = [],
  availableOrigins,
  availableDestinations,
  allRoutes = [],
  availableYears,
  availablePeriods,
  maxFlightsPossible,
  maxPassengersPossible,
  mapMode = 'routes_by_airline',
  onMapModeChange,
  mode1AnalysisMode = 'standard',
  onMode1AnalysisModeChange,
  mode1SpecificAirline,
  onMode1SpecificAirlineChange,
  mode1SpecificAirlineColor = '#06b6d4',
  onMode1SpecificAirlineColorChange,
  iataFontSize = 11,
  onChangeIataFontSize,
  tileLayer,
  onTileLayerChange,
  arcCurvature,
  onArcCurvatureChange,
  colorScheme,
  onColorSchemeChange,
  customAirlineColors = {},
  onUpdateAirlineColor,
  onResetAirlineColors,
  showAirportLabels,
  onToggleAirportLabels,
  showFlightArcs,
  onToggleFlightArcs,
  showAirports,
  onToggleAirports,
  savedMaps,
  onSaveCurrentMap,
  onLoadSavedMap,
  onDeleteSavedMap,
  onFileUpload,
  validationIssues,
  fileName,
  onOpenColumnMapper,
  onDownloadTemplate,
  isAdmin = false,
  onOpenAuthModal,
  onManualPublishCloud,
  isCloudSyncing = false,
  topAirports = [],
  top4Hubs = [],
  selectedHubCode = null,
  onSelectHub,
  onClearHubFilter,
  uniqueAnalysisMode = 'general',
  onUniqueAnalysisModeChange,
  uniqueSingleColor = '#06b6d4',
  onChangeUniqueSingleColor,
  uniqueMultiColor = '#f59e0b',
  onChangeUniqueMultiColor,
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'visuals' | 'upload'>('filters');

  // Resolved file name (defaults to current official dataset if legacy name or empty)
  const displayFileName = useMemo(() => {
    if (!fileName || fileName === 'Observatorio_de_Rutas_AFAC.xlsx' || fileName === 'Dataset_Oficial_Mexico_2024_2025.xlsx') {
      return '2026_08_27 Arline Routes AR.xlsx';
    }
    return fileName;
  }, [fileName]);

  // Extract latest route authorization date in database
  const latestRouteInfo = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return null;
    let latestDateStr = '';
    let latestRoute: FlightRoute | null = null;
    for (const r of allRoutes) {
      if (r.authorizationDate) {
        const cleanDate = r.authorizationDate.trim();
        if (cleanDate > latestDateStr) {
          latestDateStr = cleanDate;
          latestRoute = r;
        }
      }
    }
    if (!latestDateStr) return null;
    return {
      date: latestDateStr,
      route: latestRoute,
    };
  }, [allRoutes]);

  // Extract file date from filename (e.g. 2026_08_27, 2026-08-27, 2026_09_25)
  const fileDateInfo = useMemo(() => {
    if (!displayFileName) return null;
    const ymdMatch = displayFileName.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      const iso = `${year}-${month}-${day}`;
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mIdx = parseInt(month, 10) - 1;
      const formatted = `${parseInt(day, 10)} de ${months[mIdx] || month} de ${year}`;
      return { iso, formatted };
    }
    const dmyMatch = displayFileName.match(/(\d{2})[_-](\d{2})[_-](\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const iso = `${year}-${month}-${day}`;
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mIdx = parseInt(month, 10) - 1;
      const formatted = `${parseInt(day, 10)} de ${months[mIdx] || month} de ${year}`;
      return { iso, formatted };
    }
    return null;
  }, [displayFileName]);

  // Reconcile file date with latest authorized route date
  const reconciliationStatus = useMemo(() => {
    if (!latestRouteInfo) return null;
    if (fileDateInfo) {
      const isMatched = fileDateInfo.iso === latestRouteInfo.date;
      return {
        isMatched,
        message: isMatched
          ? `Conciliado: El corte del archivo (${fileDateInfo.iso}) coincide con la última autorización autorizada registrada.`
          : `Fecha del corte: ${fileDateInfo.iso} | Última autorización registrada: ${latestRouteInfo.date}`,
      };
    }
    return {
      isMatched: true,
      message: `Última ruta autorizada registrada en base: ${latestRouteInfo.date}`,
    };
  }, [fileDateInfo, latestRouteInfo]);

  // Unified Top Airports List (1 to 15)
  const fullTopList = useMemo(() => {
    return topAirports.length > 0 ? topAirports : top4Hubs;
  }, [topAirports, top4Hubs]);

  // Displayed Top Airports based on selectedTopN (only when explicitly selected, no automatic 4 hubs)
  const displayedTopAirports = useMemo(() => {
    if (!filters.selectedTopN) return [];
    return fullTopList.slice(0, filters.selectedTopN);
  }, [fullTopList, filters.selectedTopN]);

  // Unified City List sorted alphabetically by friendly label
  const cityList = useMemo(() => {
    const map = new Map<string, { code: string; name: string; city: string; label: string }>();
    (allRoutes || []).forEach((r) => {
      if (!map.has(r.originCode)) {
        const city = r.originCity || r.originName;
        map.set(r.originCode, {
          code: r.originCode,
          name: r.originName,
          city,
          label: r.originCity ? `${r.originCity} (${r.originCode})` : `${r.originName} (${r.originCode})`,
        });
      }
      if (!map.has(r.destCode)) {
        const city = r.destCity || r.destName;
        map.set(r.destCode, {
          code: r.destCode,
          name: r.destName,
          city,
          label: r.destCity ? `${r.destCity} (${r.destCode})` : `${r.destName} (${r.destCode})`,
        });
      }
    });
    if (map.size === 0) {
      availableOrigins.forEach((o) => {
        if (!map.has(o.code)) {
          map.set(o.code, { code: o.code, name: o.name, city: o.name, label: `${o.name} (${o.code})` });
        }
      });
      availableDestinations.forEach((d) => {
        if (!map.has(d.code)) {
          map.set(d.code, { code: d.code, name: d.name, city: d.name, label: `${d.name} (${d.code})` });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allRoutes, availableOrigins, availableDestinations]);

  // Active routes for bilateral connectivity (filtered by selected airlines if any)
  const activeRoutesForConnectivity = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return [];
    if (filters.selectedAirlines.length > 0) {
      return allRoutes.filter((r) => filters.selectedAirlines.includes(r.airline));
    }
    return allRoutes;
  }, [allRoutes, filters.selectedAirlines]);

  // Set of cities connected to Ciudad 1
  const connectedToC1 = useMemo(() => {
    const c1 = filters.selectedOrigins[0];
    if (!c1) return null;
    const set = new Set<string>();
    activeRoutesForConnectivity.forEach((r) => {
      if (r.originCode === c1) set.add(r.destCode);
      if (r.destCode === c1) set.add(r.originCode);
    });
    return set;
  }, [filters.selectedOrigins, activeRoutesForConnectivity]);

  // Set of cities connected to Ciudad 2
  const connectedToC2 = useMemo(() => {
    const c2 = filters.selectedDestinations[0];
    if (!c2) return null;
    const set = new Set<string>();
    activeRoutesForConnectivity.forEach((r) => {
      if (r.originCode === c2) set.add(r.destCode);
      if (r.destCode === c2) set.add(r.originCode);
    });
    return set;
  }, [filters.selectedDestinations, activeRoutesForConnectivity]);

  // Options for Ciudad 1: if Ciudad 2 is selected, show only cities with direct connection to Ciudad 2
  const optionsCiudad1 = useMemo(() => {
    if (!connectedToC2) return cityList;
    return cityList.filter((c) => connectedToC2.has(c.code));
  }, [cityList, connectedToC2]);

  // Options for Ciudad 2: if Ciudad 1 is selected, show only cities with direct connection to Ciudad 1
  const optionsCiudad2 = useMemo(() => {
    if (!connectedToC1) return cityList;
    return cityList.filter((c) => connectedToC1.has(c.code));
  }, [cityList, connectedToC1]);

  const handleSelectCiudad1 = (code: string) => {
    if (!code) {
      onFilterChange({
        ...filters,
        selectedOrigins: [],
      });
      return;
    }
    const currentC2 = filters.selectedDestinations[0];
    let newDestinations = filters.selectedDestinations;
    if (currentC2) {
      const connects = activeRoutesForConnectivity.some(
        (r) =>
          (r.originCode === code && r.destCode === currentC2) ||
          (r.originCode === currentC2 && r.destCode === code)
      );
      if (!connects) {
        newDestinations = [];
      }
    }
    onFilterChange({
      ...filters,
      selectedOrigins: [code],
      selectedDestinations: newDestinations,
    });
  };

  const handleSelectCiudad2 = (code: string) => {
    if (!code) {
      onFilterChange({
        ...filters,
        selectedDestinations: [],
      });
      return;
    }
    const currentC1 = filters.selectedOrigins[0];
    let newOrigins = filters.selectedOrigins;
    if (currentC1) {
      const connects = activeRoutesForConnectivity.some(
        (r) =>
          (r.originCode === code && r.destCode === currentC1) ||
          (r.originCode === currentC1 && r.destCode === code)
      );
      if (!connects) {
        newOrigins = [];
      }
    }
    onFilterChange({
      ...filters,
      selectedDestinations: [code],
      selectedOrigins: newOrigins,
    });
  };

  const handleSwapCities = () => {
    onFilterChange({
      ...filters,
      selectedOrigins: filters.selectedDestinations,
      selectedDestinations: filters.selectedOrigins,
    });
  };

  const handleClearCities = () => {
    onFilterChange({
      ...filters,
      selectedOrigins: [],
      selectedDestinations: [],
    });
  };
  const [newMapName, setNewMapName] = useState('');
  const [newMapDesc, setNewMapDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Airline Toggles
  const toggleAirline = (airline: string) => {
    if (filters.selectedAirlines.includes('__NONE__')) {
      onFilterChange({ ...filters, selectedAirlines: [airline] });
      return;
    }
    if (filters.selectedAirlines.length === 0) {
      const remaining = availableAirlines.filter((a) => a !== airline);
      onFilterChange({
        ...filters,
        selectedAirlines: remaining.length === 0 ? ['__NONE__'] : remaining,
      });
      return;
    }
    const isSelected = filters.selectedAirlines.includes(airline);
    const newAirlines = isSelected
      ? filters.selectedAirlines.filter((a) => a !== airline)
      : [...filters.selectedAirlines, airline];

    onFilterChange({
      ...filters,
      selectedAirlines: newAirlines.length === 0 ? ['__NONE__'] : newAirlines,
    });
  };

  const selectAllAirlines = () => {
    onFilterChange({ ...filters, selectedAirlines: [] });
  };

  const deselectAllAirlines = () => {
    onFilterChange({ ...filters, selectedAirlines: ['__NONE__'] });
  };

  // Excel Sheet Toggles
  const toggleSheet = (sheet: string) => {
    const isSelected = filters.selectedSheets?.includes(sheet);
    const newSheets = isSelected
      ? (filters.selectedSheets || []).filter((s) => s !== sheet)
      : [...(filters.selectedSheets || []), sheet];

    onFilterChange({
      ...filters,
      selectedSheets: newSheets,
    });
  };

  const selectAllSheets = () => {
    onFilterChange({ ...filters, selectedSheets: [] });
  };

  // Year Toggles
  const toggleYear = (year: number) => {
    const isSelected = filters.selectedYears.includes(year);
    const newYears = isSelected
      ? filters.selectedYears.filter((y) => y !== year)
      : [...filters.selectedYears, year];

    onFilterChange({
      ...filters,
      selectedYears: newYears,
    });
  };

  const handleSaveMap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapName.trim()) return;
    onSaveCurrentMap(newMapName.trim(), newMapDesc.trim());
    setNewMapName('');
    setNewMapDesc('');
    setShowSaveForm(false);
  };

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-10 text-xs overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0 border-r-0 opacity-0 pointer-events-none' : 'w-80 md:w-96 opacity-100'
      }`}
    >
      {/* Sidebar Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'filters'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'visuals'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Capas GIS</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAdmin ? (
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{isAdmin ? 'Carga' : 'Datos'}</span>
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Ocultar panel lateral (maximizar mapa)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition flex items-center justify-center shrink-0 cursor-pointer border border-transparent hover:border-slate-700 ml-0.5"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ================= FILTERS TAB ================= */}
        {activeTab === 'filters' && (
          <div className="space-y-5">
            {/* Header & Reset */}
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Filtros de Rutas Aéreas
              </span>
              <button
                onClick={onResetFilters}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar Todo
              </button>
            </div>

            {/* 3 Map Visualization Modes Selector */}
            {onMapModeChange && (
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Modo de Visualización
                  </span>
                  <span className="text-[10px] text-cyan-400 font-semibold font-mono">3 Vistas</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => onMapModeChange('airports')}
                    className={`p-2 rounded-lg text-left transition flex items-start gap-2 border cursor-pointer ${
                      mapMode === 'airports'
                        ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-1 rounded mt-0.5 ${mapMode === 'airports' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Building2 className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">1. Aeropuertos y Hub</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Muestra aeropuertos y hubs principales; al dar clic abre sus métricas y conexiones.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => onMapModeChange('routes_by_airline')}
                    className={`p-2 rounded-lg text-left transition flex items-start gap-2 border cursor-pointer ${
                      mapMode === 'routes_by_airline'
                        ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-1 rounded mt-0.5 ${mapMode === 'routes_by_airline' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Plane className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">2. Rutas Autorizadas</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Muestra todas las rutas autorizadas individuales por aerolínea y fecha de autorización.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => onMapModeChange('unique_routes')}
                    className={`p-2 rounded-lg text-left transition flex items-start gap-2 border cursor-pointer ${
                      mapMode === 'unique_routes'
                        ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-1 rounded mt-0.5 ${mapMode === 'unique_routes' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <GitCommit className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">3. Rutas Únicas</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tramos consolidados sin repetir; muestra aerolíneas autorizadas y fechas de autorización.
                      </div>
                    </div>
                  </button>
                </div>

                {/* MODE 1 DESCRIPTION: Color para 2+ aerolíneas y color distinto por aerolínea */}
                {mapMode === 'airports' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/50 text-xs space-y-2 shadow-lg shadow-cyan-950/30">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-cyan-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                        <Palette className="w-3.5 h-3.5 text-cyan-400" />
                        Código Cromático de Aeropuertos
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Cada aeropuerto se identifica con un color específico cuando operan <strong>2 o más aerolíneas</strong>, y con el <strong>color propio de cada aerolínea</strong> cuando opera una sola aerolínea (personalizable en todo momento).
                    </p>
                  </div>
                )}

                {mapMode === 'unique_routes' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/95 border-2 border-cyan-500/70 text-xs space-y-2.5 shadow-lg shadow-cyan-950/40">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-cyan-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Modalidad de Análisis (Rutas Únicas)
                      </span>
                      <span className="text-[10px] bg-cyan-900/80 text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-700 font-bold">
                        {uniqueAnalysisMode === 'general' ? 'Opción A: General' : 'Opción B: Específico'}
                      </span>
                    </div>

                    {/* Conditional list/dropdown and segmented buttons */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Selecciona el tipo de análisis:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => onUniqueAnalysisModeChange && onUniqueAnalysisModeChange('general')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            uniqueAnalysisMode === 'general'
                              ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Análisis general
                        </button>
                        <button
                          type="button"
                          onClick={() => onUniqueAnalysisModeChange && onUniqueAnalysisModeChange('specific')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            uniqueAnalysisMode === 'specific'
                              ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Análisis específico
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
                      {uniqueAnalysisMode === 'general'
                        ? 'a) Análisis general: Muestra todos los 346 tramos consolidados clasificados por 1 sola aerolínea autorizada (177 de operador único) vs 2 o más aerolíneas autorizadas (169 compartidas). Puedes seleccionar cualquiera de las dos o las dos juntas para visualizarlas en el mapa.'
                        : 'b) Análisis específico: Te permite elegir aerolíneas individuales con colores personalizados y resalta rutas exclusivas de una sola aerolínea o compartidas por 2 o más aerolíneas.'}
                    </p>

                    {uniqueAnalysisMode === 'general' && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/50 space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            Selección en el Mapa:
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-200 bg-slate-950 px-2 py-0.5 rounded border border-cyan-700/60">
                            {filters.mode3GeneralShowSingle !== false && filters.mode3GeneralShowMulti !== false
                              ? 'Las dos juntas'
                              : filters.mode3GeneralShowSingle !== false
                              ? '1 aerolínea'
                              : filters.mode3GeneralShowMulti !== false
                              ? '2+ aerolíneas'
                              : 'Ninguna'}
                          </span>
                        </div>

                        {/* Segmented quick selection buttons */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                mode3GeneralShowSingle: true,
                                mode3GeneralShowMulti: true,
                              })
                            }
                            className={`py-1.5 px-1 rounded-md font-bold transition flex items-center justify-center cursor-pointer text-center ${
                              filters.mode3GeneralShowSingle !== false && filters.mode3GeneralShowMulti !== false
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm ring-1 ring-cyan-400'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Las dos juntas
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                mode3GeneralShowSingle: true,
                                mode3GeneralShowMulti: false,
                              })
                            }
                            className={`py-1.5 px-1 rounded-md font-bold transition flex items-center justify-center cursor-pointer text-center ${
                              filters.mode3GeneralShowSingle !== false && filters.mode3GeneralShowMulti === false
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm ring-1 ring-cyan-400'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            1 aerolínea
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                mode3GeneralShowSingle: false,
                                mode3GeneralShowMulti: true,
                              })
                            }
                            className={`py-1.5 px-1 rounded-md font-bold transition flex items-center justify-center cursor-pointer text-center ${
                              filters.mode3GeneralShowSingle === false && filters.mode3GeneralShowMulti !== false
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm ring-1 ring-cyan-400'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            2+ aerolíneas
                          </button>
                        </div>

                        {/* Interactive toggle checkboxes / cards */}
                        <div className="space-y-1.5">
                          {/* Option 1: 1 aerolínea */}
                          <div
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                mode3GeneralShowSingle: filters.mode3GeneralShowSingle === false,
                              })
                            }
                            className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                              filters.mode3GeneralShowSingle !== false
                                ? 'bg-slate-950 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                                : 'bg-slate-950/40 border-slate-800 opacity-55 hover:opacity-90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={filters.mode3GeneralShowSingle !== false}
                                onChange={() =>
                                  onFilterChange({
                                    ...filters,
                                    mode3GeneralShowSingle: filters.mode3GeneralShowSingle === false,
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                              />
                              <div
                                className="relative flex items-center justify-center shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="color"
                                  value={uniqueSingleColor}
                                  onChange={(e) => onChangeUniqueSingleColor && onChangeUniqueSingleColor(e.target.value)}
                                  className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                  title="Cambiar color para 1 aerolínea"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-white/80 shadow-sm inline-block"
                                  style={{ backgroundColor: uniqueSingleColor }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white leading-tight">
                                  1 aerolínea
                                </div>
                                <div className="text-[9.5px] text-cyan-300">
                                  Operador único exclusivo
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-black text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                              177 rutas
                            </span>
                          </div>

                          {/* Option 2: 2 o más aerolíneas */}
                          <div
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                mode3GeneralShowMulti: filters.mode3GeneralShowMulti === false,
                              })
                            }
                            className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                              filters.mode3GeneralShowMulti !== false
                                ? 'bg-slate-950 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                                : 'bg-slate-950/40 border-slate-800 opacity-55 hover:opacity-90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={filters.mode3GeneralShowMulti !== false}
                                onChange={() =>
                                  onFilterChange({
                                    ...filters,
                                    mode3GeneralShowMulti: filters.mode3GeneralShowMulti === false,
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500 shrink-0"
                              />
                              <div
                                className="relative flex items-center justify-center shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="color"
                                  value={uniqueMultiColor}
                                  onChange={(e) => onChangeUniqueMultiColor && onChangeUniqueMultiColor(e.target.value)}
                                  className="w-5 h-5 rounded-full border border-white/40 cursor-pointer p-0 bg-transparent opacity-0 absolute inset-0 z-10"
                                  title="Cambiar color para 2 o más aerolíneas"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-white/80 shadow-sm inline-block"
                                  style={{ backgroundColor: uniqueMultiColor }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white leading-tight">
                                  2 o más aerolíneas
                                </div>
                                <div className="text-[9.5px] text-amber-300">
                                  Ruta compartida / concurrente
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                              169 rutas
                            </span>
                          </div>
                        </div>

                        <div className="text-[9.5px] text-slate-400 leading-tight bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          ℹ️ Puedes seleccionar <strong>1 aerolínea</strong>, <strong>2 o más aerolíneas</strong> por separado, o <strong>las dos juntas</strong> para visualizarlas en el mapa.
                        </div>
                      </div>
                    )}

                    {uniqueAnalysisMode === 'specific' && filters.selectedAirlines.length === 1 && (
                      <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!filters.onlyExclusiveRoutes}
                          onChange={(e) =>
                            onFilterChange({
                              ...filters,
                              onlyExclusiveRoutes: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-950 cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold text-amber-300">
                          Solo rutas exclusivas de {filters.selectedAirlines[0]} (operador único)
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= CLAVES IATA (CON NOMBRES / SIN NOMBRES Y TAMAÑO) ================= */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Claves IATA de Aeropuertos
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold font-mono">
                  {showAirportLabels ? 'Con nombres' : 'Sin nombres'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => onToggleAirportLabels && onToggleAirportLabels(true)}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center cursor-pointer ${
                    showAirportLabels
                      ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Con nombres
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAirportLabels && onToggleAirportLabels(false)}
                  className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center cursor-pointer ${
                    !showAirportLabels
                      ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sin nombres
                </button>
              </div>

              {showAirportLabels && (
                <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Tamaño de la clave IATA:</span>
                    <span className="text-cyan-300 font-mono font-bold">{iataFontSize ?? 11}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={(iataFontSize ?? 11) <= 8}
                      onClick={() => onChangeIataFontSize && onChangeIataFontSize(Math.max(8, (iataFontSize ?? 11) - 1))}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded text-xs font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      A-
                    </button>
                    <input
                      type="range"
                      min={8}
                      max={18}
                      step={1}
                      value={iataFontSize ?? 11}
                      onChange={(e) => onChangeIataFontSize && onChangeIataFontSize(Number(e.target.value))}
                      className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={(iataFontSize ?? 11) >= 18}
                      onClick={() => onChangeIataFontSize && onChangeIataFontSize(Math.min(18, (iataFontSize ?? 11) + 1))}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded text-xs font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      A+
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ================= APARTADO TOP 1 AL 15 AEROPUERTOS POR RUTAS AUTORIZADAS ================= */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                      Top Aeropuertos
                    </span>
                    <span className="text-[10px] text-cyan-400 font-semibold block">
                      Rutas de Autorización (Top 1 al 15)
                    </span>
                  </div>
                </div>

                {filters.selectedTopN && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-black font-mono">
                    Top {filters.selectedTopN} Activo
                  </span>
                )}
              </div>

              {/* Dropdown Selector */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold mb-1">
                  <span>Seleccionar Top (1 al 15):</span>
                  {filters.selectedTopN && (
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange({ ...filters, selectedTopN: null });
                        if (selectedHubCode && onClearHubFilter) onClearHubFilter();
                      }}
                      className="text-cyan-400 hover:text-white text-[10px] underline cursor-pointer"
                    >
                      Quitar filtro Top
                    </button>
                  )}
                </div>
                <select
                  value={filters.selectedTopN ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    onFilterChange({
                      ...filters,
                      selectedTopN: val,
                    });
                    if (selectedHubCode && onClearHubFilter) {
                      onClearHubFilter();
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-semibold cursor-pointer"
                >
                  <option value="">-- Seleccionar Top (1 al 15) --</option>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      Top {num} Aeropuerto{num > 1 ? 's' : ''} ({num === 1 ? '#1 con más rutas autorizadas' : `#1 al #${num} con más rutas autorizadas`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Banner (only shown if a Top is selected) */}
              {filters.selectedTopN && (
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[11px]">
                  <span className="text-slate-300 font-medium truncate">
                    <strong className="text-cyan-300">Top {filters.selectedTopN}</strong>: {displayedTopAirports.length} aeropuerto{displayedTopAirports.length > 1 ? 's' : ''} con más rutas
                  </span>
                  {selectedHubCode && (
                    <button
                      type="button"
                      onClick={onClearHubFilter}
                      className="text-[10px] text-cyan-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                      title="Ver todos los aeropuertos del Top"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Ver todos ({filters.selectedTopN})
                    </button>
                  )}
                </div>
              )}

              {/* List of Top Airports Cards (only when a Top is explicitly chosen) */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {!filters.selectedTopN ? (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
                    Selecciona una opción del Top (1 al 15) en el menú superior para desplegar y seleccionar los aeropuertos.
                  </div>
                ) : displayedTopAirports.length === 0 ? (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
                    No se encontraron aeropuertos para el Top seleccionado.
                  </div>
                ) : (
                  displayedTopAirports.map((hub, index) => {
                    const isSelected = selectedHubCode === hub.code;
                    const rankNumber = index + 1;

                    return (
                      <div
                        key={hub.code}
                        onClick={() => onSelectHub && onSelectHub(hub)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer relative group ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {/* Top Bar: Uniform Rank & Code for ALL hubs (exact same color) */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border-cyan-800">
                              TOP #{rankNumber}
                            </span>
                            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                              {hub.code}
                            </span>
                          </div>

                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-700 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                              Centrado
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 group-hover:text-cyan-400 font-medium flex items-center gap-1 transition">
                              <Eye className="w-3 h-3" />
                              Visualizar
                            </span>
                          )}
                        </div>

                        {/* Name & Location */}
                        <div className="font-bold text-slate-100 text-xs leading-snug group-hover:text-cyan-200 transition truncate">
                          {hub.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span>{hub.city ? `${hub.city}${hub.state ? `, ${hub.state}` : ''}` : 'México'}</span>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                          <div className="bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Rutas:</span>
                            <span className="font-bold text-cyan-300 font-mono">{hub.authorizedRoutesCount}</span>
                          </div>
                          <div className="bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Destinos:</span>
                            <span className="font-bold text-slate-200 font-mono">{hub.destinationsCount}</span>
                          </div>
                          <div className="bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Aerolíneas:</span>
                            <span className="font-bold text-slate-200 font-mono">{hub.airlinesCount}</span>
                          </div>
                          <div className="bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Vuelos:</span>
                            <span className="font-bold text-cyan-300 font-mono">{hub.totalFlights.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modos 2 y 3: Las aerolíneas están EXCLUSIVAMENTE en la pestaña de la derecha */}
            {(mapMode === 'routes_by_airline' || mapMode === 'unique_routes') && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>Aerolíneas y Código Cromático</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  En los <strong>Modos 2 y 3</strong>, las aerolíneas y su código cromático se gestionan exclusivamente en la pestaña de la derecha (<strong>Nomenclatura y Código Cromático</strong>), con casillas de selección múltiple para comparar 2 o más aerolíneas.
                </p>
              </div>
            )}

            {/* Ciudad 1 & Ciudad 2 Bilateral Selectors */}
            <div className="space-y-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Conexión Bilateral de Ciudades
                </span>
                {(filters.selectedOrigins.length > 0 || filters.selectedDestinations.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClearCities}
                    className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition cursor-pointer font-medium"
                    title="Restablecer ambas ciudades"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </div>

              {/* Ciudad 1 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center justify-center text-[10px] font-mono">1</span>
                    Ciudad 1
                  </label>
                  {filters.selectedOrigins[0] && (
                    <button
                      type="button"
                      onClick={() => handleSelectCiudad1('')}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                      title="Quitar Ciudad 1"
                    >
                      <X className="w-3 h-3" />
                      Quitar
                    </button>
                  )}
                </div>
                <select
                  value={filters.selectedOrigins[0] || ''}
                  onChange={(e) => handleSelectCiudad1(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                >
                  <option value="">
                    {connectedToC2
                      ? `-- Conexiones con ${filters.selectedDestinations[0]} (${optionsCiudad1.length}) --`
                      : '-- Selecciona Ciudad 1 (Todas) --'}
                  </option>
                  {optionsCiudad1.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {filters.selectedOrigins[0] && connectedToC1 && (
                  <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                    <span>✓ {connectedToC1.size} destinos conectados para Ciudad 2</span>
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwapCities}
                  disabled={!filters.selectedOrigins[0] && !filters.selectedDestinations[0]}
                  title="Intercambiar Ciudad 1 y Ciudad 2"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold">Intercambiar</span>
                </button>
              </div>

              {/* Ciudad 2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center justify-center text-[10px] font-mono">2</span>
                    Ciudad 2
                  </label>
                  {filters.selectedDestinations[0] && (
                    <button
                      type="button"
                      onClick={() => handleSelectCiudad2('')}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                      title="Quitar Ciudad 2"
                    >
                      <X className="w-3 h-3" />
                      Quitar
                    </button>
                  )}
                </div>
                <select
                  value={filters.selectedDestinations[0] || ''}
                  onChange={(e) => handleSelectCiudad2(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                >
                  <option value="">
                    {connectedToC1
                      ? `-- Conexiones con ${filters.selectedOrigins[0]} (${optionsCiudad2.length}) --`
                      : '-- Selecciona Ciudad 2 (Todas) --'}
                  </option>
                  {optionsCiudad2.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {filters.selectedDestinations[0] && connectedToC2 && (
                  <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                    <span>✓ {connectedToC2.size} destinos conectados para Ciudad 1</span>
                  </div>
                )}
              </div>

              {/* Bilateral status indicator */}
              {filters.selectedOrigins[0] && filters.selectedDestinations[0] && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span className="font-bold">
                    {filters.selectedOrigins[0]} ⇄ {filters.selectedDestinations[0]}
                  </span>
                  <span className="text-[10px] bg-emerald-900/80 px-1.5 py-0.5 rounded text-emerald-200 font-semibold">
                    Conexión Bilateral Activa
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VISUALS / GIS LAYERS TAB ================= */}
        {activeTab === 'visuals' && (
          <div className="space-y-5">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Estilización Cartográfica & GIS
              </span>
            </div>

            {/* Base Tile Layer */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Mapa Base Geográfico</label>
              <div className="space-y-2">
                {[
                  { key: 'dark', label: 'Radar Nocturno / Oscuro', desc: 'Esri Dark Canvas (Limpio, sin marcas de agua)' },
                  { key: 'light', label: 'Cartográfico Técnico Claro', desc: 'Esri Light Canvas' },
                  { key: 'satellite', label: 'Satélite Aeronáutico', desc: 'Esri World Imagery' },
                  { key: 'topo', label: 'Topografía y Relieve', desc: 'Esri World Topographic' },
                  { key: 'osm', label: 'OpenStreetMap Estándar', desc: 'OSM Global Vector' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onTileLayerChange(item.key as any)}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      tileLayer === item.key
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-md shadow-cyan-900/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                    {tileLayer === item.key && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme & Custom Airlines Palette */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Esquema de Color de Rutas</label>
              <select
                value={colorScheme}
                onChange={(e) => onColorSchemeChange(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="airline">Por Aerolínea (Colores Personalizados / Oficiales)</option>
                <option value="cyan">Monocromático Cyan Radar</option>
              </select>
            </div>

            {/* Dedicated Custom Airline Color Manager in Visuals */}
            {colorScheme === 'airline' && availableAirlines.length > 0 && (
              <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    Personalizar Colores de Aerolíneas
                  </span>
                  {onResetAirlineColors && Object.keys(customAirlineColors).length > 0 && (
                    <button
                      onClick={onResetAirlineColors}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {availableAirlines.map((airline) => {
                    const color = getAirlineColor(airline, customAirlineColors);
                    return (
                      <div
                        key={airline}
                        className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
                      >
                        <span className="text-xs text-slate-200 font-medium truncate max-w-[150px]">
                          {airline}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => onUpdateAirlineColor && onUpdateAirlineColor(airline, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            title={`Cambiar color de ${airline}`}
                          />
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {color}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Great Circle Arc Curvature */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Curvatura Geodésica de Arcos</label>
                <span className="font-mono text-cyan-300 font-bold">
                  {(arcCurvature * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.30"
                step="0.02"
                value={arcCurvature}
                onChange={(e) => onArcCurvatureChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Ajusta la altura del arco de gran círculo para simular rutas aéreas tridimensionales.
              </p>
            </div>

            {/* Layer Toggles */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-slate-200">Mostrar Arcos de Rutas</span>
                <input
                  type="checkbox"
                  checked={showFlightArcs}
                  onChange={(e) => onToggleFlightArcs(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-slate-200">Mostrar Marcadores de Aeropuertos</span>
                <input
                  type="checkbox"
                  checked={showAirports}
                  onChange={(e) => onToggleAirports(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-slate-200">Etiquetas IATA en Aeropuertos</span>
                <input
                  type="checkbox"
                  checked={showAirportLabels}
                  onChange={(e) => onToggleAirportLabels(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                />
              </label>
            </div>
          </div>
        )}

        {/* ================= UPLOAD & DATA TAB ================= */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {!isAdmin ? (
              /* Viewer Read-Only Mode */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Gestión de Datos
                  </span>
                  <span className="text-[10px] bg-slate-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800/60 flex items-center gap-1 font-semibold">
                    <Lock className="w-2.5 h-2.5" /> Solo Lectura
                  </span>
                </div>

                {/* Active file summary card with date & reconciliation */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Dataset Cartográfico Publicado
                      </span>
                      <div className="text-xs font-bold text-white break-all mt-0.5" title={displayFileName}>
                        {displayFileName}
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-1 font-medium">
                        <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Sincronizado en la nube (Firestore)</span>
                      </div>
                    </div>
                  </div>

                  {/* Date extraction & reconciliation with latest authorized route */}
                  <div className="border-t border-slate-800/80 pt-2.5 space-y-2 text-[11px]">
                    {fileDateInfo && (
                      <div className="flex items-center justify-between gap-2 text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          Fecha del archivo:
                        </span>
                        <span className="font-semibold text-cyan-300 font-mono text-right truncate">
                          {fileDateInfo.formatted} ({fileDateInfo.iso})
                        </span>
                      </div>
                    )}
                    {latestRouteInfo && (
                      <div className="flex items-center justify-between gap-2 text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <Plane className="w-3 h-3 text-amber-400" />
                          Última ruta autorizada:
                        </span>
                        <span className="font-semibold text-amber-300 font-mono text-right">
                          {latestRouteInfo.date}
                        </span>
                      </div>
                    )}
                    {reconciliationStatus && (
                      <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                        reconciliationStatus.isMatched
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                          : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span className="text-[10px] leading-tight font-medium">
                          {reconciliationStatus.message}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
                    Este mapa muestra <strong>automáticamente el archivo oficial</strong> cargado por el administrador. Cualquier persona que abra este enlace verá esta misma información sin necesidad de subir archivos.
                  </p>
                </div>

                {/* Restricted Upload Notice & Unlock Button */}
                <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <Lock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">¿Deseas actualizar el archivo Excel?</div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      La subida y sustitución de archivos cartográficos está restringida para el administrador del sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="w-full py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Ingresar Clave de Administrador
                  </button>
                </div>
              </div>
            ) : (
              /* Admin Upload & Manage Mode */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Carga y Gestión de Archivos
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Admin Activo
                  </span>
                </div>

                {/* Admin notification banner */}
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[11px]">Permisos de subida habilitados</span>
                  </div>
                  <button
                    onClick={onOpenAuthModal}
                    className="text-[10px] text-emerald-400 hover:text-emerald-200 underline font-semibold cursor-pointer"
                  >
                    Gestionar
                  </button>
                </div>

                {/* Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-950/30'
                      : 'border-slate-700 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950/90'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.xlsm,.xlsb,*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-xs break-all">
                      {displayFileName ? `Archivo activo: ${displayFileName}` : 'Subir archivo Excel o CSV'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Arrastra tu archivo aquí o haz clic para seleccionarlo
                    </p>
                    <p className="text-[10px] text-cyan-400/90 mt-1">
                      Acepta cualquier nombre de archivo (ej. 2026_08_27 Arline Routes AR, 2026_09_25 Arline Routes AR). El sistema adoptará el nombre y conciliará las fechas automáticamente.
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">.xlsx, .xls, .csv</div>
                  </div>
                </div>

                {/* Admin File Status & Conciliation */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-300">Archivo activo:</span>
                    <span className="text-white font-mono font-bold truncate max-w-[170px]" title={displayFileName}>{displayFileName}</span>
                  </div>
                  {fileDateInfo && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Fecha del corte:</span>
                      <span className="text-cyan-300 font-mono font-semibold">{fileDateInfo.formatted} ({fileDateInfo.iso})</span>
                    </div>
                  )}
                  {latestRouteInfo && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Última ruta autorizada:</span>
                      <span className="text-amber-300 font-mono font-semibold">{latestRouteInfo.date}</span>
                    </div>
                  )}
                  {reconciliationStatus && (
                    <div className={`px-2 py-1 rounded-lg border text-[10.5px] flex items-center gap-1.5 ${
                      reconciliationStatus.isMatched
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>{reconciliationStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Cloud Sync Assurance & Action */}
                <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-start gap-2 text-[11px] text-cyan-300">
                    <Cloud className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong>Sincronización centralizada:</strong> El dataset se almacena en Google Cloud Firestore. Todos los usuarios en cualquier dispositivo verán tu mapa actualizado automáticamente.
                    </p>
                  </div>

                  {onManualPublishCloud && (
                    <button
                      type="button"
                      onClick={onManualPublishCloud}
                      disabled={isCloudSyncing}
                      className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-cyan-900/40 cursor-pointer"
                    >
                      {isCloudSyncing ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Cloud className="w-3.5 h-3.5" />
                      )}
                      {isCloudSyncing ? 'Sincronizando en la Nube...' : 'Publicar Ahora en la Nube (Firestore)'}
                    </button>
                  )}
                </div>

                {/* Column Mapper Button */}
                <button
                  onClick={onOpenColumnMapper}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <Settings2 className="w-4 h-4 text-cyan-400" />
                  Revisar Mapeo de Columnas
                </button>

                {/* Template Download (Exclusivo para Administrador) */}
                <button
                  onClick={onDownloadTemplate}
                  className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-900 text-cyan-300 rounded-xl font-semibold transition flex items-center justify-center gap-2 border border-slate-800 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Descargar Plantilla Excel Oficial (.xlsx)
                </button>

                {/* Validation Issues / Log */}
                {validationIssues.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Alertas de Validación ({validationIssues.length})</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {validationIssues.slice(0, 10).map((issue, idx) => (
                        <div key={idx} className="text-[10px] text-amber-200/90 leading-tight">
                          &bull; {issue.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
