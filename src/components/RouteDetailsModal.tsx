import React, { useMemo } from 'react';
import { FlightRoute } from '../types';
import { Plane, Calendar, X, ShieldCheck, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { resolveAirport, findAirportByCoordinates, isCoordinateLike } from '../data/mexicoDemoData';

interface RouteDetailsModalProps {
  route: FlightRoute | null;
  allRoutes?: FlightRoute[];
  isUniqueMode?: boolean;
  onClose: () => void;
  getAirlineColor?: (airline: string) => string;
}

export const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({
  route,
  allRoutes = [],
  isUniqueMode = false,
  onClose,
  getAirlineColor,
}) => {
  if (!route) return null;

  // Find all airlines operating this exact origin-destination pair
  const operators = useMemo(() => {
    const list = allRoutes.length > 0 ? allRoutes : [route];
    const matching = list.filter(
      r =>
        (r.originCode === route.originCode && r.destCode === route.destCode) ||
        (r.originCode === route.destCode && r.destCode === route.originCode)
    );

    const map = new Map<string, {
      airline: string;
      authorizationDate?: string;
      flightsCount: number;
      passengers: number;
      aircraft?: string;
      flightNumber?: string;
      period?: string;
      isCurrentSelection?: boolean;
    }>();

    // Ensure the clicked route's airline is first or prioritized
    matching.forEach(r => {
      const key = r.airline.toLowerCase();
      const isSelected = r.id === route.id || r.airline.toLowerCase() === route.airline.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          airline: r.airline,
          authorizationDate: r.authorizationDate,
          flightsCount: r.flightsCount,
          passengers: r.passengers,
          aircraft: r.aircraft,
          flightNumber: r.flightNumber,
          period: r.period,
          isCurrentSelection: isSelected,
        });
      } else {
        const item = map.get(key)!;
        item.flightsCount += r.flightsCount;
        item.passengers += r.passengers;
        if (!item.authorizationDate && r.authorizationDate) {
          item.authorizationDate = r.authorizationDate;
        }
        if (isSelected) item.isCurrentSelection = true;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrentSelection && !b.isCurrentSelection) return -1;
      if (!a.isCurrentSelection && b.isCurrentSelection) return 1;
      return b.flightsCount - a.flightsCount;
    });
  }, [route, allRoutes]);

  const defaultColor = (airline: string) => {
    if (getAirlineColor) return getAirlineColor(airline);
    return '#06b6d4';
  };

  // Fallback airport profile resolution
  const origProfile = resolveAirport(route.originCode, route.originLat, route.originLng) || findAirportByCoordinates(route.originLat, route.originLng);
  const destProfile = resolveAirport(route.destCode, route.destLat, route.destLng) || findAirportByCoordinates(route.destLat, route.destLng);

  const cleanOriginCode = origProfile?.code || ((!isCoordinateLike(route.originCode) && route.originCode) ? route.originCode : 'AER');
  const cleanDestCode = destProfile?.code || ((!isCoordinateLike(route.destCode) && route.destCode) ? route.destCode : 'AER');

  const cleanOriginName = origProfile?.name
    || ((!isCoordinateLike(route.originName) && route.originName && route.originName !== route.originCode)
      ? route.originName
      : `Aeropuerto ${cleanOriginCode}`);

  const cleanDestName = destProfile?.name
    || ((!isCoordinateLike(route.destName) && route.destName && route.destName !== route.destCode)
      ? route.destName
      : `Aeropuerto ${cleanDestCode}`);

  return (
    <div
      id="route-details-modal"
      className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shrink-0 mt-0.5">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  {cleanOriginCode} ➔ {cleanDestCode}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isUniqueMode
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                  }`}
                >
                  {isUniqueMode ? 'Vis. 3: Ruta Única' : 'Vis. 2: Red por Aerolínea'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
                  {route.flightType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {route.originCity || cleanOriginName} ➔ {route.destCity || cleanDestName}
              </p>
            </div>
          </div>

          <button
            id="btn-close-route-details"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar pestaña"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Origin & Destination Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                Origen ({cleanOriginCode})
              </span>
              <div className="font-bold text-white text-xs">{cleanOriginName}</div>
              <div className="text-slate-400 text-[11px]">
                {route.originCity || origProfile?.city || ''} {route.originState || origProfile?.state ? `• ${route.originState || origProfile?.state}` : ''}
              </div>
            </div>

            <div className="space-y-0.5 sm:border-l sm:border-slate-800 sm:pl-3">
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                Destino ({cleanDestCode})
              </span>
              <div className="font-bold text-white text-xs">{cleanDestName}</div>
              <div className="text-slate-400 text-[11px]">
                {route.destCity || destProfile?.city || ''} {route.destState || destProfile?.state ? `• ${route.destState || destProfile?.state}` : ''}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium">Distancia</span>
              <span className="text-base font-black text-white">{Math.round(route.distanceKm).toLocaleString()} km</span>
              <span className="text-[10px] text-slate-400 block font-mono">{Math.round(route.distanceNm)} NM</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium">Aerolíneas Autorizadas</span>
              <span className="text-base font-black text-cyan-400">{operators.length}</span>
              <span className="text-[10px] text-slate-400 block font-medium">operador{operators.length > 1 ? 'es' : ''}</span>
            </div>
          </div>

          {/* Key Requirement: Qué aerolíneas tienen esa misma ruta y la Fecha de Autorización */}
          <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  Aerolíneas que tienen autorizada esta ruta ({operators.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {operators.length > 1 ? 'Ruta compartida / multi-operador' : 'Operador exclusivo'}
              </span>
            </div>

            <div className="space-y-2.5">
              {operators.map(op => {
                const color = defaultColor(op.airline);
                return (
                  <div
                    key={op.airline}
                    className={`p-3 rounded-xl border transition ${
                      op.isCurrentSelection
                        ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {op.airline}
                            </span>
                            {op.isCurrentSelection && (
                              <span className="text-[9px] uppercase tracking-wider font-extrabold bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-800">
                                Seleccionada
                              </span>
                            )}
                          </div>
                          {op.flightNumber && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Vuelo: {op.flightNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Explicit Requirement: Fecha de Autorización */}
                      <div className="text-right shrink-0">
                        {op.authorizationDate ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Fecha de Autorización: {op.authorizationDate}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Autorización: Registrada</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            {isUniqueMode
              ? 'Mostrando consolidado de ruta única sin duplicidades'
              : 'Detalle de ruta y operadores autorizados'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
