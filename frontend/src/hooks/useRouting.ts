import { useState, useCallback } from 'react';
import { API_URL } from '../constants';
import type { RouteResult, RouteSegment, RouteETA } from '../types';

export interface RouteInfo {
  distanceKm: number;
  maxDepth: number;
  riskLevel: string;
  facilityName?: string;
  eta: RouteETA;
}

export function useRouting() {
  const [clickPoints, setClickPoints] = useState<[number, number][]>([]);
  const [routeCoords, setRouteCoords] = useState<number[][] | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [routeStatus, setRouteStatus] = useState('Waiting for input...');
  const [routeColor, setRouteColor] = useState('#8b9bb4');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const [lastRequest, setLastRequest] = useState<{
    type: 'point2point' | 'nearest';
    start?: [number, number];
    end?: [number, number];
    lat?: number;
    lon?: number;
    facilityType?: string;
  } | null>(null);

  const processRouteResult = useCallback((data: RouteResult) => {
    if (data.status === 'success' && data.path) {
      setRouteCoords(data.path);
      setRouteSegments(data.segments || []);
      setRouteInfo({
        distanceKm: data.distance_km || 0,
        maxDepth: data.max_depth || 0,
        riskLevel: data.risk_level || 'SAFE',
        facilityName: data.facility_name,
        eta: data.eta || { walk: null, bike: null, car: null },
      });

      const risk = data.risk_level || 'SAFE';
      if (risk === 'CRITICAL') {
        setRouteStatus(`⚠️ Route found — CRITICAL (${data.distance_km} km)`);
        setRouteColor('#ff3366');
      } else if (risk === 'HIGH') {
        setRouteStatus(`⚠️ Route found — HIGH risk (${data.distance_km} km)`);
        setRouteColor('#ff8800');
      } else if (risk === 'MODERATE') {
        setRouteStatus(`Route found — moderate risk (${data.distance_km} km)`);
        setRouteColor('#ffd200');
      } else {
        setRouteStatus(`✅ Safe route found (${data.distance_km} km)`);
        setRouteColor('#4ade80');
      }
    } else {
      setRouteCoords(null);
      setRouteSegments([]);
      setRouteInfo(null);
      setRouteStatus('No safe route. All paths flooded.');
      setRouteColor('#ff3366');
    }
  }, []);

  const calculateRoute = useCallback(async (
    start: [number, number],
    end: [number, number],
    intensity: number
  ) => {
    setRouteStatus('AI calculating safest path...');
    setRouteColor('#8b9bb4');
    setLastRequest({ type: 'point2point', start, end });

    try {
      const response = await fetch(`${API_URL}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lon: start[0],
          start_lat: start[1],
          end_lon: end[0],
          end_lat: end[1],
          intensity,
        }),
      });
      const data: RouteResult = await response.json();
      processRouteResult(data);
    } catch (e) {
      console.error('Routing Error:', e);
      setRouteStatus('Error calculating route.');
      setRouteColor('#ff3366');
    }
  }, [processRouteResult]);

  const findNearest = useCallback(async (
    lat: number,
    lon: number,
    facilityType: string,
    intensity: number
  ) => {
    setRouteStatus(`Finding nearest ${facilityType}...`);
    setRouteColor('#8b9bb4');
    setLastRequest({ type: 'nearest', lat, lon, facilityType });

    try {
      const response = await fetch(`${API_URL}/route/nearest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, facility_type: facilityType, intensity }),
      });
      const data: RouteResult = await response.json();
      processRouteResult(data);
      if (data.facility_name) {
        setRouteStatus((prev) => `${prev} → ${data.facility_name}`);
      }
    } catch (e) {
      console.error('Nearest Routing Error:', e);
      setRouteStatus('Error finding nearest facility.');
      setRouteColor('#ff3366');
    }
  }, [processRouteResult]);

  const handleMapClick = useCallback(
    (coordinate: [number, number], intensity: number) => {
      setClickPoints((prev) => {
        let updated: [number, number][];
        if (prev.length >= 2) {
          updated = [coordinate];
          setRouteCoords(null);
          setRouteSegments([]);
          setRouteInfo(null);
          setRouteStatus('Click destination on the map...');
          setRouteColor('#8b9bb4');
        } else {
          updated = [...prev, coordinate];
        }

        if (updated.length === 1) {
          setRouteStatus('Click destination on the map...');
          setRouteColor('#8b9bb4');
        } else if (updated.length === 2) {
          setTimeout(() => calculateRoute(updated[0], updated[1], intensity), 0);
        }

        return updated;
      });
    },
    [calculateRoute]
  );

  const recalculateRoute = useCallback(
    (intensity: number) => {
      if (lastRequest?.type === 'point2point' && lastRequest.start && lastRequest.end) {
        calculateRoute(lastRequest.start, lastRequest.end, intensity);
      } else if (lastRequest?.type === 'nearest' && lastRequest.lat && lastRequest.lon && lastRequest.facilityType) {
        findNearest(lastRequest.lat, lastRequest.lon, lastRequest.facilityType, intensity);
      }
    },
    [calculateRoute, findNearest, lastRequest]
  );

  const clearRoute = useCallback(() => {
    setClickPoints([]);
    setRouteCoords(null);
    setRouteSegments([]);
    setRouteInfo(null);
    setRouteStatus('Waiting for input...');
    setRouteColor('#8b9bb4');
    setLastRequest(null);
  }, []);

  return {
    clickPoints,
    routeCoords,
    routeSegments,
    routeStatus,
    routeColor,
    routeInfo,
    handleMapClick,
    recalculateRoute,
    findNearest,
    clearRoute,
  };
}
