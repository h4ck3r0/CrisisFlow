import type { EmergencyFacility, ViewState } from '../types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
  pitch: 60,
  bearing: -25,
  zoom: 15,
  transitionDuration: 800,
};

export const EMERGENCY_INFRA: EmergencyFacility[] = [
  // Hospitals — real OSM coordinates
  { name: 'Manipal Hospitals', type: 'hospital', lon: 77.6652549, lat: 12.9199685 },
  { name: 'St. Johns Emergency Ward', type: 'hospital', lon: 77.6186159, lat: 12.9305937 },
  { name: 'Apollo Spectra Hospitals', type: 'hospital', lon: 77.6201615, lat: 12.9338175 },
  { name: 'Phoenix Hospital', type: 'hospital', lon: 77.6450517, lat: 12.9166101 },
  { name: 'Rainbow Childrens Hospital', type: 'hospital', lon: 77.6674739, lat: 12.9202359 },
  { name: 'Manipal Hospital Bengaluru', type: 'hospital', lon: 77.6490296, lat: 12.9587074 },
  { name: 'Greenview Hospital', type: 'hospital', lon: 77.6381223, lat: 12.9191928 },
  { name: 'Govt Primary Health Centre', type: 'hospital', lon: 77.6162619, lat: 12.9503234 },
  { name: 'Roopena Agrahara Govt Hospital', type: 'hospital', lon: 77.6244654, lat: 12.9102142 },
  { name: 'HCG Koramangala', type: 'hospital', lon: 77.6228848, lat: 12.9343279 },
  // Police — real OSM coordinates
  { name: 'HSR Police Station', type: 'police', lon: 77.6513034, lat: 12.9201775 },
  { name: 'Koramangala Police Station', type: 'police', lon: 77.6214106, lat: 12.9410977 },
  { name: 'Viveknagar Police Station', type: 'police', lon: 77.6223510, lat: 12.9518683 },
  { name: 'Bellanduru Police Station', type: 'police', lon: 77.6679644, lat: 12.9190149 },
  { name: 'Madiwala Traffic Police', type: 'police', lon: 77.6206703, lat: 12.9210124 },
  // Fire Station — real OSM coordinates
  { name: 'Sarjapura Road Fire Station', type: 'fire', lon: 77.6738567, lat: 12.9168126 },
  // Shelters — real OSM coordinates
  { name: 'HSR Layout Shelter', type: 'shelter', lon: 77.6441635, lat: 12.9215585 },
  { name: 'Agara Shelter A', type: 'shelter', lon: 77.6411318, lat: 12.9110130 },
  { name: 'Agara Shelter B', type: 'shelter', lon: 77.6402540, lat: 12.9111180 },
  { name: 'Iblur Shelter', type: 'shelter', lon: 77.6387847, lat: 12.9190637 },
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
