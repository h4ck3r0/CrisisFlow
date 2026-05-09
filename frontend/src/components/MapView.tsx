import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer, ScatterplotLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import { INFRA_COLORS, FLOOD_COLOR_RANGE } from '../constants';
import type { FloodPoint, EmergencyFacility, ViewState, RouteSegment } from '../types';
import 'maplibre-gl/dist/maplibre-gl.css';

const INFRA_ICONS: Record<string, string> = {
  hospital: '🏥',
  fire: '🚒',
  police: '🚔',
  shelter: '🏠',
};

interface MapViewProps {
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
  is3D: boolean;
  activeFloodPoints: FloodPoint[];
  emergencyData: EmergencyFacility[];
  clickPoints: [number, number][];
  routeCoords: number[][] | null;
  routeSegments: RouteSegment[];
  onMapClick: (coordinate: [number, number]) => void;
  currentPoint: [number, number] | null;
}

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 2.0,
});

const sunLight = new DirectionalLight({
  color: [255, 245, 230],
  intensity: 3.0,
  direction: [-3, -9, -1],
});

const sunLight2 = new DirectionalLight({
  color: [180, 200, 255],
  intensity: 1.5,
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
  routeSegments,
  onMapClick,
  currentPoint,
}: MapViewProps) {
  const layers = useMemo(() => {
    const allLayers = [
      new GeoJsonLayer({
        id: 'buildings-3d',
        data: `http://127.0.0.1:8000/geojson/buildings`,
        filled: true,
        extruded: is3D,
        wireframe: is3D,
        getElevation: (d: unknown) => {
          const feature = d as { properties?: { height?: number } };
          return feature.properties?.height || 10;
        },
        getFillColor: is3D
          ? [45, 55, 95, 240]
          : [20, 25, 40, 80],
        getLineColor: is3D
          ? [100, 130, 200, 180]
          : [60, 70, 100, 80],
        elevationScale: is3D ? 5 : 0,
        material: is3D
          ? {
              ambient: 0.4,
              diffuse: 0.8,
              shininess: 60,
              specularColor: [120, 160, 255],
            }
          : undefined,
        pickable: false,
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
        radiusPixels: 25,
        intensity: 1.2,
        threshold: 0.08,
        colorRange: FLOOD_COLOR_RANGE,
        opacity: 0.7,
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
        id: 'emergency-bg',
        data: emergencyData,
        pickable: false,
        opacity: 0.9,
        stroked: true,
        filled: true,
        radiusMinPixels: 16,
        radiusMaxPixels: 22,
        lineWidthMinPixels: 2,
        getPosition: (d: EmergencyFacility) => [d.lon, d.lat],
        getRadius: 60,
        getFillColor: (d: EmergencyFacility) => {
          return d.accessible !== false ? [15, 20, 35, 220] : [60, 15, 20, 220];
        },
        getLineColor: (d: EmergencyFacility) => {
          const base = INFRA_COLORS[d.type] || [255, 255, 255];
          return d.accessible !== false ? [...base, 255] : [...base, 100];
        },
      }),

      new TextLayer({
        id: 'emergency-icons',
        data: emergencyData,
        pickable: true,
        getPosition: (d: EmergencyFacility) => [d.lon, d.lat],
        getText: (d: EmergencyFacility) => INFRA_ICONS[d.type] || '📍',
        getSize: 20,
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        getPixelOffset: [0, 0],
        fontFamily: 'Arial, sans-serif',
        characterSet: 'auto',
        billboard: true,
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
        getPosition: (d: { pos: [number, number]; type: number }) => d.pos,
        getRadius: 30,
        getFillColor: (d: { pos: [number, number]; type: number }) =>
          d.type === 0 ? [0, 255, 130, 255] : [255, 80, 80, 255],
        getLineColor: [255, 255, 255, 220],
      }),

      new PathLayer({
        id: 'ai-route-glow',
        data: routeCoords ? [{ path: routeCoords }] : [],
        pickable: false,
        widthMinPixels: 14,
        widthMaxPixels: 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPath: (d: any) => d.path,
        getColor: [0, 180, 255, 40],
        getWidth: 14,
        rounded: true,
      }),

      new PathLayer({
        id: 'ai-route-segments',
        data: routeSegments,
        pickable: false,
        widthMinPixels: 5,
        widthMaxPixels: 8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPath: (d: RouteSegment) => d.path as any,
        getColor: (d: RouteSegment) => d.color,
        getWidth: 5,
        rounded: true,
      }),

      new ScatterplotLayer({
        id: 'report-marker',
        data: currentPoint ? [{ pos: currentPoint }] : [],
        pickable: false,
        opacity: 0.8,
        stroked: true,
        filled: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 12,
        lineWidthMinPixels: 2,
        getPosition: (d: { pos: [number, number] }) => d.pos,
        getRadius: 20,
        getFillColor: [255, 255, 0, 200],
        getLineColor: [255, 255, 255, 255],
      }),
    ];

    return allLayers;
  }, [is3D, activeFloodPoints, emergencyData, clickPoints, routeCoords, routeSegments, currentPoint]);

  const effects = useMemo(() => (is3D ? [lightingEffect] : []), [is3D]);

  const getTooltip = ({ object }: { object?: Record<string, unknown> }) => {
    if (!object) return null;
    if (object.depth !== undefined) {
      const depth = object.depth as number;
      let status = 'Safe';
      let color = '#4ade80';
      if (depth > 10) {
        status = 'CRITICAL';
        color = '#ff2244';
      } else if (depth > 5) {
        status = 'HIGH RISK';
        color = '#ff8800';
      } else if (depth > 2) {
        status = 'MODERATE';
        color = '#ffcc00';
      }
      return {
        html: `<div style="font-family:Inter,sans-serif">
          <strong style="color:${color};font-size:18px;font-family:Outfit,sans-serif">${depth.toFixed(1)} cm</strong><br/>
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
    const properties = object.properties as Record<string, unknown> | undefined;
    if (properties?.name) return properties.name as string;
    return null;
  };

  return (
    <DeckGL
      viewState={viewState}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onViewStateChange={(params: any) => onViewStateChange(params.viewState)}
      controller={true}
      layers={layers}
      effects={effects}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
