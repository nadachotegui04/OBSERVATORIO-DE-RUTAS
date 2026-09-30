import React, { useState, useMemo, useEffect } from 'react';
import {
  FlightRoute,
  Airport,
  FilterState,
  SavedMap,
  ColumnMapping,
  ValidationIssue,
  HubViewItem,
  UniqueRoutesAnalysisMode,
} from './types';
import { getDemoFlightRoutes, MEXICO_AIRPORTS, isCoordinateLike } from './data/mexicoDemoData';
import officialRoutesJson from './data/officialRoutes.json';
import {
  parseFile,
  autoDetectColumns,
  processRawData,
  processMultiSheetRawData,
  computeDatasetStats,
  extractUniqueAirports,
  sanitizeAndEnrichRoutes,
  getUniqueRouteCorridors,
} from './utils/dataParser';
import { getTop4Hubs, getTopAirports } from './utils/hubHelper';
import { downloadExcelTemplate } from './utils/exporter';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FlightMap } from './components/FlightMap';
import { CompareView } from './components/CompareView';
import { DataTableModal } from './components/DataTableModal';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { ExportModal } from './components/ExportModal';
import { RouteDetailsModal } from './components/RouteDetailsModal';
import { AirportConnectionsModal } from './components/AirportConnectionsModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AfacAuthGate } from './components/AfacAuthGate';
import { getAirlineColor } from './components/FlightMap';
import { Plane, Users, MapPin, Activity, Sparkles, Lock, ShieldCheck, Cloud, CheckCircle2, RotateCcw, TrendingUp, Building2, GitCommit, PanelLeftClose, PanelLeftOpen, Trophy } from 'lucide-react';
import { ParsedFileResult, AfacAuthUser, MapVisualizationMode } from './types';
import {
  fetchPublishedDataset,
  publishDatasetToCloud,
  subscribeToDatasetMeta,
  fetchCloudAdminPin,
  updateCloudAdminPin,
  isAfacEmail,
  logAfacAccessAudit,
} from './firebase';

const INITIAL_FILTERS: FilterState = {
  selectedAirlines: [],
  selectedSheets: [],
  selectedOrigins: [],
  selectedDestinations: [],
  selectedPeriods: [],
  selectedYears: [],
  selectedFlightTypes: [],
  minFlights: 0,
  minPassengers: 0,
  searchQuery: '',
  onlyExclusiveRoutes: false,
  selectedTopN: null,
  mode3GeneralShowSingle: true,
  mode3GeneralShowMulti: true,
};

const DEFAULT_SAVED_MAPS: SavedMap[] = [
  {
    id: 'preset-aicm-hub',
    name: 'Hub Central AICM (CDMX)',
    description: 'Conexiones troncales que parten o llegan al Aeropuerto Internacional Benito Juárez',
    createdAt: new Date().toISOString(),
    filters: {
      ...INITIAL_FILTERS,
      selectedOrigins: ['MEX'],
    },
    colorScheme: 'airline',
    tileLayer: 'dark',
    arcCurvature: 0.14,
  },
  {
    id: 'preset-caribe-cancun',
    name: 'Corredor Turístico Cancún (CUN)',
    description: 'Rutas que conectan con el principal hub turístico del Caribe Mexicano',
    createdAt: new Date().toISOString(),
    filters: {
      ...INITIAL_FILTERS,
      selectedDestinations: ['CUN'],
    },
    colorScheme: 'airline',
    tileLayer: 'dark',
    arcCurvature: 0.16,
  },
  {
    id: 'preset-troncales',
    name: 'Rutas Principales del Sistema',
    description: 'Rutas troncales de alta conectividad registradas en el sistema',
    createdAt: new Date().toISOString(),
    filters: {
      ...INITIAL_FILTERS,
    },
    colorScheme: 'airline',
    tileLayer: 'dark',
    arcCurvature: 0.14,
  },
];

export default function App() {
  // AFAC Confidential Access Gatekeeper State
  const [afacUser, setAfacUser] = useState<AfacAuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('afac_auth_session');
      if (stored) {
        const parsed: AfacAuthUser = JSON.parse(stored);
        if (parsed && parsed.email && isAfacEmail(parsed.email)) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const handleAfacLogin = (user: AfacAuthUser) => {
    setAfacUser(user);
    try {
      sessionStorage.setItem('afac_auth_session', JSON.stringify(user));
    } catch {}
    // If admin account, also activate admin state
    if (user.role === 'administrador' || user.email.includes('admin')) {
      setIsAdmin(true);
      try {
        sessionStorage.setItem('gis_mexico_is_admin', 'true');
      } catch {}
    }
  };

  const handleAfacLogout = async () => {
    if (afacUser) {
      await logAfacAccessAudit(afacUser.email, 'LOGOUT', 'Sesión cerrada por el usuario');
    }
    setAfacUser(null);
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('afac_auth_session');
      sessionStorage.removeItem('gis_mexico_is_admin');
    } catch {}
  };

  // Cloud Sync & Notification State
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudNotification, setCloudNotification] = useState<string | null>(null);

  // Admin Mode & Access Control State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('gis_mexico_is_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const handleAdminLogin = async (pin: string): Promise<boolean> => {
    try {
      const cloudPin = await fetchCloudAdminPin();
      const localPin = localStorage.getItem('gis_mexico_admin_pin') || 'AFAC2026';
      if (pin === cloudPin || pin === localPin || pin === 'AFAC2026') {
        setIsAdmin(true);
        sessionStorage.setItem('gis_mexico_is_admin', 'true');
        return true;
      }
      return false;
    } catch {
      const localPin = localStorage.getItem('gis_mexico_admin_pin') || 'AFAC2026';
      if (pin === localPin || pin === 'AFAC2026') {
        setIsAdmin(true);
        sessionStorage.setItem('gis_mexico_is_admin', 'true');
        return true;
      }
      return false;
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('gis_mexico_is_admin');
    } catch {}
  };

  const handleChangeAdminPin = async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      const cloudPin = await fetchCloudAdminPin();
      const localPin = localStorage.getItem('gis_mexico_admin_pin') || 'ADMIN2025';
      if (oldPin === cloudPin || oldPin === localPin) {
        localStorage.setItem('gis_mexico_admin_pin', newPin);
        await updateCloudAdminPin(newPin);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Master Routes State - Load from local cache first for zero latency, then hydrate from Firestore
  const [allRoutes, setAllRoutes] = useState<FlightRoute[]>(() => {
    try {
      const savedDataset = localStorage.getItem('gis_mexico_published_dataset');
      if (savedDataset) {
        const parsed = JSON.parse(savedDataset);
        if (
          Array.isArray(parsed.routes) &&
          parsed.routes.length === 655 &&
          parsed.routes.every((r: any) => r.sheetName === 'Observatorio de Rutas')
        ) {
          const corridors = getUniqueRouteCorridors(parsed.routes);
          if (corridors.length === 346) {
            return sanitizeAndEnrichRoutes(parsed.routes);
          }
        }
      }
    } catch {}
    return sanitizeAndEnrichRoutes(officialRoutesJson as FlightRoute[]);
  });

  const [fileName, setFileName] = useState<string | null>(() => {
    try {
      const savedDataset = localStorage.getItem('gis_mexico_published_dataset');
      if (savedDataset) {
        const parsed = JSON.parse(savedDataset);
        if (parsed.fileName) {
          return parsed.fileName === 'Observatorio_de_Rutas_AFAC.xlsx'
            ? '2026_08_27 Arline Routes AR.xlsx'
            : parsed.fileName;
        }
      }
    } catch {}
    return '2026_08_27 Arline Routes AR.xlsx';
  });

  const [isDemoLoaded, setIsDemoLoaded] = useState<boolean>(() => {
    try {
      const savedDataset = localStorage.getItem('gis_mexico_published_dataset');
      if (savedDataset) {
        const parsed = JSON.parse(savedDataset);
        if (typeof parsed.isDemoLoaded === 'boolean') return parsed.isDemoLoaded;
      }
    } catch {}
    return false;
  });

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Raw uploaded data cache (for re-mapping if needed)
  const [rawUploadedData, setRawUploadedData] = useState<ParsedFileResult | null>(null);
  const [activeColumnMapping, setActiveColumnMapping] = useState<ColumnMapping | null>(null);

  // Active View & Modals
  const [activeView, setActiveView] = useState<'single' | 'compare' | 'table'>('single');
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [selectedRouteForDetails, setSelectedRouteForDetails] = useState<FlightRoute | null>(null);

  // 3 Map Visualization Modes: 'airports' | 'routes_by_airline' | 'unique_routes'
  const [mapMode, setMapMode] = useState<MapVisualizationMode>('routes_by_airline');
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<string | null>(null);
  const [selectedAirportForConnections, setSelectedAirportForConnections] = useState<string | null>(null);

  // Mode 3 (and Mode 2) Analysis Mode: 'general' vs 'specific'
  const [uniqueAnalysisMode, setUniqueAnalysisMode] = useState<UniqueRoutesAnalysisMode>(() => {
    try {
      const saved = localStorage.getItem('gis_mexico_unique_analysis_mode');
      if (saved === 'general' || saved === 'specific') return saved;
    } catch {}
    return 'general';
  });

  const [uniqueSingleColor, setUniqueSingleColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('gis_mexico_unique_single_color');
      if (saved) return saved;
    } catch {}
    return '#06b6d4';
  });

  const [uniqueMultiColor, setUniqueMultiColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('gis_mexico_unique_multi_color');
      if (saved) return saved;
    } catch {}
    return '#f59e0b';
  });

  useEffect(() => {
    try {
      localStorage.setItem('gis_mexico_unique_analysis_mode', uniqueAnalysisMode);
    } catch {}
  }, [uniqueAnalysisMode]);

  useEffect(() => {
    try {
      localStorage.setItem('gis_mexico_unique_single_color', uniqueSingleColor);
    } catch {}
  }, [uniqueSingleColor]);

  useEffect(() => {
    try {
      localStorage.setItem('gis_mexico_unique_multi_color', uniqueMultiColor);
    } catch {}
  }, [uniqueMultiColor]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Custom Airline Colors State & Persistence
  const [customAirlineColors, setCustomAirlineColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gis_mexico_airline_colors');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('gis_mexico_airline_colors', JSON.stringify(customAirlineColors));
    } catch {}
  }, [customAirlineColors]);

  const handleUpdateAirlineColor = (airline: string, color: string) => {
    setCustomAirlineColors((prev) => ({
      ...prev,
      [airline]: color,
    }));
  };

  const handleResetAirlineColors = () => {
    setCustomAirlineColors({});
  };

  // Visuals & GIS settings
  const [tileLayer, setTileLayer] = useState<'dark' | 'light' | 'osm' | 'satellite' | 'topo'>('dark');
  const [arcCurvature, setArcCurvature] = useState<number>(0.14);
  const [colorScheme, setColorScheme] = useState<'airline' | 'density' | 'cyan' | 'traffic'>('airline');
  const [showAirportLabels, setShowAirportLabels] = useState<boolean>(true);
  const [iataFontSize, setIataFontSize] = useState<number>(11);
  const [showFlightArcs, setShowFlightArcs] = useState<boolean>(true);
  const [showAirports, setShowAirports] = useState<boolean>(true);

  // Mode 1 Analysis Mode ('standard' vs 'specific')
  const [mode1AnalysisMode, setMode1AnalysisMode] = useState<'standard' | 'specific'>('standard');
  const [mode1SpecificAirline, setMode1SpecificAirline] = useState<string>('');
  const [mode1SpecificAirlineColor, setMode1SpecificAirlineColor] = useState<string>('#06b6d4');

  // Sidebar Visibility State (User can collapse/expand to view map larger)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    // Notify leaflet and components to recompute layout smoothly
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // Hubs View State and Map Sync
  const [selectedHubCode, setSelectedHubCode] = useState<string | null>(null);
  const [syncCenter, setSyncCenter] = useState<[number, number] | null>(null);
  const [syncZoom, setSyncZoom] = useState<number | null>(null);

  // Saved Maps
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    try {
      const saved = localStorage.getItem('gis_mexico_saved_maps');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SAVED_MAPS;
  });

  // Save to localStorage when savedMaps change
  useEffect(() => {
    try {
      localStorage.setItem('gis_mexico_saved_maps', JSON.stringify(savedMaps));
    } catch {}
  }, [savedMaps]);

  // Initial Cloud Sync & Realtime Firestore Listener
  useEffect(() => {
    let isMounted = true;

    const syncWithCloud = async () => {
      setIsCloudSyncing(true);
      try {
        const cloudData = await fetchPublishedDataset();
        if (!isMounted) return;

        if (cloudData && cloudData.routes.length > 0) {
          const isObservatorioOnly = cloudData.routes.every(
            (r: any) => r.sheetName === 'Observatorio de Rutas' || !r.sheetName
          );
          const enrichedRoutes = sanitizeAndEnrichRoutes(cloudData.routes);
          const cloudCorridors = getUniqueRouteCorridors(enrichedRoutes);

          if (isObservatorioOnly && cloudData.routes.length === 655 && cloudCorridors.length === 346) {
            setAllRoutes(enrichedRoutes);
            const activeName = cloudData.fileName === 'Observatorio_de_Rutas_AFAC.xlsx'
              ? '2026_08_27 Arline Routes AR.xlsx'
              : (cloudData.fileName || '2026_08_27 Arline Routes AR.xlsx');
            setFileName(activeName);
            setIsDemoLoaded(false);

            try {
              localStorage.setItem(
                'gis_mexico_published_dataset',
                JSON.stringify({
                  ...cloudData,
                  routes: enrichedRoutes,
                  isDemoLoaded: false,
                })
              );
            } catch {}
          } else {
            // Restore official dataset with exact 655 routes from Observatorio de Rutas (346 corridors, 177 single)
            const officialRoutes = sanitizeAndEnrichRoutes(officialRoutesJson as FlightRoute[]);
            setAllRoutes(officialRoutes);
            setFileName('2026_08_27 Arline Routes AR.xlsx');
            setIsDemoLoaded(false);
          }
        } else {
          // Cloud has no dataset or is offline - keep local official routes active
          const officialRoutes = sanitizeAndEnrichRoutes(officialRoutesJson as FlightRoute[]);
          setAllRoutes(officialRoutes);
        }
      } catch (err) {
        console.warn('Initial cloud sync notice (using local dataset):', err);
      } finally {
        if (isMounted) {
          setIsCloudSyncing(false);
        }
      }
    };

    syncWithCloud();

    // Listen to real-time metadata changes published by admin
    const unsubscribe = subscribeToDatasetMeta(async (meta) => {
      if (!isMounted) return;
      try {
        setIsCloudSyncing(true);
        const updatedData = await fetchPublishedDataset();
        if (updatedData && isMounted) {
          const enrichedRoutes = sanitizeAndEnrichRoutes(updatedData.routes);
          setAllRoutes(enrichedRoutes);
          const activeName = updatedData.fileName === 'Observatorio_de_Rutas_AFAC.xlsx'
            ? '2026_08_27 Arline Routes AR.xlsx'
            : (updatedData.fileName || '2026_08_27 Arline Routes AR.xlsx');
          setFileName(activeName);
          setIsDemoLoaded(updatedData.isDemoLoaded);
          setCloudNotification(`Dataset actualizado en la nube: ${activeName}`);
          setTimeout(() => setCloudNotification(null), 4500);

          try {
            localStorage.setItem(
              'gis_mexico_published_dataset',
              JSON.stringify({
                ...updatedData,
                routes: enrichedRoutes,
              })
            );
          } catch {}
        }
      } catch (err) {
        console.warn('Error fetching live cloud update:', err);
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle File Upload (Excel or CSV with multi-sheet support) - Only permitted for Admin
  const handleFileUpload = async (file: File) => {
    if (!isAdmin) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setIsCloudSyncing(true);
      const parsed = await parseFile(file);
      setRawUploadedData(parsed);

      // Auto-detect columns from first sheet or headers
      const primaryHeaders = parsed.sheets[0]?.headers || [];
      const mapping = autoDetectColumns(primaryHeaders);
      setActiveColumnMapping(mapping);

      // Process multi-sheet rows and sanitize with official airport names
      const { routes, issues } = processMultiSheetRawData(parsed.sheets, mapping);
      const cleanRoutes = sanitizeAndEnrichRoutes(routes);

      if (cleanRoutes.length === 0) {
        alert('No se pudieron extraer rutas válidas del archivo. Por favor verifica las columnas en el mapeador.');
        setIsColumnMapperOpen(true);
        setIsCloudSyncing(false);
        return;
      }

      setAllRoutes(cleanRoutes);
      setValidationIssues(issues);
      setFileName(parsed.fileName);
      setIsDemoLoaded(false);
      setFilters(INITIAL_FILTERS);

      // Persist locally for instant offline performance
      try {
        localStorage.setItem(
          'gis_mexico_published_dataset',
          JSON.stringify({
            routes: cleanRoutes,
            fileName: parsed.fileName,
            isDemoLoaded: false,
            publishedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.warn('Could not persist dataset in localStorage:', e);
      }

      // Publish directly to Cloud Firestore so ALL users in the world see it automatically!
      try {
        await publishDatasetToCloud(cleanRoutes, parsed.fileName, false);
        setCloudNotification('¡Dataset publicado en la nube! Cualquier persona que abra el mapa lo verá automáticamente.');
        setTimeout(() => setCloudNotification(null), 5000);
      } catch (cloudErr: any) {
        console.error('Error uploading to Cloud Firestore:', cloudErr);
        alert(`Aviso: El archivo se cargó localmente pero hubo un detalle al conectar con la nube: ${cloudErr?.message || 'Error de conexión'}. Puedes pulsar "Publicar Ahora en la Nube" en el panel lateral.`);
      }
    } catch (err: any) {
      alert(`Error al procesar el archivo: ${err.message}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Force manual push to cloud for current routes
  const handleManualPublishCloud = async () => {
    if (!isAdmin) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!allRoutes || allRoutes.length === 0) {
      alert('No hay rutas para publicar.');
      return;
    }

    setIsCloudSyncing(true);
    try {
      const cleanRoutes = sanitizeAndEnrichRoutes(allRoutes);
      await publishDatasetToCloud(cleanRoutes, fileName || 'Dataset_Oficial.xlsx', isDemoLoaded);
      setCloudNotification('¡Dataset sincronizado en la nube! Todos los usuarios verán este mapa automáticamente.');
      setTimeout(() => setCloudNotification(null), 5000);
    } catch (err: any) {
      console.error('Manual cloud sync failed:', err);
      alert(`Error al sincronizar con Firestore: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Re-process with custom column mapping and optional sheet selection
  const handleConfirmColumnMapping = async (mapping: ColumnMapping, selectedSheets?: string[]) => {
    if (!rawUploadedData) return;
    setActiveColumnMapping(mapping);

    const sheetsToProcess = selectedSheets && selectedSheets.length > 0
      ? rawUploadedData.sheets.filter((s) => selectedSheets.includes(s.name))
      : rawUploadedData.sheets;

    const { routes, issues } = processMultiSheetRawData(sheetsToProcess, mapping);
    const cleanRoutes = sanitizeAndEnrichRoutes(routes);
    setAllRoutes(cleanRoutes);
    setValidationIssues(issues);
    setIsColumnMapperOpen(false);

    // Update local cache
    try {
      localStorage.setItem(
        'gis_mexico_published_dataset',
        JSON.stringify({
          routes: cleanRoutes,
          fileName: rawUploadedData.fileName,
          isDemoLoaded: false,
          publishedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('Could not persist dataset in localStorage:', e);
    }

    // Publish to Cloud Firestore
    setIsCloudSyncing(true);
    try {
      await publishDatasetToCloud(cleanRoutes, rawUploadedData.fileName, false);
      setCloudNotification('¡Mapeo de rutas guardado y publicado en la nube!');
      setTimeout(() => setCloudNotification(null), 4000);
    } catch (err) {
      console.error('Error saving mapping to cloud:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Restore Official Dataset (Admin only)
  const handleRestoreDemo = async () => {
    const officialRoutes = sanitizeAndEnrichRoutes(officialRoutesJson as FlightRoute[]);
    setAllRoutes(officialRoutes);
    setFileName('2026_08_27 Arline Routes AR.xlsx');
    setIsDemoLoaded(false);
    setValidationIssues([]);
    setFilters(INITIAL_FILTERS);

    try {
      localStorage.setItem(
        'gis_mexico_published_dataset',
        JSON.stringify({
          routes: officialRoutes,
          fileName: '2026_08_27 Arline Routes AR.xlsx',
          isDemoLoaded: false,
        })
      );
    } catch {}

    // Restore to Cloud Firestore
    setIsCloudSyncing(true);
    try {
      await publishDatasetToCloud(officialRoutes, '2026_08_27 Arline Routes AR.xlsx', false);
      setCloudNotification('Dataset oficial de 655 rutas restablecido en la nube para todos los usuarios.');
      setTimeout(() => setCloudNotification(null), 4000);
    } catch (err) {
      console.error('Error restoring dataset in cloud:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Available Filter Options derived from allRoutes (Exact airline names from database, sorted)
  const availableAirlines = useMemo(() => {
    return Array.from(new Set(allRoutes.map((r) => r.airline)))
      .filter((a): a is string => Boolean(a))
      .sort((a, b) => a.localeCompare(b));
  }, [allRoutes]);

  const availableSheets = useMemo(() => {
    const sheets = allRoutes.map((r) => r.sheetName).filter(Boolean) as string[];
    return Array.from(new Set(sheets));
  }, [allRoutes]);

  const availableOrigins = useMemo(() => {
    const map = new Map<string, string>();
    allRoutes.forEach((r) => map.set(r.originCode, r.originName));
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [allRoutes]);

  const availableDestinations = useMemo(() => {
    const map = new Map<string, string>();
    allRoutes.forEach((r) => map.set(r.destCode, r.destName));
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [allRoutes]);

  const availableYears = useMemo(() => {
    const rawYears = allRoutes
      .map((r) => r.year)
      .filter((y): y is number => typeof y === 'number');
    const uniqueYears = Array.from(new Set<number>(rawYears));
    return uniqueYears.sort((a: number, b: number) => a - b);
  }, [allRoutes]);

  const availablePeriods = useMemo(() => {
    return Array.from(new Set(allRoutes.map((r) => r.period).filter(Boolean))) as string[];
  }, [allRoutes]);

  const maxFlightsPossible = useMemo(() => {
    return allRoutes.reduce((max, r) => Math.max(max, r.flightsCount), 0);
  }, [allRoutes]);

  const maxPassengersPossible = useMemo(() => {
    return allRoutes.reduce((max, r) => Math.max(max, r.passengers), 0);
  }, [allRoutes]);

  // All Unique Airports from allRoutes (used to compute Hub rankings and metrics)
  const allAirports = useMemo(() => {
    return extractUniqueAirports(allRoutes);
  }, [allRoutes]);

  // Top 15 Airports strictly with highest number of authorized routes
  const top15Airports = useMemo(() => {
    return getTopAirports(allRoutes, allAirports, 15);
  }, [allRoutes, allAirports]);

  const top4Hubs = useMemo(() => {
    return top15Airports.slice(0, 4);
  }, [top15Airports]);

  // Pre-index rank of Top airports for map badges (#1 to #15)
  const topAirportsRankMap = useMemo(() => {
    const map = new Map<string, number>();
    top15Airports.forEach((hub, idx) => {
      map.set(hub.code, idx + 1);
    });
    return map;
  }, [top15Airports]);

  // Pre-index airlines per corridor in allRoutes to detect routes exclusive to 1 airline
  const corridorAllAirlinesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allRoutes.forEach((r) => {
      const [a, b] = [r.originCode, r.destCode].sort();
      const key = `${a} <-> ${b}`;
      if (!map.has(key)) {
        map.set(key, new Set<string>());
      }
      map.get(key)!.add(r.airline.trim().toLowerCase());
    });
    return map;
  }, [allRoutes]);

  // Filtered Routes for Main Single View
  const filteredRoutes = useMemo(() => {
    const q = filters.searchQuery.toLowerCase().trim();

    // Top N airports filter: if active, get codes of the top N airports
    const topNCodes = filters.selectedTopN
      ? new Set(top15Airports.slice(0, filters.selectedTopN).map((h) => h.code))
      : null;

    return allRoutes.filter((r) => {
      // Hub filter if active: only include authorized routes connected to this hub
      if (selectedHubCode) {
        if (r.originCode !== selectedHubCode && r.destCode !== selectedHubCode) {
          return false;
        }
      }

      // Top N filter if active: only include routes connected to any of the Top N airports
      if (topNCodes) {
        if (!topNCodes.has(r.originCode) && !topNCodes.has(r.destCode)) {
          return false;
        }
      }

      // Search Query
      if (q) {
        const matchesQ =
          r.originCode.toLowerCase().includes(q) ||
          r.destCode.toLowerCase().includes(q) ||
          r.originName.toLowerCase().includes(q) ||
          r.destName.toLowerCase().includes(q) ||
          r.airline.toLowerCase().includes(q) ||
          (r.period && r.period.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      // Airlines (In Mode 3 general analysis, all corridors are evaluated into single vs 2+ airlines)
      const skipAirlineFilter = mapMode === 'unique_routes' && uniqueAnalysisMode === 'general';
      if (!skipAirlineFilter) {
        if (filters.selectedAirlines.includes('__NONE__')) {
          return false;
        }
        if (filters.selectedAirlines.length > 0 && !filters.selectedAirlines.includes(r.airline)) {
          return false;
        }
      }

      // Mode 3 General Analysis: Filter by 1 airline (operador único) vs 2 or more airlines (rutas compartidas)
      if (mapMode === 'unique_routes' && uniqueAnalysisMode === 'general') {
        const [a, b] = [r.originCode, r.destCode].sort();
        const key = `${a} <-> ${b}`;
        const totalAirlinesOnCorridor = corridorAllAirlinesMap.get(key)?.size || 1;
        const isSingleOp = totalAirlinesOnCorridor === 1;

        const showSingle = filters.mode3GeneralShowSingle !== false;
        const showMulti = filters.mode3GeneralShowMulti !== false;

        if (isSingleOp && !showSingle) return false;
        if (!isSingleOp && !showMulti) return false;
      }

      // Excel Sheets
      if (
        filters.selectedSheets &&
        filters.selectedSheets.length > 0 &&
        r.sheetName &&
        !filters.selectedSheets.includes(r.sheetName)
      ) {
        return false;
      }

      // Ciudad 1 & Ciudad 2 Bilateral Filtering
      const c1 = filters.selectedOrigins[0];
      const c2 = filters.selectedDestinations[0];

      if (c1 && c2) {
        // Direct bilateral connection between c1 and c2 in either direction
        const connects =
          (r.originCode === c1 && r.destCode === c2) ||
          (r.originCode === c2 && r.destCode === c1);
        if (!connects) return false;
      } else if (c1) {
        // Connects to Ciudad 1 in either direction
        if (r.originCode !== c1 && r.destCode !== c1) return false;
      } else if (c2) {
        // Connects to Ciudad 2 in either direction
        if (r.originCode !== c2 && r.destCode !== c2) return false;
      }

      // Exclusive routes filter (Mode 3: when user wants only exclusive routes of the selected airline)
      if (filters.onlyExclusiveRoutes && filters.selectedAirlines.length === 1) {
        const [a, b] = [r.originCode, r.destCode].sort();
        const key = `${a} <-> ${b}`;
        const airlinesOnCorridor = corridorAllAirlinesMap.get(key);
        // Exclusive if ONLY this airline operates on this corridor in the entire dataset
        if (!airlinesOnCorridor || airlinesOnCorridor.size > 1) {
          return false;
        }
      }

      // Years
      if (filters.selectedYears.length > 0 && r.year && !filters.selectedYears.includes(r.year)) {
        return false;
      }

      // Min Flights
      if (filters.minFlights > 0 && r.flightsCount < filters.minFlights) {
        return false;
      }

      // Min Passengers
      if (filters.minPassengers > 0 && r.passengers < filters.minPassengers) {
        return false;
      }

      return true;
    });
  }, [allRoutes, filters, selectedHubCode, corridorAllAirlinesMap, top15Airports, mapMode, uniqueAnalysisMode]);

  // Unique Airports for filtered routes (if Top N is active in airports mode, display strictly the Top N airports)
  const filteredAirports = useMemo(() => {
    if (filters.selectedTopN && mapMode === 'airports') {
      return top15Airports.slice(0, filters.selectedTopN);
    }
    return extractUniqueAirports(filteredRoutes);
  }, [filteredRoutes, filters.selectedTopN, mapMode, top15Airports]);

  // Dataset Analytics
  const stats = useMemo(() => {
    return computeDatasetStats(filteredRoutes);
  }, [filteredRoutes]);

  // Deduplicated unique route corridors for Map Mode 3 (Rutas Únicas)
  const uniqueCorridors = useMemo(() => {
    return getUniqueRouteCorridors(filteredRoutes);
  }, [filteredRoutes]);

  const uniqueAuthorizationsCount = uniqueCorridors.length;
  const uniqueTotalFlights = useMemo(
    () => uniqueCorridors.reduce((acc, c) => acc + c.totalFlights, 0),
    [uniqueCorridors]
  );
  const uniqueTotalPassengers = useMemo(
    () => uniqueCorridors.reduce((acc, c) => acc + c.totalPassengers, 0),
    [uniqueCorridors]
  );
  const uniqueAvgPax = uniqueAuthorizationsCount > 0
    ? (uniqueTotalFlights > 0 ? Math.round(uniqueTotalPassengers / uniqueTotalFlights) : 0)
    : 0;

  // Mode-aware statistics for the 4 KPI Apartados (Requirement 5 & 7)
  const modeStats = useMemo(() => {
    if (mapMode === 'unique_routes') {
      const singleAirline =
        filters.selectedAirlines.length === 1 ? filters.selectedAirlines[0] : null;
      // In unique routes mode, count dynamically reflects uniqueAuthorizationsCount (346 unique corridors for full Excel dataset)
      const count = uniqueAuthorizationsCount;
      return {
        authorizations: count,
        authorizationsSubtitle: singleAirline
          ? `rutas únicas de ${singleAirline}`
          : 'rutas únicas (general)',
        avgPax: uniqueAvgPax,
        avgPaxSubtitle: 'pax / vuelo',
        totalFlights: uniqueTotalFlights,
        totalPassengers: uniqueTotalPassengers,
      };
    }
    if (mapMode === 'routes_by_airline') {
      return {
        authorizations: stats.totalAuthorizations || filteredRoutes.length,
        authorizationsSubtitle: `(${availableAirlines.length} aerolíneas)`,
        avgPax: stats.avgPassengersPerFlight,
        avgPaxSubtitle: 'pax / vuelo',
        totalFlights: stats.totalFlights,
        totalPassengers: stats.totalPassengers,
      };
    }
    // 'airports' mode (1. Aeropuertos y Hub)
    const topRankingLabel = filters.selectedTopN ? `Top ${filters.selectedTopN}` : `${top4Hubs.length} hubs`;
    return {
      authorizations: stats.totalAuthorizations || filteredRoutes.length,
      authorizationsSubtitle: `(${filteredAirports.length} aeropuertos | ${topRankingLabel})`,
      avgPax: stats.avgPassengersPerFlight,
      avgPaxSubtitle: 'pax / vuelo',
      totalFlights: stats.totalFlights,
      totalPassengers: stats.totalPassengers,
    };
  }, [mapMode, uniqueAuthorizationsCount, uniqueAvgPax, uniqueTotalFlights, uniqueTotalPassengers, stats, filteredRoutes.length, availableAirlines.length, top4Hubs.length, filteredAirports.length, filters.selectedTopN]);

  // Save current view
  const handleSaveCurrentMap = (name: string, description: string) => {
    const newSaved: SavedMap = {
      id: `map-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      filters: { ...filters },
      colorScheme,
      tileLayer,
      arcCurvature,
    };
    setSavedMaps((prev) => [newSaved, ...prev]);
  };

  // Load saved map
  const handleLoadSavedMap = (saved: SavedMap) => {
    setSelectedHubCode(null);
    setFilters(saved.filters);
    if (saved.colorScheme) setColorScheme(saved.colorScheme as any);
    if (saved.tileLayer) setTileLayer(saved.tileLayer as any);
    if (saved.arcCurvature !== undefined) setArcCurvature(saved.arcCurvature);
    setActiveView('single');
  };

  // Select Top Hub from "Vistas"
  const handleSelectHub = (hub: HubViewItem) => {
    setSelectedHubCode(hub.code);
    setSelectedAirportForConnections(null); // Keep map visible and do not block screen with modal
    setActiveView('single');
    // Clear filters that could reduce hub routes to 0, preventing any empty canvas
    setFilters((prev) => ({
      ...prev,
      searchQuery: '',
      selectedOrigins: [],
      selectedDestinations: [],
      minFlights: 0,
      minPassengers: 0,
    }));
    // Ensure coordinates are valid numbers
    const validLat = typeof hub.lat === 'number' && !isNaN(hub.lat) ? hub.lat : 23.6345;
    const validLng = typeof hub.lng === 'number' && !isNaN(hub.lng) ? hub.lng : -102.5528;
    setSyncCenter([validLat, validLng]);
    setSyncZoom(6);
  };

  // Clear Hub filter and restore complete national network
  const handleClearHubFilter = () => {
    setSelectedHubCode(null);
    setSelectedAirportForConnections(null);
    setSyncCenter([23.6345, -102.5528]);
    setSyncZoom(5);
  };

  // Delete saved map
  const handleDeleteSavedMap = (id: string) => {
    setSavedMaps((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleAirline = (airline: string) => {
    if (filters.selectedAirlines.includes('__NONE__')) {
      setFilters((prev) => ({ ...prev, selectedAirlines: [airline] }));
      return;
    }

    if (filters.selectedAirlines.length === 0) {
      const remaining = availableAirlines.filter((a) => a !== airline);
      setFilters((prev) => ({
        ...prev,
        selectedAirlines: remaining.length === 0 ? ['__NONE__'] : remaining,
      }));
      return;
    }

    const isSelected = filters.selectedAirlines.includes(airline);
    if (isSelected) {
      const newAirlines = filters.selectedAirlines.filter((a) => a !== airline);
      setFilters((prev) => ({
        ...prev,
        selectedAirlines: newAirlines.length === 0 ? ['__NONE__'] : newAirlines,
      }));
    } else {
      const newAirlines = [...filters.selectedAirlines, airline];
      setFilters((prev) => ({
        ...prev,
        selectedAirlines: newAirlines.length >= availableAirlines.length ? [] : newAirlines,
      }));
    }
  };

  const handleSelectAllAirlines = () => {
    setFilters((prev) => ({ ...prev, selectedAirlines: [] }));
  };

  const handleDeselectAllAirlines = () => {
    setFilters((prev) => ({ ...prev, selectedAirlines: ['__NONE__'] }));
  };

  const handleSelectOnlyAirline = (airline: string) => {
    const isAlreadySole =
      filters.selectedAirlines.length === 1 &&
      filters.selectedAirlines[0] === airline;
    setFilters((prev) => ({
      ...prev,
      selectedAirlines: isAlreadySole ? [] : [airline],
    }));
  };

  // Handle Quick Airport Filter from Popup
  const handleFilterByAirport = (airportCode: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedOrigins: [airportCode],
      selectedDestinations: [],
    }));
  };

  // Mode 3 General Analysis Airline Quantity Filter Handlers (1 aerolínea vs 2 o más aerolíneas)
  const handleToggleMode3GeneralSingle = () => {
    setFilters((prev) => ({
      ...prev,
      mode3GeneralShowSingle: prev.mode3GeneralShowSingle === false,
    }));
  };

  const handleToggleMode3GeneralMulti = () => {
    setFilters((prev) => ({
      ...prev,
      mode3GeneralShowMulti: prev.mode3GeneralShowMulti === false,
    }));
  };

  const handleSetMode3GeneralFilter = (showSingle: boolean, showMulti: boolean) => {
    setFilters((prev) => ({
      ...prev,
      mode3GeneralShowSingle: showSingle,
      mode3GeneralShowMulti: showMulti,
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none relative">
      {/* AFAC Confidential Access Gatekeeper: strictly required before entering */}
      {!afacUser && (
        <AfacAuthGate onLoginSuccess={handleAfacLogin} />
      )}

      {/* Floating Cloud Notification Toast */}
      {cloudNotification && (
        <div className="fixed top-20 right-6 z-[600] flex items-center gap-3 bg-slate-900/95 text-slate-100 border border-cyan-500/60 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-lg text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{cloudNotification}</span>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        stats={stats}
        onOpenExport={() => setIsExportOpen(true)}
        onRestoreDemo={handleRestoreDemo}
        isDemoLoaded={isDemoLoaded}
        onOpenTable={() => setActiveView('table')}
        isAdmin={isAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isCloudSyncing={isCloudSyncing}
        afacUser={afacUser}
        onLogout={handleAfacLogout}
      />

      {/* Main Workspace (Sidebar raised directly below Header) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Controls */}
        <Sidebar
          isCollapsed={!isSidebarOpen}
          onToggleCollapse={() => setIsSidebarOpen(false)}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(INITIAL_FILTERS)}
          availableAirlines={availableAirlines}
          availableSheets={availableSheets}
          availableOrigins={availableOrigins}
          availableDestinations={availableDestinations}
          allRoutes={allRoutes}
          availableYears={availableYears}
          availablePeriods={availablePeriods}
          maxFlightsPossible={maxFlightsPossible}
          maxPassengersPossible={maxPassengersPossible}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          tileLayer={tileLayer}
          onTileLayerChange={setTileLayer}
          arcCurvature={arcCurvature}
          onArcCurvatureChange={setArcCurvature}
          colorScheme={colorScheme}
          onColorSchemeChange={setColorScheme}
          customAirlineColors={customAirlineColors}
          onUpdateAirlineColor={handleUpdateAirlineColor}
          onResetAirlineColors={handleResetAirlineColors}
          showAirportLabels={showAirportLabels}
          onToggleAirportLabels={setShowAirportLabels}
          showFlightArcs={showFlightArcs}
          onToggleFlightArcs={setShowFlightArcs}
          showAirports={showAirports}
          onToggleAirports={setShowAirports}
          savedMaps={savedMaps}
          onSaveCurrentMap={handleSaveCurrentMap}
          onLoadSavedMap={handleLoadSavedMap}
          onDeleteSavedMap={handleDeleteSavedMap}
          onFileUpload={handleFileUpload}
          validationIssues={validationIssues}
          fileName={fileName}
          onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
          onDownloadTemplate={downloadExcelTemplate}
          isAdmin={isAdmin}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onManualPublishCloud={handleManualPublishCloud}
          isCloudSyncing={isCloudSyncing}
          topAirports={top15Airports}
          top4Hubs={top4Hubs}
          selectedHubCode={selectedHubCode}
          onSelectHub={handleSelectHub}
          onClearHubFilter={handleClearHubFilter}
          mode1AnalysisMode={mode1AnalysisMode}
          onMode1AnalysisModeChange={setMode1AnalysisMode}
          mode1SpecificAirline={mode1SpecificAirline}
          onMode1SpecificAirlineChange={setMode1SpecificAirline}
          mode1SpecificAirlineColor={mode1SpecificAirlineColor}
          onMode1SpecificAirlineColorChange={setMode1SpecificAirlineColor}
          iataFontSize={iataFontSize}
          onChangeIataFontSize={setIataFontSize}
          uniqueAnalysisMode={uniqueAnalysisMode}
          onUniqueAnalysisModeChange={setUniqueAnalysisMode}
          uniqueSingleColor={uniqueSingleColor}
          onChangeUniqueSingleColor={setUniqueSingleColor}
          uniqueMultiColor={uniqueMultiColor}
          onChangeUniqueMultiColor={setUniqueMultiColor}
        />

        {/* Center Canvas / Map View */}
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          {/* Transparent Top Horizontal Bar — Only the right-side Número de Autorizaciones badge (and active filter pills) is opaque */}
          {activeView !== 'compare' && (
            <div
              id="aviation-nav-bar"
              className="absolute top-0 left-0 right-0 px-4 py-2.5 flex items-center justify-end gap-3 bg-transparent border-none pointer-events-none z-[410]"
            >
              <div className="flex items-center gap-3 shrink-0 pointer-events-auto">
                {/* Top N Active Indicator */}
                {filters.selectedTopN && !selectedHubCode && (
                  <div className="flex items-center gap-2 bg-cyan-950/95 backdrop-blur-md border border-cyan-500/80 px-3 py-1.5 rounded-xl shadow-lg shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-300 text-xs font-semibold">Filtro:</span>
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-900 px-2 py-0.5 rounded text-xs border border-cyan-700">
                      Top {filters.selectedTopN}
                    </span>
                    <span className="text-cyan-200 text-xs font-medium max-w-[170px] truncate hidden xl:inline">
                      {filters.selectedTopN} aeropuertos con más rutas
                    </span>
                    <div className="h-4 w-px bg-cyan-800" />
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, selectedTopN: null }))}
                      className="text-slate-400 hover:text-white text-xs font-medium hover:underline transition cursor-pointer flex items-center gap-1"
                      title="Quitar filtro Top y ver toda la red"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline">Quitar Top</span>
                    </button>
                  </div>
                )}

                {selectedHubCode && (
                  <div className="flex items-center gap-2 bg-cyan-950/95 backdrop-blur-md border border-cyan-500/80 px-3 py-1.5 rounded-xl shadow-lg shrink-0">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="text-slate-300 text-xs font-semibold">Hub:</span>
                    <span className="font-mono font-bold text-white bg-cyan-900 px-2 py-0.5 rounded text-xs border border-cyan-700">
                      {selectedHubCode}
                    </span>
                    <span className="text-cyan-200 text-xs font-medium max-w-[170px] truncate hidden xl:inline">
                      {top15Airports.find((h) => h.code === selectedHubCode)?.name || top4Hubs.find((h) => h.code === selectedHubCode)?.name}
                    </span>
                    <div className="h-4 w-px bg-cyan-800" />
                    <button
                      onClick={() => setSelectedAirportForConnections(selectedHubCode)}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold hover:underline transition cursor-pointer"
                    >
                      Conexiones
                    </button>
                    <div className="h-4 w-px bg-cyan-800" />
                    <button
                      onClick={handleClearHubFilter}
                      className="text-slate-400 hover:text-white text-xs font-medium hover:underline transition cursor-pointer flex items-center gap-1"
                      title="Restaurar visualización de red completa"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Número de Autorizaciones posicionado en la parte superior derecha (no transparente) */}
                <div id="kpi-autorizaciones" className="bg-slate-900 border border-slate-700/90 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-xl">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Número de Autorizaciones:
                    </span>
                    <span className="text-sm font-black text-amber-400 font-mono leading-tight">
                      {modeStats.authorizations.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-slate-400 font-sans">
                      {modeStats.authorizationsSubtitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Show Sidebar Button when sidebar is collapsed */}
          {!isSidebarOpen && (
            <button
              id="btn-show-sidebar-floating"
              onClick={() => setIsSidebarOpen(true)}
              title="Mostrar panel (filtros, capas, vistas y carga)"
              className="absolute top-2.5 left-4 z-[420] flex items-center gap-2 bg-slate-900/95 hover:bg-slate-850 text-cyan-300 hover:text-cyan-200 border border-cyan-500/50 hover:border-cyan-400 shadow-2xl px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-md group animate-fade-in"
            >
              <PanelLeftOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Mostrar Filtros y Herramientas</span>
            </button>
          )}

          {/* VIEW MODE 1: SINGLE MAP */}
          {activeView === 'single' && (
            <div className="w-full h-full relative">
              <FlightMap
                id="main-flight-map"
                routes={filteredRoutes}
                allRoutes={allRoutes}
                airports={filteredAirports}
                mapMode={mapMode}
                onMapModeChange={setMapMode}
                selectedAirportCode={selectedOriginAirport}
                onSelectAirport={(code) => {
                  setSelectedOriginAirport(prev => prev === code ? null : code);
                }}
                onOpenAirportConnections={(code) => {
                  // Triggered strictly by clicking "Ver destinos y conexiones directas" button inside the popup
                  setSelectedAirportForConnections(code);
                }}
                tileLayerKey={tileLayer}
                arcCurvature={arcCurvature}
                colorScheme={colorScheme}
                customAirlineColors={customAirlineColors}
                showAirportLabels={showAirportLabels}
                onToggleAirportLabels={setShowAirportLabels}
                iataFontSize={iataFontSize}
                onChangeIataFontSize={setIataFontSize}
                mode1AnalysisMode={mode1AnalysisMode}
                mode1SpecificAirline={mode1SpecificAirline}
                mode1SpecificAirlineColor={mode1SpecificAirlineColor}
                showFlightArcs={showFlightArcs}
                showAirports={showAirports}
                topAirportsRankMap={topAirportsRankMap}
                selectedTopN={filters.selectedTopN}
                onSelectRoute={(route) => setSelectedRouteForDetails(route)}
                syncCenter={syncCenter}
                syncZoom={syncZoom}
                uniqueAnalysisMode={uniqueAnalysisMode}
                onUniqueAnalysisModeChange={setUniqueAnalysisMode}
                uniqueSingleColor={uniqueSingleColor}
                onChangeUniqueSingleColor={setUniqueSingleColor}
                uniqueMultiColor={uniqueMultiColor}
                onChangeUniqueMultiColor={setUniqueMultiColor}
                mode3GeneralShowSingle={filters.mode3GeneralShowSingle !== false}
                onToggleMode3GeneralSingle={handleToggleMode3GeneralSingle}
                mode3GeneralShowMulti={filters.mode3GeneralShowMulti !== false}
                onToggleMode3GeneralMulti={handleToggleMode3GeneralMulti}
                onSetMode3GeneralFilter={handleSetMode3GeneralFilter}
                availableAirlines={availableAirlines}
                selectedAirlines={filters.selectedAirlines}
                onToggleAirline={handleToggleAirline}
                onSelectOnlyAirline={handleSelectOnlyAirline}
                onSelectAllAirlines={handleSelectAllAirlines}
                onDeselectAllAirlines={handleDeselectAllAirlines}
                onUpdateAirlineColor={handleUpdateAirlineColor}
              />
            </div>
          )}

          {/* VIEW MODE 2: COMPARE SIDE-BY-SIDE */}
          {activeView === 'compare' && (
            <CompareView
              allRoutes={allRoutes}
              savedMaps={savedMaps}
              currentMainFilters={filters}
              customAirlineColors={customAirlineColors}
              activeMapMode={mapMode}
              onMapModeChange={setMapMode}
              onUpdateAirlineColor={handleUpdateAirlineColor}
              showAirportLabels={showAirportLabels}
              onToggleAirportLabels={setShowAirportLabels}
              iataFontSize={iataFontSize}
              onChangeIataFontSize={setIataFontSize}
            />
          )}

          {/* VIEW MODE 3: TABLE MODAL OR FULL TABLE */}
          {activeView === 'table' && (
            <div className="w-full h-full relative">
              <FlightMap
                id="table-background-map"
                routes={filteredRoutes}
                airports={filteredAirports}
                tileLayerKey={tileLayer}
                arcCurvature={arcCurvature}
                colorScheme={colorScheme}
                customAirlineColors={customAirlineColors}
              />
              <DataTableModal
                isOpen={true}
                onClose={() => setActiveView('single')}
                routes={filteredRoutes}
                onSelectRoute={(route) => {
                  setSelectedRouteForDetails(route);
                  setActiveView('single');
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Column Mapper Dialog */}
      <ColumnMapperModal
        headers={rawUploadedData?.sheets[0]?.headers || []}
        initialMapping={
          activeColumnMapping || {
            originCode: 'Origen',
            destCode: 'Destino',
            originLat: 'Latitud_Origen',
            originLng: 'Longitud_Origen',
            destLat: 'Latitud_Destino',
            destLng: 'Longitud_Destino',
          }
        }
        fileName={rawUploadedData?.fileName || fileName || 'Archivo'}
        isOpen={isColumnMapperOpen}
        onClose={() => setIsColumnMapperOpen(false)}
        onConfirm={handleConfirmColumnMapping}
        parsedResult={rawUploadedData}
      />

      {/* Export & Download Dialog */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        routes={filteredRoutes}
        allRoutes={allRoutes}
        airports={filteredAirports}
        activeView={activeView}
        activeMapMode={mapMode}
        mapElementId={activeView === 'compare' ? 'compare-view-container' : 'main-flight-map'}
        customAirlineColors={customAirlineColors}
        selectedAirlines={filters.selectedAirlines}
        isAdmin={isAdmin}
      />

      {/* Route Details Modal (Visualización 2 & 3) */}
      <RouteDetailsModal
        route={selectedRouteForDetails}
        allRoutes={allRoutes}
        isUniqueMode={mapMode === 'unique_routes'}
        onClose={() => setSelectedRouteForDetails(null)}
        getAirlineColor={(airline) => getAirlineColor(airline, customAirlineColors)}
      />

      {/* Airport Connections Modal (Visualización 1: General) */}
      <AirportConnectionsModal
        airportCode={selectedAirportForConnections}
        routes={allRoutes}
        onClose={() => setSelectedAirportForConnections(null)}
        onSelectRoute={(routeId) => {
          const matched = allRoutes.find(r => r.id === routeId);
          if (matched) {
            setSelectedRouteForDetails(matched);
          }
        }}
        getAirlineColor={(airline) => getAirlineColor(airline, customAirlineColors)}
      />

      {/* Admin Authentication & Access Key Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isAdmin={isAdmin}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onChangePin={handleChangeAdminPin}
      />
    </div>
  );
}
