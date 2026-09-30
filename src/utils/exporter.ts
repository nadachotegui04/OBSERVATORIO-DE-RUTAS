import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { FlightRoute, Airport } from '../types';
import { generateGreatCircleArc } from './geodesic';
import { getAirlineColor } from '../components/FlightMap';
import mexicoStatesData from '../data/mexicoStates.json';

export const AIRLINE_TO_IATA: Record<string, string> = {
  aeromexico: 'AM',
  'aerovias de mexico': 'AM',
  'aeromexico connect': '5D',
  aerolitoral: '5D',
  volaris: 'Y4',
  'concesionaria vuela': 'Y4',
  'concesionaria vuela compania de aviacion': 'Y4',
  vivaaerobus: 'VB',
  'viva aerobus': 'VB',
  viva: 'VB',
  'aeroenlaces nacionales': 'VB',
  aeroenlaces: 'VB',
  tar: 'YQ',
  'tar aerolineas': 'YQ',
  'link conexion aerea': 'YQ',
  'link conexion': 'YQ',
  'aereo calafia': 'A3',
  calafia: 'A3',
  mexicana: 'MX',
  'mexicana de aviacion': 'MX',
  'aerolinea del estado mexicano': 'MX',
  magnicharters: 'UJ',
  'grupo aereo monterrey': 'UJ',
  aerus: 'ZV',
  'aerotransportes rafilher': 'ZV',
  interjet: '4O',
  'abc aerolineas': '4O',
  aeromar: 'VW',
  'transportes aeromar': 'VW',
  estafeta: 'E7',
  'estafeta carga aerea': 'E7',
  mas: 'M7',
  'mas air': 'M7',
  masair: 'M7',
  'aerotransportes mas de carga': 'M7',
  tsm: 'VTM',
  'aeronaves tsm': 'VTM',
  'tm aerolineas': 'T2',
  tum: 'T2',
  'tum aerocarga': 'T2',
  aerounion: '6R',
  'aerotransporte de carga union': '6R',
  aerotucan: 'RT',
  'aereo servicio guerrero': 'SG',
  'maya air': '2M',
  'american airlines': 'AA',
  american: 'AA',
  'united airlines': 'UA',
  united: 'UA',
  delta: 'DL',
  'delta air lines': 'DL',
  copa: 'CM',
  'copa airlines': 'CM',
  avianca: 'AV',
  iberia: 'IB',
  'air france': 'AF',
  lufthansa: 'LH',
  'british airways': 'BA',
  klm: 'KL',
  latam: 'LA',
  'air canada': 'AC',
  southwest: 'WN',
  alaska: 'AS',
};

/**
 * Returns the 2-3 character official IATA code for an airline name.
 * Dynamically resolves normalized names, variations, or returns uppercase fallback.
 */
export function getAirlineIataCode(airlineName: string): string {
  if (!airlineName || typeof airlineName !== 'string') return '';
  const trimmed = airlineName.trim();
  if (/^[A-Z0-9]{2,3}$/.test(trimmed)) return trimmed;
  const norm = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, code] of Object.entries(AIRLINE_TO_IATA)) {
    if (norm === key || norm.includes(key) || key.includes(norm)) {
      return code;
    }
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Generates dynamic, descriptive filenames reacting to the active session filters,
 * explicitly embedding the IATA codes of the chosen airlines.
 */
export function generateExportFilename(options: {
  prefix?: string;
  routes?: FlightRoute[];
  selectedAirlines?: string[];
  airlineA?: string;
  airlineB?: string;
  extension: 'png' | 'html' | 'xlsx';
  isDual?: boolean;
}): string {
  const {
    prefix = 'mapa_rutas_mexico',
    routes = [],
    selectedAirlines = [],
    airlineA,
    airlineB,
    extension,
    isDual = false,
  } = options;
  const dateStr = new Date().toISOString().slice(0, 10);

  if (isDual) {
    const codeA = !airlineA || airlineA === 'all' || airlineA.includes('Todas') ? 'TODAS' : getAirlineIataCode(airlineA);
    const codeB = !airlineB || airlineB === 'all' || airlineB.includes('Todas') ? 'TODAS' : getAirlineIataCode(airlineB);
    return `comparativa_dual_${codeA}_vs_${codeB}_${dateStr}.${extension}`;
  }

  let iataTag = '';
  if (selectedAirlines && selectedAirlines.length > 0) {
    const codes = Array.from(new Set(selectedAirlines.map(getAirlineIataCode).filter(Boolean)));
    if (codes.length <= 4) {
      iataTag = codes.join('_');
    } else {
      iataTag = `${codes.slice(0, 3).join('_')}_etc`;
    }
  } else if (routes && routes.length > 0) {
    const uniqueAirlines = Array.from(new Set(routes.map((r) => r.airline))).filter(Boolean) as string[];
    if (uniqueAirlines.length === 1) {
      iataTag = getAirlineIataCode(uniqueAirlines[0]);
    } else if (uniqueAirlines.length <= 3) {
      iataTag = uniqueAirlines.map(getAirlineIataCode).filter(Boolean).join('_');
    } else {
      iataTag = 'TODAS';
    }
  }

  const cleanPrefix = prefix.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (iataTag) {
    return `${cleanPrefix}_${iataTag}_${dateStr}.${extension}`;
  }
  return `${cleanPrefix}_${dateStr}.${extension}`;
}

// Vector coordinates for Mexican Republic mainland and Baja California peninsula
export const MEXICO_MAINLAND_OUTLINE: [number, number][] = [
  [32.53, -117.12], [32.40, -114.72], [31.75, -114.60], [31.30, -113.55],
  [31.25, -113.15], [30.50, -112.90], [28.90, -112.00], [27.90, -111.00],
  [25.80, -109.30], [24.80, -108.00], [23.20, -106.40], [21.50, -105.20],
  [20.60, -105.25], [19.05, -104.30], [18.00, -102.20], [16.85, -99.90],
  [15.75, -96.15], [16.20, -94.00], [14.65, -92.25], [14.90, -91.90],
  [16.05, -90.95], [17.80, -89.15], [18.50, -88.30], [20.20, -87.45],
  [21.15, -86.85], [21.55, -87.10], [21.55, -88.15], [21.35, -90.00],
  [19.85, -90.55], [18.65, -91.80], [18.40, -93.15], [18.15, -94.40],
  [19.20, -96.15], [20.95, -97.35], [22.25, -97.85], [24.00, -97.75],
  [25.95, -97.15], [26.05, -97.50], [27.50, -99.50], [28.70, -100.50],
  [29.30, -101.00], [29.80, -102.75], [31.35, -105.65], [31.75, -106.50],
  [31.75, -108.20], [31.33, -108.20], [31.33, -111.00], [32.50, -114.75],
  [32.72, -114.72], [32.53, -117.12]
];

export const BAJA_PENINSULA_OUTLINE: [number, number][] = [
  [32.53, -117.12], [31.85, -116.60], [30.00, -115.80], [28.00, -114.10],
  [26.75, -113.15], [24.50, -111.70], [22.88, -109.90], [24.15, -110.30],
  [26.00, -111.35], [27.35, -112.30], [28.95, -113.55], [30.50, -114.70],
  [31.75, -114.60], [32.40, -114.72], [32.53, -117.12]
];

/**
 * Fallback high-resolution Direct Canvas GIS Renderer
 * Generates an ultra-crisp 2K aeronautical chart respecting active mapMode and Mexico geography
 */
async function exportMapDirectCanvas(
  routes: FlightRoute[] = [],
  airports: Airport[] = [],
  filename = 'mapa_rutas_mexico.png',
  customColors?: Record<string, string>,
  mapMode: string = 'routes_by_airline'
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

  // 2.5 Draw Republic of Mexico Coastlines & Borders
  const drawMexicoShape = (pts: [number, number][]) => {
    ctx.save();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.04)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([lat, lng], idx) => {
      const [px, py] = project(lat, lng);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawMexicoShape(MEXICO_MAINLAND_OUTLINE);
  drawMexicoShape(BAJA_PENINSULA_OUTLINE);

  // 3. Draw Flight Arcs (ONLY IF NOT IN MODE 1: AIRPORTS ONLY)
  if (mapMode !== 'airports') {
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
  }

  // 4. Draw Airport Nodes
  airports.forEach((airport) => {
    const [ax, ay] = project(airport.lat, airport.lng);
    const isMajor = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(airport.code);
    const radius = isMajor ? 11 : 7;

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
    ctx.font = isMajor ? '900 17px "SF Mono", sans-serif' : 'bold 12px "SF Mono", sans-serif';
    const textWidth = ctx.measureText(airport.code).width;

    // Single label pill background (no double box)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(ax - textWidth / 2 - 5, ay - radius - 24, textWidth + 10, 18);
    ctx.strokeStyle = isMajor ? '#38bdf8' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - textWidth / 2 - 5, ay - radius - 24, textWidth + 10, 18);

    // Label text
    ctx.fillStyle = isMajor ? '#38bdf8' : '#e2e8f0';
    ctx.fillText(airport.code, ax - textWidth / 2, ay - radius - 10);
    ctx.restore();
  });

  // 5. Official Institutional Header Title Card (Top Left)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(40, 40, 780, 160);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 780, 160);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 24px -apple-system, sans-serif';
  ctx.fillText('Observatorio de Conectividad Aerocomercial', 65, 76);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px -apple-system, sans-serif';
  ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', 65, 102);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 12.5px -apple-system, sans-serif';
  ctx.fillText('DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO', 65, 124);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12.5px -apple-system, sans-serif';
  ctx.fillText('COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO', 65, 144);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px "SF Mono", monospace, sans-serif';
  const modeSubtitle = mapMode === 'airports'
    ? `Visualización 1: Aeropuertos y Hubs  |  Aeropuertos activos: ${airports.length}`
    : `Rutas activas en mapa: ${routes.length}  |  Aeropuertos: ${airports.length}`;
  ctx.fillText(modeSubtitle, 65, 178);
  ctx.restore();

  // 6. Airline Legend Card (Bottom Right) - Only when routes exist
  const uniqueAirlines = Array.from(new Set(routes.map((r) => r.airline))).filter(Boolean);
  if (mapMode !== 'airports' && uniqueAirlines.length > 0) {
    const itemsPerCol = 14;
    const numCols = Math.ceil(uniqueAirlines.length / itemsPerCol);
    const colWidth = 260;
    const cardWidth = Math.max(380, numCols * colWidth + 40);
    const cardHeight = Math.min(600, 60 + Math.min(itemsPerCol, uniqueAirlines.length) * 28);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(width - cardWidth - 40, height - cardHeight - 40, cardWidth, cardHeight);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width - cardWidth - 40, height - cardHeight - 40, cardWidth, cardHeight);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText(`VIÑETA CROMÁTICA DE AEROLÍNEAS (${uniqueAirlines.length})`, width - cardWidth - 20, height - cardHeight - 15);

    uniqueAirlines.forEach((airline, idx) => {
      const col = Math.floor(idx / itemsPerCol);
      const row = idx % itemsPerCol;
      const color = getAirlineColor(airline, customColors);
      const lx = width - cardWidth - 20 + col * colWidth;
      const ly = height - cardHeight + 25 + row * 26;

      ctx.fillStyle = color;
      ctx.fillRect(lx, ly - 11, 24, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly - 11, 24, 12);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 12px "SF Mono", monospace, sans-serif';
      ctx.fillText(airline.length > 24 ? airline.slice(0, 23) + '…' : airline, lx + 32, ly);
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
 * Direct Leaflet DOM Screen Compositor
 * Captures loaded map tiles, Mexico states vector boundaries, great-circle flight arcs,
 * and airport markers with exact 1:1 mathematical precision matching the on-screen zoom and center.
 */
async function captureLeafletDomToCanvas(
  element: HTMLElement,
  routes: FlightRoute[] = [],
  airports: Airport[] = [],
  customColors?: Record<string, string>,
  mapMode = 'routes_by_airline'
): Promise<HTMLCanvasElement | null> {
  try {
    const map = (element as any)?._leaflet_map ||
      (element.querySelector('.leaflet-container') as any)?._leaflet_map ||
      ((window as any)[`__leaflet_map_${element.id}`]) ||
      (element.id ? (document.getElementById(element.id) as any)?._leaflet_map : null);
    const rect = element.getBoundingClientRect();
    const width = Math.round(map && map.getSize ? map.getSize().x : rect.width);
    const height = Math.round(map && map.getSize ? map.getSize().y : rect.height);
    if (width <= 50 || height <= 50) return null;

    const scale = 2; // Crisp 2x retina export
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // 1. Base dark aviation radar background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Coordinate projection function strictly locked to Leaflet's active screen viewport
    const project = (lat: number, lng: number): [number, number] => {
      if (map && typeof map.latLngToContainerPoint === 'function') {
        const pt = map.latLngToContainerPoint([lat, lng]);
        return [pt.x, pt.y];
      }
      return [width / 2, height / 2];
    };

    // 2. Draw loaded base map tiles safely (check with 1x1 scratch canvas to guarantee NO tainting)
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1;
    testCanvas.height = 1;
    const testCtx = testCanvas.getContext('2d');

    const tiles = element.querySelectorAll('img.leaflet-tile') as NodeListOf<HTMLImageElement>;
    tiles.forEach((tile) => {
      if (!tile.complete || tile.naturalWidth === 0) return;
      const tRect = tile.getBoundingClientRect();
      const x = tRect.left - rect.left;
      const y = tRect.top - rect.top;
      const w = tRect.width;
      const h = tRect.height;
      if (x + w < 0 || y + h < 0 || x > width || y > height) return;
      
      let isCORSValid = false;
      if (testCtx) {
        try {
          testCtx.clearRect(0, 0, 1, 1);
          testCtx.drawImage(tile, 0, 0, 1, 1);
          testCanvas.toDataURL();
          isCORSValid = true;
        } catch {
          isCORSValid = false;
        }
      }
      if (isCORSValid) {
        try {
          ctx.drawImage(tile, x, y, w, h);
        } catch {}
      }
    });

    // 3. Draw Republic of Mexico 32 States GeoJSON boundaries (exact 1:1 projection)
    if (mexicoStatesData && Array.isArray((mexicoStatesData as any).features)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.fillStyle = 'rgba(14, 116, 144, 0.04)';
      (mexicoStatesData as any).features.forEach((feature: any) => {
        const geom = feature.geometry;
        if (!geom) return;
        const drawPolygonCoords = (ring: number[][]) => {
          ctx.beginPath();
          ring.forEach(([lng, lat], i) => {
            const [px, py] = project(lat, lng);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };

        if (geom.type === 'Polygon') {
          geom.coordinates.forEach(drawPolygonCoords);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly: any) => poly.forEach(drawPolygonCoords));
        }
      });
      ctx.restore();
    }

    // 4. Draw flight routes: exact GreatCircle arc points projected through Leaflet map
    if (mapMode !== 'airports') {
      routes.forEach((route) => {
        const arcPoints = generateGreatCircleArc(
          [route.originLat, route.originLng],
          [route.destLat, route.destLng],
          35,
          0.14
        );

        const strokeColor = getAirlineColor(route.airline, customColors);
        const lineWeight = Math.min(6, Math.max(2, (route.flightsCount / 500) * 1.5));

        // Glow
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWeight + 2.5;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        arcPoints.forEach((pt, i) => {
          const [px, py] = project(pt[0], pt[1]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();

        // Core line
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWeight;
        ctx.globalAlpha = 0.88;
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
    }

    // 5. Draw airport nodes and IATA labels
    airports.forEach((airport) => {
      const [ax, ay] = project(airport.lat, airport.lng);
      if (ax < -30 || ay < -30 || ax > width + 30 || ay > height + 30) return;
      const isMajor = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(airport.code);
      const radius = isMajor ? 7.5 : 5.5;

      ctx.save();
      // Glow
      ctx.fillStyle = '#06b6d4';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(ax, ay, radius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Sharp dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = isMajor ? '#38bdf8' : '#0ea5e9';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // IATA Label
      ctx.save();
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const tw = ctx.measureText(airport.code).width;
      const labelW = tw + 8;
      const labelH = 15;
      const lx = ax - labelW / 2;
      const ly = ay - radius - labelH - 2;

      ctx.fillStyle = 'rgba(11, 15, 25, 0.95)';
      ctx.fillRect(lx, ly, labelW, labelH);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly, labelW, labelH);

      ctx.fillStyle = '#38bdf8';
      ctx.textBaseline = 'middle';
      ctx.fillText(airport.code, lx + 4, ly + labelH / 2);
      ctx.restore();
    });

    // 6. Institutional AFAC Header Title Card
    ctx.save();
    const cardW = Math.min(width - 40, 560);
    const cardH = 95;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(20, 20, cardW, cardH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, cardW, cardH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText('Observatorio de Conectividad Aerocomercial', 35, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', 35, 66);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px -apple-system, sans-serif';
    ctx.fillText('DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO', 35, 82);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace, sans-serif';
    const modeLabel = mapMode === 'airports'
      ? `Visualización 1: Aeropuertos y Hubs (${airports.length} aeropuertos activos)`
      : mapMode === 'unique_routes'
      ? `Visualización 3: Rutas Únicas (${routes.length} autorizaciones consolidadas)`
      : `Visualización 2: Rutas Autorizadas (${routes.length} rutas • ${airports.length} aeropuertos)`;
    ctx.fillText(modeLabel, 35, 98);
    ctx.restore();

    // 7. LEYENDA Y VIÑETA CROMÁTICA DE AEROLÍNEAS CON CÓDIGOS IATA
    const airlineCounts: Record<string, number> = {};
    routes.forEach((r) => {
      if (r.airline && r.airline.trim()) {
        const a = r.airline.trim();
        airlineCounts[a] = (airlineCounts[a] || 0) + 1;
      }
    });
    const uniqueAirlines = Object.entries(airlineCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([airline, count]) => ({
        airline,
        count,
        iata: getAirlineIataCode(airline),
        color: getAirlineColor(airline, customColors),
      }));

    if (uniqueAirlines.length > 0) {
      const itemsPerCol = Math.min(10, Math.max(3, Math.ceil(uniqueAirlines.length / 3)));
      const numCols = Math.ceil(uniqueAirlines.length / itemsPerCol);
      const colW = 220;
      const legW = Math.min(width - 40, Math.max(320, numCols * colW + 30));
      const legH = 38 + itemsPerCol * 24;
      const legX = width - legW - 20;
      const legY = height - legH - 20;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(legX, legY, legW, legH);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(legX, legY, legW, legH);

      // Legend Title
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(`LEYENDA & VIÑETAS CROMÁTICAS (${uniqueAirlines.length} AEROLÍNEAS)`, legX + 15, legY + 22);

      uniqueAirlines.forEach((item, idx) => {
        const col = Math.floor(idx / itemsPerCol);
        const row = idx % itemsPerCol;
        const ix = legX + 15 + col * colW;
        const iy = legY + 44 + row * 24;

        // Colored swatch/bullet with crisp white outline
        ctx.fillStyle = item.color;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(ix, iy - 10, 18, 12, 3);
        } else {
          ctx.rect(ix, iy - 10, 18, 12);
        }
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // IATA badge
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(ix + 24, iy - 10, 24, 12);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.strokeRect(ix + 24, iy - 10, 24, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.iata, ix + 36, iy - 4);

        // Airline name and count
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 10px -apple-system, sans-serif';
        const displayName = item.airline.length > 18 ? item.airline.slice(0, 17) + '…' : item.airline;
        ctx.fillText(`${displayName} (${item.count})`, ix + 54, iy - 4);
      });
      ctx.restore();
    }

    return canvas;
  } catch (err) {
    console.warn('captureLeafletDomToCanvas error:', err);
    return null;
  }
}

/**
 * Creates an untainted, mathematically precise vector map canvas aligned with current Leaflet view
 */
function createVectorMapCanvas(
  element: HTMLElement,
  routes: FlightRoute[] = [],
  airports: Airport[] = [],
  customColors?: Record<string, string>,
  mapMode = 'routes_by_airline'
): HTMLCanvasElement | null {
  try {
    const map = (element as any)?._leaflet_map;
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width <= 50 || height <= 50) return null;

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);

    // 1. Radar background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#0b132b');
    bgGrad.addColorStop(0.6, '#030712');
    bgGrad.addColorStop(1, '#010409');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Geographic projection helper
    const project = (lat: number, lng: number): [number, number] => {
      if (map && typeof map.latLngToContainerPoint === 'function') {
        const pt = map.latLngToContainerPoint([lat, lng]);
        return [pt.x, pt.y];
      }
      const minLat = 13.5, maxLat = 33.5, minLng = -118.5, maxLng = -85.5;
      const x = ((lng - minLng) / (maxLng - minLng)) * (width - 160) + 80;
      const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 160) + 80;
      return [x, y];
    };

    // 2. Graticule lines
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (let lat = 15; lat <= 32; lat += 5) {
      const [, y] = project(lat, -118);
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${lat}°N`, 12, y + 4);
    }
    for (let lng = -115; lng <= -85; lng += 5) {
      const [x] = project(14, lng);
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, height - 30);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${Math.abs(lng)}°W`, x - 15, height - 12);
    }
    ctx.restore();

    // 3. Republic of Mexico Coastlines & Borders (Guaranteed presence in all screenshots)
    const drawShape = (pts: [number, number][]) => {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.06)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      pts.forEach(([lat, lng], idx) => {
        const [px, py] = project(lat, lng);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawShape(MEXICO_MAINLAND_OUTLINE);
    drawShape(BAJA_PENINSULA_OUTLINE);

    // 4. Flight Arcs: ONLY IF NOT IN MODE 1 (airports)
    if (mapMode !== 'airports') {
      routes.forEach((route) => {
        const arcPoints = generateGreatCircleArc(
          [route.originLat, route.originLng],
          [route.destLat, route.destLng],
          35,
          0.14
        );
        const strokeColor = getAirlineColor(route.airline, customColors);
        const lineWeight = Math.min(6, Math.max(2, (route.flightsCount / 500) * 1.5));

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

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWeight;
        ctx.globalAlpha = 0.85;
        ctx.lineCap = 'round';
        ctx.beginPath();
        arcPoints.forEach((pt, i) => {
          const [px, py] = project(pt[0], pt[1]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    // 5. Draw airport markers from DOM at their exact screen positions
    const markerIcons = element.querySelectorAll('.leaflet-marker-icon') as NodeListOf<HTMLElement>;
    if (markerIcons.length > 0) {
      markerIcons.forEach((m) => {
        const mRect = m.getBoundingClientRect();
        const cx = mRect.left - rect.left + mRect.width / 2;
        const cy = mRect.top - rect.top + mRect.height / 2;
        if (cx < 0 || cy < 0 || cx > width || cy > height) return;
        const pin = m.querySelector('.airport-pin') as HTMLElement | null;
        const pinBg = pin ? window.getComputedStyle(pin).backgroundColor : '#06b6d4';
        const pinRadius = pin ? Math.max(4, pin.offsetWidth / 2) : 7;

        ctx.save();
        ctx.fillStyle = pinBg;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, pinRadius + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = pinBg;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pinRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    } else {
      airports.forEach((airport) => {
        const [ax, ay] = project(airport.lat, airport.lng);
        ctx.save();
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ax, ay, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    // 6. Draw IATA labels from DOM at their exact screen positions
    const badges = element.querySelectorAll('.airport-iata-badge') as NodeListOf<HTMLElement>;
    badges.forEach((badge) => {
      const bRect = badge.getBoundingClientRect();
      const x = bRect.left - rect.left;
      const y = bRect.top - rect.top;
      const w = bRect.width;
      const h = bRect.height;
      if (x + w < 0 || y + h < 0 || x > width || y > height) return;

      ctx.save();
      ctx.fillStyle = 'rgba(11, 15, 25, 0.95)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = window.getComputedStyle(badge).borderColor || 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      const text = badge.textContent?.trim() || '';
      ctx.fillStyle = window.getComputedStyle(badge).color || '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + 4, y + h / 2);
      ctx.restore();
    });

    // 7. Official AFAC Header
    ctx.save();
    const cardW = Math.min(width - 40, 560);
    const cardH = 95;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(20, 20, cardW, cardH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, cardW, cardH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText('Observatorio de Conectividad Aerocomercial', 35, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', 35, 66);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px -apple-system, sans-serif';
    ctx.fillText('DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO', 35, 82);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    const modeLabel = mapMode === 'airports'
      ? `Visualización 1: Aeropuertos y Hubs (${airports.length} aeropuertos activos)`
      : mapMode === 'unique_routes'
      ? `Visualización 3: Rutas Únicas (${routes.length} autorizaciones consolidadas)`
      : `Visualización 2: Rutas Autorizadas (${routes.length} rutas • ${airports.length} aeropuertos)`;
    ctx.fillText(modeLabel, 35, 98);
    ctx.restore();

    return canvas;
  } catch (err) {
    console.warn('createVectorMapCanvas error:', err);
    return null;
  }
}

/**
 * Exports DOM element (the map container) to a PNG image file with automatic fail-safe fallback
 */
export async function exportMapToImage(
  elementId: string,
  filename = 'mapa_rutas_mexico.png',
  routes: FlightRoute[] = [],
  airports: Airport[] = [],
  customColors?: Record<string, string>,
  mapMode = 'routes_by_airline'
) {
  const element = document.getElementById(elementId);

  // Strategy 1: Direct DOM Canvas Compositor (captures exact current zoom, tiles, markers, and mode)
  if (element) {
    const directCanvas = await captureLeafletDomToCanvas(element, routes, airports, customColors, mapMode);
    if (directCanvas) {
      const blob = await new Promise<Blob | null>((resolve) => directCanvas.toBlob(resolve, 'image/png'));
      if (blob && blob.size > 2000) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        return;
      }
    }
  }

  // Strategy 2: Attempt html2canvas capture with Leaflet transform normalization
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        scale: 2, // High resolution
        logging: false,
        backgroundColor: '#020617',
        ignoreElements: (el) => {
          return (
            el.id?.includes('-btn-') ||
            el.classList?.contains('leaflet-control-container') ||
            el.id?.includes('toast')
          );
        },
        onclone: (clonedDoc) => {
          const mapPanes = clonedDoc.querySelectorAll('.leaflet-map-pane') as NodeListOf<HTMLElement>;
          mapPanes.forEach((pane) => {
            const transform = pane.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
              if (match) {
                pane.style.transform = `translate(${match[1]}px, ${match[2]}px)`;
              }
            }
          });

          const tileContainers = clonedDoc.querySelectorAll('.leaflet-tile-container') as NodeListOf<HTMLElement>;
          tileContainers.forEach((tc) => {
            const transform = tc.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
              if (match) {
                tc.style.transform = `translate(${match[1]}px, ${match[2]}px)`;
              }
            }
          });
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

  // Strategy 3: Direct High-Res Vector Canvas Renderer (Faithful to active mapMode and Republic of Mexico geography)
  await exportMapDirectCanvas(routes, airports, filename, customColors, mapMode);
}

/**
 * Fallback high-resolution Direct Canvas Dual GIS Renderer for Comparison Mode
 * Generates an ultra-crisp 3.2K side-by-side aeronautical chart
 */
async function exportComparisonDirectCanvas(
  routesA: FlightRoute[] = [],
  routesB: FlightRoute[] = [],
  airportsA: Airport[] = [],
  airportsB: Airport[] = [],
  airlineAName = 'Todas las Rutas (A)',
  airlineBName = 'Todas las Rutas (B)',
  filename = 'comparativa_rutas_mexico.png',
  customColors?: Record<string, string>,
  mapMode = 'routes_by_airline'
) {
  const width = 3200;
  const height = 1650;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar contexto 2D de Canvas para la comparativa.');

  // Deep aviation radar background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  // Top Global Institutional Comparison Bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 125);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 125);
  ctx.lineTo(width, 125);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 24px -apple-system, sans-serif';
  ctx.fillText('Observatorio de Conectividad Aerocomercial — Comparativa Side-by-Side', 50, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px -apple-system, sans-serif';
  ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', 50, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.fillText('DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO • COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO', 50, 92);

  const routeDelta = routesB.length - routesA.length;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px "SF Mono", monospace, sans-serif';
  ctx.fillText(
    `Rutas: ${routesA.length} vs ${routesB.length} (${routeDelta >= 0 ? `+${routeDelta}` : routeDelta})  |  Aeropuertos: ${airportsA.length} vs ${airportsB.length}`,
    width - 850,
    68
  );

  // Render a single map pane
  const renderPane = (
    paneRoutes: FlightRoute[],
    paneAirports: Airport[],
    paneTitle: string,
    startX: number,
    startY: number,
    paneW: number,
    paneH: number,
    badgeColor: string
  ) => {
    // Background gradient for pane
    const bgGrad = ctx.createRadialGradient(
      startX + paneW / 2,
      startY + paneH / 2,
      80,
      startX + paneW / 2,
      startY + paneH / 2,
      paneW
    );
    bgGrad.addColorStop(0, '#0b132b');
    bgGrad.addColorStop(0.6, '#030712');
    bgGrad.addColorStop(1, '#010409');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(startX, startY, paneW, paneH);

    // Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, paneW, paneH);

    // Geographic bounds for Mexico + buffer
    const minLat = 13.5;
    const maxLat = 33.5;
    const minLng = -118.5;
    const maxLng = -85.5;

    const project = (lat: number, lng: number): [number, number] => {
      const x = startX + ((lng - minLng) / (maxLng - minLng)) * (paneW - 140) + 70;
      const y = startY + ((maxLat - lat) / (maxLat - minLat)) * (paneH - 140) + 70;
      return [x, y];
    };

    // Coordinate Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);

    for (let lat = 15; lat <= 30; lat += 5) {
      const [, y] = project(lat, minLng);
      ctx.beginPath();
      ctx.moveTo(startX + 40, y);
      ctx.lineTo(startX + paneW - 40, y);
      ctx.stroke();
    }
    for (let lng = -115; lng <= -90; lng += 5) {
      const [x] = project(minLat, lng);
      ctx.beginPath();
      ctx.moveTo(x, startY + 40);
      ctx.lineTo(x, startY + paneH - 40);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Mexico Mainland and Baja California on Pane
    const drawShapeOnPane = (pts: [number, number][]) => {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.035)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      pts.forEach(([lat, lng], idx) => {
        const [px, py] = project(lat, lng);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawShapeOnPane(MEXICO_MAINLAND_OUTLINE);
    drawShapeOnPane(BAJA_PENINSULA_OUTLINE);

    // Flight Arcs (ONLY IF NOT IN MODE 1: AIRPORTS ONLY)
    if (mapMode !== 'airports') {
      paneRoutes.forEach((route) => {
        const arcPoints = generateGreatCircleArc(
          [route.originLat, route.originLng],
          [route.destLat, route.destLng],
          35,
          0.14
        );

        const strokeColor = getAirlineColor(route.airline, customColors);
        const lineWeight = 3;

        // Glow
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWeight + 3;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        arcPoints.forEach((pt, i) => {
          const [px, py] = project(pt[0], pt[1]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();

        // Sharp Core
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWeight;
        ctx.globalAlpha = 0.88;
        ctx.lineCap = 'round';
        ctx.beginPath();
        arcPoints.forEach((pt, i) => {
          const [px, py] = project(pt[0], pt[1]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    // Airport Nodes
    paneAirports.forEach((airport) => {
      const [ax, ay] = project(airport.lat, airport.lng);
      const isMajor = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(airport.code);
      const radius = isMajor ? 9 : 5.5;

      ctx.save();
      // In Mode 1 compare view, airports appear with distinct airline color of that pane!
      ctx.fillStyle = mapMode === 'airports' ? badgeColor : (isMajor ? '#38bdf8' : '#0ea5e9');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // IATA Label - Single clean frame
      ctx.font = isMajor ? 'bold 13px "SF Mono", monospace' : '10px "SF Mono", monospace';
      const tw = ctx.measureText(airport.code).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(ax - tw / 2 - 4, ay - radius - 18, tw + 8, 16);
      ctx.strokeStyle = isMajor ? badgeColor : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - tw / 2 - 4, ay - radius - 18, tw + 8, 16);

      ctx.fillStyle = isMajor ? badgeColor : '#e2e8f0';
      ctx.fillText(airport.code, ax - tw / 2, ay - radius - 5);
      ctx.restore();
    });

    // Header Card for Pane
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(startX + 25, startY + 25, 480, 80);
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(startX + 25, startY + 25, 480, 80);

    ctx.fillStyle = badgeColor;
    ctx.font = '900 18px -apple-system, sans-serif';
    ctx.fillText(paneTitle, startX + 45, startY + 58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    const paneSubtitle = mapMode === 'airports'
      ? `${paneAirports.length} aeropuertos con operaciones`
      : `${paneRoutes.length} rutas autorizadas • ${paneAirports.length} aeropuertos`;
    ctx.fillText(paneSubtitle, startX + 45, startY + 86);
    ctx.restore();
  };

  const paneWidth = (width - 60) / 2;
  const paneHeight = height - 290;

  const colorA = airlineAName && !airlineAName.includes('Todas') ? getAirlineColor(airlineAName, customColors) : '#06b6d4';
  const colorB = airlineBName && !airlineBName.includes('Todas') ? getAirlineColor(airlineBName, customColors) : '#c084fc';

  // Render Map A (Left)
  renderPane(routesA, airportsA, `MAPA A: ${airlineAName}`, 20, 130, paneWidth, paneHeight, colorA);

  // Render Map B (Right)
  renderPane(routesB, airportsB, `MAPA B: ${airlineBName}`, 20 + paneWidth + 20, 130, paneWidth, paneHeight, colorB);

  // Bottom Viñeta Cromática de Aerolíneas Card
  const allComparedRoutes = [...routesA, ...routesB];
  const uniqueAirlines = Array.from(new Set(allComparedRoutes.map((r) => r.airline))).filter(Boolean);

  if (mapMode !== 'airports' && uniqueAirlines.length > 0) {
    const cardY = height - 140;
    const cardH = 120;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.fillRect(20, cardY, width - 40, cardH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, cardY, width - 40, cardH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText(`VIÑETA CROMÁTICA DE AEROLÍNEAS EN COMPARATIVA (${uniqueAirlines.length} OPERADORES):`, 40, cardY + 30);

    const itemsPerRow = 6;
    const colW = (width - 100) / itemsPerRow;

    uniqueAirlines.forEach((airline, idx) => {
      const row = Math.floor(idx / itemsPerRow);
      const col = idx % itemsPerRow;
      const color = getAirlineColor(airline, customColors);
      const itemX = 40 + col * colW;
      const itemY = cardY + 58 + row * 28;

      ctx.fillStyle = color;
      ctx.fillRect(itemX, itemY - 11, 24, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, itemY - 11, 24, 12);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 12px "SF Mono", monospace, sans-serif';
      const label = airline.length > 26 ? airline.slice(0, 25) + '…' : airline;
      ctx.fillText(label, itemX + 32, itemY);
    });
  }

  // Trigger Download
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Error al codificar imagen PNG de la comparativa.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Exports Side-by-Side Dual Map Comparison to a PNG image file
 */
export async function exportComparisonToImage(
  containerId = 'compare-view-container',
  filename = 'comparativa_rutas_mexico.png',
  routesA: FlightRoute[] = [],
  routesB: FlightRoute[] = [],
  airportsA: Airport[] = [],
  airportsB: Airport[] = [],
  airlineAName = 'Mapa A',
  airlineBName = 'Mapa B',
  customColors?: Record<string, string>,
  mapMode = 'routes_by_airline'
) {
  const element = document.getElementById(containerId);

  // Strategy 1: High-Fidelity Direct DOM Dual Canvas Compositor
  const mapA = document.getElementById('map-compare-a');
  const mapB = document.getElementById('map-compare-b');
  if (mapA && mapB) {
    try {
      const colorA = airlineAName && !airlineAName.includes('Todas') ? getAirlineColor(airlineAName, customColors) : '#06b6d4';
      const colorB = airlineBName && !airlineBName.includes('Todas') ? getAirlineColor(airlineBName, customColors) : '#c084fc';
      const [canvasA, canvasB] = await Promise.all([
        captureLeafletDomToCanvas(mapA, routesA, airportsA, customColors, mapMode),
        captureLeafletDomToCanvas(mapB, routesB, airportsB, customColors, mapMode),
      ]);

      if (canvasA && canvasB) {
        const dualCanvas = document.createElement('canvas');
        const headerH = 140;
        const legendH = 150;
        const gap = 16;
        const border = 16;
        dualCanvas.width = canvasA.width + canvasB.width + gap + (border * 2);
        dualCanvas.height = Math.max(canvasA.height, canvasB.height) + headerH + legendH + (border * 2);
        const ctx = dualCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, dualCanvas.width, dualCanvas.height);

          // Top Header Bar
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, dualCanvas.width, headerH);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, dualCanvas.width, headerH);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 24px -apple-system, sans-serif';
          ctx.fillText('Observatorio de Conectividad Aerocomercial — Comparativa Side-by-Side', border + 12, 46);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px -apple-system, sans-serif';
          ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', border + 12, 74);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 12px -apple-system, sans-serif';
          ctx.fillText('DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO • COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO', border + 12, 100);

          // Draw Map A
          const yPos = headerH + border;
          ctx.drawImage(canvasA, border, yPos);
          ctx.strokeStyle = colorA;
          ctx.lineWidth = 3;
          ctx.strokeRect(border, yPos, canvasA.width, canvasA.height);

          // Draw Map B
          const xPosB = border + canvasA.width + gap;
          ctx.drawImage(canvasB, xPosB, yPos);
          ctx.strokeStyle = colorB;
          ctx.lineWidth = 3;
          ctx.strokeRect(xPosB, yPos, canvasB.width, canvasB.height);

          // Bottom Dual Comparison Legend & Viñeta Card
          const legY = yPos + Math.max(canvasA.height, canvasB.height) + border;
          const legW = dualCanvas.width - (border * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(border, legY, legW, legendH - border);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(border, legY, legW, legendH - border);

          // Title
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 14px -apple-system, sans-serif';
          ctx.fillText('LEYENDA Y VIÑETAS CROMÁTICAS COMPARATIVAS (CÓDIGOS IATA)', border + 20, legY + 28);

          // Comparison Map A vs Map B indicator pills
          const iataA = airlineAName === 'all' || airlineAName.includes('Todas') ? 'TODAS' : getAirlineIataCode(airlineAName);
          const iataB = airlineBName === 'all' || airlineBName.includes('Todas') ? 'TODAS' : getAirlineIataCode(airlineBName);

          // Pill A
          ctx.fillStyle = colorA;
          ctx.fillRect(border + 20, legY + 44, 22, 14);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(border + 20, legY + 44, 22, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.fillText(`MAPA A: [${iataA}] ${airlineAName} (${routesA.length} rutas)`, border + 50, legY + 56);

          // Pill B
          const pillBX = border + Math.round(legW / 2);
          ctx.fillStyle = colorB;
          ctx.fillRect(pillBX, legY + 44, 22, 14);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(pillBX, legY + 44, 22, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.fillText(`MAPA B: [${iataB}] ${airlineBName} (${routesB.length} rutas)`, pillBX + 30, legY + 56);

          // Multi-airline chips breakdown
          const allComparedRoutes = [...routesA, ...routesB];
          const uniqueAirlines = Array.from(new Set(allComparedRoutes.map((r) => r.airline))).filter(Boolean);
          if (uniqueAirlines.length > 0) {
            const cols = 5;
            const chipColW = (legW - 40) / cols;
            uniqueAirlines.slice(0, 10).forEach((airline, idx) => {
              const c = idx % cols;
              const r = Math.floor(idx / cols);
              const chipX = border + 20 + c * chipColW;
              const chipY = legY + 84 + r * 22;
              const aColor = getAirlineColor(airline, customColors);
              const aIata = getAirlineIataCode(airline);

              ctx.fillStyle = aColor;
              ctx.fillRect(chipX, chipY - 9, 16, 10);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 0.8;
              ctx.strokeRect(chipX, chipY - 9, 16, 10);

              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 10px "JetBrains Mono", monospace';
              ctx.fillText(`[${aIata}]`, chipX + 22, chipY);

              ctx.fillStyle = '#cbd5e1';
              ctx.font = '10px -apple-system, sans-serif';
              const label = airline.length > 16 ? airline.slice(0, 15) + '…' : airline;
              ctx.fillText(label, chipX + 54, chipY);
            });
          }

          const blob = await new Promise<Blob | null>((res) => dualCanvas.toBlob(res, 'image/png'));
          if (blob && blob.size > 2000) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 3000);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Direct DOM comparison capture warning:', err);
    }
  }

  // Strategy 2: Attempt html2canvas capture of the side-by-side container
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        logging: false,
        backgroundColor: '#020617',
        ignoreElements: (el) => {
          return (
            el.id?.includes('-btn-') ||
            el.classList?.contains('leaflet-control-container')
          );
        },
        onclone: (clonedDoc) => {
          const mapPanes = clonedDoc.querySelectorAll('.leaflet-map-pane') as NodeListOf<HTMLElement>;
          mapPanes.forEach((pane) => {
            const transform = pane.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
              if (match) {
                pane.style.transform = `translate(${match[1]}px, ${match[2]}px)`;
              }
            }
          });

          const tileContainers = clonedDoc.querySelectorAll('.leaflet-tile-container') as NodeListOf<HTMLElement>;
          tileContainers.forEach((tc) => {
            const transform = tc.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
              if (match) {
                tc.style.transform = `translate(${match[1]}px, ${match[2]}px)`;
              }
            }
          });
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
      console.warn('html2canvas capture warning for comparison, switching to High-Res Direct Canvas GIS Engine:', err);
    }
  }

  // Strategy 2: High-Res Direct Canvas Dual GIS Renderer
  await exportComparisonDirectCanvas(
    routesA,
    routesB,
    airportsA,
    airportsB,
    airlineAName,
    airlineBName,
    filename,
    customColors,
    mapMode
  );
}

/**
 * Generates an interactive standalone HTML file for Side-by-Side Comparison with Dual Leaflet Maps
 */
export function exportComparisonToStandaloneHtml(
  routesA: FlightRoute[],
  routesB: FlightRoute[],
  airportsA: Airport[],
  airportsB: Airport[],
  airlineAName = 'Mapa A',
  airlineBName = 'Mapa B',
  title = 'Comparativa Side-by-Side de Rutas Aéreas México',
  customColors?: Record<string, string>
) {
  const routesADataJson = JSON.stringify(
    routesA.map((r) => ({
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

  const routesBDataJson = JSON.stringify(
    routesB.map((r) => ({
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

  const airportsAJson = JSON.stringify(airportsA);
  const airportsBJson = JSON.stringify(airportsB);
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
    body, html { width: 100%; height: 100%; background: #020617; color: #f8fafc; overflow: hidden; display: flex; flex-direction: column; }
    .top-bar {
      height: 60px; background: #0f172a; border-bottom: 1px solid #1e293b;
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
    }
    .top-bar h1 { font-size: 16px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .kpis { display: flex; align-items: center; gap: 16px; font-size: 13px; }
    .kpi-pill { background: #020617; border: 1px solid #334155; padding: 6px 12px; rounded-radius: 8px; border-radius: 8px; }
    .kpi-pill strong { color: #38bdf8; }
    .sync-btn {
      background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 8px;
      font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;
    }
    .sync-btn:hover { background: #0369a1; }
    .dual-container { flex: 1; display: grid; grid-template-columns: 1fr 1fr; position: relative; overflow: hidden; }
    .map-pane { position: relative; width: 100%; height: 100%; border-right: 1px solid #1e293b; }
    .map-pane:last-child { border-right: none; }
    .map-header {
      position: absolute; top: 12px; left: 12px; z-index: 1000;
      background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px);
      border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px;
      padding: 8px 14px;
    }
    .map-header h3 { font-size: 13px; font-weight: bold; color: #ffffff; }
    .map-header p { font-size: 11px; color: #94a3b8; }
    .bottom-legend {
      height: 90px; background: #0b0f19; border-top: 1px solid #1e293b;
      padding: 8px 20px; overflow-x: auto; display: flex; flex-direction: column; justify-content: center;
    }
    .legend-title { font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px; }
    .legend-items { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .legend-chip { display: flex; align-items: center; gap: 6px; font-size: 11px; font-family: monospace; }
    .legend-color { width: 16px; height: 8px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.4); }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>
      <h1 style="font-size: 15px; font-weight: 800; color: #38bdf8; margin: 0;">Observatorio de Conectividad Aerocomercial</h1>
      <div style="font-size: 11px; font-weight: bold; color: #ffffff; margin-top: 1px;">
        AGENCIA FEDERAL DE AVIACIÓN CIVIL
      </div>
      <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">
        DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO &bull; COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO
      </div>
    </div>
    <div class="kpis">
      <div class="kpi-pill">Rutas: <strong>${routesA.length}</strong> vs <strong>${routesB.length}</strong> (${routesB.length - routesA.length >= 0 ? `+${routesB.length - routesA.length}` : routesB.length - routesA.length})</div>
      <div class="kpi-pill">Aeropuertos: <strong>${airportsA.length}</strong> vs <strong>${airportsB.length}</strong></div>
      <button id="btn-sync" class="sync-btn" onclick="toggleSync()">Zoom Sincronizado: ON</button>
    </div>
  </div>

  <div class="dual-container">
    <div class="map-pane">
      <div class="map-header" style="border-color: #38bdf8;">
        <h3>MAPA A: ${airlineAName}</h3>
        <p>${routesA.length} rutas autorizadas • ${airportsA.length} aeropuertos</p>
      </div>
      <div id="map-a" style="width:100%; height:100%;"></div>
    </div>

    <div class="map-pane">
      <div class="map-header" style="border-color: #c084fc;">
        <h3>MAPA B: ${airlineBName}</h3>
        <p>${routesB.length} rutas autorizadas • ${airportsB.length} aeropuertos</p>
      </div>
      <div id="map-b" style="width:100%; height:100%;"></div>
    </div>
  </div>

  <div class="bottom-legend">
    <div class="legend-title">VIÑETA CROMÁTICA DE AEROLÍNEAS EN COMPARATIVA</div>
    <div id="legend-chips" class="legend-items"></div>
  </div>

  <script>
    const routesA = ${routesADataJson};
    const routesB = ${routesBDataJson};
    const airportsA = ${airportsAJson};
    const airportsB = ${airportsBJson};
    const customColors = ${customColorsJson};

    const KNOWN_COLORS = {
      'aeromexico': '#0284c7',
      'aerovias de mexico': '#0284c7',
      'volaris': '#a855f7',
      'concesionaria vuela': '#a855f7',
      'vivaaerobus': '#10b981',
      'viva': '#10b981',
      'aeroenlaces nacionales': '#10b981',
      'aerolitoral': '#1d4ed8',
      'link conexion aerea': '#f59e0b',
      'tar': '#f59e0b',
      'aereo calafia': '#ec4899',
      'calafia': '#ec4899',
      'estafeta': '#dc2626',
      'aerotransportes rafilher': '#14b8a6',
      'aerotransportes mas de carga': '#8b5cf6',
      'tm aerolineas': '#f97316',
      'aerotransporte de carga union': '#e11d48',
      'aerolinea del estado mexicano': '#06b6d4',
      'mexicana': '#06b6d4',
      'magnicharters': '#eab308',
      'interjet': '#3b82f6',
      'aerus': '#84cc16'
    };

    const PALETTE = ['#0284c7', '#a855f7', '#10b981', '#f59e0b', '#dc2626', '#06b6d4', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#84cc16', '#1d4ed8'];

    function getColor(airline) {
      if (!airline) return '#06b6d4';
      if (customColors[airline]) return customColors[airline];
      const norm = airline.toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      for (const [k, v] of Object.entries(KNOWN_COLORS)) {
        if (norm === k || norm.includes(k) || k.includes(norm)) return v;
      }
      let hash = 0;
      for (let i = 0; i < airline.length; i++) hash = (hash << 5) - hash + airline.charCodeAt(i);
      return PALETTE[Math.abs(hash) % PALETTE.length];
    }

    // Populate bottom color vignette with IATA tags
    const allAirlines = Array.from(new Set([...routesA.map(r => r.airline), ...routesB.map(r => r.airline)])).filter(Boolean);
    const chipsContainer = document.getElementById('legend-chips');
    const IATA_MAP = ${JSON.stringify(AIRLINE_TO_IATA)};

    function getIata(al) {
      if (!al) return '';
      const norm = al.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [k, v] of Object.entries(IATA_MAP)) {
        if (norm === k || norm.includes(k) || k.includes(norm)) return v;
      }
      return al.slice(0, 2).toUpperCase();
    }

    allAirlines.forEach(al => {
      const color = getColor(al);
      const iata = getIata(al);
      const countA = routesA.filter(r => r.airline === al).length;
      const countB = routesB.filter(r => r.airline === al).length;
      const chip = document.createElement('div');
      chip.className = 'legend-chip';
      chip.innerHTML = '<span class="legend-color" style="background:'+color+'"></span>' +
        '<span style="background:rgba(56,189,248,0.2); color:#38bdf8; font-weight:bold; font-family:monospace; font-size:10px; padding:1px 5px; border-radius:4px; border:1px solid rgba(56,189,248,0.4);">['+iata+']</span>' +
        '<span style="color:#f8fafc; font-weight:600;">'+al+'</span>' +
        '<span style="color:#94a3b8; font-size:10px;">(A: '+countA+' | B: '+countB+')</span>';
      chipsContainer.appendChild(chip);
    });

    // Create maps
    const mapA = L.map('map-a', { center: [23.6345, -102.5528], zoom: 5, zoomControl: true });
    const mapB = L.map('map-b', { center: [23.6345, -102.5528], zoom: 5, zoomControl: true });

    L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; OpenStreetMap contributors'
    }).addTo(mapA);

    L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; OpenStreetMap contributors'
    }).addTo(mapB);

    function renderMapContent(map, routes, airports) {
      routes.forEach(r => {
        const color = getColor(r.airline);
        L.polyline(r.arc, { color, weight: 3, opacity: 0.8 }).bindPopup(
          '<div style=\"min-width:180px;\"><strong>' + r.orig + ' ➔ ' + r.dest + '</strong><br/>' +
          r.origName + ' ➔ ' + r.destName + '<br/>' +
          '<strong>Aerolínea:</strong> ' + r.airline + '<br/>' +
          '<strong>Distancia:</strong> ' + Math.round(r.distanceKm) + ' km</div>'
        ).addTo(map);
      });

      airports.forEach(a => {
        L.circleMarker([a.lat, a.lng], {
          radius: 6, fillColor: '#38bdf8', color: '#ffffff', weight: 1.5, fillOpacity: 0.85
        }).bindPopup('<strong>' + a.code + '</strong> - ' + a.name).addTo(map);
      });
    }

    renderMapContent(mapA, routesA, airportsA);
    renderMapContent(mapB, routesB, airportsB);

    // Zoom and pan synchronization
    let isSync = true;
    let isMoving = false;

    function syncMove(source, target) {
      if (!isSync || isMoving) return;
      isMoving = true;
      target.setView(source.getCenter(), source.getZoom(), { animate: false });
      isMoving = false;
    }

    mapA.on('move', () => syncMove(mapA, mapB));
    mapB.on('move', () => syncMove(mapB, mapA));

    function toggleSync() {
      isSync = !isSync;
      const btn = document.getElementById('btn-sync');
      btn.textContent = 'Zoom Sincronizado: ' + (isSync ? 'ON' : 'OFF');
      btn.style.background = isSync ? '#0284c7' : '#475569';
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = generateExportFilename({
    prefix: 'comparativa_rutas_aereas_mexico',
    airlineA: airlineAName,
    airlineB: airlineBName,
    extension: 'html',
    isDual: true,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
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
  customColors?: Record<string, string>,
  selectedAirlines?: string[]
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
    <h1>Observatorio de Conectividad Aerocomercial</h1>
    <div style="font-size: 13px; font-weight: bold; color: #ffffff; margin-top: 4px;">
      AGENCIA FEDERAL DE AVIACIÓN CIVIL
    </div>
    <div style="font-size: 11.5px; color: #cbd5e1; font-weight: 600; margin-top: 2px;">
      DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO
    </div>
    <div style="font-size: 11.5px; color: #38bdf8; font-weight: 600;">
      COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO
    </div>
  </div>

  <div class="stats">
    <div>Rutas seleccionadas: <span class="stat-val">${routes.length}</span></div>
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

    const KNOWN_COLORS = {
      'aeromexico': '#0284c7',
      'aerovias de mexico': '#0284c7',
      'volaris': '#a855f7',
      'concesionaria vuela': '#a855f7',
      'vivaaerobus': '#10b981',
      'viva': '#10b981',
      'aeroenlaces nacionales': '#10b981',
      'aerolitoral': '#1d4ed8',
      'link conexion aerea': '#f59e0b',
      'tar': '#f59e0b',
      'aereo calafia': '#ec4899',
      'calafia': '#ec4899',
      'estafeta': '#dc2626',
      'aerotransportes rafilher': '#14b8a6',
      'aerotransportes mas de carga': '#8b5cf6',
      'tm aerolineas': '#f97316',
      'aerotransporte de carga union': '#e11d48',
      'aerolinea del estado mexicano': '#06b6d4',
      'mexicana': '#06b6d4',
      'magnicharters': '#eab308',
      'interjet': '#3b82f6',
      'aerus': '#84cc16'
    };

    const DYNAMIC_PALETTE = [
      '#0284c7', '#a855f7', '#10b981', '#f59e0b', '#dc2626', '#06b6d4',
      '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#84cc16', '#1d4ed8',
      '#d946ef', '#e11d48', '#eab308', '#6366f1'
    ];

    function getColor(airline) {
      if (!airline) return '#06b6d4';
      if (customColors[airline]) return customColors[airline];
      const norm = airline.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [k, v] of Object.entries(KNOWN_COLORS)) {
        if (norm === k || norm.includes(k) || k.includes(norm)) return v;
      }
      let hash = 0;
      for (let i = 0; i < airline.length; i++) hash = (hash << 5) - hash + airline.charCodeAt(i);
      return DYNAMIC_PALETTE[Math.abs(hash) % DYNAMIC_PALETTE.length];
    }

    // Populate Legend with IATA codes
    const uniqueAirlines = Array.from(new Set(routes.map(r => r.airline))).filter(Boolean);
    const legendEl = document.getElementById('legend-items');
    const IATA_MAP = ${JSON.stringify(AIRLINE_TO_IATA)};

    function getIata(al) {
      if (!al) return '';
      const norm = al.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [k, v] of Object.entries(IATA_MAP)) {
        if (norm === k || norm.includes(k) || k.includes(norm)) return v;
      }
      return al.slice(0, 2).toUpperCase();
    }

    uniqueAirlines.forEach(airline => {
      const col = getColor(airline);
      const iata = getIata(airline);
      const count = routes.filter(r => r.airline === airline).length;
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.marginBottom = '6px';
      row.innerHTML = '<span class="legend-color" style="background:'+col+'; width:16px; height:10px; border-radius:3px; border:1px solid #fff; shrink-0;"></span>' +
        '<span style="background:rgba(56,189,248,0.2); color:#38bdf8; font-weight:bold; font-family:monospace; font-size:10px; padding:1px 5px; border-radius:4px; border:1px solid rgba(56,189,248,0.4);">['+iata+']</span>' +
        '<span style="color:#f8fafc; font-weight:600; font-size:11px;">'+airline+'</span>' +
        '<span style="color:#94a3b8; font-size:10px;">('+count+')</span>';
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
  link.download = generateExportFilename({
    prefix: 'mapa_rutas_aereas_mexico',
    routes,
    selectedAirlines,
    extension: 'html',
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}
