import { Airport, FlightRoute, HubViewItem } from '../types';
import { MEXICO_AIRPORTS, resolveAirport, findAirportByCoordinates, isCoordinateLike } from '../data/mexicoDemoData';

/**
 * Calculates strictly the Top N airports with the highest number of authorized routes
 * from the loaded dataset (e.g. "Observatorio de Rutas").
 */
export function getTopAirports(routes: FlightRoute[], airports: Airport[], limit: number = 15): HubViewItem[] {
  const airportMap = new Map<string, Airport>();
  airports.forEach(a => airportMap.set(a.code, a));

  const hubRoutes = new Map<string, Set<string>>();
  const hubDestinations = new Map<string, Set<string>>();
  const hubAirlines = new Map<string, Set<string>>();
  const hubFlights = new Map<string, number>();

  routes.forEach(r => {
    // Process Origin
    if (r.originCode) {
      if (!hubRoutes.has(r.originCode)) {
        hubRoutes.set(r.originCode, new Set());
        hubDestinations.set(r.originCode, new Set());
        hubAirlines.set(r.originCode, new Set());
        hubFlights.set(r.originCode, 0);
      }
      hubRoutes.get(r.originCode)!.add(r.id);
      if (r.destCode) hubDestinations.get(r.originCode)!.add(r.destCode);
      if (r.airline) hubAirlines.get(r.originCode)!.add(r.airline);
      hubFlights.set(r.originCode, (hubFlights.get(r.originCode) || 0) + (r.flightsCount || 1));
    }

    // Process Destination
    if (r.destCode) {
      if (!hubRoutes.has(r.destCode)) {
        hubRoutes.set(r.destCode, new Set());
        hubDestinations.set(r.destCode, new Set());
        hubAirlines.set(r.destCode, new Set());
        hubFlights.set(r.destCode, 0);
      }
      hubRoutes.get(r.destCode)!.add(r.id);
      if (r.originCode) hubDestinations.get(r.destCode)!.add(r.originCode);
      if (r.airline) hubAirlines.get(r.destCode)!.add(r.airline);
      hubFlights.set(r.destCode, (hubFlights.get(r.destCode) || 0) + (r.flightsCount || 1));
    }
  });

  const candidates: HubViewItem[] = [];

  hubRoutes.forEach((routeSet, rawCode) => {
    let apt = airportMap.get(rawCode) || resolveAirport(rawCode);
    const fallbackApt = MEXICO_AIRPORTS[rawCode];

    const lat = apt?.lat ?? fallbackApt?.lat ?? 23.6345;
    const lng = apt?.lng ?? fallbackApt?.lng ?? -102.5528;

    if (!apt || isCoordinateLike(rawCode) || isCoordinateLike(apt.name)) {
      apt = resolveAirport(rawCode, lat, lng) || findAirportByCoordinates(lat, lng) || apt;
    }

    const code = (apt && isCoordinateLike(rawCode)) ? apt.code : rawCode;

    let fullName = (apt?.name && !isCoordinateLike(apt.name) && apt.name !== code)
      ? apt.name
      : (fallbackApt?.name || null);

    if (!fullName || isCoordinateLike(fullName)) {
      const byCoords = findAirportByCoordinates(lat, lng);
      fullName = byCoords ? byCoords.name : `Aeropuerto ${code}`;
    }

    const city = apt?.city || fallbackApt?.city || '';
    const state = apt?.state || fallbackApt?.state || '';

    const airlinesArray = Array.from(hubAirlines.get(rawCode) || []);

    candidates.push({
      code,
      name: fullName,
      city,
      state,
      lat,
      lng,
      authorizedRoutesCount: routeSet.size,
      destinationsCount: hubDestinations.get(rawCode)?.size || 0,
      airlinesCount: airlinesArray.length,
      totalFlights: hubFlights.get(rawCode) || 0,
      airlinesList: airlinesArray,
    });
  });

  // Sort strictly by authorizedRoutesCount descending (number of authorized routes)
  candidates.sort((a, b) => b.authorizedRoutesCount - a.authorizedRoutesCount);

  // If candidates is empty (edge case), complete with default major Mexican hubs
  const defaultMajorHubs = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'SJD', 'BJX', 'CUL', 'HMO', 'MID', 'PVR', 'VSA', 'TGZ', 'OAX', 'MZT'];
  if (candidates.length < limit) {
    for (const hCode of defaultMajorHubs) {
      if (!candidates.some(c => c.code === hCode)) {
        const fallback = MEXICO_AIRPORTS[hCode];
        if (fallback) {
          candidates.push({
            code: fallback.code,
            name: fallback.name,
            city: fallback.city,
            state: fallback.state,
            lat: fallback.lat,
            lng: fallback.lng,
            authorizedRoutesCount: 0,
            destinationsCount: 0,
            airlinesCount: 0,
            totalFlights: 0,
            airlinesList: [],
          });
        }
      }
      if (candidates.length >= limit) break;
    }
  }

  return candidates.slice(0, limit);
}

/**
 * Backwards compatibility helper for Top 4 Hubs
 */
export function getTop4Hubs(routes: FlightRoute[], airports: Airport[]): HubViewItem[] {
  return getTopAirports(routes, airports, 4);
}
