export interface Airport {
  code: string; // IATA (e.g. MEX, CUN)
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  totalFlights?: number;
  totalPassengers?: number;
  incomingRoutes?: number;
  outgoingRoutes?: number;
}

export interface FlightRoute {
  id: string;
  originCode: string;
  originName: string;
  originCity?: string;
  originState?: string;
  originLat: number;
  originLng: number;
  destCode: string;
  destName: string;
  destCity?: string;
  destState?: string;
  destLat: number;
  destLng: number;
  airline: string;
  sheetName?: string; // Originating Excel sheet tab (e.g. "Aeroméxico", "Volaris")
  flightNumber?: string;
  aircraft?: string;
  flightsCount: number;
  passengers: number;
  period?: string; // e.g. "2024", "2025", "2024-Q1", "2025-Ene"
  month?: string;
  year?: number;
  authorizationDate?: string; // Fecha de autorización de la ruta
  distanceKm: number;
  distanceNm: number;
  flightType: 'Nacional' | 'Internacional';
  extraData?: Record<string, any>;
}

export type MapVisualizationMode = 'airports' | 'routes_by_airline' | 'unique_routes';

export type UniqueRoutesAnalysisMode = 'general' | 'specific';

export interface RouteAirlineOperator {
  airline: string;
  authorizationDate?: string;
  flightsCount: number;
  passengers: number;
  aircraft?: string;
  flightNumber?: string;
  period?: string;
  year?: number;
  routeId: string;
}

export interface UniqueRouteCorridor {
  corridorKey: string; // e.g. "MEX-CUN"
  originCode: string;
  originName: string;
  originCity?: string;
  originState?: string;
  originLat: number;
  originLng: number;
  destCode: string;
  destName: string;
  destCity?: string;
  destState?: string;
  destLat: number;
  destLng: number;
  distanceKm: number;
  distanceNm: number;
  flightType: 'Nacional' | 'Internacional';
  totalFlights: number;
  totalPassengers: number;
  airlines: RouteAirlineOperator[];
}

export interface AirportConnectionDetail {
  destCode: string;
  destName: string;
  destCity?: string;
  destState?: string;
  destLat: number;
  destLng: number;
  distanceKm: number;
  distanceNm: number;
  flightType: 'Nacional' | 'Internacional';
  airlines: RouteAirlineOperator[];
  totalFlights: number;
  totalPassengers: number;
}

export interface FilterOptions {
  airlines: string[];
  sheets: string[];
  origins: string[];
  destinations: string[];
  periods: string[];
  years: number[];
  states: string[];
  flightTypes: ('Nacional' | 'Internacional')[];
  minFlights: number;
  maxFlights: number;
  minPassengers: number;
  maxPassengers: number;
  searchQuery: string;
}

export interface FilterState {
  selectedAirlines: string[];
  selectedSheets: string[];
  selectedOrigins: string[];
  selectedDestinations: string[];
  selectedPeriods: string[];
  selectedYears: number[];
  selectedFlightTypes: ('Nacional' | 'Internacional')[];
  minFlights: number;
  minPassengers: number;
  searchQuery: string;
  onlyExclusiveRoutes?: boolean;
  selectedTopN?: number | null;
  uniqueRoutesAnalysisMode?: UniqueRoutesAnalysisMode;
  mode1AnalysisMode?: 'standard' | 'specific';
  mode1SpecificAirline?: string;
  mode1SpecificAirlineColor?: string;
  mode3GeneralShowSingle?: boolean;
  mode3GeneralShowMulti?: boolean;
}

export interface SavedMap {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filters: FilterState;
  colorScheme: string;
  tileLayer: string;
  arcCurvature: number;
}

export interface ColumnMapping {
  originCode: string;
  originName: string;
  originLat: string;
  originLng: string;
  originState?: string;
  destCode: string;
  destName: string;
  destLat: string;
  destLng: string;
  destState?: string;
  airline?: string;
  flightsCount?: string;
  passengers?: string;
  period?: string;
  year?: string;
  aircraft?: string;
  authorizationDate?: string;
}

export interface ValidationIssue {
  row: number;
  type: 'error' | 'warning';
  message: string;
}

export interface DatasetStats {
  totalRoutes: number;
  totalAuthorizations: number; // Número de Autorizaciones
  totalOperations: number; // Fallback / operaciones
  avgPassengersPerFlight: number; // Número de Pasajeros por vuelo
  totalFlights: number; // Total de Vuelos
  totalPassengers: number; // Total de Pasajeros
  uniqueOrigins: number;
  uniqueDestinations: number;
  totalAirports: number;
  totalDistanceKm: number;
  topAirline: string;
  topRoute: string;
  topAirport: string;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: any[];
  rowCount: number;
  detectedAirline?: string;
  mapping?: ColumnMapping;
}

export interface ParsedFileResult {
  fileName: string;
  sheets: ParsedSheet[];
  activeSheetNames: string[];
  isMultiSheet: boolean;
}

export interface AfacAuthUser {
  email: string;
  fullName?: string;
  department?: string;
  role?: 'funcionario' | 'analista' | 'director' | 'administrador';
  loginTimestamp: string;
}

export interface HubViewItem {
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  authorizedRoutesCount: number;
  destinationsCount: number;
  airlinesCount: number;
  totalFlights: number;
  airlinesList: string[];
}

