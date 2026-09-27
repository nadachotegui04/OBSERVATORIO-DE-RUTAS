import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  FlightRoute,
  ColumnMapping,
  ValidationIssue,
  DatasetStats,
  Airport,
  ParsedSheet,
  ParsedFileResult,
  UniqueRouteCorridor,
  AirportConnectionDetail,
} from '../types';
import { calculateDistanceKm, kmToNauticalMiles, isCoordinateInMexico } from './geodesic';
import { MEXICO_AIRPORTS, resolveAirport, findAirportByCoordinates, isCoordinateLike } from '../data/mexicoDemoData';

const COMMON_COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  originCode: [
    'origen', 'origin', 'iata_origen', 'iata_orig', 'cve_origen', 'aeropuerto_origen_cod',
    'pto_origen', 'codigo_origen', 'estacion_origen', 'aeropuerto_origen', 'ruta', 'tramo',
    'orig', 'de', 'from', 'origen_iata', 'cod_origen', 'cve_pto_origen', 'pto_salida',
    'salida', 'aeropuerto_salida'
  ],
  originName: [
    'nombre_aeropuerto_origen', 'nombre_origen', 'aeropuerto_origen', 'aeropuerto_orig',
    'origin_name', 'nom_origen', 'desc_origen', 'ciudad_origen', 'nombre_pto_origen',
    'nombre_de_aeropuerto_origen', 'aeropuerto_de_origen', 'nombre_aeropuerto', 'nombre_salida',
    'aeropuerto_salida_nombre', 'denominacion_origen', 'denominacion', 'aeropuerto',
    'nombre_estacion_origen', 'origen_nombre', 'nombre_de_estacion_origen', 'estacion_origen'
  ],
  originLat: [
    'latitud_origen', 'lat_origen', 'lat_orig', 'origin_lat', 'latitud_orig', 'origen_lat',
    'lat1', 'lat_o', 'latitud_o', 'lat_salida', 'origen_latitud', 'lat'
  ],
  originLng: [
    'longitud_origen', 'lon_origen', 'lng_origen', 'long_origen', 'origin_lng', 'origin_lon',
    'origen_lng', 'origen_lon', 'lon1', 'lng1', 'long1', 'lon_o', 'lng_o', 'longitud_o',
    'longitud_orig', 'lon_salida', 'origen_longitud', 'lng', 'lon', 'long'
  ],
  originState: ['estado_origen', 'edo_origen', 'state_origin', 'entidad_origen', 'edo_orig'],
  destCode: [
    'destino', 'destination', 'iata_destino', 'iata_dest', 'cve_destino', 'aeropuerto_destino_cod',
    'pto_destino', 'codigo_destino', 'estacion_destino', 'aeropuerto_destino', 'dest', 'a',
    'to', 'hacia', 'destino_iata', 'cod_destino', 'cve_pto_destino', 'pto_llegada',
    'llegada', 'aeropuerto_llegada'
  ],
  destName: [
    'nombre_aeropuerto_destino', 'nombre_destino', 'aeropuerto_destino', 'aeropuerto_dest',
    'dest_name', 'destination_name', 'nom_destino', 'desc_destino', 'ciudad_destino', 'nombre_pto_destino',
    'nombre_de_aeropuerto_destino', 'aeropuerto_de_destino', 'nombre_llegada',
    'aeropuerto_llegada_nombre', 'denominacion_destino', 'destino_nombre', 'nombre_estacion_destino',
    'estacion_destino'
  ],
  destLat: [
    'latitud_destino', 'lat_destino', 'lat_dest', 'dest_lat', 'latitud_dest', 'destino_lat',
    'lat2', 'lat_d', 'latitud_d', 'lat_llegada', 'destino_latitud'
  ],
  destLng: [
    'longitud_destino', 'lon_destino', 'lng_destino', 'long_destino', 'dest_lng', 'dest_lon',
    'destino_lng', 'destino_lon', 'lon2', 'lng2', 'long2', 'lon_d', 'lng_d', 'longitud_d',
    'longitud_dest', 'lon_llegada', 'destino_longitud'
  ],
  destState: ['estado_destino', 'edo_destino', 'state_dest', 'entidad_destino', 'edo_dest'],
  airline: [
    'aerolinea', 'airline', 'arline', 'linea_aerea', 'operador', 'carrier', 'compania', 'linea',
    'empresa', 'concesionario', 'prestador', 'linea_transporte', 'aerolineas', 'nombre_aerolinea',
    'operador_aereo', 'permisionario', 'empresa_aerea', 'linea_aerea_nombre', 'concesionaria',
    'cia', 'cia_aerea', 'siglas_aerolinea', 'razon_social', 'carrier_name', 'airline_name',
    'operator', 'aircraft_operator', 'air_carrier', 'concesionario_autorizado'
  ],
  flightsCount: [
    'vuelos', 'num_vuelos', 'frecuencia', 'vuelos_totales', 'flights', 'flight_count',
    'operaciones', 'frecuencias', 'ops', 'num_operaciones', 'total_vuelos', 'salidas',
    'frecuencia_semanal', 'frecuencia_mensual', 'frecuencia_anual'
  ],
  passengers: [
    'pasajeros', 'pax', 'total_pasajeros', 'num_pasajeros', 'passengers', 'volumen_pasajeros',
    'viajeros', 'personas', 'asientos_ocupados', 'pax_totales'
  ],
  period: ['periodo', 'period', 'mes', 'month', 'trimestre', 'quarter', 'semana', 'temporada', 'bimestre'],
  year: ['año', 'anio', 'year', 'ejercicio', 'anualidad'],
  aircraft: ['aeronave', 'avion', 'aircraft', 'equipo', 'modelo_avion', 'tipo_aeronave', 'flota', 'material_vuelo'],
  authorizationDate: [
    'fecha_de_autorizacion', 'fecha_autorizacion', 'fecha_aut', 'autorizacion',
    'fecha_de_aprobacion', 'fecha_aprobacion', 'f_autorizacion', 'f_aut',
    'fecha_autorizada', 'fecha_permiso', 'fecha_registro', 'fecha_de_oficio',
    'oficio_fecha', 'fec_autorizacion', 'fecha_autorizo', 'fecha_resolucion',
    'resolucion_fecha', 'fecha_de_inicio', 'fecha_inicio', 'fecha_de_vigencia',
    'vigencia', 'fecha', 'date', 'f_inicio', 'f_resolucion', 'fecha_validez', 'fec_aut',
    'authorization_date', 'auth_date', 'approval_date', 'date_authorized', 'date_of_authorization',
    'effective_date', 'last_authorized', 'fecha_ultima_autorizacion', 'fecha_corte'
  ],
};

/**
 * Normalizes string for alias matching (lowercased, trim, remove accents)
 */
function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_');
}

/**
 * Automatically detects column mapping from headers with prioritized matching
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  const normalizedHeaders = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));

  // First pass: exact matches or strong startsWith
  for (const [key, aliases] of Object.entries(COMMON_COLUMN_ALIASES) as [keyof ColumnMapping, string[]][]) {
    const match = normalizedHeaders.find(h => {
      return aliases.some(alias => {
        const normAlias = normalizeHeader(alias);
        return h.norm === normAlias || h.norm.startsWith(normAlias + '_') || h.norm.endsWith('_' + normAlias);
      });
    });

    if (match) {
      mapping[key] = match.raw;
    }
  }

  // Second pass: general inclusion matches for fields not yet resolved
  for (const [key, aliases] of Object.entries(COMMON_COLUMN_ALIASES) as [keyof ColumnMapping, string[]][]) {
    if (!mapping[key]) {
      const match = normalizedHeaders.find(h => {
        return aliases.some(alias => {
          const normAlias = normalizeHeader(alias);
          return h.norm.includes(normAlias);
        });
      });

      if (match) {
        mapping[key] = match.raw;
      }
    }
  }

  // If destLat/destLng were matched to the same column as originLat/originLng, look for second lat/lng column
  if (mapping.destLat && mapping.destLat === mapping.originLat) {
    const latCols = headers.filter(h => {
      const n = normalizeHeader(h);
      return n.includes('lat');
    });
    if (latCols.length >= 2) {
      mapping.originLat = latCols[0];
      mapping.destLat = latCols[1];
    } else {
      delete mapping.destLat;
    }
  }

  if (mapping.destLng && mapping.destLng === mapping.originLng) {
    const lngCols = headers.filter(h => {
      const n = normalizeHeader(h);
      return n.includes('lon') || n.includes('lng');
    });
    if (lngCols.length >= 2) {
      mapping.originLng = lngCols[0];
      mapping.destLng = lngCols[1];
    } else {
      delete mapping.destLng;
    }
  }

  return {
    originCode: mapping.originCode || headers[0] || 'Origen',
    originName: mapping.originName,
    originLat: mapping.originLat || 'Latitud_Origen',
    originLng: mapping.originLng || 'Longitud_Origen',
    originState: mapping.originState,
    destCode: mapping.destCode || (headers.length > 1 ? headers[1] : 'Destino'),
    destName: mapping.destName,
    destLat: mapping.destLat || 'Latitud_Destino',
    destLng: mapping.destLng || 'Longitud_Destino',
    destState: mapping.destState,
    airline: mapping.airline,
    flightsCount: mapping.flightsCount,
    passengers: mapping.passengers,
    period: mapping.period,
    year: mapping.year,
    aircraft: mapping.aircraft,
  };
}

/**
 * Parses numeric coordinate cleanly, handles comma as decimal separator, DMS notation, and scale issues
 */
function parseCoordinate(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    let n = val;
    // If coordinate was scaled up (e.g. 19436300 instead of 19.4363)
    if (Math.abs(n) > 180) {
      while (Math.abs(n) > 180) {
        n = n / 10;
      }
    }
    return n;
  }

  let str = String(val).trim();
  if (!str) return null;

  // Handle DMS format like 19°26'10.5"N or 99°04'20.1"W or 19 26 10 N
  const dmsMatch = str.match(/([0-9]+)[°\s]+([0-9]+)['\s]+([0-9.]+)?["\s]*([NSEWnsew])?/);
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1]) || 0;
    const min = parseFloat(dmsMatch[2]) || 0;
    const sec = parseFloat(dmsMatch[3]) || 0;
    const dir = (dmsMatch[4] || '').toUpperCase();
    let dec = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') dec = -dec;
    return dec;
  }

  // Standard numeric string: replace comma with dot
  let cleanStr = str.replace(/['"°\s]/g, '').replace(/,/g, '.');
  
  // If there are multiple dots (e.g. "19.436.300"), keep first dot
  const parts = cleanStr.split('.');
  if (parts.length > 2) {
    cleanStr = parts[0] + '.' + parts.slice(1).join('');
  }

  let num = parseFloat(cleanStr);
  if (isNaN(num)) return null;

  if (Math.abs(num) > 180) {
    while (Math.abs(num) > 180) {
      num = num / 10;
    }
  }

  return num;
}

/**
 * Validates, corrects swapped Lat/Lng, and resolves coordinates against Mexican & International Airport DB
 */
function sanitizeCoordinates(
  latIn: number | null,
  lngIn: number | null,
  airportCode: string
): { lat: number; lng: number } | null {
  let lat = latIn;
  let lng = lngIn;

  // Check if airport is known in DB
  const known = resolveAirport(airportCode);

  // If coordinates are missing or invalid, use known airport coordinates
  if (lat === null || lng === null) {
    if (known) return { lat: known.lat, lng: known.lng };
    return null;
  }

  // Check for Lat/Lng Inversion (e.g. Lat is negative like -99.07, Lng is positive like 19.43)
  if (lat < 0 && lng > 0) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  // In Western Hemisphere (Mexico / Americas), Longitude is negative (e.g. -86° to -118°).
  // If user entered positive longitude e.g. 99.0721 or 100.1069:
  if (lng > 60 && lng < 170) {
    lng = -lng;
  }

  // If coordinates are clearly near (0, 0) and we have known airport, use known
  if (Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5 && known) {
    return { lat: known.lat, lng: known.lng };
  }

  // If lat is outside standard latitude (-90 to 90), or lng outside (-180 to 180):
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    if (known) return { lat: known.lat, lng: known.lng };
    return null;
  }

  return { lat, lng };
}

/**
 * Formats date values from Excel serial numbers, Date objects, or string representations into ISO YYYY-MM-DD
 */
export function parseDateValue(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined' || str === 'N/A' || str === '-') return undefined;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    return val.toISOString().split('T')[0];
  }

  // Handle Excel serial date numbers (e.g. 44562, 45290)
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    try {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}
  }

  // String numeric check for Excel serial date
  const num = Number(str);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    try {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}
  }

  // Check for YYYY-MM-DD or YYYY_MM_DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[/\-_](\d{1,2})[/\-_](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Check for DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/\-_](\d{1,2})[/\-_](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Return clean trimmed string date
  return str;
}

/**
 * Checks if a sheet name represents a generic dataset title rather than an individual airline name
 */
export function isGenericDatasetSheetName(sheetName: string): boolean {
  if (!sheetName) return true;
  const norm = normalizeHeader(sheetName);
  const genericKeywords = [
    'observatorio', 'sheet', 'hoja', 'datos', 'data', 'rutas', 'routes',
    'airline_routes', 'arline_routes', 'airline_route', 'arline_route',
    'base', 'dataset', 'tabla', 'table', 'general', 'oficial', 'resumen'
  ];
  return genericKeywords.some(kw => norm.includes(kw));
}

/**
 * Preserves airline name strictly as it appears in the database/file
 */
export function cleanAirlineName(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return 'General / No especificada';
  return trimmed;
}

/**
 * Splits compound route strings if origin & destination are combined (e.g. "MEX-CUN", "GDL/TIJ")
 */
function parseOriginDestPair(rawOrig: string, rawDest: string): { orig: string; dest: string } {
  let orig = rawOrig;
  let dest = rawDest;

  if (!dest || dest === orig) {
    const separators = ['-', '/', '➔', '->', '_', ' a ', ' to '];
    for (const sep of separators) {
      if (orig.includes(sep)) {
        const parts = orig.split(sep);
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
          orig = parts[0].trim().toUpperCase();
          dest = parts[1].trim().toUpperCase();
          break;
        }
      }
    }
  }

  return { orig, dest };
}

/**
 * Processes raw rows using mapping and validates Mexican coordinates
 */
export function processRawData(
  rows: any[],
  mapping: ColumnMapping,
  sheetName = 'Principal'
): { routes: FlightRoute[]; issues: ValidationIssue[] } {
  const routes: FlightRoute[] = [];
  const issues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header row

    // Extract Origin & Dest Codes
    let rawOrig = String(row[mapping.originCode] || '').trim().toUpperCase();
    let rawDest = String(row[mapping.destCode] || '').trim().toUpperCase();

    // Check if route was provided in a single compound column
    const pair = parseOriginDestPair(rawOrig, rawDest);
    rawOrig = pair.orig;
    rawDest = pair.dest;

    if (!rawOrig && !rawDest) {
      // Empty row
      return;
    }

    if (!rawOrig || !rawDest) {
      issues.push({
        row: rowNum,
        type: 'warning',
        message: `[${sheetName}] Fila ignorada: Origen o Destino vacío (Origen: "${rawOrig}", Destino: "${rawDest}")`,
      });
      return;
    }

    // Coordinates parsing & sanitization
    const rawOrigLat = parseCoordinate(row[mapping.originLat]);
    const rawOrigLng = parseCoordinate(row[mapping.originLng]);
    const rawDestLat = parseCoordinate(row[mapping.destLat]);
    const rawDestLng = parseCoordinate(row[mapping.destLng]);

    const cleanOrigCoords = sanitizeCoordinates(rawOrigLat, rawOrigLng, rawOrig);
    const cleanDestCoords = sanitizeCoordinates(rawDestLat, rawDestLng, rawDest);

    // Lookup & resolve known airport profiles (with coordinate fallback)
    let knownOrig = resolveAirport(rawOrig, cleanOrigCoords?.lat, cleanOrigCoords?.lng) || MEXICO_AIRPORTS[rawOrig];
    let knownDest = resolveAirport(rawDest, cleanDestCoords?.lat, cleanDestCoords?.lng) || MEXICO_AIRPORTS[rawDest];

    if (!knownOrig && cleanOrigCoords) {
      knownOrig = findAirportByCoordinates(cleanOrigCoords.lat, cleanOrigCoords.lng);
    }
    if (!knownDest && cleanDestCoords) {
      knownDest = findAirportByCoordinates(cleanDestCoords.lat, cleanDestCoords.lng);
    }

    // If rawOrig / rawDest are raw coordinates, replace with official IATA code
    if (isCoordinateLike(rawOrig) && knownOrig) {
      rawOrig = knownOrig.code;
    }
    if (isCoordinateLike(rawDest) && knownDest) {
      rawDest = knownDest.code;
    }

    if (!cleanOrigCoords) {
      issues.push({
        row: rowNum,
        type: 'error',
        message: `[${sheetName}] Coordenadas no encontradas para origen "${rawOrig}". (${row[mapping.originLat] || 'vacío'}, ${row[mapping.originLng] || 'vacío'})`,
      });
      return;
    }

    if (!cleanDestCoords) {
      issues.push({
        row: rowNum,
        type: 'error',
        message: `[${sheetName}] Coordenadas no encontradas para destino "${rawDest}". (${row[mapping.destLat] || 'vacío'}, ${row[mapping.destLng] || 'vacío'})`,
      });
      return;
    }

    const origLat = cleanOrigCoords.lat;
    const origLng = cleanOrigCoords.lng;
    const destLat = cleanDestCoords.lat;
    const destLng = cleanDestCoords.lng;

    // Check bounds in Mexico
    const origInMexico = isCoordinateInMexico(origLat, origLng);
    const destInMexico = isCoordinateInMexico(destLat, destLng);

    if (!origInMexico && !destInMexico) {
      issues.push({
        row: rowNum,
        type: 'warning',
        message: `[${sheetName}] Ruta fuera del territorio mexicano: ${rawOrig} (${origLat.toFixed(2)}, ${origLng.toFixed(2)}) -> ${rawDest} (${destLat.toFixed(2)}, ${destLng.toFixed(2)})`,
      });
    }

    // Origin / Destination Names: Prioritize exact airport names from the sheet
    let rowOrigName = mapping.originName ? String(row[mapping.originName] || '').trim() : '';
    let rowDestName = mapping.destName ? String(row[mapping.destName] || '').trim() : '';

    if (!rowOrigName || isCoordinateLike(rowOrigName)) {
      for (const k of Object.keys(row)) {
        const normKey = normalizeHeader(k);
        if ((normKey.includes('nom') || normKey.includes('aeropuerto') || normKey.includes('estacion')) &&
            (normKey.includes('orig') || normKey.includes('salida') || normKey.includes('de'))) {
          const val = String(row[k] || '').trim();
          if (val && val !== 'undefined' && val !== 'null' && !isCoordinateLike(val)) {
            rowOrigName = val;
            break;
          }
        }
      }
    }

    if (!rowDestName || isCoordinateLike(rowDestName)) {
      for (const k of Object.keys(row)) {
        const normKey = normalizeHeader(k);
        if ((normKey.includes('nom') || normKey.includes('aeropuerto') || normKey.includes('estacion')) &&
            (normKey.includes('dest') || normKey.includes('llegada') || normKey.includes('hacia') || normKey.includes('a'))) {
          const val = String(row[k] || '').trim();
          if (val && val !== 'undefined' && val !== 'null' && !isCoordinateLike(val)) {
            rowDestName = val;
            break;
          }
        }
      }
    }

    // Determine final full airport names: User requirement 1: Extract as in DB, never coordinates
    let origName = (rowOrigName && !isCoordinateLike(rowOrigName)) ? rowOrigName : '';
    if (!origName) {
      if (knownOrig) {
        origName = knownOrig.name;
      } else {
        const byCoords = findAirportByCoordinates(origLat, origLng);
        if (byCoords) {
          origName = byCoords.name;
        } else if (rawOrig && !isCoordinateLike(rawOrig)) {
          origName = rawOrig.length > 4 ? rawOrig : `Aeropuerto ${rawOrig}`;
        } else {
          origName = 'Aeropuerto Nacional';
        }
      }
    }

    let destName = (rowDestName && !isCoordinateLike(rowDestName)) ? rowDestName : '';
    if (!destName) {
      if (knownDest) {
        destName = knownDest.name;
      } else {
        const byCoords = findAirportByCoordinates(destLat, destLng);
        if (byCoords) {
          destName = byCoords.name;
        } else if (rawDest && !isCoordinateLike(rawDest)) {
          destName = rawDest.length > 4 ? rawDest : `Aeropuerto ${rawDest}`;
        } else {
          destName = 'Aeropuerto Nacional';
        }
      }
    }

    // Numbers
    const flightsCount = Math.max(1, parseInt(String(row[mapping.flightsCount || ''] || '1').replace(/[^0-9]/g, '')) || 1);
    const passengers = Math.max(0, parseInt(String(row[mapping.passengers || ''] || '0').replace(/[^0-9]/g, '')) || (flightsCount * 120));

    // Determine Airline: User requirement 3: Exactly equal as in the database
    let rawAirline = String(row[mapping.airline || ''] || '').trim();
    if (!rawAirline || rawAirline === 'undefined' || rawAirline === 'null') {
      for (const k of Object.keys(row)) {
        const normKey = normalizeHeader(k);
        if (normKey.includes('aerolinea') || normKey.includes('operador') || normKey.includes('linea_aerea')) {
          const val = String(row[k] || '').trim();
          if (val && val !== 'undefined' && val !== 'null') {
            rawAirline = val;
            break;
          }
        }
      }
    }

    const isGenericSheet = isGenericDatasetSheetName(sheetName);
    if (!rawAirline || rawAirline === 'undefined' || rawAirline === 'null') {
      if (sheetName && sheetName !== 'Datos_CSV' && !isGenericSheet) {
        rawAirline = sheetName;
      } else {
        rawAirline = 'General / No especificada';
      }
    }
    const airline = cleanAirlineName(rawAirline);

    // Extract Authorization Date (Fecha de Autorización)
    let authDate: string | undefined = undefined;
    if (mapping.authorizationDate && row[mapping.authorizationDate] !== undefined) {
      authDate = parseDateValue(row[mapping.authorizationDate]);
    }
    if (!authDate) {
      for (const k of Object.keys(row)) {
        const normKey = normalizeHeader(k);
        if (normKey.includes('autoriza') || normKey.includes('aprob') || normKey.includes('resoluc')) {
          authDate = parseDateValue(row[k]);
          if (authDate) break;
        }
      }
    }

    const period = String(row[mapping.period || ''] || '').trim() || 'General';
    const yearRaw = parseInt(String(row[mapping.year || ''] || '').replace(/[^0-9]/g, ''));
    const year = !isNaN(yearRaw) && yearRaw > 1990 && yearRaw < 2050 ? yearRaw : undefined;
    const aircraft = String(row[mapping.aircraft || ''] || '').trim() || undefined;

    const distKm = calculateDistanceKm(origLat, origLng, destLat, destLng);
    const distNm = kmToNauticalMiles(distKm);

    const flightType = origInMexico && destInMexico ? 'Nacional' : 'Internacional';

    routes.push({
      id: `route-${sheetName.replace(/[^a-zA-Z0-9]/g, '')}-${index}-${rawOrig}-${rawDest}-${airline.replace(/\s+/g, '')}`,
      originCode: rawOrig,
      originName: origName,
      originCity: knownOrig?.city,
      originState: String(row[mapping.originState || ''] || '').trim() || knownOrig?.state,
      originLat: origLat,
      originLng: origLng,
      destCode: rawDest,
      destName: destName,
      destCity: knownDest?.city,
      destState: String(row[mapping.destState || ''] || '').trim() || knownDest?.state,
      destLat: destLat,
      destLng: destLng,
      airline,
      sheetName,
      aircraft,
      flightsCount,
      passengers,
      period,
      year,
      authorizationDate: authDate,
      distanceKm: distKm,
      distanceNm: distNm,
      flightType,
    });
  });

  return { routes, issues };
}

/**
 * Processes multiple sheets from parsed workbook with per-sheet automatic column detection
 */
export function processMultiSheetRawData(
  sheets: ParsedSheet[],
  fallbackMapping: ColumnMapping,
  activeSheetNames?: string[],
  useSheetAsAirline = true
): { routes: FlightRoute[]; issues: ValidationIssue[]; processedSheets: string[] } {
  let allRoutes: FlightRoute[] = [];
  let allIssues: ValidationIssue[] = [];
  const processedSheets: string[] = [];

  const targetSheets = activeSheetNames && activeSheetNames.length > 0
    ? sheets.filter(s => activeSheetNames.includes(s.name))
    : sheets;

  targetSheets.forEach(sheet => {
    // Detect column mapping specifically for this sheet's headers
    const detectedSheetMapping = autoDetectColumns(sheet.headers);
    const sheetMapping = sheet.mapping || detectedSheetMapping || fallbackMapping;

    const { routes, issues } = processRawData(sheet.rows, sheetMapping, sheet.name);

    const isGenericSheet = isGenericDatasetSheetName(sheet.name);
    if (useSheetAsAirline && !isGenericSheet) {
      routes.forEach(r => {
        if (!r.airline || r.airline === 'General / No especificada') {
          r.airline = sheet.name;
        }
      });
    }

    allRoutes = allRoutes.concat(routes);
    allIssues = allIssues.concat(issues);
    processedSheets.push(sheet.name);
  });

  return { routes: allRoutes, issues: allIssues, processedSheets };
}

/**
 * Parses File (Excel or CSV) into raw array of objects with full multi-sheet and dynamic header row detection
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  const isCSV = fileName.toLowerCase().endsWith('.csv');

  if (isCSV) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = (results.meta.fields || []).map(h => String(h || '').trim());
          const rows = results.data as any[];
          const singleSheet: ParsedSheet = {
            name: 'Datos_CSV',
            headers,
            rows,
            rowCount: rows.length,
          };
          resolve({
            fileName,
            sheets: [singleSheet],
            activeSheetNames: [singleSheet.name],
            isMultiSheet: false,
          });
        },
        error: (err) => reject(new Error(`Error al leer archivo CSV: ${err.message}`)),
      });
    });
  } else {
    // Excel .xlsx or .xls
    const dataBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      throw new Error('El archivo Excel no contiene ninguna hoja.');
    }

    const sheets: ParsedSheet[] = [];

    const KEYWORDS = [
      'origen', 'origin', 'destino', 'dest', 'iata', 'aeropuerto', 'ruta', 'tramo',
      'lat', 'lon', 'lng', 'vuelo', 'pax', 'pasajero', 'aerolinea', 'airline',
      'distancia', 'avion', 'aircraft', 'frecuencia', 'periodo', 'mes', 'año', 'operador'
    ];

    for (const sName of sheetNames) {
      const worksheet = workbook.Sheets[sName];
      if (!worksheet) continue;

      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      if (!rawRows || rawRows.length === 0) continue;

      // Smart Header Finder: Search first 20 rows to find the row with the most matching aviation keywords
      let bestHeaderRowIdx = 0;
      let maxScore = -1;

      for (let r = 0; r < Math.min(20, rawRows.length); r++) {
        const row = rawRows[r] || [];
        let score = 0;
        let filledCells = 0;

        row.forEach((cell: any) => {
          const s = normalizeHeader(String(cell || ''));
          if (s.length > 0) {
            filledCells++;
            if (KEYWORDS.some(kw => s.includes(kw))) {
              score += 3;
            }
          }
        });

        if (filledCells >= 2 && score > maxScore) {
          maxScore = score;
          bestHeaderRowIdx = r;
        }
      }

      // Extract and deduplicate headers from the best row
      const headerRow = rawRows[bestHeaderRowIdx] || [];
      const headers: string[] = [];
      const headerCounts: Record<string, number> = {};

      headerRow.forEach((h: any, idx: number) => {
        let name = String(h || '').trim();
        if (!name) {
          name = `Col_${idx + 1}`;
        }
        if (headerCounts[name] !== undefined) {
          headerCounts[name]++;
          name = `${name}_${headerCounts[name]}`;
        } else {
          headerCounts[name] = 1;
        }
        headers.push(name);
      });

      if (headers.length === 0) continue;

      // Build data rows starting after header row
      const dataRows: Record<string, any>[] = [];
      for (let r = bestHeaderRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r] || [];
        const rowObj: Record<string, any> = {};
        let hasData = false;

        headers.forEach((header, idx) => {
          const val = row[idx];
          rowObj[header] = val;
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            hasData = true;
          }
        });

        if (hasData) {
          dataRows.push(rowObj);
        }
      }

      if (dataRows.length > 0) {
        sheets.push({
          name: sName,
          headers,
          rows: dataRows,
          rowCount: dataRows.length,
          detectedAirline: sName,
        });
      }
    }

    if (sheets.length === 0) {
      throw new Error('No se encontraron filas de datos válidas en las hojas del archivo Excel.');
    }

    // Check if any sheet is "Observatorio de Rutas" (User explicit request: "únicamente necesito que de esa base de datos tomes la hoja 'Observatorio de Rutas'")
    const observatorioSheet = sheets.find(s => {
      const norm = normalizeHeader(s.name);
      return norm.includes('observatorio') || norm.includes('observatorio_de_rutas');
    });

    if (observatorioSheet) {
      return {
        fileName,
        sheets: [observatorioSheet],
        activeSheetNames: [observatorioSheet.name],
        isMultiSheet: false,
      };
    }

    return {
      fileName,
      sheets,
      activeSheetNames: sheets.map(s => s.name),
      isMultiSheet: sheets.length > 1,
    };
  }
}

/**
 * Computes high-level aviation stats from routes array
 */
export function computeDatasetStats(routes: FlightRoute[]): DatasetStats {
  if (routes.length === 0) {
    return {
      totalRoutes: 0,
      totalAuthorizations: 0,
      totalOperations: 0,
      avgPassengersPerFlight: 0,
      uniqueOrigins: 0,
      uniqueDestinations: 0,
      totalAirports: 0,
      totalFlights: 0,
      totalPassengers: 0,
      totalDistanceKm: 0,
      topAirline: 'N/A',
      topRoute: 'N/A',
      topAirport: 'N/A',
    };
  }

  const origins = new Set<string>();
  const dests = new Set<string>();
  const airports = new Set<string>();
  const airlineFlights: Record<string, number> = {};
  const airportFreq: Record<string, number> = {};
  const routeFreq: Record<string, number> = {};

  let totalFlights = 0;
  let totalPassengers = 0;
  let totalDistanceKm = 0;

  routes.forEach(r => {
    origins.add(r.originCode);
    dests.add(r.destCode);
    airports.add(r.originCode);
    airports.add(r.destCode);

    totalFlights += r.flightsCount;
    totalPassengers += r.passengers;
    totalDistanceKm += r.distanceKm * r.flightsCount;

    airlineFlights[r.airline] = (airlineFlights[r.airline] || 0) + r.flightsCount;
    airportFreq[r.originCode] = (airportFreq[r.originCode] || 0) + r.flightsCount;
    airportFreq[r.destCode] = (airportFreq[r.destCode] || 0) + r.flightsCount;

    const routeKey = `${r.originCode} ➔ ${r.destCode}`;
    routeFreq[routeKey] = (routeFreq[routeKey] || 0) + r.flightsCount;
  });

  const topAirline = Object.entries(airlineFlights).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const topRoute = Object.entries(routeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const topAirport = Object.entries(airportFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const totalOperations = routes.length;
  const avgPassengersPerFlight = totalFlights > 0 ? Math.round(totalPassengers / totalFlights) : 0;

  return {
    totalRoutes: routes.length,
    totalAuthorizations: routes.length,
    totalOperations,
    avgPassengersPerFlight,
    uniqueOrigins: origins.size,
    uniqueDestinations: dests.size,
    totalAirports: airports.size,
    totalFlights,
    totalPassengers,
    totalDistanceKm,
    topAirline,
    topRoute,
    topAirport,
  };
}

/**
 * Extracts list of unique airports with accumulated metric sums.
 * Guarantees that official airport names and IATA codes are used rather than raw coordinates.
 */
export function extractUniqueAirports(routes: FlightRoute[]): Airport[] {
  const map: Record<string, Airport> = {};

  routes.forEach(r => {
    // 1. Resolve Origin Profile
    let origAirport = resolveAirport(r.originCode, r.originLat, r.originLng);
    if (!origAirport && r.originLat && r.originLng) {
      origAirport = findAirportByCoordinates(r.originLat, r.originLng);
    }

    const origCode = origAirport ? origAirport.code : ((r.originCode && !isCoordinateLike(r.originCode)) ? r.originCode : 'AER');
    const origFullName = origAirport
      ? origAirport.name
      : ((r.originName && !isCoordinateLike(r.originName) && r.originName !== origCode) ? r.originName : `Aeropuerto ${origCode}`);

    if (!map[origCode]) {
      map[origCode] = {
        code: origCode,
        name: origFullName,
        city: origAirport?.city || r.originCity || '',
        state: origAirport?.state || r.originState || '',
        lat: origAirport?.lat || r.originLat,
        lng: origAirport?.lng || r.originLng,
        totalFlights: 0,
        totalPassengers: 0,
        outgoingRoutes: 0,
        incomingRoutes: 0,
      };
    } else {
      if (origAirport) {
        map[origCode].name = origAirport.name;
        map[origCode].city = origAirport.city || map[origCode].city;
        map[origCode].state = origAirport.state || map[origCode].state;
        map[origCode].lat = origAirport.lat;
        map[origCode].lng = origAirport.lng;
      }
    }
    map[origCode].totalFlights! += r.flightsCount;
    map[origCode].totalPassengers! += r.passengers;
    map[origCode].outgoingRoutes! += 1;

    // 2. Resolve Dest Profile
    let destAirport = resolveAirport(r.destCode, r.destLat, r.destLng);
    if (!destAirport && r.destLat && r.destLng) {
      destAirport = findAirportByCoordinates(r.destLat, r.destLng);
    }

    const destCode = destAirport ? destAirport.code : ((r.destCode && !isCoordinateLike(r.destCode)) ? r.destCode : 'AER');
    const destFullName = destAirport
      ? destAirport.name
      : ((r.destName && !isCoordinateLike(r.destName) && r.destName !== destCode) ? r.destName : `Aeropuerto ${destCode}`);

    if (!map[destCode]) {
      map[destCode] = {
        code: destCode,
        name: destFullName,
        city: destAirport?.city || r.destCity || '',
        state: destAirport?.state || r.destState || '',
        lat: destAirport?.lat || r.destLat,
        lng: destAirport?.lng || r.destLng,
        totalFlights: 0,
        totalPassengers: 0,
        outgoingRoutes: 0,
        incomingRoutes: 0,
      };
    } else {
      if (destAirport) {
        map[destCode].name = destAirport.name;
        map[destCode].city = destAirport.city || map[destCode].city;
        map[destCode].state = destAirport.state || map[destCode].state;
        map[destCode].lat = destAirport.lat;
        map[destCode].lng = destAirport.lng;
      }
    }
    map[destCode].totalFlights! += r.flightsCount;
    map[destCode].totalPassengers! += r.passengers;
    map[destCode].incomingRoutes! += 1;
  });

  return Object.values(map);
}

/**
 * Sanitizes and enriches flight routes so that airport codes and names are always official names and IATAs,
 * converting raw numeric coordinates into their respective official airports.
 */
export function sanitizeAndEnrichRoutes(routes: FlightRoute[]): FlightRoute[] {
  return routes.map((r, idx) => {
    // 1. Resolve Origin Airport
    let origAirport = resolveAirport(r.originCode, r.originLat, r.originLng);
    if (!origAirport && r.originLat && r.originLng) {
      origAirport = findAirportByCoordinates(r.originLat, r.originLng);
    }

    // 2. Resolve Destination Airport
    let destAirport = resolveAirport(r.destCode, r.destLat, r.destLng);
    if (!destAirport && r.destLat && r.destLng) {
      destAirport = findAirportByCoordinates(r.destLat, r.destLng);
    }

    // Clean Origin Code & Name (Preserve exact original code if not a raw coordinate)
    let origCode = (r.originCode && !isCoordinateLike(r.originCode))
      ? r.originCode.trim().toUpperCase()
      : (origAirport ? origAirport.code : 'AER');
    let origName = origAirport 
      ? origAirport.name 
      : (r.originName && !isCoordinateLike(r.originName) ? r.originName : `Aeropuerto ${origCode}`);

    // Clean Dest Code & Name (Preserve exact original code if not a raw coordinate)
    let destCode = (r.destCode && !isCoordinateLike(r.destCode))
      ? r.destCode.trim().toUpperCase()
      : (destAirport ? destAirport.code : 'AER');
    let destName = destAirport 
      ? destAirport.name 
      : (r.destName && !isCoordinateLike(r.destName) ? r.destName : `Aeropuerto ${destCode}`);

    return {
      ...r,
      originCode: origCode || r.originCode,
      originName: origName || r.originName,
      originCity: r.originCity || origAirport?.city,
      originState: r.originState || origAirport?.state,
      originLat: origAirport ? origAirport.lat : r.originLat,
      originLng: origAirport ? origAirport.lng : r.originLng,
      destCode: destCode || r.destCode,
      destName: destName || r.destName,
      destCity: r.destCity || destAirport?.city,
      destState: r.destState || destAirport?.state,
      destLat: destAirport ? destAirport.lat : r.destLat,
      destLng: destAirport ? destAirport.lng : r.destLng,
    };
  });
}

/**
 * Deduplicates routes into unique origin-destination corridors for Map Visualization Mode 3.
 * Groups all operating airlines and their authorization dates under each unique corridor.
 * Guarantees that even if a route repeats 2, 3 or more times across airlines or directions,
 * it appears strictly ONCE as a unique corridor.
 */
export function getUniqueRouteCorridors(routes: FlightRoute[]): UniqueRouteCorridor[] {
  const corridorMap = new Map<string, UniqueRouteCorridor>();

  for (const route of routes) {
    // Sort origin and destination alphabetically so that A->B and B->A, or duplicate A->B rows,
    // consolidate into exactly ONE unique corridor on the map
    const [c1, c2] = [route.originCode, route.destCode].sort();
    const key = `${c1} <-> ${c2}`;

    if (!corridorMap.has(key)) {
      const isCanonical = route.originCode === c1;
      const originCode = isCanonical ? route.originCode : route.destCode;
      const originName = isCanonical ? route.originName : route.destName;
      const originCity = isCanonical ? route.originCity : route.destCity;
      const originState = isCanonical ? route.originState : route.destState;
      const originLat = isCanonical ? route.originLat : route.destLat;
      const originLng = isCanonical ? route.originLng : route.destLng;

      const destCode = isCanonical ? route.destCode : route.originCode;
      const destName = isCanonical ? route.destName : route.originName;
      const destCity = isCanonical ? route.destCity : route.originCity;
      const destState = isCanonical ? route.destState : route.originState;
      const destLat = isCanonical ? route.destLat : route.originLat;
      const destLng = isCanonical ? route.destLng : route.originLng;

      corridorMap.set(key, {
        corridorKey: key,
        originCode,
        originName,
        originCity,
        originState,
        originLat,
        originLng,
        destCode,
        destName,
        destCity,
        destState,
        destLat,
        destLng,
        distanceKm: route.distanceKm,
        distanceNm: route.distanceNm,
        flightType: route.flightType,
        totalFlights: 0,
        totalPassengers: 0,
        airlines: [],
      });
    }

    const corridor = corridorMap.get(key)!;
    corridor.totalFlights += route.flightsCount;
    corridor.totalPassengers += route.passengers;

    // Check if this airline is already recorded for this corridor
    const cleanAirline = (route.airline || '').trim();
    const existingOp = corridor.airlines.find(
      a => a.airline.toLowerCase() === cleanAirline.toLowerCase()
    );
    if (existingOp) {
      existingOp.flightsCount += route.flightsCount;
      existingOp.passengers += route.passengers;
      if (!existingOp.authorizationDate && route.authorizationDate) {
        existingOp.authorizationDate = route.authorizationDate;
      }
    } else {
      corridor.airlines.push({
        airline: cleanAirline,
        authorizationDate: route.authorizationDate,
        flightsCount: route.flightsCount,
        passengers: route.passengers,
        aircraft: route.aircraft,
        flightNumber: route.flightNumber,
        period: route.period,
        year: route.year,
        routeId: route.id,
      });
    }
  }

  return Array.from(corridorMap.values());
}

/**
 * Calculates all outgoing direct destination connections for an airport in Map Visualization Mode 1.
 */
export function getAirportConnections(airportCode: string, routes: FlightRoute[]): AirportConnectionDetail[] {
  const destMap = new Map<string, AirportConnectionDetail>();

  routes
    .filter(r => r.originCode === airportCode)
    .forEach(route => {
      if (!destMap.has(route.destCode)) {
        destMap.set(route.destCode, {
          destCode: route.destCode,
          destName: route.destName,
          destCity: route.destCity,
          destState: route.destState,
          destLat: route.destLat,
          destLng: route.destLng,
          distanceKm: route.distanceKm,
          distanceNm: route.distanceNm,
          flightType: route.flightType,
          airlines: [],
          totalFlights: 0,
          totalPassengers: 0,
        });
      }

      const detail = destMap.get(route.destCode)!;
      detail.totalFlights += route.flightsCount;
      detail.totalPassengers += route.passengers;

      const existingOp = detail.airlines.find(a => a.airline.toLowerCase() === route.airline.toLowerCase());
      if (existingOp) {
        existingOp.flightsCount += route.flightsCount;
        existingOp.passengers += route.passengers;
        if (!existingOp.authorizationDate && route.authorizationDate) {
          existingOp.authorizationDate = route.authorizationDate;
        }
      } else {
        detail.airlines.push({
          airline: route.airline,
          authorizationDate: route.authorizationDate,
          flightsCount: route.flightsCount,
          passengers: route.passengers,
          aircraft: route.aircraft,
          flightNumber: route.flightNumber,
          period: route.period,
          year: route.year,
          routeId: route.id,
        });
      }
    });

  return Array.from(destMap.values()).sort((a, b) => b.totalFlights - a.totalFlights);
}

