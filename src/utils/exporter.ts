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
  ctx.fillText(`Rutas activas en mapa: ${routes.length}  |  Aeropuertos: ${airports.length}`, 65, 178);
  ctx.restore();

  // 6. Airline Legend Card (Bottom Right) - High-density multi-column if needed
  const uniqueAirlines = Array.from(new Set(routes.map((r) => r.airline))).filter(Boolean);
  if (uniqueAirlines.length > 0) {
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

export interface MapCaptureOptions {
  modeName?: string;
  legendContainer?: HTMLElement | null;
  showWatermark?: boolean;
}

/**
 * High-fidelity GIS Leaflet Map to Canvas rasterizer.
 * Captures the true, live visual state of the Leaflet map container:
 * - Real basemap tiles (Republic of Mexico, states, topography)
 * - Exact vector flight arcs / radial connections currently visible
 * - Real airport pins and glowing auras
 * - Tooltip badges and IATA codes
 * - Institutional AFAC watermark header
 * - Dynamic color legend / palette vignette
 */
export async function captureLeafletMapToCanvas(
  container: HTMLElement | string,
  options?: MapCaptureOptions
): Promise<HTMLCanvasElement> {
  const rootEl = typeof container === 'string' ? document.getElementById(container) : container;
  if (!rootEl) {
    throw new Error('No se encontró el contenedor del mapa para captura.');
  }

  // Find the Leaflet map container
  const mapDiv: HTMLElement = rootEl.classList.contains('leaflet-container')
    ? rootEl
    : (rootEl.querySelector<HTMLElement>('.leaflet-container') || rootEl);

  const contRect = mapDiv.getBoundingClientRect();
  const width = Math.max(300, Math.round(contRect.width || mapDiv.clientWidth || 1280));
  const height = Math.max(300, Math.round(contRect.height || mapDiv.clientHeight || 720));
  const scale = 2; // High-resolution retina 2K/4K

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar contexto 2D para captura cartográfica.');

  ctx.scale(scale, scale);

  // 1. Base dark aviation radar background
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, width, height);

  // 2. Render all visible Basemap Tiles (Republic of Mexico and World Basemap)
  const tileImages = Array.from(mapDiv.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile'));
  for (const img of tileImages) {
    if (!img.complete || img.naturalWidth === 0) continue;
    const imgRect = img.getBoundingClientRect();
    const dx = imgRect.left - contRect.left;
    const dy = imgRect.top - contRect.top;
    const dw = imgRect.width;
    const dh = imgRect.height;

    // Only draw tiles within current viewport bounds
    if (dx + dw > 0 && dx < width && dy + dh > 0 && dy < height) {
      const opacityStr = window.getComputedStyle(img).opacity;
      const opacity = opacityStr ? parseFloat(opacityStr) : 1;
      ctx.save();
      ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;
      try {
        ctx.drawImage(img, dx, dy, dw, dh);
      } catch (e) {
        console.warn('Advertencia al renderizar tesela en canvas:', e);
      }
      ctx.restore();
    }
  }

  // 3. Render Vector Flight Arcs and Radial Routes (SVG Paths)
  const svgs = Array.from(mapDiv.querySelectorAll<SVGSVGElement>('.leaflet-overlay-pane svg'));
  for (const svg of svgs) {
    const svgRect = svg.getBoundingClientRect();
    const ox = svgRect.left - contRect.left;
    const oy = svgRect.top - contRect.top;

    const paths = Array.from(svg.querySelectorAll('path'));
    for (const path of paths) {
      const d = path.getAttribute('d');
      if (!d) continue;

      const computed = window.getComputedStyle(path);
      const stroke = path.getAttribute('stroke') || computed.stroke;
      const strokeWidth = parseFloat(path.getAttribute('stroke-width') || computed.strokeWidth || '2');
      const opacity = parseFloat(path.getAttribute('stroke-opacity') || computed.strokeOpacity || '1');
      const fill = path.getAttribute('fill') || computed.fill;
      const fillOpacity = parseFloat(path.getAttribute('fill-opacity') || computed.fillOpacity || '0');
      const dashArray = path.getAttribute('stroke-dasharray') || computed.strokeDasharray;

      ctx.save();
      ctx.translate(ox, oy);
      const p2d = new Path2D(d);

      if (fill && fill !== 'none' && fill !== 'transparent') {
        ctx.fillStyle = fill;
        ctx.globalAlpha = isNaN(fillOpacity) ? 1 : fillOpacity;
        ctx.fill(p2d);
      }

      if (stroke && stroke !== 'none' && stroke !== 'transparent') {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;
        ctx.lineCap = (computed.strokeLinecap as CanvasLineCap) || 'round';
        ctx.lineJoin = (computed.strokeLinejoin as CanvasLineJoin) || 'round';
        if (dashArray && dashArray !== 'none') {
          const dashes = dashArray
            .split(/[\s,]+/)
            .map((s) => parseFloat(s.trim()))
            .filter((n) => !isNaN(n));
          if (dashes.length > 0) ctx.setLineDash(dashes);
        }
        ctx.stroke(p2d);
      }
      ctx.restore();
    }
  }

  // 4. Render Airport Pins and Glows
  const markers = Array.from(mapDiv.querySelectorAll<HTMLElement>('.leaflet-marker-pane .leaflet-marker-icon'));
  for (const marker of markers) {
    const mRect = marker.getBoundingClientRect();
    const mx = mRect.left - contRect.left;
    const my = mRect.top - contRect.top;
    const mw = mRect.width;
    const mh = mRect.height;

    if (mx + mw < 0 || mx > width || my + mh < 0 || my > height) continue;

    const pin = marker.querySelector<HTMLElement>('.airport-pin');
    if (pin) {
      const pinStyle = window.getComputedStyle(pin);
      const pinBg = pin.style.backgroundColor || pinStyle.backgroundColor || '#0ea5e9';
      const pinBorder = pin.style.border || pinStyle.border || '2px solid #ffffff';
      const pinRadius = Math.max(3, Math.min(15, (pin.clientWidth || mw) / 2));
      const cx = mx + mw / 2;
      const cy = my + mh / 2;

      ctx.save();
      // Glowing radar aura
      ctx.fillStyle = pinBg;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, pinRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Main pin node
      ctx.globalAlpha = 1;
      ctx.fillStyle = pinBg;
      ctx.beginPath();
      ctx.arc(cx, cy, pinRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = pinBorder.includes('64748b') ? '#64748b' : '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5. Render Airport Labels and Tooltips
  const tooltips = Array.from(mapDiv.querySelectorAll<HTMLElement>('.leaflet-tooltip-pane .leaflet-tooltip'));
  for (const tt of tooltips) {
    const tRect = tt.getBoundingClientRect();
    const tx = tRect.left - contRect.left;
    const ty = tRect.top - contRect.top;
    const tw = tRect.width;
    const th = tRect.height;

    if (tx + tw < 0 || tx > width || ty + th < 0 || ty > height) continue;

    const rawText = tt.innerText.trim().replace(/\s+/g, ' ');
    if (!rawText) continue;

    const innerBadge = tt.querySelector<HTMLElement>('.airport-iata-badge');
    const computed = innerBadge ? window.getComputedStyle(innerBadge) : null;
    const borderColor = computed?.borderColor || innerBadge?.style.borderColor || 'rgba(56, 189, 248, 0.7)';
    const textColor = computed?.color || innerBadge?.style.color || '#38bdf8';
    const fontSize = computed?.fontSize || innerBadge?.style.fontSize || '11px';

    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 26, 0.94)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `800 ${fontSize} "JetBrains Mono", monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rawText, tx + tw / 2, ty + th / 2);
    ctx.restore();
  }

  // 6. Institutional AFAC Watermark Header
  if (options?.showWatermark !== false) {
    ctx.save();
    const bannerW = Math.min(width - 32, 470);
    const bannerH = 68;
    const bx = 16;
    const by = 16;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bannerW, bannerH, 10);
    ctx.fill();
    ctx.stroke();

    // Cyan vertical accent bar
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(bx, by, 4, bannerH, [10, 0, 0, 10]);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', bx + 14, by + 18);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Observatorio de Conectividad Aerocomercial', bx + 14, by + 36);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10.5px "Plus Jakarta Sans", sans-serif';
    const modeSubtitle = options?.modeName || 'Dirección Ejecutiva de Transporte y Control Aeronáutico';
    ctx.fillText(modeSubtitle, bx + 14, by + 53);

    ctx.restore();
  }

  // 7. Dynamic Color Legend Vignette
  const legendBox =
    options?.legendContainer ||
    rootEl.querySelector<HTMLElement>('[class*="items-end"]') ||
    document.querySelector<HTMLElement>('[class*="items-end"]');

  if (legendBox) {
    const items = Array.from(legendBox.querySelectorAll<HTMLElement>('.flex.items-center.justify-between, .flex.items-center.gap-2'));
    const legendRows: { color: string; label: string; count?: string }[] = [];

    items.forEach((item) => {
      const colorDot = item.querySelector<HTMLElement>('[style*="background"], span.rounded-full');
      const labelEl = item.querySelector<HTMLElement>('span.font-bold, span.truncate, span.text-slate-200');
      const countEl = item.querySelector<HTMLElement>('span.font-mono, span.text-slate-400');

      if (labelEl && labelEl.innerText.trim()) {
        let color = '#38bdf8';
        if (colorDot) {
          color = colorDot.style.backgroundColor || window.getComputedStyle(colorDot).backgroundColor || '#38bdf8';
        }
        legendRows.push({
          color,
          label: labelEl.innerText.trim(),
          count: countEl?.innerText.trim(),
        });
      }
    });

    if (legendRows.length > 0) {
      ctx.save();
      const rowsToDraw = legendRows.slice(0, 12);
      const legW = Math.min(270, width - 40);
      const legH = 34 + rowsToDraw.length * 20;
      const lx = width - legW - 16;
      const ly = height - legH - 16;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lx, ly, legW, legH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NOMENCLATURA CROMÁTICA', lx + 12, ly + 18);

      rowsToDraw.forEach((row, i) => {
        const ry = ly + 36 + i * 20;
        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.arc(lx + 16, ry - 3, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        const labelText = row.label.length > 22 ? row.label.slice(0, 20) + '…' : row.label;
        ctx.fillText(labelText, lx + 28, ry);

        if (row.count) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(row.count, lx + legW - 12, ry);
          ctx.textAlign = 'left';
        }
      });

      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Exports DOM element (the map container) to a PNG image file with automatic fail-safe fallback
 */
export async function exportMapToImage(
  elementId: string,
  filename = 'mapa_rutas_mexico.png',
  routes?: FlightRoute[],
  airports?: Airport[],
  customColors?: Record<string, string>,
  options?: MapCaptureOptions
) {
  const element = document.getElementById(elementId) || document.querySelector<HTMLElement>('.leaflet-container');

  // Strategy 1: Dedicated GIS Leaflet Map to Canvas Engine (Captures exactly what is rendered)
  if (element) {
    try {
      const canvas = await captureLeafletMapToCanvas(element, options);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob && blob.size > 2000) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    } catch (err) {
      console.warn('captureLeafletMapToCanvas warning, trying html2canvas fallback:', err);
    }

    // Strategy 2: Attempt html2canvas capture with 3D transform flattening
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // High resolution
        logging: false,
        backgroundColor: '#020617',
        ignoreElements: (el) => {
          return Boolean(el.id?.includes('-btn-'));
        },
        onclone: (_clonedDoc, clonedElement) => {
          const allTransformed = clonedElement.querySelectorAll<HTMLElement>('*');
          allTransformed.forEach((el) => {
            const transform = el.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
              if (match) {
                const tx = parseFloat(match[1]);
                const ty = parseFloat(match[2]);
                el.style.transform = 'none';
                const curL = parseFloat(el.style.left || '0') || 0;
                const curT = parseFloat(el.style.top || '0') || 0;
                el.style.left = `${curL + tx}px`;
                el.style.top = `${curT + ty}px`;
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
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    } catch (err) {
      console.warn('html2canvas capture warning, switching to High-Res Direct Canvas GIS Engine:', err);
    }
  }

  // Strategy 3: Direct High-Res Vector Canvas Renderer
  await exportMapDirectCanvas(routes, airports, filename, customColors);
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
  customColors?: Record<string, string>
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

    // Flight Arcs
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

    // Airport Nodes
    paneAirports.forEach((airport) => {
      const [ax, ay] = project(airport.lat, airport.lng);
      const isMajor = ['MEX', 'CUN', 'GDL', 'MTY', 'TIJ', 'NLU'].includes(airport.code);
      const radius = isMajor ? 9 : 5.5;

      ctx.save();
      ctx.fillStyle = isMajor ? '#38bdf8' : '#0ea5e9';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // IATA Label
      ctx.font = isMajor ? 'bold 13px "SF Mono", monospace' : '10px "SF Mono", monospace';
      const tw = ctx.measureText(airport.code).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(ax - tw / 2 - 4, ay - radius - 18, tw + 8, 16);
      ctx.strokeStyle = isMajor ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - tw / 2 - 4, ay - radius - 18, tw + 8, 16);

      ctx.fillStyle = isMajor ? '#38bdf8' : '#e2e8f0';
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
    ctx.fillText(`${paneRoutes.length} rutas autorizadas • ${paneAirports.length} aeropuertos`, startX + 45, startY + 86);
    ctx.restore();
  };

  const paneWidth = (width - 60) / 2;
  const paneHeight = height - 290;

  // Render Map A (Left)
  renderPane(routesA, airportsA, `MAPA A: ${airlineAName}`, 20, 130, paneWidth, paneHeight, '#38bdf8');

  // Render Map B (Right)
  renderPane(routesB, airportsB, `MAPA B: ${airlineBName}`, 20 + paneWidth + 20, 130, paneWidth, paneHeight, '#c084fc');

  // Bottom Viñeta Cromática de Aerolíneas Card
  const allComparedRoutes = [...routesA, ...routesB];
  const uniqueAirlines = Array.from(new Set(allComparedRoutes.map((r) => r.airline))).filter(Boolean);

  if (uniqueAirlines.length > 0) {
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
  options?: { modeName?: string }
) {
  const mapA = document.getElementById('compare-map-a');
  const mapB = document.getElementById('compare-map-b');

  // Strategy 1: Dedicated GIS Multi-Map Canvas Compositor
  if (mapA && mapB) {
    try {
      const [canvasA, canvasB] = await Promise.all([
        captureLeafletMapToCanvas(mapA, {
          modeName: `Mapa A: ${airlineAName}`,
          showWatermark: false,
        }),
        captureLeafletMapToCanvas(mapB, {
          modeName: `Mapa B: ${airlineBName}`,
          showWatermark: false,
        }),
      ]);

      const headerH = 130 * 2; // retina 2x
      const width = canvasA.width + canvasB.width;
      const height = Math.max(canvasA.height, canvasB.height) + headerH;

      const dualCanvas = document.createElement('canvas');
      dualCanvas.width = width;
      dualCanvas.height = height;
      const ctx = dualCanvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar canvas comparativo dual.');

      // Deep dark background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Top Institutional Comparison Bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, headerH);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, headerH);
      ctx.lineTo(width, headerH);
      ctx.stroke();

      // AFAC Institutional Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('AGENCIA FEDERAL DE AVIACIÓN CIVIL', 40, 42);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Observatorio de Conectividad Aerocomercial — Comparativa Side-by-Side', 40, 80);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'DIRECCIÓN EJECUTIVA DE TRANSPORTE Y CONTROL AERONÁUTICO • COORDINACIÓN DE CONCESIONES Y TRANSPORTE AÉREO',
        40,
        115
      );

      // Right Stats & Deltas
      const routeDelta = routesB.length - routesA.length;
      const airportDelta = airportsB.length - airportsA.length;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `Rutas: ${routesA.length} vs ${routesB.length} (${routeDelta >= 0 ? `+${routeDelta}` : routeDelta})  |  Aeropuertos: ${airportsA.length} vs ${airportsB.length} (${airportDelta >= 0 ? `+${airportDelta}` : airportDelta})`,
        width - 40,
        60
      );
      if (options?.modeName) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(options.modeName, width - 40, 95);
      }
      ctx.textAlign = 'left';

      // Draw Map A on Left
      ctx.drawImage(canvasA, 0, headerH);

      // Draw Map B on Right
      const paneW = canvasA.width;
      ctx.drawImage(canvasB, paneW, headerH);

      // Vertical separator
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(paneW, headerH);
      ctx.lineTo(paneW, height);
      ctx.stroke();

      // Pane A Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(24, headerH + 20, 420, 52, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`MAPA A: ${airlineAName}`, 42, headerH + 53);

      // Pane B Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(paneW + 24, headerH + 20, 420, 52, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`MAPA B: ${airlineBName}`, paneW + 42, headerH + 53);

      const blob = await new Promise<Blob | null>((resolve) => dualCanvas.toBlob(resolve, 'image/png'));
      if (blob && blob.size > 2000) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    } catch (err) {
      console.warn('captureLeafletMapToCanvas dual error, attempting fallback:', err);
    }
  }

  // Strategy 2: Attempt html2canvas capture of the side-by-side container
  const element = document.getElementById(containerId);
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#020617',
        ignoreElements: (el) => Boolean(el.id?.includes('-btn-')),
        onclone: (_clonedDoc, clonedElement) => {
          const allTransformed = clonedElement.querySelectorAll<HTMLElement>('*');
          allTransformed.forEach((el) => {
            const transform = el.style.transform;
            if (transform && transform.includes('translate3d')) {
              const match = transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
              if (match) {
                const tx = parseFloat(match[1]);
                const ty = parseFloat(match[2]);
                el.style.transform = 'none';
                const curL = parseFloat(el.style.left || '0') || 0;
                const curT = parseFloat(el.style.top || '0') || 0;
                el.style.left = `${curL + tx}px`;
                el.style.top = `${curT + ty}px`;
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
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    } catch (err) {
      console.warn('html2canvas capture warning for comparison, switching to High-Res Direct Canvas GIS Engine:', err);
    }
  }

  // Strategy 3: Direct High-Res Vector Canvas Renderer for Comparison
  await exportComparisonDirectCanvas(
    routesA,
    routesB,
    airportsA,
    airportsB,
    airlineAName,
    airlineBName,
    filename,
    customColors
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

    // Populate bottom color vignette
    const allAirlines = Array.from(new Set([...routesA.map(r => r.airline), ...routesB.map(r => r.airline)])).filter(Boolean);
    const chipsContainer = document.getElementById('legend-chips');
    allAirlines.forEach(al => {
      const color = getColor(al);
      const chip = document.createElement('div');
      chip.className = 'legend-chip';
      chip.innerHTML = '<span class="legend-color" style="background:'+color+'"></span><span>'+al+'</span>';
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
  link.download = 'comparativa_rutas_aereas_mexico.html';
  link.click();
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
