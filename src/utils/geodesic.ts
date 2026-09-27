/**
 * Geodesic & Great Circle Calculations for GIS Aviation Routes
 */

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;
const KM_TO_NM = 0.539957;

/**
 * Calculates Great Circle distance between two points using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = (lat2 - lat1) * TO_RAD;
  const dLon = (lon2 - lon1) * TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * TO_RAD) *
      Math.cos(lat2 * TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

export function kmToNauticalMiles(km: number): number {
  return Math.round(km * KM_TO_NM);
}

/**
 * Calculates initial bearing from point 1 to point 2 in degrees
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = lat1 * TO_RAD;
  const phi2 = lat2 * TO_RAD;
  const deltaLambda = (lon2 - lon1) * TO_RAD;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (theta * TO_DEG + 360) % 360;
}

/**
 * Generates an interpolated Great Circle Arc with slight cartographic curvature.
 * @param start [lat, lng]
 * @param end [lat, lng]
 * @param numPoints Number of intermediate waypoints
 * @param curvatureFactor Controls additional aesthetic arc height (0 = pure straight, 0.15 = standard aviation arc)
 */
export function generateGreatCircleArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 40,
  curvatureFactor: number = 0.15
): [number, number][] {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  // If points are identical, return single point
  if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lon1 - lon2) < 0.0001) {
    return [start];
  }

  const p1 = [lat1 * TO_RAD, lon1 * TO_RAD];
  const p2 = [lat2 * TO_RAD, lon2 * TO_RAD];

  // Angular distance between points
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((p1[0] - p2[0]) / 2), 2) +
          Math.cos(p1[0]) *
            Math.cos(p2[0]) *
            Math.pow(Math.sin((p1[1] - p2[1]) / 2), 2)
      )
    );

  const points: [number, number][] = [];

  // Perpendicular offset calculation for visible aesthetic curvature on flat maps
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;
  const dx = lon2 - lon1;
  const dy = lat2 - lat1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Normal vector pointing northward/perpendicular
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    if (d < 0.0001) {
      points.push([lat1, lon1]);
      continue;
    }

    // Great circle spherical linear interpolation
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x =
      A * Math.cos(p1[0]) * Math.cos(p1[1]) +
      B * Math.cos(p2[0]) * Math.cos(p2[1]);
    const y =
      A * Math.cos(p1[0]) * Math.sin(p1[1]) +
      B * Math.cos(p2[0]) * Math.sin(p2[1]);
    const z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);

    let lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * TO_DEG;
    let lon = Math.atan2(y, x) * TO_DEG;

    // Add quadratic altitude/curvature curve factor so flight arcs look like parabolic routes
    const arcHeight = Math.sin(f * Math.PI) * len * curvatureFactor;
    lat += ny * arcHeight;
    lon += nx * arcHeight;

    points.push([lat, lon]);
  }

  return points;
}

/**
 * Checks if a coordinate is within or near the Mexican Republic territorial & airspace boundaries
 * Mexico bounds approx: Lat 14.0 to 33.5, Lng -118.5 to -86.0
 */
export function isCoordinateInMexico(lat: number, lng: number): boolean {
  return lat >= 14.0 && lat <= 33.5 && lng >= -118.5 && lng <= -86.0;
}
