export interface FloodPoint {
  lon: number;
  lat: number;
  depth: number;
}

export interface RoadSegment {
  from: [number, number];
  to: [number, number];
  depth: number;
}

export interface EmergencyFacility {
  name: string;
  type: 'hospital' | 'fire' | 'police' | 'shelter';
  lon: number;
  lat: number;
  accessible?: boolean;
}

export interface SimulationResult {
  roads: RoadSegment[];
  points: FloodPoint[];
  timeline: number[][];
}

export interface WeatherResult {
  rain_mm: number;
  intensity: number;
  status: 'live' | 'fallback';
}

export interface RouteSegment {
  path: number[][];
  depth: number;
  color: [number, number, number, number];
}

export interface RouteETA {
  walk: number | null;
  bike: number | null;
  car: number | null;
}

export interface RouteResult {
  status: 'success' | 'error';
  path?: number[][];
  segments?: RouteSegment[];
  distance_km?: number;
  max_depth?: number;
  risk_level?: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  facility_name?: string;
  eta?: RouteETA;
  message?: string;
}

export interface GovStats {
  affected: number;
  total: number;
  critical: number;
  maxDepth: number;
  dangerous: number;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}
