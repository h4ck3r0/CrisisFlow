import { useState, useCallback } from 'react';
import { API_URL } from '../constants';
import type { RouteResult } from '../types';

export function useRouting() {
  const [clickPoints, setClickPoints] = useState<[number, number][]>([]);
  const [routeCoords, setRouteCoords] = useState<number[][] | null>(null);
  const [routeStatus, setRouteStatus] = useState('Waiting for input...');
  const [routeColor, setRouteColor] = useState('#8b9bb4');

  const handleMapClick = useCallback(
    (coordinate: [number, number], intensity: number) => {
      setClickPoints((prev) => {
        let updated: [number, number][];
        if (prev.length >= 2) {
          updated = [coordinate];
          setRouteCoords(null);
          setRouteStatus('Click destination on the map...');
          setRouteColor('#8b9bb4');
        } else {
          updated = [...prev, coordinate];
        }

        if (updated.length === 1) {
          setRouteStatus('Click destination on the map...');
          setRouteColor('#8b9bb4');
        } else if (updated.length === 2) {
          calculateRoute(updated[0], updated[1], intensity);
        }

        return updated;
      });
    },
    []
  );

  const calculateRoute = async (
    start: [number, number],
    end: [number, number],
    intensity: number
  ) => {
    setRouteStatus('AI calculating safest path...');
    setRouteColor('#8b9bb4');

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

      if (data.status === 'success' && data.path) {
        setRouteCoords(data.path);
        setRouteStatus('Safe route found!');
        setRouteColor('#4ade80');
      } else {
        setRouteCoords(null);
        setRouteStatus('No safe route. All paths flooded.');
        setRouteColor('#ff3366');
      }
    } catch (e) {
      console.error('Routing Error:', e);
      setRouteStatus('Error calculating route.');
      setRouteColor('#ff3366');
    }
  };

  const recalculateRoute = useCallback(
    (intensity: number) => {
      setClickPoints((prev) => {
        if (prev.length === 2) {
          calculateRoute(prev[0], prev[1], intensity);
        }
        return prev;
      });
    },
    []
  );

  const clearRoute = useCallback(() => {
    setClickPoints([]);
    setRouteCoords(null);
    setRouteStatus('Waiting for input...');
    setRouteColor('#8b9bb4');
  }, []);

  return { clickPoints, routeCoords, routeStatus, routeColor, handleMapClick, recalculateRoute, clearRoute };
}
