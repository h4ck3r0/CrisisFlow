import type { EmergencyFacility, ViewState } from '../types';

export const API_URL = 'http://127.0.0.1:8000';

export const INITIAL_VIEW_STATE: ViewState = {
  longitude: 77.6450,
  latitude: 12.9350,
  zoom: 13.5,
  pitch: 0,
  bearing: 0,
};

export const VIEW_STATE_2D: Partial<ViewState> = {
  pitch: 0,
  bearing: 0,
  transitionDuration: 800,
};

export const VIEW_STATE_3D: Partial<ViewState> = {
  pitch: 50,
  bearing: -25,
  transitionDuration: 800,
};

export const EMERGENCY_INFRA: EmergencyFacility[] = [
  { name: 'Fortis Hospital', type: 'hospital', lon: 77.6220, lat: 12.9340 },
  { name: 'Apollo Clinic HSR', type: 'hospital', lon: 77.6480, lat: 12.9180 },
  { name: 'Koramangala Fire Station', type: 'fire', lon: 77.6300, lat: 12.9420 },
  { name: 'Madiwala Fire Station', type: 'fire', lon: 77.6200, lat: 12.9220 },
  { name: 'HSR Police Station', type: 'police', lon: 77.6500, lat: 12.9150 },
  { name: 'Koramangala Police', type: 'police', lon: 77.6250, lat: 12.9380 },
  { name: 'Community Shelter A', type: 'shelter', lon: 77.6350, lat: 12.9500 },
  { name: 'Community Shelter B', type: 'shelter', lon: 77.6550, lat: 12.9280 },
];

export const INFRA_COLORS: Record<string, [number, number, number]> = {
  hospital: [255, 68, 68],
  fire: [255, 136, 0],
  police: [68, 136, 255],
  shelter: [68, 204, 136],
};

export const FLOOD_COLOR_RANGE: [number, number, number, number][] = [
  [0, 60, 140, 0],
  [0, 160, 255, 100],
  [0, 220, 255, 160],
  [255, 220, 0, 200],
  [255, 130, 0, 230],
  [255, 30, 50, 255],
];
