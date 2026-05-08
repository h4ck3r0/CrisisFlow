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

export interface RouteResult {
  status: 'success' | 'error';
  path?: number[][];
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
