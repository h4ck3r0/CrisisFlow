import { useMemo } from 'react';
import type { FloodPoint } from '../types';

interface GridCell {
  lon: number;
  lat: number;
  depth: number;
  count: number;
}

const GRID_SIZE = 0.0008;

export function useFloodClustering(
  points: FloodPoint[],
  threshold: number,
  clusterEnabled: boolean
): FloodPoint[] {
  return useMemo(() => {
    const filtered = points.filter((p) => p.depth >= threshold);

    if (!clusterEnabled || filtered.length === 0) return filtered;

    const grid = new Map<string, GridCell>();

    for (const p of filtered) {
      const gx = Math.floor(p.lon / GRID_SIZE);
      const gy = Math.floor(p.lat / GRID_SIZE);
      const key = `${gx},${gy}`;

      const existing = grid.get(key);
      if (existing) {
        existing.lon = (existing.lon * existing.count + p.lon) / (existing.count + 1);
        existing.lat = (existing.lat * existing.count + p.lat) / (existing.count + 1);
        existing.depth = Math.max(existing.depth, p.depth);
        existing.count += 1;
      } else {
        grid.set(key, { lon: p.lon, lat: p.lat, depth: p.depth, count: 1 });
      }
    }

    return Array.from(grid.values()).map((cell) => ({
      lon: cell.lon,
      lat: cell.lat,
      depth: cell.depth,
    }));
  }, [points, threshold, clusterEnabled]);
}
