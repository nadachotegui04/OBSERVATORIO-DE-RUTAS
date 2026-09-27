import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { FlightRoute, Airport } from '../types';
import { generateGreatCircleArc } from './geodesic';
import { getAirlineColor } from '../components/FlightMap';

/**
 * Fallback high-resolution Direct Canvas GIS Renderer
 * Generates an ultra-crisp 2K aeronautical chart if html2canvas meets browser CORS restrictions
 */
async function exportMapDirectCanvas(
  routes: FlightRoute[] = [],
  airports: Airport[] = [],
  filename = 'mapa_rutas_mexico.png',
  customColors?: Record<string, string>
) {
  const width = 2400;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar contexto 2D de Canvas.');

  // 1. High contrast deep aviation radar background
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width);
  bgGrad.addColorStop(0, '#0b132b');
  bgGrad.addColorStop(0.6, '#030712');
  bgGrad.addColorStop(1, '#010409');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Geographic bounds for Mexico + buffer
  const minLat = 13.5;
  const maxLat = 33.5;
  const minLng = -118.5;
  const maxLng = -85.5;

  const project = (lat: number, lng: number): [number, number] => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 240) + 120;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 240) + 120;
    return [x, y];
  };

  // 2. Radar coordinate grid (lat/lng graticule lines)
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);

  for (let lat = 15; lat <= 32; lat += 5) {
    const [, y] = project(lat, minLng);
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(width - 100, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = 'bold 16px "SF Mono", monospace';
    ctx.fillText(`${lat}°N`, 40, y + 5);
  }

  for (let lng = -115; lng <= -85; lng += 5) {
    const [x] = project(minLat, lng);
    ctx.beginPath();
    ctx.moveTo(x, 100);
    ctx.lineTo(x, height - 100);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = 'bold 16px "SF Mono", monospace';
    ctx.fillText(`${Math.abs(lng)}°W`, x - 20, height - 50);
  }
  ctx.restore();

  // 3. Draw All Flight Arcs
  routes.forEach((route) => {
    const arcPoints = generateGreatCircleArc(
      [route.originLat, route.originLng],
      [route.destLat, route.destLng],
      40,
      0.14
    );

    const strokeColor = getAirlineColor(route.airline, customColors);
    const lineWeight = Math.min(8, Math.max(2.5, (route.flightsCount / 500) * 1.5));

    // Outer glow
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWeight + 3;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    arcPoints.forEach((pt, i) => {
      const [px, py] = project(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();

    // Sharp Core Arc
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWeight;
    ctx.globalAlpha = 0.85;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    arcPoints.forEach((pt, i) => {
      const [px, py] = project(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  });

  // 4. Draw Airport Nodes
  airports.forEach((airport) => {
    const [ax, ay] = project(airport.lat, airport.lng);
    const isMajor = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(airport.code);
    const radius = isMajor ? 12 : 7;

    // Glowing Radar Aura
    ctx.save();
    ctx.fillStyle = isMajor ? 'rgba(56, 189, 248, 0.4)' : 'rgba(14, 165, 233, 0.25)';
    ctx.beginPath();
    ctx.arc(ax, ay, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Node Circle
    ctx.fillStyle = isMajor ? '#38bdf8' : '#0ea5e9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ax, ay, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Airport IATA Label
    ctx.font = isMajor ? '900 18px "SF Mono", sans-serif' : 'bold 13px "SF Mono", sans-serif';
    const textWidth = ctx.measureText(airport.code).width;

    // Label pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(ax - textWidth / 2 - 6, ay - radius - 26, textWidth + 12, 20);
    ctx.strokeStyle = isMajor ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - textWidth / 2 - 6, ay - radius - 26, textWidth + 12, 20);

    // Label text
    ctx.fillStyle = isMajor ? '#38bdf8' : '#e2e8f0';
    ctx.fillText(airport.code, ax - textWidth / 2, ay - radius - 11);
    ctx.restore();
  });

  // 5. Header Title Card (Top Left)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(40, 40, 680, 140);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, 680, 140);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 24px -apple-system, sans-serif';
  ctx.fillText('✈️ GIS AVIACIÓN MÉXICO — RUTAS AÉREAS', 65, 80);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillText(`Cartografía geodésica • Gran Círculo • ${new Date().toLocaleDateString('es-MX')}`, 65, 110);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 15px -apple-system, sans-serif';
  const totalPax = routes.reduce((acc, r) => acc + (r.passengers || 0), 0);
  const totalFlights = routes.reduce((acc, r) => acc + (r.flightsCount || 0), 0);
  ctx.fillText(`Rutas: ${routes.length} | Aeropuertos: ${airports.length} | Vuelos: ${totalFlights.toLocaleString()} | Pasajeros: ${(totalPax / 1000000).toFixed(2)}M`, 65, 145);
  ctx.restore();

  // 6. Airline Legend Card (Bottom Right)
  const uniqueAirlines = Array.from(new Set(routes.map((r) => r.airline))).filter(Boolean);
  if (uniqueAirlines.length > 0) {
    const cardHeight = Math.min(420, 70 + uniqueAirlines.slice(0, 10).length * 32);
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(width - 440, height - cardHeight - 40, 400, cardHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width - 440, height - cardHeight - 40, 400, cardHeight);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText('LEYENDA DE AEROLÍNEAS', width - 415, height - cardHeight);

    uniqueAirlines.slice(0, 10).forEach((airline, idx) => {
      const color = getAirlineColor(airline, customColors);
      const ly = height - cardHeight + 40 + idx * 30;

      ctx.fillStyle = color;
      ctx.fillRect(width - 415, ly - 12, 28, 14);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 415, ly - 12, 28, 14);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 14px -apple-system, sans-serif';
      ctx.fillText(airline, width - 375, ly);
    });
    ctx.restore();
  }

  // Trigger Download
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Error al codificar imagen PNG.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Exports DOM element (the map container) to a PNG image file with automatic fail-safe fallback
 */
export async function exportMapToImage(
  elementId: string,
  filename = 'mapa_rutas_mexico.png',
  routes?: FlightRoute[],
  airports?: Airport[],
  customColors?: Record<string, string>
) {
  const element = document.getElementById(elementId);

  // Strategy 1: Attempt html2canvas capture
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        scale: 2, // High resolution
        logging: false,
        backgroundColor: '#020617',
        ignoreElements: (el) => {
          return el.id?.includes('-btn-');
        },
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob && blob.size > 2000) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        return;
      }
    } catch (err) {
      console.warn('html2canvas capture warning, switching to High-Res Direct Canvas GIS Engine:', err);
    }
  }

  // Strategy 2: Direct High-Res Vector Canvas Renderer
  await exportMapDirectCanvas(routes, airports, filename, customColors);
}

/**
 * Exports current routes to formatted Excel (.xlsx) file with multi-sheet airline support
 */
export function exportRoutesToExcel(routes: FlightRoute[], filename = 'rutas_aereas_mexico.xlsx') {
  const workbook = XLSX.utils.book_new();

  const formatRoute = (r: FlightRoute, i: number) => ({
    'ID': i + 1,
    'Origen': r.originCode,
    'Nombre_Aeropuerto_Origen': r.originName,
    'Estado_Origen': r.originState || '',
    'Latitud_Origen': r.originLat,
    'Longitud_Origen': r.originLng,
    'Destino': r.destCode,
    'Nombre_Aeropuerto_Destino': r.destName,
    'Estado_Destino': r.destState || '',
    'Latitud_Destino': r.destLat,
    'Longitud_Destino': r.destLng,
    'Aerolinea': r.airline,
    'Pestaña_Excel': r.sheetName || r.airline,
    'Vuelos': r.flightsCount,
    'Pasajeros': r.passengers,
    'Distancia_KM': r.distanceKm,
    'Distancia_NM': r.distanceNm,
    'Periodo': r.period || '',
    'Año': r.year || '',
    'Aeronave': r.aircraft || '',
    'Tipo_Vuelo': r.flightType,
  });

  // Sheet 1: Master (All routes)
  const allData = routes.map((r, i) => formatRoute(r, i));
  const masterWorksheet = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(workbook, masterWorksheet, 'Todas_Las_Rutas');

  // Individual sheets per Airline
  const routesByAirline: Record<string, FlightRoute[]> = {};
  routes.forEach(r => {
    const key = r.sheetName || r.airline || 'Otras';
    const cleanKey = key.slice(0, 31).replace(/[\\/?*[\]]/g, '_'); // Excel sheet name max 31 chars
    if (!routesByAirline[cleanKey]) {
      routesByAirline[cleanKey] = [];
    }
    routesByAirline[cleanKey].push(r);
  });

  Object.entries(routesByAirline).forEach(([airlineName, airlineRoutes]) => {
    if (airlineName !== 'Todas_Las_Rutas') {
      const sheetData = airlineRoutes.map((r, i) => formatRoute(r, i));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, ws, airlineName);
    }
  });

  XLSX.writeFile(workbook, filename);
}

/**
 * Downloads a pre-formatted Excel template with multiple sheets (pestañas) for each airline
 */
export function downloadExcelTemplate() {
  const workbook = XLSX.utils.book_new();

  const aeromexicoData = [
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'CUN',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional de Cancún',
      'Latitud_Destino': 21.0365,
      'Longitud_Destino': -86.8771,
      'Estado_Destino': 'Quintana Roo',
      'Aerolinea': 'Aeroméxico',
      'Vuelos': 3450,
      'Pasajeros': 620000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Boeing 787-9'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'MTY',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional General Mariano Escobedo',
      'Latitud_Destino': 25.7785,
      'Longitud_Destino': -100.1069,
      'Estado_Destino': 'Nuevo León',
      'Aerolinea': 'Aeroméxico',
      'Vuelos': 4200,
      'Pasajeros': 680000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Boeing 737 MAX 9'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'GDL',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Miguel Hidalgo',
      'Latitud_Destino': 20.5218,
      'Longitud_Destino': -103.3112,
      'Estado_Destino': 'Jalisco',
      'Aerolinea': 'Aeroméxico',
      'Vuelos': 3800,
      'Pasajeros': 590000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Boeing 737-800'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'MID',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Manuel Crescencio Rejón',
      'Latitud_Destino': 20.9370,
      'Longitud_Destino': -89.6577,
      'Estado_Destino': 'Yucatán',
      'Aerolinea': 'Aeroméxico',
      'Vuelos': 2100,
      'Pasajeros': 310000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Embraer 190'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'TIJ',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Abelardo L. Rodríguez',
      'Latitud_Destino': 32.5411,
      'Longitud_Destino': -116.9702,
      'Estado_Destino': 'Baja California',
      'Aerolinea': 'Aeroméxico',
      'Vuelos': 2850,
      'Pasajeros': 460000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Boeing 737 MAX 8'
    }
  ];

  const volarisData = [
    {
      'Origen': 'GDL',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Miguel Hidalgo',
      'Latitud_Origen': 20.5218,
      'Longitud_Origen': -103.3112,
      'Estado_Origen': 'Jalisco',
      'Destino': 'TIJ',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Abelardo L. Rodríguez',
      'Latitud_Destino': 32.5411,
      'Longitud_Destino': -116.9702,
      'Estado_Destino': 'Baja California',
      'Aerolinea': 'Volaris',
      'Vuelos': 3100,
      'Pasajeros': 580000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A321neo'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'CUN',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional de Cancún',
      'Latitud_Destino': 21.0365,
      'Longitud_Destino': -86.8771,
      'Estado_Destino': 'Quintana Roo',
      'Aerolinea': 'Volaris',
      'Vuelos': 3900,
      'Pasajeros': 710000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A320neo'
    },
    {
      'Origen': 'TIJ',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Abelardo L. Rodríguez',
      'Latitud_Origen': 32.5411,
      'Longitud_Origen': -116.9702,
      'Estado_Origen': 'Baja California',
      'Destino': 'CUL',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Federal de Culiacán',
      'Latitud_Destino': 24.7645,
      'Longitud_Destino': -107.4746,
      'Estado_Destino': 'Sinaloa',
      'Aerolinea': 'Volaris',
      'Vuelos': 1950,
      'Pasajeros': 340000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A320'
    },
    {
      'Origen': 'GDL',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Miguel Hidalgo',
      'Latitud_Origen': 20.5218,
      'Longitud_Origen': -103.3112,
      'Estado_Origen': 'Jalisco',
      'Destino': 'CUN',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional de Cancún',
      'Latitud_Destino': 21.0365,
      'Longitud_Destino': -86.8771,
      'Estado_Destino': 'Quintana Roo',
      'Aerolinea': 'Volaris',
      'Vuelos': 2200,
      'Pasajeros': 410000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A321neo'
    }
  ];

  const vivaData = [
    {
      'Origen': 'MTY',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional General Mariano Escobedo',
      'Latitud_Origen': 25.7785,
      'Longitud_Origen': -100.1069,
      'Estado_Origen': 'Nuevo León',
      'Destino': 'CUN',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional de Cancún',
      'Latitud_Destino': 21.0365,
      'Longitud_Destino': -86.8771,
      'Estado_Destino': 'Quintana Roo',
      'Aerolinea': 'VivaAerobus',
      'Vuelos': 3600,
      'Pasajeros': 690000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A321neo'
    },
    {
      'Origen': 'MEX',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Benito Juárez',
      'Latitud_Origen': 19.4363,
      'Longitud_Origen': -99.0721,
      'Estado_Origen': 'CDMX',
      'Destino': 'MTY',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional General Mariano Escobedo',
      'Latitud_Destino': 25.7785,
      'Longitud_Destino': -100.1069,
      'Estado_Destino': 'Nuevo León',
      'Aerolinea': 'VivaAerobus',
      'Vuelos': 3900,
      'Pasajeros': 740000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A321neo'
    },
    {
      'Origen': 'NLU',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional Felipe Ángeles (AIFA)',
      'Latitud_Origen': 19.7439,
      'Longitud_Origen': -99.0142,
      'Estado_Origen': 'Estado de México',
      'Destino': 'CUN',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional de Cancún',
      'Latitud_Destino': 21.0365,
      'Longitud_Destino': -86.8771,
      'Estado_Destino': 'Quintana Roo',
      'Aerolinea': 'VivaAerobus',
      'Vuelos': 2400,
      'Pasajeros': 460000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A320neo'
    },
    {
      'Origen': 'MTY',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Internacional General Mariano Escobedo',
      'Latitud_Origen': 25.7785,
      'Longitud_Origen': -100.1069,
      'Estado_Origen': 'Nuevo León',
      'Destino': 'GDL',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Miguel Hidalgo',
      'Latitud_Destino': 20.5218,
      'Longitud_Destino': -103.3112,
      'Estado_Destino': 'Jalisco',
      'Aerolinea': 'VivaAerobus',
      'Vuelos': 2800,
      'Pasajeros': 520000,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Airbus A320'
    }
  ];

  const tarData = [
    {
      'Origen': 'QRO',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Intercontinental de Querétaro',
      'Latitud_Origen': 20.6173,
      'Longitud_Origen': -100.1856,
      'Estado_Origen': 'Querétaro',
      'Destino': 'MTY',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional General Mariano Escobedo',
      'Latitud_Destino': 25.7785,
      'Longitud_Destino': -100.1069,
      'Estado_Destino': 'Nuevo León',
      'Aerolinea': 'TAR Aerolíneas',
      'Vuelos': 720,
      'Pasajeros': 32400,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Embraer ERJ 145'
    },
    {
      'Origen': 'QRO',
      'Nombre_Aeropuerto_Origen': 'Aeropuerto Intercontinental de Querétaro',
      'Latitud_Origen': 20.6173,
      'Longitud_Origen': -100.1856,
      'Estado_Origen': 'Querétaro',
      'Destino': 'GDL',
      'Nombre_Aeropuerto_Destino': 'Aeropuerto Internacional Miguel Hidalgo',
      'Latitud_Destino': 20.5218,
      'Longitud_Destino': -103.3112,
      'Estado_Destino': 'Jalisco',
      'Aerolinea': 'TAR Aerolíneas',
      'Vuelos': 680,
      'Pasajeros': 30600,
      'Año': 2025,
      'Periodo': '2025-Anual',
      'Aeronave': 'Embraer ERJ 145'
    }
  ];

  // Append each airline as a separate sheet (pestaña)
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(aeromexicoData), 'Aeroméxico');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(volarisData), 'Volaris');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vivaData), 'VivaAerobus');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tarData), 'TAR Aerolíneas');

  XLSX.writeFile(workbook, 'plantilla_rutas_aereas_mexico_multi_pestañas.xlsx');
}

/**
 * Generates an interactive standalone HTML file with Leaflet map, Great Circle flight arcs and popups
 */
export function exportMapToStandaloneHtml(
  routes: FlightRoute[],
  airports: Airport[],
  title = 'Visualización de Rutas Aéreas México',
  customColors?: Record<string, string>
) {
  const routesDataJson = JSON.stringify(
    routes.map(r => ({
      orig: r.originCode,
      origName: r.originName,
      origLat: r.originLat,
      origLng: r.originLng,
      dest: r.destCode,
      destName: r.destName,
      destLat: r.destLat,
      destLng: r.destLng,
      airline: r.airline,
      flights: r.flightsCount,
      passengers: r.passengers,
      distanceKm: r.distanceKm,
      arc: generateGreatCircleArc([r.originLat, r.originLng], [r.destLat, r.destLng], 25, 0.12),
    }))
  );

  const airportsDataJson = JSON.stringify(airports);
  const customColorsJson = JSON.stringify(customColors || {});

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body, html, #map { width: 100%; height: 100%; background: #0b0f19; overflow: hidden; }
    .header {
      position: absolute; top: 16px; left: 16px; z-index: 1000;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
      padding: 14px 20px; color: #f8fafc; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .header h1 { font-size: 18px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .header p { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .stats {
      position: absolute; bottom: 20px; left: 16px; z-index: 1000;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
      padding: 10px 16px; color: #f8fafc; font-size: 12px; display: flex; gap: 16px;
    }
    .stat-val { font-weight: 700; color: #38bdf8; font-size: 14px; }
    .legend {
      position: absolute; bottom: 20px; right: 16px; z-index: 1000;
      background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
      padding: 12px 16px; color: #f8fafc; font-size: 12px; max-height: 200px; overflow-y: auto;
    }
    .legend-title { font-weight: bold; color: #38bdf8; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; }
    .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .legend-color { width: 14px; height: 6px; border-radius: 2px; }
    .airport-marker {
      background: #0ea5e9; border: 2px solid #ffffff; border-radius: 50%;
      box-shadow: 0 0 10px #0ea5e9; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 9px; cursor: pointer;
    }
    .leaflet-popup-content-wrapper {
      background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 8px;
    }
    .leaflet-popup-tip { background: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✈️ ${title}</h1>
    <p>Visualización GIS interactiva sobre la República Mexicana</p>
  </div>

  <div class="stats">
    <div>Rutas: <span class="stat-val">${routes.length}</span></div>
    <div>Aeropuertos: <span class="stat-val">${airports.length}</span></div>
  </div>

  <div id="legend" class="legend">
    <div class="legend-title">Aerolíneas</div>
    <div id="legend-items"></div>
  </div>

  <div id="map"></div>

  <script>
    const routes = ${routesDataJson};
    const airports = ${airportsDataJson};
    const customColors = ${customColorsJson};

    const map = L.map('map', {
      center: [23.6345, -102.5528],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14
    });

    // Dark Canvas Basemap (Free, high-contrast, no watermark)
    L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; OpenStreetMap contributors'
    }).addTo(map);

    const defaultAirlineColors = {
      'Aeroméxico': '#0284c7',
      'Volaris': '#a855f7',
      'VivaAerobus': '#10b981',
      'TAR Aerolíneas': '#f59e0b',
      'Default': '#06b6d4'
    };

    function getColor(airline) {
      if (customColors[airline]) return customColors[airline];
      for (const [k, v] of Object.entries(customColors)) {
        if (k.toLowerCase() === (airline || '').toLowerCase()) return v;
      }
      return defaultAirlineColors[airline] || defaultAirlineColors['Default'];
    }

    // Populate Legend
    const uniqueAirlines = Array.from(new Set(routes.map(r => r.airline))).filter(Boolean);
    const legendEl = document.getElementById('legend-items');
    uniqueAirlines.forEach(airline => {
      const col = getColor(airline);
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.innerHTML = '<span class="legend-color" style="background:'+col+'"></span><span>'+airline+'</span>';
      legendEl.appendChild(row);
    });

    // Draw Great Circle Route Arcs
    routes.forEach(r => {
      const color = getColor(r.airline);
      const polyline = L.polyline(r.arc, {
        color: color,
        weight: Math.min(5, Math.max(2, (r.flights / 600))),
        opacity: 0.75,
        smoothFactor: 1
      }).addTo(map);

      polyline.bindPopup(\`
        <div style="font-size:13px; min-width: 200px;">
          <div style="font-weight: bold; color: \${color}; font-size:14px; margin-bottom:4px;">
            \${r.orig} ➔ \${r.dest}
          </div>
          <div>\${r.origName} ➔ \${r.destName}</div>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 6px 0;" />
          <div><strong>Aerolínea:</strong> \${r.airline}</div>
          <div><strong>Vuelos anuales:</strong> \${r.flights.toLocaleString()}</div>
          <div><strong>Pasajeros:</strong> \${r.passengers.toLocaleString()}</div>
          <div><strong>Distancia:</strong> \${r.distanceKm} km</div>
        </div>
      \`);

      polyline.on('mouseover', function(e) {
        this.setStyle({ weight: 6, opacity: 1 });
      });
      polyline.on('mouseout', function(e) {
        this.setStyle({ weight: Math.min(5, Math.max(2, (r.flights / 600))), opacity: 0.75 });
      });
    });

    // Draw Airports Markers
    airports.forEach(a => {
      const marker = L.circleMarker([a.lat, a.lng], {
        radius: Math.min(10, Math.max(5, Math.sqrt(a.totalFlights || 100) / 10)),
        fillColor: '#38bdf8',
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);

      marker.bindPopup(\`
        <div style="font-size:13px; min-width: 180px;">
          <div style="font-weight: bold; color: #38bdf8; font-size:15px;">\${a.code}</div>
          <div style="font-size:12px; color:#cbd5e1;">\${a.name}</div>
          <div style="font-size:11px; color:#94a3b8;">\${a.city || ''} \${a.state ? '('+a.state+')' : ''}</div>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 6px 0;" />
          <div><strong>Número de Autorizaciones:</strong> \${(a.totalFlights || 0).toLocaleString()}</div>
          <div><strong>Pasajeros totales:</strong> \${(a.totalPassengers || 0).toLocaleString()}</div>
        </div>
      \`);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'mapa_rutas_aereas_mexico.html';
  link.click();
}
