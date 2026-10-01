import { Airport, FlightRoute } from '../types';
import { calculateDistanceKm, kmToNauticalMiles } from '../utils/geodesic';
import officialRoutesJson from './officialRoutes.json';

export const MEXICO_AIRPORTS: Record<string, Airport> = {
  // Troncales y Hubs Principales
  MEX: {
    code: 'MEX',
    name: 'Aeropuerto Internacional Benito Juárez (AICM)',
    city: 'Ciudad de México',
    state: 'CDMX',
    lat: 19.4363,
    lng: -99.0721,
  },
  NLU: {
    code: 'NLU',
    name: 'Aeropuerto Internacional Felipe Ángeles (AIFA)',
    city: 'Santa Lucía / Zumpango',
    state: 'Estado de México',
    lat: 19.7439,
    lng: -99.0142,
  },
  TLC: {
    code: 'TLC',
    name: 'Aeropuerto Internacional Lic. Adolfo López Mateos',
    city: 'Toluca',
    state: 'Estado de México',
    lat: 19.3371,
    lng: -99.5660,
  },
  CUN: {
    code: 'CUN',
    name: 'Aeropuerto Internacional de Cancún',
    city: 'Cancún',
    state: 'Quintana Roo',
    lat: 21.0365,
    lng: -86.8771,
  },
  TQO: {
    code: 'TQO',
    name: 'Aeropuerto Internacional de Tulum Felipe Carrillo Puerto',
    city: 'Tulum',
    state: 'Quintana Roo',
    lat: 20.1600,
    lng: -87.6700,
  },
  COZ: {
    code: 'COZ',
    name: 'Aeropuerto Internacional de Cozumel',
    city: 'Cozumel',
    state: 'Quintana Roo',
    lat: 20.5224,
    lng: -86.9257,
  },
  CZM: {
    code: 'CZM',
    name: 'Aeropuerto Internacional de Cozumel',
    city: 'Cozumel',
    state: 'Quintana Roo',
    lat: 20.5224,
    lng: -86.9257,
  },
  CTM: {
    code: 'CTM',
    name: 'Aeropuerto Internacional de Chetumal',
    city: 'Chetumal',
    state: 'Quintana Roo',
    lat: 18.5047,
    lng: -88.3268,
  },
  GDL: {
    code: 'GDL',
    name: 'Aeropuerto Internacional Miguel Hidalgo y Costilla',
    city: 'Guadalajara',
    state: 'Jalisco',
    lat: 20.5218,
    lng: -103.3112,
  },
  PVR: {
    code: 'PVR',
    name: 'Aeropuerto Internacional Lic. Gustavo Díaz Ordaz',
    city: 'Puerto Vallarta',
    state: 'Jalisco',
    lat: 20.6801,
    lng: -105.2542,
  },
  MTY: {
    code: 'MTY',
    name: 'Aeropuerto Internacional General Mariano Escobedo',
    city: 'Monterrey',
    state: 'Nuevo León',
    lat: 25.7785,
    lng: -100.1069,
  },
  TIJ: {
    code: 'TIJ',
    name: 'Aeropuerto Internacional Abelardo L. Rodríguez',
    city: 'Tijuana',
    state: 'Baja California',
    lat: 32.5411,
    lng: -116.9702,
  },
  MXL: {
    code: 'MXL',
    name: 'Aeropuerto Internacional General Rodolfo Sánchez Taboada',
    city: 'Mexicali',
    state: 'Baja California',
    lat: 32.6309,
    lng: -115.2414,
  },
  ENS: {
    code: 'ENS',
    name: 'Aeropuerto de Ensenada',
    city: 'Ensenada',
    state: 'Baja California',
    lat: 31.7947,
    lng: -116.6028,
  },
  MID: {
    code: 'MID',
    name: 'Aeropuerto Internacional Manuel Crescencio Rejón',
    city: 'Mérida',
    state: 'Yucatán',
    lat: 20.9370,
    lng: -89.6577,
  },
  SJD: {
    code: 'SJD',
    name: 'Aeropuerto Internacional de Los Cabos',
    city: 'San José del Cabo',
    state: 'Baja California Sur',
    lat: 23.1518,
    lng: -109.7215,
  },
  CSL: {
    code: 'CSL',
    name: 'Aeródromo Internacional de Cabo San Lucas',
    city: 'Cabo San Lucas',
    state: 'Baja California Sur',
    lat: 22.9489,
    lng: -109.9389,
  },
  LAP: {
    code: 'LAP',
    name: 'Aeropuerto Internacional Manuel Márquez de León',
    city: 'La Paz',
    state: 'Baja California Sur',
    lat: 24.0727,
    lng: -110.3625,
  },
  LTO: {
    code: 'LTO',
    name: 'Aeropuerto Internacional de Loreto',
    city: 'Loreto',
    state: 'Baja California Sur',
    lat: 25.9892,
    lng: -111.3483,
  },
  HMO: {
    code: 'HMO',
    name: 'Aeropuerto Internacional General Ignacio Pesqueira García',
    city: 'Hermosillo',
    state: 'Sonora',
    lat: 29.0959,
    lng: -111.0479,
  },
  CEN: {
    code: 'CEN',
    name: 'Aeropuerto Internacional de Ciudad Obregón',
    city: 'Ciudad Obregón',
    state: 'Sonora',
    lat: 27.3928,
    lng: -109.8331,
  },
  GYM: {
    code: 'GYM',
    name: 'Aeropuerto Internacional General José María Yáñez',
    city: 'Guaymas',
    state: 'Sonora',
    lat: 27.9692,
    lng: -110.9250,
  },
  PPE: {
    code: 'PPE',
    name: 'Aeropuerto Internacional de Mar de Cortés',
    city: 'Puerto Peñasco',
    state: 'Sonora',
    lat: 31.3508,
    lng: -113.3056,
  },
  NOG: {
    code: 'NOG',
    name: 'Aeropuerto Internacional de Nogales',
    city: 'Nogales',
    state: 'Sonora',
    lat: 31.2269,
    lng: -110.9767,
  },
  CUL: {
    code: 'CUL',
    name: 'Aeropuerto Internacional Federal de Culiacán',
    city: 'Culiacán',
    state: 'Sinaloa',
    lat: 24.7645,
    lng: -107.4746,
  },
  MZT: {
    code: 'MZT',
    name: 'Aeropuerto Internacional General Rafael Buelna',
    city: 'Mazatlán',
    state: 'Sinaloa',
    lat: 23.1614,
    lng: -106.2661,
  },
  LMM: {
    code: 'LMM',
    name: 'Aeropuerto Internacional Federal del Valle del Fuerte',
    city: 'Los Mochis',
    state: 'Sinaloa',
    lat: 25.6853,
    lng: -109.0806,
  },
  OAX: {
    code: 'OAX',
    name: 'Aeropuerto Internacional de Oaxaca',
    city: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 16.9999,
    lng: -96.7266,
  },
  PXM: {
    code: 'PXM',
    name: 'Aeropuerto Internacional de Puerto Escondido',
    city: 'Puerto Escondido',
    state: 'Oaxaca',
    lat: 15.8769,
    lng: -97.0889,
  },
  HUX: {
    code: 'HUX',
    name: 'Aeropuerto Internacional de Bahías de Huatulco',
    city: 'Huatulco',
    state: 'Oaxaca',
    lat: 15.7753,
    lng: -96.2626,
  },
  TGZ: {
    code: 'TGZ',
    name: 'Aeropuerto Internacional Ángel Albino Corzo',
    city: 'Tuxtla Gutiérrez',
    state: 'Chiapas',
    lat: 16.5645,
    lng: -93.0258,
  },
  TAP: {
    code: 'TAP',
    name: 'Aeropuerto Internacional de Tapachula',
    city: 'Tapachula',
    state: 'Chiapas',
    lat: 14.7942,
    lng: -92.3700,
  },
  QRO: {
    code: 'QRO',
    name: 'Aeropuerto Intercontinental de Querétaro',
    city: 'Santiago de Querétaro',
    state: 'Querétaro',
    lat: 20.6173,
    lng: -100.1856,
  },
  BJX: {
    code: 'BJX',
    name: 'Aeropuerto Internacional del Bajío',
    city: 'Silao / León / Guanajuato',
    state: 'Guanajuato',
    lat: 20.9935,
    lng: -101.4809,
  },
  AGU: {
    code: 'AGU',
    name: 'Aeropuerto Internacional Lic. Jesús Terán Peredo',
    city: 'Aguascalientes',
    state: 'Aguascalientes',
    lat: 21.7056,
    lng: -102.2861,
  },
  SLP: {
    code: 'SLP',
    name: 'Aeropuerto Internacional Ponciano Arriaga',
    city: 'San Luis Potosí',
    state: 'San Luis Potosí',
    lat: 22.2544,
    lng: -100.9308,
  },
  ZCL: {
    code: 'ZCL',
    name: 'Aeropuerto Internacional General Leobardo C. Ruiz',
    city: 'Zacatecas',
    state: 'Zacatecas',
    lat: 22.8972,
    lng: -102.6869,
  },
  DGO: {
    code: 'DGO',
    name: 'Aeropuerto Internacional General Guadalupe Victoria',
    city: 'Durango',
    state: 'Durango',
    lat: 24.1242,
    lng: -104.5283,
  },
  CUU: {
    code: 'CUU',
    name: 'Aeropuerto Internacional General Roberto Fierro Villalobos',
    city: 'Chihuahua',
    state: 'Chihuahua',
    lat: 28.7029,
    lng: -105.9646,
  },
  CJS: {
    code: 'CJS',
    name: 'Aeropuerto Internacional Abraham González',
    city: 'Ciudad Juárez',
    state: 'Chihuahua',
    lat: 31.6361,
    lng: -106.4286,
  },
  TRC: {
    code: 'TRC',
    name: 'Aeropuerto Internacional Francisco Sarabia',
    city: 'Torreón',
    state: 'Coahuila',
    lat: 25.5683,
    lng: -103.4106,
  },
  SLW: {
    code: 'SLW',
    name: 'Aeropuerto Internacional Plan de Guadalupe',
    city: 'Saltillo',
    state: 'Coahuila',
    lat: 25.5497,
    lng: -100.9286,
  },
  PDS: {
    code: 'PDS',
    name: 'Aeropuerto Internacional de Piedras Negras',
    city: 'Piedras Negras',
    state: 'Coahuila',
    lat: 28.6275,
    lng: -100.5350,
  },
  VSA: {
    code: 'VSA',
    name: 'Aeropuerto Internacional Carlos Rovirosa Pérez',
    city: 'Villahermosa',
    state: 'Tabasco',
    lat: 17.9970,
    lng: -92.8174,
  },
  VER: {
    code: 'VER',
    name: 'Aeropuerto Internacional General Heriberto Jara',
    city: 'Veracruz',
    state: 'Veracruz',
    lat: 19.1459,
    lng: -96.1873,
  },
  MTT: {
    code: 'MTT',
    name: 'Aeropuerto Internacional de Minatitlán',
    city: 'Minatitlán / Coatzacoalcos',
    state: 'Veracruz',
    lat: 18.1042,
    lng: -94.5808,
  },
  PAZ: {
    code: 'PAZ',
    name: 'Aeropuerto Nacional El Tajín',
    city: 'Poza Rica',
    state: 'Veracruz',
    lat: 20.6006,
    lng: -97.4608,
  },
  TAM: {
    code: 'TAM',
    name: 'Aeropuerto Internacional General Francisco Javier Mina',
    city: 'Tampico',
    state: 'Tamaulipas',
    lat: 22.2965,
    lng: -97.8659,
  },
  REX: {
    code: 'REX',
    name: 'Aeropuerto Internacional General Lucio Blanco',
    city: 'Reynosa',
    state: 'Tamaulipas',
    lat: 26.0089,
    lng: -98.2283,
  },
  NLD: {
    code: 'NLD',
    name: 'Aeropuerto Internacional Quetzalcóatl',
    city: 'Nuevo Laredo',
    state: 'Tamaulipas',
    lat: 27.4439,
    lng: -99.5706,
  },
  MAM: {
    code: 'MAM',
    name: 'Aeropuerto Internacional General Servando Canales',
    city: 'Matamoros',
    state: 'Tamaulipas',
    lat: 25.7700,
    lng: -97.5253,
  },
  CVM: {
    code: 'CVM',
    name: 'Aeropuerto Internacional General Pedro J. Méndez',
    city: 'Ciudad Victoria',
    state: 'Tamaulipas',
    lat: 23.7033,
    lng: -98.9567,
  },
  ACA: {
    code: 'ACA',
    name: 'Aeropuerto Internacional General Juan N. Álvarez',
    city: 'Acapulco',
    state: 'Guerrero',
    lat: 16.7571,
    lng: -99.7540,
  },
  ZIH: {
    code: 'ZIH',
    name: 'Aeropuerto Internacional de Ixtapa-Zihuatanejo',
    city: 'Ixtapa-Zihuatanejo',
    state: 'Guerrero',
    lat: 17.6016,
    lng: -101.4606,
  },
  // Alias IATA/regional para Ixtapa-Zihuatanejo
  IXT: {
    code: 'ZIH',
    name: 'Aeropuerto Internacional de Ixtapa-Zihuatanejo',
    city: 'Ixtapa-Zihuatanejo',
    state: 'Guerrero',
    lat: 17.6016,
    lng: -101.4606,
  },
  MMZH: {
    code: 'ZIH',
    name: 'Aeropuerto Internacional de Ixtapa-Zihuatanejo',
    city: 'Ixtapa-Zihuatanejo',
    state: 'Guerrero',
    lat: 17.6016,
    lng: -101.4606,
  },
  // Aeropuerto de Tamuín (San Luis Potosí)
  TSL: {
    code: 'TSL',
    name: 'Aeropuerto Nacional de Tamuín',
    city: 'Tamuín',
    state: 'San Luis Potosí',
    lat: 22.0400,
    lng: -98.8072,
  },
  MMTN: {
    code: 'TSL',
    name: 'Aeropuerto Nacional de Tamuín',
    city: 'Tamuín',
    state: 'San Luis Potosí',
    lat: 22.0400,
    lng: -98.8072,
  },
  // Aeropuerto de Ixtepec (Oaxaca)
  IZT: {
    code: 'IZT',
    name: 'Aeropuerto Nacional de Ixtepec',
    city: 'Ciudad Ixtepec',
    state: 'Oaxaca',
    lat: 16.4447,
    lng: -95.0933,
  },
  MMIT: {
    code: 'IZT',
    name: 'Aeropuerto Nacional de Ixtepec',
    city: 'Ciudad Ixtepec',
    state: 'Oaxaca',
    lat: 16.4447,
    lng: -95.0933,
  },
  // Aeropuerto de Tehuacán (Puebla)
  TCN: {
    code: 'TCN',
    name: 'Aeropuerto Nacional de Tehuacán',
    city: 'Tehuacán',
    state: 'Puebla',
    lat: 18.4975,
    lng: -97.4189,
  },
  MMHC: {
    code: 'TCN',
    name: 'Aeropuerto Nacional de Tehuacán',
    city: 'Tehuacán',
    state: 'Puebla',
    lat: 18.4975,
    lng: -97.4189,
  },
  MMTC: {
    code: 'TCN',
    name: 'Aeropuerto Nacional de Tehuacán',
    city: 'Tehuacán',
    state: 'Puebla',
    lat: 18.4975,
    lng: -97.4189,
  },
  // Aeropuerto de Palenque (Chiapas)
  PQM: {
    code: 'PQM',
    name: 'Aeropuerto Internacional de Palenque',
    city: 'Palenque',
    state: 'Chiapas',
    lat: 17.5342,
    lng: -92.0161,
  },
  // Aeropuerto de Monclova (Coahuila)
  LOV: {
    code: 'LOV',
    name: 'Aeropuerto Internacional Venustiano Carranza',
    city: 'Monclova',
    state: 'Coahuila',
    lat: 26.9556,
    lng: -101.4700,
  },
  // Aeropuerto de Creel (Chihuahua)
  CRE: {
    code: 'CRE',
    name: 'Aeropuerto Regional de Creel - Barrancas del Cobre',
    city: 'Creel',
    state: 'Chihuahua',
    lat: 27.7533,
    lng: -107.6367,
  },
  // Aeropuerto de San Cristóbal de las Casas (Chiapas)
  SZT: {
    code: 'SZT',
    name: 'Aeropuerto Nacional de San Cristóbal de las Casas',
    city: 'San Cristóbal de las Casas',
    state: 'Chiapas',
    lat: 16.6908,
    lng: -92.5303,
  },
  MLM: {
    code: 'MLM',
    name: 'Aeropuerto Internacional General Francisco J. Múgica',
    city: 'Morelia',
    state: 'Michoacán',
    lat: 19.8499,
    lng: -101.0256,
  },
  UPN: {
    code: 'UPN',
    name: 'Aeropuerto Internacional Lic. y Gral. Ignacio López Rayón',
    city: 'Uruapan',
    state: 'Michoacán',
    lat: 19.3967,
    lng: -102.0392,
  },
  LZC: {
    code: 'LZC',
    name: 'Aeropuerto Nacional de Lázaro Cárdenas',
    city: 'Lázaro Cárdenas',
    state: 'Michoacán',
    lat: 18.0017,
    lng: -102.2206,
  },
  CLQ: {
    code: 'CLQ',
    name: 'Aeropuerto Nacional Licenciado Miguel de la Madrid',
    city: 'Colima',
    state: 'Colima',
    lat: 19.2772,
    lng: -103.5772,
  },
  ZLO: {
    code: 'ZLO',
    name: 'Aeropuerto Internacional Playa de Oro',
    city: 'Manzanillo',
    state: 'Colima',
    lat: 19.1447,
    lng: -104.5586,
  },
  CPE: {
    code: 'CPE',
    name: 'Aeropuerto Internacional Ing. Alberto Acuña Ongay',
    city: 'Campeche',
    state: 'Campeche',
    lat: 19.8197,
    lng: -90.5003,
  },
  CME: {
    code: 'CME',
    name: 'Aeropuerto Internacional de Ciudad del Carmen',
    city: 'Ciudad del Carmen',
    state: 'Campeche',
    lat: 18.6497,
    lng: -91.7989,
  },
  PBC: {
    code: 'PBC',
    name: 'Aeropuerto Internacional de Puebla (Hermanos Serdán)',
    city: 'Puebla / Huejotzingo',
    state: 'Puebla',
    lat: 19.1581,
    lng: -98.3714,
  },
  CVJ: {
    code: 'CVJ',
    name: 'Aeropuerto Internacional General Mariano Matamoros',
    city: 'Cuernavaca',
    state: 'Morelos',
    lat: 18.8339,
    lng: -99.2619,
  },
  TEP: {
    code: 'TEP',
    name: 'Aeropuerto Internacional Amado Nervo',
    city: 'Tepic',
    state: 'Nayarit',
    lat: 21.5200,
    lng: -104.8425,
  },

  // Principales Conexiones Internacionales habituales en estadísticas de aviación de México
  MIA: { code: 'MIA', name: 'Miami International Airport', city: 'Miami, FL', state: 'USA', lat: 25.7959, lng: -80.2870 },
  LAX: { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles, CA', state: 'USA', lat: 33.9416, lng: -118.4085 },
  DFW: { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas, TX', state: 'USA', lat: 32.8998, lng: -97.0403 },
  IAH: { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston, TX', state: 'USA', lat: 29.9902, lng: -95.3368 },
  JFK: { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York, NY', state: 'USA', lat: 40.6413, lng: -73.7781 },
  ORD: { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago, IL', state: 'USA', lat: 41.9742, lng: -87.9073 },
  ATL: { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta, GA', state: 'USA', lat: 33.6407, lng: -84.4277 },
  SFO: { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco, CA', state: 'USA', lat: 37.6213, lng: -122.3790 },
  LAS: { code: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas, NV', state: 'USA', lat: 36.0840, lng: -115.1537 },
  MCO: { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando, FL', state: 'USA', lat: 28.4312, lng: -81.3081 },
  SAT: { code: 'SAT', name: 'San Antonio International Airport', city: 'San Antonio, TX', state: 'USA', lat: 29.5337, lng: -98.4698 },
  SAN: { code: 'SAN', name: 'San Diego International Airport', city: 'San Diego, CA', state: 'USA', lat: 32.7338, lng: -117.1933 },
  PHX: { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix, AZ', state: 'USA', lat: 33.4373, lng: -112.0078 },
  DEN: { code: 'DEN', name: 'Denver International Airport', city: 'Denver, CO', state: 'USA', lat: 39.8561, lng: -104.6737 },
  BOS: { code: 'BOS', name: 'Logan International Airport', city: 'Boston, MA', state: 'USA', lat: 42.3656, lng: -71.0096 },
  EWR: { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark, NJ', state: 'USA', lat: 40.6895, lng: -74.1745 },
  MAD: { code: 'MAD', name: 'Aeropuerto Adolfo Suárez Madrid-Barajas', city: 'Madrid', state: 'España', lat: 40.4839, lng: -3.5679 },
  CDG: { code: 'CDG', name: 'Aéroport Paris-Charles de Gaulle', city: 'París', state: 'Francia', lat: 49.0097, lng: 2.5479 },
  LHR: { code: 'LHR', name: 'Heathrow Airport', city: 'Londres', state: 'Reino Unido', lat: 51.4700, lng: -0.4543 },
  BOG: { code: 'BOG', name: 'Aeropuerto Internacional El Dorado', city: 'Bogotá', state: 'Colombia', lat: 4.7016, lng: -74.1469 },
  PTY: { code: 'PTY', name: 'Aeropuerto Internacional de Tocumen', city: 'Ciudad de Panamá', state: 'Panamá', lat: 9.0714, lng: -79.3835 },
  GUA: { code: 'GUA', name: 'Aeropuerto Internacional La Aurora', city: 'Ciudad de Guatemala', state: 'Guatemala', lat: 14.5833, lng: -90.5275 },
  SJO: { code: 'SJO', name: 'Aeropuerto Internacional Juan Santamaría', city: 'San José', state: 'Costa Rica', lat: 9.9939, lng: -84.2089 },
  SAL: { code: 'SAL', name: 'Aeropuerto Internacional San Óscar Arnulfo Romero', city: 'San Salvador', state: 'El Salvador', lat: 13.4409, lng: -89.0557 },
  HAV: { code: 'HAV', name: 'Aeropuerto Internacional José Martí', city: 'La Habana', state: 'Cuba', lat: 22.9892, lng: -82.4092 },
  LIM: { code: 'LIM', name: 'Aeropuerto Internacional Jorge Chávez', city: 'Lima', state: 'Perú', lat: -12.0219, lng: -77.1143 },
  YYZ: { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', state: 'Canadá', lat: 43.6777, lng: -79.6248 },
  YVR: { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', state: 'Canadá', lat: 49.1967, lng: -123.1815 },
};

/**
 * Checks if a string or value represents raw coordinates (e.g. "19.4358", "-99.0703", "Aeropuerto 19.43", "19.43, -99.07")
 */
export function isCoordinateLike(val: any): boolean {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  if (!s) return false;
  // If pure numeric or decimal like "19.4358" or "-99.0703"
  if (/^-?\d+(\.\d+)?$/.test(s)) return true;
  // If starts with "Aeropuerto" followed by numbers/signs/coords e.g. "Aeropuerto 19.43" or "Aeropuerto -99.07"
  if (/^Aeropuerto\s+.*-?\d+\.\d+/i.test(s)) return true;
  if (/^Aeropuerto\s+-?\d+/i.test(s)) return true;
  // If like "19.43, -99.07" or "19.43 -99.07" or "(19.43, -99.07)"
  if (/^[\(\[]?-?\d+(\.\d+)?[\s,/-]+-?\d+(\.\d+)?[\)\]]?$/.test(s)) return true;
  // If contains coordinate markers like degree symbol or lat/lng terms
  if (/°|'|"|\b(lat|lng|lon|latitud|longitud)\b/i.test(s)) return true;
  // If contains multiple floating-point numbers without alphabetic text
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(s) && /\d+\.\d+/.test(s)) return true;
  // If only digits, punctuation and symbols without letters
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(s) && /^[0-9.,\s\-–—/()]+$/.test(s) && /\d/.test(s)) return true;
  return false;
}

/**
 * Reverse geocodes a latitude/longitude pair to the closest known Mexican or International airport
 */
export function findAirportByCoordinates(lat: number | undefined | null, lng: number | undefined | null, maxDistanceKm = 80): Airport | undefined {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return undefined;
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return undefined;

  let closestAirport: Airport | undefined = undefined;
  let minDistance = maxDistanceKm;

  for (const airport of Object.values(MEXICO_AIRPORTS)) {
    const dist = calculateDistanceKm(lat, lng, airport.lat, airport.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestAirport = airport;
    }
  }

  return closestAirport;
}

/**
 * Intelligent geocoding resolver for Mexican and international airports by Code (IATA/ICAO), City, Airport Name, or Coordinates
 */
export function resolveAirport(rawQuery: string | undefined | null, lat?: number, lng?: number): Airport | undefined {
  // If valid coordinates are provided, check coordinates first if query is missing or coordinate-like:
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    if (!rawQuery || isCoordinateLike(rawQuery)) {
      const byCoords = findAirportByCoordinates(lat, lng);
      if (byCoords) return byCoords;
    }
  }

  if (!rawQuery) {
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return findAirportByCoordinates(lat, lng);
    }
    return undefined;
  }
  const q = String(rawQuery).trim();
  if (!q) {
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return findAirportByCoordinates(lat, lng);
    }
    return undefined;
  }

  // If query contains a pair of coordinates e.g. "18.4975, -97.4189" or "22.04 -98.8072"
  const pairMatch = q.match(/^(-?\d+(\.\d+)?)[,\s/]+(-?\d+(\.\d+)?)$/);
  if (pairMatch) {
    const pLat = parseFloat(pairMatch[1]);
    const pLng = parseFloat(pairMatch[3]);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      const byCoords = findAirportByCoordinates(pLat, pLng);
      if (byCoords) return byCoords;
    }
  }

  // If query looks like coordinates and we have lat/lng passed:
  if (isCoordinateLike(q)) {
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      const byCoords = findAirportByCoordinates(lat, lng);
      if (byCoords) return byCoords;
    }
  }

  const upper = q.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Specific canonical aliases for requested Mexican airports
  if (upper === 'CSL' || upper === 'MMSL' || upper === 'CABOSANLUCAS' || upper === 'AERODROMOCABOSANLUCAS') {
    return MEXICO_AIRPORTS['CSL'];
  }
  if (upper === 'SJD' || upper === 'MMSD' || upper === 'SANJOSEDELCABO' || upper === 'LOSCABOS') {
    return MEXICO_AIRPORTS['SJD'];
  }
  if (upper === 'ZIH' || upper === 'IXT' || upper === 'MMZH' || upper === 'ZIHUATANEJO' || upper === 'IXTAPA') {
    return MEXICO_AIRPORTS['ZIH'];
  }
  if (upper === 'TSL' || upper === 'MMTN' || upper === 'TAMUIN') {
    return MEXICO_AIRPORTS['TSL'];
  }
  if (upper === 'IZT' || upper === 'MMIT' || upper === 'IXTEPEC') {
    return MEXICO_AIRPORTS['IZT'];
  }
  if (upper === 'TCN' || upper === 'MMHC' || upper === 'MMTC' || upper === 'TEHUACAN') {
    return MEXICO_AIRPORTS['TCN'];
  }

  // 1. Direct IATA check
  if (MEXICO_AIRPORTS[upper]) {
    return MEXICO_AIRPORTS[upper];
  }

  // 2. ICAO check (e.g. MMMX -> MEX, MMUN -> CUN, MMGL -> GDL, MMTO -> TLC, etc.)
  if (upper.startsWith('MM') && upper.length === 4) {
    const icaoSuffix = upper.slice(2);
    // Find matching IATA
    for (const [code, airport] of Object.entries(MEXICO_AIRPORTS)) {
      if (code === icaoSuffix || code.startsWith(icaoSuffix.slice(0, 2))) {
        return airport;
      }
    }
  }

  // 3. Normalized text matching (accents stripped)
  const normQ = q.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Search by city name or airport name
  for (const airport of Object.values(MEXICO_AIRPORTS)) {
    const normCity = (airport.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normName = airport.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normCity === normQ || normName === normQ) {
      return airport;
    }
    if (normQ.length >= 4 && (normCity.includes(normQ) || normName.includes(normQ))) {
      return airport;
    }
    if (normCity.length >= 4 && normQ.includes(normCity)) {
      return airport;
    }
  }

  // Fallback to coordinates if available
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    return findAirportByCoordinates(lat, lng);
  }

  return undefined;
}

interface RawDemoRoute {
  orig: string;
  dest: string;
  airline: string;
  flightNo?: string;
  aircraft: string;
  flights2024: number;
  pax2024: number;
  flights2025: number;
  pax2025: number;
  month: string;
  authDate?: string;
}

const RAW_ROUTES: RawDemoRoute[] = [
  // CDMX Troncales
  { orig: 'MEX', dest: 'CUN', airline: 'Aeroméxico', flightNo: 'AM500', aircraft: 'Boeing 787-9', flights2024: 1850, pax2024: 388500, flights2025: 2100, pax2025: 451500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'CUN', airline: 'Volaris', flightNo: 'Y4702', aircraft: 'Airbus A321neo', flights2024: 2400, pax2024: 480000, flights2025: 2750, pax2025: 563750, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'CUN', airline: 'VivaAerobus', flightNo: 'VB1050', aircraft: 'Airbus A320', flights2024: 2100, pax2024: 378000, flights2025: 2350, pax2025: 434750, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'MTY', airline: 'Aeroméxico', flightNo: 'AM902', aircraft: 'Boeing 737 MAX 8', flights2024: 2900, pax2024: 435000, flights2025: 3150, pax2025: 488250, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'MTY', airline: 'VivaAerobus', flightNo: 'VB2104', aircraft: 'Airbus A321neo', flights2024: 2600, pax2024: 520000, flights2025: 2900, pax2025: 594500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'GDL', airline: 'Aeroméxico', flightNo: 'AM204', aircraft: 'Boeing 737-800', flights2024: 3100, pax2024: 465000, flights2025: 3300, pax2025: 511500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'GDL', airline: 'Volaris', flightNo: 'Y4800', aircraft: 'Airbus A320neo', flights2024: 2200, pax2024: 396000, flights2025: 2400, pax2025: 444000, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'TIJ', airline: 'Aeroméxico', flightNo: 'AM170', aircraft: 'Boeing 737 MAX 9', flights2024: 1550, pax2024: 248000, flights2025: 1720, pax2025: 283800, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'TIJ', airline: 'Volaris', flightNo: 'Y4810', aircraft: 'Airbus A321neo', flights2024: 2100, pax2024: 441000, flights2025: 2300, pax2025: 494500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'MID', airline: 'Aeroméxico', flightNo: 'AM820', aircraft: 'Embraer 190', flights2024: 1350, pax2024: 121500, flights2025: 1480, pax2025: 140600, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'MID', airline: 'VivaAerobus', flightNo: 'VB1100', aircraft: 'Airbus A320', flights2024: 1200, pax2024: 216000, flights2025: 1380, pax2025: 255300, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'SJD', airline: 'Aeroméxico', flightNo: 'AM362', aircraft: 'Boeing 737 MAX 8', flights2024: 1100, pax2024: 165000, flights2025: 1250, pax2025: 193750, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'PVR', airline: 'Aeroméxico', flightNo: 'AM334', aircraft: 'Boeing 737-800', flights2024: 1250, pax2024: 187500, flights2025: 1390, pax2025: 215450, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'OAX', airline: 'Aeroméxico', flightNo: 'AM2046', aircraft: 'Embraer 190', flights2024: 980, pax2024: 88200, flights2025: 1120, pax2025: 106400, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'OAX', airline: 'Volaris', flightNo: 'Y4780', aircraft: 'Airbus A320', flights2024: 850, pax2024: 144500, flights2025: 980, pax2025: 171500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'TGZ', airline: 'VivaAerobus', flightNo: 'VB1240', aircraft: 'Airbus A320', flights2024: 910, pax2024: 154700, flights2025: 1020, pax2025: 178500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'CUU', airline: 'Aeroméxico', flightNo: 'AM134', aircraft: 'Boeing 737-700', flights2024: 820, pax2024: 106600, flights2025: 900, pax2025: 121500, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'HMO', airline: 'Aeroméxico', flightNo: 'AM112', aircraft: 'Boeing 737 MAX 8', flights2024: 940, pax2024: 141000, flights2025: 1060, pax2025: 164300, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'VSA', airline: 'Aeroméxico', flightNo: 'AM508', aircraft: 'Embraer 190', flights2024: 760, pax2024: 68400, flights2025: 840, pax2025: 79800, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'HUX', airline: 'Aeroméxico', flightNo: 'AM2530', aircraft: 'Embraer 190', flights2024: 650, pax2024: 58500, flights2025: 730, pax2025: 69350, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'PXM', airline: 'VivaAerobus', flightNo: 'VB1312', aircraft: 'Airbus A320', flights2024: 580, pax2024: 98600, flights2025: 710, pax2025: 124250, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'ACA', airline: 'Aeroméxico', flightNo: 'AM304', aircraft: 'Embraer 190', flights2024: 720, pax2024: 64800, flights2025: 790, pax2025: 75050, month: 'Enero-Diciembre' },

  // AIFA (NLU) Rutas
  { orig: 'NLU', dest: 'CUN', airline: 'VivaAerobus', flightNo: 'VB3010', aircraft: 'Airbus A321neo', flights2024: 1200, pax2024: 240000, flights2025: 1850, pax2025: 379250, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'MTY', airline: 'VivaAerobus', flightNo: 'VB3022', aircraft: 'Airbus A320', flights2024: 980, pax2024: 166600, flights2025: 1450, pax2025: 253750, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'GDL', airline: 'Volaris', flightNo: 'Y41020', aircraft: 'Airbus A320neo', flights2024: 850, pax2024: 144500, flights2025: 1280, pax2025: 224000, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'TIJ', airline: 'Volaris', flightNo: 'Y41040', aircraft: 'Airbus A321neo', flights2024: 920, pax2024: 188600, flights2025: 1350, pax2025: 283500, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'MID', airline: 'Aeroméxico', flightNo: 'AM870', aircraft: 'Boeing 737 MAX 8', flights2024: 640, pax2024: 92800, flights2025: 980, pax2025: 147000, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'OAX', airline: 'VivaAerobus', flightNo: 'VB3060', aircraft: 'Airbus A320', flights2024: 450, pax2024: 74250, flights2025: 720, pax2025: 122400, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'PVR', airline: 'Aeroméxico', flightNo: 'AM880', aircraft: 'Boeing 737-800', flights2024: 510, pax2024: 76500, flights2025: 840, pax2025: 130200, month: 'Enero-Diciembre' },

  // Rutas Interciudades / Hub Guadalajara (GDL)
  { orig: 'GDL', dest: 'TIJ', airline: 'Volaris', flightNo: 'Y4512', aircraft: 'Airbus A321neo', flights2024: 2100, pax2024: 430500, flights2025: 2350, pax2025: 493500, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'TIJ', airline: 'VivaAerobus', flightNo: 'VB4012', aircraft: 'Airbus A320', flights2024: 1600, pax2024: 272000, flights2025: 1820, pax2025: 318500, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'CUN', airline: 'Volaris', flightNo: 'Y4560', aircraft: 'Airbus A321neo', flights2024: 1450, pax2024: 297250, flights2025: 1650, pax2025: 346500, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'CUN', airline: 'VivaAerobus', flightNo: 'VB4040', aircraft: 'Airbus A320', flights2024: 1300, pax2024: 221000, flights2025: 1480, pax2025: 259000, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'MTY', airline: 'VivaAerobus', flightNo: 'VB4100', aircraft: 'Airbus A320', flights2024: 1750, pax2024: 297500, flights2025: 1950, pax2025: 341250, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'MTY', airline: 'Aeroméxico', flightNo: 'AM2114', aircraft: 'Embraer 190', flights2024: 1100, pax2024: 99000, flights2025: 1250, pax2025: 118750, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'SJD', airline: 'Volaris', flightNo: 'Y4580', aircraft: 'Airbus A320neo', flights2024: 980, pax2024: 171500, flights2025: 1120, pax2025: 201600, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'CUL', airline: 'Volaris', flightNo: 'Y4590', aircraft: 'Airbus A320', flights2024: 840, pax2024: 142800, flights2025: 930, pax2025: 162750, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'HMO', airline: 'Volaris', flightNo: 'Y4594', aircraft: 'Airbus A320', flights2024: 760, pax2024: 129200, flights2025: 850, pax2025: 148750, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'MID', airline: 'Volaris', flightNo: 'Y4524', aircraft: 'Airbus A320neo', flights2024: 620, pax2024: 108500, flights2025: 740, pax2025: 133200, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'VER', airline: 'VivaAerobus', flightNo: 'VB4130', aircraft: 'Airbus A320', flights2024: 510, pax2024: 84150, flights2025: 590, pax2025: 100300, month: 'Enero-Diciembre' },
  { orig: 'GDL', dest: 'TGZ', airline: 'Volaris', flightNo: 'Y4532', aircraft: 'Airbus A320', flights2024: 420, pax2024: 71400, flights2025: 510, pax2025: 89250, month: 'Enero-Diciembre' },

  // Rutas Interciudades / Hub Monterrey (MTY)
  { orig: 'MTY', dest: 'CUN', airline: 'VivaAerobus', flightNo: 'VB2050', aircraft: 'Airbus A321neo', flights2024: 1950, pax2024: 399750, flights2025: 2200, pax2025: 462000, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'CUN', airline: 'Volaris', flightNo: 'Y42010', aircraft: 'Airbus A320neo', flights2024: 1200, pax2024: 210000, flights2025: 1350, pax2025: 243000, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'TIJ', airline: 'VivaAerobus', flightNo: 'VB2020', aircraft: 'Airbus A320', flights2024: 1400, pax2024: 238000, flights2025: 1580, pax2025: 276500, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'TIJ', airline: 'Volaris', flightNo: 'Y42030', aircraft: 'Airbus A321neo', flights2024: 1100, pax2024: 225500, flights2025: 1250, pax2025: 262500, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'MID', airline: 'VivaAerobus', flightNo: 'VB2070', aircraft: 'Airbus A320', flights2024: 920, pax2024: 156400, flights2025: 1080, pax2025: 189000, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'PVR', airline: 'VivaAerobus', flightNo: 'VB2080', aircraft: 'Airbus A320', flights2024: 860, pax2024: 141900, flights2025: 980, pax2025: 166600, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'SJD', airline: 'VivaAerobus', flightNo: 'VB2090', aircraft: 'Airbus A320', flights2024: 890, pax2024: 146850, flights2025: 1040, pax2025: 176800, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'HMO', airline: 'VivaAerobus', flightNo: 'VB2034', aircraft: 'Airbus A320', flights2024: 670, pax2024: 110550, flights2025: 760, pax2025: 129200, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'VSA', airline: 'VivaAerobus', flightNo: 'VB2062', aircraft: 'Airbus A320', flights2024: 580, pax2024: 95700, flights2025: 670, pax2025: 113900, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'QRO', airline: 'Aeroméxico', flightNo: 'AM2430', aircraft: 'Embraer 190', flights2024: 520, pax2024: 44200, flights2025: 610, pax2025: 54900, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'TRC', airline: 'TAR Aerolíneas', flightNo: 'YQ710', aircraft: 'Embraer ERJ 145', flights2024: 340, pax2024: 15300, flights2025: 390, pax2025: 18330, month: 'Enero-Diciembre' },
  { orig: 'MTY', dest: 'CUU', airline: 'TAR Aerolíneas', flightNo: 'YQ720', aircraft: 'Embraer ERJ 145', flights2024: 360, pax2024: 16200, flights2025: 410, pax2025: 19270, month: 'Enero-Diciembre' },

  // Rutas Hub Tijuana (TIJ) y Pacífico Norte
  { orig: 'TIJ', dest: 'CUN', airline: 'Volaris', flightNo: 'Y45050', aircraft: 'Airbus A321neo', flights2024: 1050, pax2024: 215250, flights2025: 1220, pax2025: 256200, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'CUL', airline: 'Volaris', flightNo: 'Y45012', aircraft: 'Airbus A320', flights2024: 1350, pax2024: 229500, flights2025: 1480, pax2025: 259000, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'CUL', airline: 'VivaAerobus', flightNo: 'VB5014', aircraft: 'Airbus A320', flights2024: 980, pax2024: 161700, flights2025: 1100, pax2025: 187000, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'BJX', airline: 'Volaris', flightNo: 'Y45022', aircraft: 'Airbus A320neo', flights2024: 1120, pax2024: 196000, flights2025: 1260, pax2025: 226800, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'MLM', airline: 'Volaris', flightNo: 'Y45032', aircraft: 'Airbus A320', flights2024: 870, pax2024: 147900, flights2025: 960, pax2025: 168000, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'OAX', airline: 'Volaris', flightNo: 'Y45042', aircraft: 'Airbus A320', flights2024: 740, pax2024: 125800, flights2025: 860, pax2025: 150500, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'PVR', airline: 'Volaris', flightNo: 'Y45054', aircraft: 'Airbus A320', flights2024: 690, pax2024: 117300, flights2025: 780, pax2025: 136500, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'SJD', airline: 'Volaris', flightNo: 'Y45060', aircraft: 'Airbus A320', flights2024: 820, pax2024: 139400, flights2025: 930, pax2025: 162750, month: 'Enero-Diciembre' },
  { orig: 'TIJ', dest: 'LAP', airline: 'Volaris', flightNo: 'Y45064', aircraft: 'Airbus A320', flights2024: 590, pax2024: 97350, flights2025: 670, pax2025: 113900, month: 'Enero-Diciembre' },

  // Rutas Cancún (CUN) y Sureste
  { orig: 'CUN', dest: 'MID', airline: 'Aeroméxico', flightNo: 'AM2700', aircraft: 'Embraer 190', flights2024: 540, pax2024: 45900, flights2025: 620, pax2025: 55800, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'TGZ', airline: 'VivaAerobus', flightNo: 'VB6010', aircraft: 'Airbus A320', flights2024: 490, pax2024: 80850, flights2025: 580, pax2025: 98600, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'OAX', airline: 'Volaris', flightNo: 'Y46020', aircraft: 'Airbus A320', flights2024: 460, pax2024: 75900, flights2025: 550, pax2025: 93500, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'VSA', airline: 'VivaAerobus', flightNo: 'VB6030', aircraft: 'Airbus A320', flights2024: 510, pax2024: 84150, flights2025: 610, pax2025: 103700, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'BJX', airline: 'Volaris', flightNo: 'Y46040', aircraft: 'Airbus A320neo', flights2024: 680, pax2024: 119000, flights2025: 790, pax2025: 142200, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'QRO', airline: 'VivaAerobus', flightNo: 'VB6050', aircraft: 'Airbus A320', flights2024: 630, pax2024: 103950, flights2025: 750, pax2025: 127500, month: 'Enero-Diciembre' },
  { orig: 'CUN', dest: 'VER', airline: 'VivaAerobus', flightNo: 'VB6060', aircraft: 'Airbus A320', flights2024: 570, pax2024: 94050, flights2025: 660, pax2025: 112200, month: 'Enero-Diciembre' },

  // Rutas Regionales Querétaro / Toluca / Bajío
  { orig: 'QRO', dest: 'PVR', airline: 'TAR Aerolíneas', flightNo: 'YQ502', aircraft: 'Embraer ERJ 145', flights2024: 310, pax2024: 13950, flights2025: 350, pax2025: 16450, month: 'Enero-Diciembre' },
  { orig: 'QRO', dest: 'ZIH', airline: 'TAR Aerolíneas', flightNo: 'YQ512', aircraft: 'Embraer ERJ 145', flights2024: 240, pax2024: 10560, flights2025: 280, pax2025: 12880, month: 'Enero-Diciembre' },
  { orig: 'TLC', dest: 'CUN', airline: 'Volaris', flightNo: 'Y4710', aircraft: 'Airbus A320', flights2024: 620, pax2024: 105400, flights2025: 780, pax2025: 136500, month: 'Enero-Diciembre' },
  { orig: 'TLC', dest: 'GDL', airline: 'VivaAerobus', flightNo: 'VB720', aircraft: 'Airbus A320', flights2024: 480, pax2024: 79200, flights2025: 610, pax2025: 103700, month: 'Enero-Diciembre' },
  { orig: 'TLC', dest: 'MTY', airline: 'VivaAerobus', flightNo: 'VB730', aircraft: 'Airbus A320', flights2024: 510, pax2024: 84150, flights2025: 650, pax2025: 110500, month: 'Enero-Diciembre' },
  { orig: 'TLC', dest: 'PVR', airline: 'Volaris', flightNo: 'Y4720', aircraft: 'Airbus A320', flights2024: 380, pax2024: 62700, flights2025: 490, pax2025: 83300, month: 'Enero-Diciembre' },

  // Rutas de Conectividad Regional (Tamuín, Ixtepec, Tehuacán, Zihuatanejo)
  { orig: 'MEX', dest: 'ZIH', airline: 'Aeroméxico', flightNo: 'AM2540', aircraft: 'Boeing 737-800', flights2024: 680, pax2024: 98600, flights2025: 750, pax2025: 112500, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'TSL', airline: 'Mexicana de Aviación', flightNo: 'MX1420', aircraft: 'Embraer ERJ 145', flights2024: 210, pax2024: 9450, flights2025: 260, pax2025: 12220, month: 'Enero-Diciembre' },
  { orig: 'SLP', dest: 'TSL', airline: 'Aerus', flightNo: 'ZV220', aircraft: 'Cessna Grand Caravan', flights2024: 180, pax2024: 1440, flights2025: 220, pax2025: 1870, month: 'Enero-Diciembre' },
  { orig: 'NLU', dest: 'IZT', airline: 'Mexicana de Aviación', flightNo: 'MX1530', aircraft: 'Boeing 737-800', flights2024: 290, pax2024: 39150, flights2025: 340, pax2025: 47600, month: 'Enero-Diciembre' },
  { orig: 'OAX', dest: 'IZT', airline: 'Aerotucán', flightNo: 'RT110', aircraft: 'Cessna 208B', flights2024: 240, pax2024: 1920, flights2025: 270, pax2025: 2295, month: 'Enero-Diciembre' },
  { orig: 'MEX', dest: 'TCN', airline: 'Aerus', flightNo: 'ZV340', aircraft: 'Cessna Grand Caravan', flights2024: 160, pax2024: 1280, flights2025: 190, pax2025: 1615, month: 'Enero-Diciembre' },
  { orig: 'PBC', dest: 'TCN', airline: 'Aerus', flightNo: 'ZV350', aircraft: 'Cessna Grand Caravan', flights2024: 140, pax2024: 1120, flights2025: 170, pax2025: 1445, month: 'Enero-Diciembre' },
];

/**
 * Returns official database records strictly from the loaded database (sheet Observatorio de Rutas)
 */
export function getDemoFlightRoutes(): FlightRoute[] {
  return officialRoutesJson as FlightRoute[];
}
