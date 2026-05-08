import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer, ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import { INFRA_COLORS, FLOOD_COLOR_RANGE } from '../constants';
import type { FloodPoint, EmergencyFacility, ViewState } from '../types';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
  is3D: boolean;
  activeFloodPoints: FloodPoint[];
  emergencyData: EmergencyFacility[];
  clickPoints: [number, number][];
  routeCoords: number[][] | null;
  onMapClick: (coordinate: [number, number]) => void;
}

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const sunLight = new DirectionalLight({
  color: [255, 245, 230],
  intensity: 2.2,
  direction: [-3, -9, -1],
  _shadow: true,
});

const sunLight2 = new DirectionalLight({
  color: [200, 220, 255],
  intensity: 0.6,
  direction: [5, -8, -2],
});

const lightingEffect = new LightingEffect({
  ambientLight,
  sunLight,
  sunLight2,
});

export default function MapView({
  viewState,
  onViewStateChange,
  is3D,
  activeFloodPoints,
  emergencyData,
  clickPoints,
  routeCoords,
  onMapClick,
}: MapViewProps) {
  const layers = useMemo(() => {
    const allLayers = [
      new GeoJsonLayer({
        id: 'buildings-3d',
        data: `http://127.0.0.1:8000/geojson/buildings`,
        filled: true,
        extruded: is3D,
        wireframe: is3D,
        getElevation: (d: any) => (d.properties?.height || 10) * (is3D ? 1.2 : 0),
        getFillColor: is3D
          ? [22, 28, 48, 220]
          : [20, 25, 40, 80],
        getLineColor: is3D
          ? [50, 65, 110, 120]
          : [60, 70, 100, 80],
        elevationScale: is3D ? 1 : 0,
        material: is3D
          ? {
              ambient: 0.25,
              diffuse: 0.7,
              shininess: 40,
              specularColor: [80, 120, 200],
            }
          : undefined,
        pickable: false,
        parameters: {
          depthTest: true,
        },
      }),

      new GeoJsonLayer({
        id: 'water-bodies',
        data: `http://127.0.0.1:8000/geojson/water`,
        filled: true,
        extruded: false,
        getFillColor: [15, 60, 130, 160],
        getLineColor: [0, 140, 255, 80],
        lineWidthMinPixels: 1,
        pickable: true,
      }),

      new HeatmapLayer({
        id: 'flood-heatmap',
        data: activeFloodPoints,
        getPosition: (d: FloodPoint) => [d.lon, d.lat],
        getWeight: (d: FloodPoint) => Math.max(d.depth, 0),
        radiusPixels: 35,
        intensity: 1.5,
        threshold: 0.03,
        colorRange: FLOOD_COLOR_RANGE,
        opacity: 0.75,
        pickable: false,
      }),

      new ScatterplotLayer({
        id: 'flood-dots',
        data: activeFloodPoints.filter((d) => d.depth > 2),
        pickable: true,
        opacity: 0.5,
        stroked: false,
        filled: true,
        radiusMinPixels: 3,
        radiusMaxPixels: 12,
        getPosition: (d: FloodPoint) => [d.lon, d.lat],
        getRadius: (d: FloodPoint) => d.depth * 2,
        getFillColor: (d: FloodPoint) => {
          if (d.depth > 10) return [255, 40, 60, 180];
          if (d.depth > 5) return [255, 150, 0, 150];
          return [0, 200, 255, 120];
        },
      }),

      new ScatterplotLayer({
        id: 'emergency-markers',
        data: emergencyData,
        pickable: true,
        opacity: 1,
        stroked: true,
        filled: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 14,
        lineWidthMinPixels: 2,
        getPosition: (d: EmergencyFacility) => [d.lon, d.lat],
        getRadius: 40,
        getFillColor: (d: EmergencyFacility) => {
          const base = INFRA_COLORS[d.type] || [255, 255, 255];
          return d.accessible !== false ? [...base, 255] : [...base, 100];
        },
        getLineColor: (d: EmergencyFacility) =>
          d.accessible !== false ? [255, 255, 255, 200] : [255, 50, 50, 255],
      }),

      new ScatterplotLayer({
        id: 'markers',
        data: clickPoints.map((c, i) => ({ pos: c, type: i })),
        pickable: false,
        opacity: 1,
        stroked: true,
        filled: true,
        radiusMinPixels: 10,
        radiusMaxPixels: 16,
        lineWidthMinPixels: 3,
        getPosition: (d: any) => d.pos,
        getRadius: 30,
        getFillColor: (d: any) =>
          d.type === 0 ? [0, 255, 130, 255] : [255, 80, 80, 255],
        getLineColor: [255, 255, 255, 220],
      }),

      new PathLayer({
        id: 'ai-route-glow',
        data: routeCoords ? [{ path: routeCoords }] : [],
        pickable: false,
        widthMinPixels: 14,
        widthMaxPixels: 20,
        getPath: (d: any) => d.path,
        getColor: [0, 180, 255, 50],
        getWidth: 14,
        rounded: true,
      }),

      new PathLayer({
        id: 'ai-route',
        data: routeCoords ? [{ path: routeCoords }] : [],
        pickable: false,
        widthMinPixels: 5,
        widthMaxPixels: 8,
        getPath: (d: any) => d.path,
        getColor: [0, 180, 255, 240],
        getWidth: 5,
        rounded: true,
      }),
    ];

    return allLayers;
  }, [is3D, activeFloodPoints, emergencyData, clickPoints, routeCoords]);

  const effects = useMemo(() => (is3D ? [lightingEffect] : []), [is3D]);

  const getTooltip = ({ object }: any) => {
    if (!object) return null;
    if (object.depth !== undefined) {
      let status = 'Safe';
      let color = '#4ade80';
      if (object.depth > 10) {
        status = 'CRITICAL';
        color = '#ff2244';
      } else if (object.depth > 5) {
        status = 'HIGH RISK';
        color = '#ff8800';
      } else if (object.depth > 2) {
        status = 'MODERATE';
        color = '#ffcc00';
      }
      return {
        html: `<div style="font-family:Inter,sans-serif">
          <strong style="color:${color};font-size:18px;font-family:Outfit,sans-serif">${object.depth.toFixed(1)} cm</strong><br/>
          <span style="color:#8b9bb4;font-size:11px;text-transform:uppercase">Water Depth</span><br/>
          <span style="color:${color};font-weight:600;font-size:12px">${status}</span>
        </div>`,
        style: {
          backgroundColor: 'rgba(11, 15, 25, 0.95)',
          border: `1px solid ${color}`,
          borderRadius: '10px',
          padding: '12px 16px',
          boxShadow: `0 4px 20px ${color}33`,
        },
      };
    }
    if (object.name && object.type) {
      const accessible = object.accessible !== false;
      const statusText = accessible ? '✅ Accessible' : '❌ Flooded Area';
      const statusColor = accessible ? '#4ade80' : '#ff3366';
      return {
        html: `<div style="font-family:Inter,sans-serif">
          <strong style="color:white;font-size:14px;font-family:Outfit,sans-serif">${object.name}</strong><br/>
          <span style="color:#8b9bb4;font-size:11px;text-transform:uppercase">${object.type}</span><br/>
          <span style="color:${statusColor};font-weight:600;font-size:12px">${statusText}</span>
        </div>`,
        style: {
          backgroundColor: 'rgba(11, 15, 25, 0.95)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
        },
      };
    }
    if (object.properties?.name) return object.properties.name;
    return null;
  };

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }: any) => onViewStateChange(vs)}
      controller={true}
      layers={layers}
      effects={effects}
      onClick={(info: any) => {
        if (info.coordinate) {
          onMapClick(info.coordinate as [number, number]);
        }
      }}
      getTooltip={getTooltip}
    >
      <Map
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        attributionControl={false}
      />
    </DeckGL>
  );
}
