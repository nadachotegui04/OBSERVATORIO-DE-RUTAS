import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plane, Calendar, Building2, MapPin, ArrowUpRight, Users, Navigation, ShieldCheck, CheckCircle2, Filter, Layers, ChevronRight, Hash, Activity } from 'lucide-react';
import { FlightRoute, AirportConnectionDetail } from '../types';
import { getAirportConnections } from '../utils/dataParser';
import { resolveAirport, findAirportByCoordinates } from '../data/mexicoDemoData';

interface AirportConnectionsModalProps {
  airportCode: string | null;
  routes: FlightRoute[];
  onClose: () => void;
  onSelectRoute?: (routeId: string) => void;
  getAirlineColor?: (airline: string) => string;
  initialTab?: 'destinations' | 'airlines';
}

export const AirportConnectionsModal: React.FC<AirportConnectionsModalProps> = ({
  airportCode,
  routes,
  onClose,
  onSelectRoute,
  getAirlineColor,
  initialTab = 'destinations',
}) => {
  const [activeTab, setActiveTab] = useState<'destinations' | 'airlines'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Nacional' | 'Internacional'>('all');
  const [selectedAirlineFilter, setSelectedAirlineFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'count_desc' | 'airline_asc' | 'date_desc' | 'date_asc'>('count_desc');

  // Sync initialTab when props change
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, airportCode]);

  const airportInfo = useMemo(() => {
    if (!airportCode) return null;
    let resolved = resolveAirport(airportCode);
    if (!resolved) {
      const matchRoute = routes.find(r => r.originCode === airportCode || r.destCode === airportCode);
      if (matchRoute) {
        const isOrig = matchRoute.originCode === airportCode;
        const rLat = isOrig ? matchRoute.originLat : matchRoute.destLat;
        const rLng = isOrig ? matchRoute.originLng : matchRoute.destLng;
        resolved = resolveAirport(airportCode, rLat, rLng) || findAirportByCoordinates(rLat, rLng);
      }
    }
    return resolved;
  }, [airportCode, routes]);

  const displayCode = (airportInfo?.code || airportCode || '').trim().toUpperCase();

  // All routes linked to this airport (origin or destination)
  const airportRoutes = useMemo(() => {
    if (!airportCode) return [];
    const code = airportCode.trim().toUpperCase();
    return routes.filter(r => {
      const orig = (r.originCode || '').trim().toUpperCase();
      const dest = (r.destCode || '').trim().toUpperCase();
      return orig === code || dest === code;
    });
  }, [airportCode, routes]);

  // Direct connections (destinations)
  const connections: AirportConnectionDetail[] = useMemo(() => {
    if (!airportCode) return [];
    return getAirportConnections(airportCode, routes);
  }, [airportCode, routes]);

  // Filtered connections for Tab 1 (Destinations)
  const filteredConnections = useMemo(() => {
    return connections.filter(conn => {
      const matchesSearch =
        conn.destCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conn.destName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conn.destCity && conn.destCity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        conn.airlines.some(a => a.airline.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'all' || conn.flightType === filterType;

      return matchesSearch && matchesType;
    });
  }, [connections, searchTerm, filterType]);

  // Aggregated breakdown by airline for Tab 2 (Airlines & Authorizations)
  const airlineAuthorizationsData = useMemo(() => {
    const code = displayCode;
    const map = new Map<string, {
      airline: string;
      totalAuthorizations: number;
      destinations: Set<string>;
      routes: Array<{
        routeId: string;
        otherCode: string;
        otherName: string;
        otherCity?: string;
        otherState?: string;
        authorizationDate?: string;
        flightType: 'Nacional' | 'Internacional';
        aircraft?: string;
        flightNumber?: string;
        flightsCount: number;
        passengers: number;
        distanceKm: number;
      }>;
    }>();

    airportRoutes.forEach(r => {
      const aName = (r.airline || 'General').trim();
      if (!map.has(aName)) {
        map.set(aName, {
          airline: aName,
          totalAuthorizations: 0,
          destinations: new Set<string>(),
          routes: [],
        });
      }

      const item = map.get(aName)!;
      item.totalAuthorizations += 1;

      const isOrig = (r.originCode || '').trim().toUpperCase() === code;
      const otherCode = isOrig ? r.destCode : r.originCode;
      const otherName = isOrig ? r.destName : r.originName;
      const otherCity = isOrig ? r.destCity : r.originCity;
      const otherState = isOrig ? r.destState : r.originState;

      item.destinations.add(otherCode);
      item.routes.push({
        routeId: r.id,
        otherCode,
        otherName,
        otherCity,
        otherState,
        authorizationDate: r.authorizationDate,
        flightType: r.flightType,
        aircraft: r.aircraft,
        flightNumber: r.flightNumber,
        flightsCount: r.flightsCount,
        passengers: r.passengers,
        distanceKm: r.distanceKm,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalAuthorizations - a.totalAuthorizations || a.airline.localeCompare(b.airline));
  }, [airportRoutes, displayCode]);

  // Filtered airlines for Tab 2
  const filteredAirlineGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return airlineAuthorizationsData
      .filter(group => {
        if (selectedAirlineFilter !== 'all' && group.airline !== selectedAirlineFilter) {
          return false;
        }

        if (!q) return true;

        const matchesAirline = group.airline.toLowerCase().includes(q);
        const matchesAnyRoute = group.routes.some(r =>
          r.otherCode.toLowerCase().includes(q) ||
          r.otherName.toLowerCase().includes(q) ||
          (r.otherCity && r.otherCity.toLowerCase().includes(q)) ||
          (r.authorizationDate && r.authorizationDate.toLowerCase().includes(q))
        );

        return matchesAirline || matchesAnyRoute;
      })
      .map(group => {
        // Filter routes within group if query exists
        let groupRoutes = group.routes;
        if (q) {
          groupRoutes = groupRoutes.filter(r =>
            group.airline.toLowerCase().includes(q) ||
            r.otherCode.toLowerCase().includes(q) ||
            r.otherName.toLowerCase().includes(q) ||
            (r.otherCity && r.otherCity.toLowerCase().includes(q)) ||
            (r.authorizationDate && r.authorizationDate.toLowerCase().includes(q))
          );
        }

        // Apply sort to routes
        if (sortOption === 'date_desc') {
          groupRoutes = [...groupRoutes].sort((a, b) => (b.authorizationDate || '').localeCompare(a.authorizationDate || ''));
        } else if (sortOption === 'date_asc') {
          groupRoutes = [...groupRoutes].sort((a, b) => (a.authorizationDate || '9999').localeCompare(b.authorizationDate || '9999'));
        } else {
          groupRoutes = [...groupRoutes].sort((a, b) => a.otherCode.localeCompare(b.otherCode));
        }

        return {
          ...group,
          filteredRoutes: groupRoutes,
        };
      })
      .filter(g => g.filteredRoutes.length > 0);
  }, [airlineAuthorizationsData, selectedAirlineFilter, searchTerm, sortOption]);

  const uniqueAirlines = useMemo(() => {
    return airlineAuthorizationsData.map(a => a.airline);
  }, [airlineAuthorizationsData]);

  if (!airportCode) return null;

  const defaultColor = (airline: string) => {
    if (getAirlineColor) return getAirlineColor(airline);
    return '#06b6d4';
  };

  return (
    <div
      id="airport-connections-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-[96vw] max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-start justify-between relative">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-black text-2xl shrink-0 shadow-lg shadow-cyan-500/10">
              {displayCode}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 px-3 py-0.5 rounded-full border border-cyan-800/80">
                  Ficha Aeroportuaria y Conexiones
                </span>
                {airportInfo?.hub && (
                  <span className="text-[11px] font-semibold bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-800/70">
                    Hub Nacional
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                {airportInfo?.name || `Aeropuerto ${displayCode}`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-1 font-medium">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{airportInfo?.city || displayCode}, {airportInfo?.state || 'México'}</span>
                <span className="text-cyan-300 font-mono font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-xs">
                  IATA: {displayCode}
                </span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-airport-connections"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (Pestaña 1: Destinos | Pestaña 2: Aerolíneas y Autorizaciones) */}
        <div className="bg-slate-950 px-5 pt-2.5 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-3">
            <button
              id="tab-btn-destinations"
              type="button"
              onClick={() => setActiveTab('destinations')}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'destinations'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/90 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Destinos y Conexiones Directas</span>
              <span className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">
                {connections.length}
              </span>
            </button>

            <button
              id="tab-btn-airlines"
              type="button"
              onClick={() => setActiveTab('airlines')}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'airlines'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/90 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Aerolíneas y Autorizaciones</span>
              <span className="ml-1 text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                {airportRoutes.length} aut.
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 pb-2.5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              Total Autorizaciones: <strong className="text-white font-mono text-sm">{airportRoutes.length}</strong>
            </span>
          </div>
        </div>

        {/* Airport Quick Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total de Autorizaciones</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{airportRoutes.length}</span>
              <span className="text-xs text-slate-300 font-medium">rutas oficiales</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Aerolíneas con Conexión</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">{uniqueAirlines.length}</span>
              <span className="text-xs text-slate-300 font-medium">autorizadas</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Destinos Directos</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">{connections.length}</span>
              <span className="text-xs text-slate-300 font-medium">aeropuertos</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Aerolínea con más autorizaciones</span>
            <div className="mt-1">
              <span className="text-sm sm:text-base font-black text-emerald-400 truncate block" title={airlineAuthorizationsData[0]?.airline || 'N/A'}>
                {airlineAuthorizationsData[0]?.airline || 'N/A'}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {airlineAuthorizationsData[0]?.totalAuthorizations || 0} autorizaciones vigentes
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-airport-modal"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'destinations'
                  ? 'Buscar por destino o aerolínea (ej. Cancún, CUN, Volaris)...'
                  : 'Buscar aerolínea, fecha de autorización o tramo (ej. Aeroméxico, 1998, CUN)...'
              }
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {activeTab === 'destinations' ? (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({connections.length})
              </button>
              <button
                onClick={() => setFilterType('Nacional')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterType === 'Nacional'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Nacionales
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Ordenar:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="count_desc" className="bg-slate-900 text-white">Más autorizaciones</option>
                  <option value="date_desc" className="bg-slate-900 text-white">Fecha más reciente</option>
                  <option value="date_asc" className="bg-slate-900 text-white">Fecha más antigua</option>
                  <option value="airline_asc" className="bg-slate-900 text-white">Aerolínea A-Z</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tab 2 Filter by Airline Pills */}
        {activeTab === 'airlines' && airlineAuthorizationsData.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filtrar Aerolínea:
            </span>
            <button
              onClick={() => setSelectedAirlineFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
                selectedAirlineFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Todas ({airportRoutes.length})
            </button>
            {airlineAuthorizationsData.map(group => {
              const aColor = defaultColor(group.airline);
              const isSelected = selectedAirlineFilter === group.airline;
              return (
                <button
                  key={group.airline}
                  onClick={() => setSelectedAirlineFilter(group.airline)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aColor }}></span>
                  <span>{group.airline}</span>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                    {group.totalAuthorizations}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body (Amplio, espacioso y perfectamente legible) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
          {/* ======================================================== */}
          {/* TAB 1: DESTINOS Y CONEXIONES DIRECTAS                    */}
          {/* ======================================================== */}
          {activeTab === 'destinations' && (
            <div className="space-y-4">
              {filteredConnections.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                  <p className="text-base font-bold text-slate-200">No se encontraron destinos coincidentes</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o cambia el filtro de tipo de vuelo.</p>
                </div>
              ) : (
                filteredConnections.map(conn => {
                  const destAirportInfo = resolveAirport(conn.destCode);
                  return (
                    <div
                      key={conn.destCode}
                      className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 transition shadow-sm"
                    >
                      {/* Destination Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 text-cyan-300 font-mono font-black text-base flex items-center justify-center shrink-0 shadow-inner">
                            {conn.destCode}
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-base font-extrabold text-white">
                                {conn.destCity || destAirportInfo?.city || conn.destName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  conn.flightType === 'Nacional'
                                    ? 'bg-sky-950/80 text-sky-400 border-sky-800/60'
                                    : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                                }`}
                              >
                                {conn.flightType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {conn.destName} • {destAirportInfo?.state || 'México'}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                          <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono">
                            {Math.round(conn.distanceKm).toLocaleString()} km
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {Math.round(conn.distanceNm).toLocaleString()} NM
                          </div>
                        </div>
                      </div>

                      {/* Airlines operating on this connection */}
                      <div className="mt-3.5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                          <span>Aerolíneas con autorización en esta conexión ({conn.airlines.length})</span>
                          <span className="text-cyan-400 font-semibold lowercase">
                            {conn.airlines.length} autorizada{conn.airlines.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {conn.airlines.map(op => {
                            const color = defaultColor(op.airline);
                            return (
                              <div
                                key={op.routeId}
                                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm"
                              >
                                <div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/30"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="text-xs font-bold text-white truncate" title={op.airline}>
                                      {op.airline}
                                    </span>
                                  </div>

                                  {/* Fecha de autorización clara */}
                                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                    <span className="text-[10.5px] text-slate-400">Fecha autorización:</span>
                                    {op.authorizationDate ? (
                                      <span className="text-[11px] text-emerald-300 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-emerald-400" />
                                        {op.authorizationDate}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                        Registrada
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                                  <span>
                                    {op.aircraft ? `${op.aircraft} • ` : ''}
                                    {op.flightsCount.toLocaleString()} ops
                                  </span>

                                  {onSelectRoute && (
                                    <button
                                      onClick={() => onSelectRoute(op.routeId)}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 font-bold transition text-[10.5px] flex items-center gap-1 shrink-0 cursor-pointer"
                                      title="Enfocar esta ruta en el mapa"
                                    >
                                      <Navigation className="w-3 h-3" />
                                      <span>Ver ruta</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: AEROLÍNEAS CON CONEXIÓN Y FECHAS DE AUTORIZACIÓN   */}
          {/* ======================================================== */}
          {activeTab === 'airlines' && (
            <div className="space-y-5">
              {filteredAirlineGroups.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShieldCheck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                  <p className="text-base font-bold text-slate-200">No se encontraron aerolíneas coincidentes</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o selecciona otra aerolínea en los filtros.</p>
                </div>
              ) : (
                filteredAirlineGroups.map(group => {
                  const aColor = defaultColor(group.airline);
                  const percentage = Math.round((group.totalAuthorizations / (airportRoutes.length || 1)) * 100);

                  return (
                    <div
                      key={group.airline}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                    >
                      {/* Airline Header Bar (Amplio y estructurado) */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className="w-5 h-5 rounded-full shrink-0 shadow-md border-2 border-white/50"
                            style={{ backgroundColor: aColor }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-base sm:text-lg font-black text-white truncate">
                                {group.airline}
                              </h3>
                              <span className="text-[11px] font-bold font-mono bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-800">
                                {percentage}% de la conectividad
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">
                              Conecta con <strong className="text-cyan-300 font-bold">{group.destinations.size} destinos</strong> directos autorizados desde este aeropuerto
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 self-start sm:self-auto">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Total de Autorizaciones:
                          </span>
                          <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                            {group.totalAuthorizations}
                          </span>
                        </div>
                      </div>

                      {/* Authorized Routes Grid for this Airline (Espacioso y bien alineado) */}
                      <div className="p-4 sm:p-5 bg-slate-950/40">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                          <span>Rutas y Fechas de Autorización AFAC ({group.filteredRoutes.length}):</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                          {group.filteredRoutes.map((r, rIdx) => {
                            const otherAirport = resolveAirport(r.otherCode);
                            const hasAuthDate = Boolean(r.authorizationDate);

                            return (
                              <div
                                key={`${r.routeId}-${rIdx}`}
                                className="bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 rounded-xl p-4 transition flex flex-col justify-between gap-3 shadow-sm group"
                              >
                                <div>
                                  {/* Route corridor & code */}
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm">
                                      <span className="bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-md border border-cyan-800">
                                        {displayCode}
                                      </span>
                                      <span className="text-slate-400 font-sans">⇄</span>
                                      <span className="bg-slate-800 text-white px-2.5 py-0.5 rounded-md border border-slate-700">
                                        {r.otherCode}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        r.flightType === 'Nacional'
                                          ? 'bg-sky-950 text-sky-400 border-sky-800/60'
                                          : 'bg-purple-950 text-purple-300 border-purple-800/60'
                                      }`}
                                    >
                                      {r.flightType}
                                    </span>
                                  </div>

                                  <div className="text-sm font-extrabold text-white truncate">
                                    {r.otherCity || otherAirport?.city || r.otherName}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate mt-0.5">
                                    {r.otherName}
                                    {r.otherState && r.otherState !== r.otherCity ? `, ${r.otherState}` : ''}
                                  </div>

                                  {/* FECHA DE AUTORIZACIÓN: High visibility dedicated box */}
                                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                                      <Calendar className={`w-4 h-4 shrink-0 ${hasAuthDate ? 'text-emerald-400' : 'text-slate-400'}`} />
                                      <span>Fecha de Autorización:</span>
                                    </div>
                                    {hasAuthDate ? (
                                      <span className="text-xs font-mono font-black text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-700/80 shadow-sm">
                                        {r.authorizationDate}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        Registrada en Concesión
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                                  <span>
                                    {r.aircraft ? `${r.aircraft} • ` : ''}
                                    {Math.round(r.distanceKm).toLocaleString()} km
                                  </span>

                                  {onSelectRoute && (
                                    <button
                                      onClick={() => onSelectRoute(r.routeId)}
                                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition cursor-pointer hover:underline text-xs"
                                    >
                                      <Navigation className="w-3.5 h-3.5" />
                                      <span>Ver ruta en mapa</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400">
          <div>
            {activeTab === 'destinations' ? (
              <>
                Mostrando <span className="text-white font-bold">{filteredConnections.length}</span> de{' '}
                <span className="text-white font-bold">{connections.length}</span> conexiones directas
              </>
            ) : (
              <>
                Total: <span className="text-white font-bold">{airportRoutes.length}</span> autorizaciones en{' '}
                <span className="text-white font-bold">{uniqueAirlines.length}</span> aerolíneas autorizadas
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition cursor-pointer shadow-sm"
          >
            Cerrar Recuadro
          </button>
        </div>
      </div>
    </div>
  );
};
