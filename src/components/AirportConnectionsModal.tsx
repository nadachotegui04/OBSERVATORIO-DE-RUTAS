import React, { useState, useMemo } from 'react';
import { X, Search, Plane, Calendar, Building2, MapPin, ArrowUpRight, Users, Navigation } from 'lucide-react';
import { FlightRoute, AirportConnectionDetail } from '../types';
import { getAirportConnections } from '../utils/dataParser';
import { resolveAirport, findAirportByCoordinates } from '../data/mexicoDemoData';

interface AirportConnectionsModalProps {
  airportCode: string | null;
  routes: FlightRoute[];
  onClose: () => void;
  onSelectRoute?: (routeId: string) => void;
  getAirlineColor?: (airline: string) => string;
}

export const AirportConnectionsModal: React.FC<AirportConnectionsModalProps> = ({
  airportCode,
  routes,
  onClose,
  onSelectRoute,
  getAirlineColor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Nacional' | 'Internacional'>('all');

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

  const displayCode = airportInfo?.code || airportCode;

  // Compute all direct connections from this airport
  const connections: AirportConnectionDetail[] = useMemo(() => {
    if (!airportCode) return [];
    return getAirportConnections(airportCode, routes);
  }, [airportCode, routes]);

  // Filtered connections by search & type
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

  // Aggregated airport totals
  const uniqueAirlines = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => c.airlines.forEach(a => set.add(a.airline)));
    return Array.from(set);
  }, [connections]);

  if (!airportCode) return null;

  const defaultColor = (airline: string) => {
    if (getAirlineColor) return getAirlineColor(airline);
    return '#06b6d4';
  };

  return (
    <div
      id="airport-connections-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-start justify-between relative">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-cyan-500/10">
              {displayCode}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-800/80">
                  Visualización 1: Aeropuerto y Conexiones
                </span>
                {airportInfo?.hub && (
                  <span className="text-[11px] font-semibold bg-cyan-950/90 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-700/80">
                    Hub Principal
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {airportInfo?.name || `Aeropuerto ${displayCode}`}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{airportInfo?.city || displayCode}, {airportInfo?.state || 'México'}</span>
                <span className="text-cyan-400 font-mono font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                  IATA: {displayCode}
                </span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-airport-connections"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Cerrar pestaña"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Airport Stats Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3.5 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Destinos Directos</span>
            <span className="text-lg font-black text-cyan-400">{connections.length}</span>
            <span className="text-[10px] text-slate-400 ml-1">conexiones</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Aerolíneas Autorizadas</span>
            <span className="text-lg font-black text-sky-400">{uniqueAirlines.length}</span>
            <span className="text-[10px] text-slate-400 ml-1">líneas</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-3.5 bg-slate-900/70 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-airport-destinations"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar destino (ej. Cancún, CUN, Monterrey, Volaris)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({connections.length})
            </button>
            <button
              onClick={() => setFilterType('Nacional')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'Nacional'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nacionales
            </button>
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No se encontraron destinos coincidentes</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o cambia el filtro de tipo de vuelo.</p>
            </div>
          ) : (
            filteredConnections.map(conn => {
              const destAirportInfo = resolveAirport(conn.destCode);
              return (
                <div
                  key={conn.destCode}
                  className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 transition group"
                >
                  {/* Destination Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 text-cyan-400 font-bold text-sm flex items-center justify-center shrink-0">
                        {conn.destCode}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {conn.destCity || destAirportInfo?.city || conn.destName}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                              conn.flightType === 'Nacional'
                                ? 'bg-sky-950/80 text-sky-400 border-sky-800/60'
                                : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                            }`}
                          >
                            {conn.flightType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {conn.destName} • {destAirportInfo?.state || 'México'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-200">
                        {Math.round(conn.distanceKm).toLocaleString()} km
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {Math.round(conn.distanceNm).toLocaleString()} NM
                      </div>
                    </div>
                  </div>

                  {/* Airlines operating on this connection */}
                  <div className="mt-3 pt-3 border-t border-slate-800/70">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Aerolíneas con autorización en esta conexión ({conn.airlines.length})</span>
                      <span className="text-slate-400 font-normal">
                        {conn.airlines.length} autorizada{conn.airlines.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {conn.airlines.map(op => {
                        const color = defaultColor(op.airline);
                        return (
                          <div
                            key={op.routeId}
                            className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 flex items-start justify-between gap-2"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {op.airline}
                                </div>
                                {op.authorizationDate ? (
                                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>Aut: {op.authorizationDate}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>Aut: Registrada</span>
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {op.aircraft ? `${op.aircraft} • ` : ''}
                                  {op.flightsCount.toLocaleString()} ops • {op.passengers.toLocaleString()} pax
                                </div>
                              </div>
                            </div>

                            {onSelectRoute && (
                              <button
                                onClick={() => onSelectRoute(op.routeId)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Enfocar esta ruta en el mapa"
                              >
                                <Navigation className="w-3 h-3" />
                                <span className="hidden sm:inline">Ver ruta</span>
                              </button>
                            )}
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

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Mostrando <span className="text-white font-bold">{filteredConnections.length}</span> de{' '}
            <span className="text-white font-bold">{connections.length}</span> conexiones directas
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition cursor-pointer"
          >
            Cerrar Recuadro
          </button>
        </div>
      </div>
    </div>
  );
};
