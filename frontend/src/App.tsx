import { useState, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import RainEffect from './components/RainEffect';
import TopRightNav, { type NavTab } from './components/TopRightNav';
import BottomRightPanel, { type Report } from './components/BottomRightPanel';
import { useFloodSimulation } from './hooks/useFloodSimulation';
import { useWeather } from './hooks/useWeather';
import { useRouting } from './hooks/useRouting';
import { useFloodClustering } from './hooks/useFloodClustering';
import {
  INITIAL_VIEW_STATE,
  VIEW_STATE_2D,
  VIEW_STATE_3D,
  EMERGENCY_INFRA,
} from './constants';
import type { FloodPoint, GovStats, ViewState } from './types';

const DUMMY_REPORTS: Report[] = [
  {
    id: '1',
    type: 'police',
    description: 'Traffic congestion due to water logging near main junction.',
    location: [77.63, 12.95],
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '2',
    type: 'hospital',
    description: 'Medical emergency: Elderly person needs evacuation.',
    location: [77.62, 12.94],
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
];

function App() {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [is3D, setIs3D] = useState(false);
  const [intensity, setIntensity] = useState(0.5);
  const [currentTimestep, setCurrentTimestep] = useState(-1);
  const [depthThreshold, setDepthThreshold] = useState(1.0);
  const [clusterEnabled, setClusterEnabled] = useState(true);

  // New states for User/Gov/Police/Hospital
  const [activeTab, setActiveTab] = useState<NavTab>('user');
  const [reports, setReports] = useState<Report[]>(DUMMY_REPORTS);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<[number, number] | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const { floodPoints, floodTimeline, computing, computeTime, simulate, clearSimulation } =
    useFloodSimulation();
  const {
    weatherStatus,
    weatherColor,
    fetching: weatherFetching,
    autoRefresh,
    fetchWeather,
    toggleAutoRefresh,
  } = useWeather();
  const {
    clickPoints, routeCoords, routeSegments, routeStatus, routeColor,
    routeInfo, handleMapClick, recalculateRoute, findNearest, clearRoute,
  } = useRouting();

  const activeFloodPoints = useMemo((): FloodPoint[] => {
    if (currentTimestep === -2) return [];
    if (currentTimestep === -1 || floodTimeline.length === 0) return floodPoints;
    return floodPoints.map((p, i) => ({
      lon: p.lon,
      lat: p.lat,
      depth: floodTimeline[currentTimestep]?.[i] ?? 0,
    }));
  }, [floodPoints, floodTimeline, currentTimestep]);

  const clusteredPoints = useFloodClustering(activeFloodPoints, depthThreshold, clusterEnabled);

  const emergencyData = useMemo(() => {
    const active = activeFloodPoints;
    if (active.length === 0) return EMERGENCY_INFRA.map((f) => ({ ...f, accessible: true }));
    return EMERGENCY_INFRA.map((f) => {
      let minDist = Infinity;
      let nearDepth = 0;
      for (const p of active) {
        const dist = Math.abs(p.lon - f.lon) + Math.abs(p.lat - f.lat);
        if (dist < minDist) {
          minDist = dist;
          nearDepth = p.depth;
        }
      }
      return { ...f, accessible: nearDepth < 5 };
    });
  }, [activeFloodPoints]);

  const govStats = useMemo((): GovStats => {
    const points = activeFloodPoints;
    if (points.length === 0)
      return { affected: 0, total: 0, critical: 0, maxDepth: 0, dangerous: 0 };
    return {
      total: points.length,
      affected: points.filter((p) => p.depth > 0.5).length,
      critical: points.filter((p) => p.depth > 10).length,
      maxDepth: Math.max(...points.map((p) => p.depth)),
      dangerous: points.filter((p) => p.depth > 5).length,
    };
  }, [activeFloodPoints]);

  const handleToggle2D = useCallback(() => {
    setIs3D(false);
    setViewState((prev) => ({ ...prev, ...VIEW_STATE_2D }));
  }, []);

  const handleToggle3D = useCallback(() => {
    setIs3D(true);
    setViewState((prev) => ({ ...prev, ...VIEW_STATE_3D }));
  }, []);

  const handleSimulate = useCallback(async () => {
    if (currentTimestep === -2) {
      setCurrentTimestep(-1);
    }
    const result = await simulate(intensity);
    if (result && clickPoints.length === 2) {
      recalculateRoute(intensity);
    }
  }, [intensity, simulate, clickPoints, recalculateRoute, currentTimestep]);

  const handleClearSimulation = useCallback(() => {
    clearSimulation();
    setCurrentTimestep(-2);
  }, [clearSimulation]);

  const handleFetchWeather = useCallback(async () => {
    const newIntensity = await fetchWeather();
    if (newIntensity !== null) {
      setIntensity(newIntensity);
      if (newIntensity <= 0.05) {
        clearSimulation();
        setCurrentTimestep(-2);
      } else {
        setCurrentTimestep(0);
        await simulate(newIntensity);
      }
      if (clickPoints.length === 2) {
        recalculateRoute(newIntensity);
      }
    }
  }, [fetchWeather, clearSimulation, simulate, clickPoints, recalculateRoute]);

  const handleAutoRefresh = useCallback(() => {
    toggleAutoRefresh(async () => {
      const newIntensity = await fetchWeather();
      if (newIntensity !== null) {
        setIntensity(newIntensity);
        if (newIntensity <= 0.05) {
          clearSimulation();
          setCurrentTimestep(-2);
        } else {
          setCurrentTimestep(0);
          await simulate(newIntensity);
        }
        if (clickPoints.length === 2) {
          recalculateRoute(newIntensity);
        }
      }
    });
  }, [toggleAutoRefresh, fetchWeather, clearSimulation, simulate, clickPoints, recalculateRoute]);

  const onMapClick = useCallback(
    (coordinate: [number, number]) => {
      if (isSettingLocation) {
        setCurrentPoint(coordinate);
        setIsSettingLocation(false);
      } else {
        handleMapClick(coordinate, intensity);
      }
    },
    [handleMapClick, intensity, isSettingLocation]
  );

  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'gov') {
      setIntensity((prev) => Math.min(prev + 0.2, 1.0));
      setAlert('⚠️ GOVERNMENT EMERGENCY: Storm intensity increased!');
      setTimeout(() => setAlert(null), 5000);
    }
  }, []);

  const handleReport = useCallback((newReport: Omit<Report, 'id' | 'timestamp'>) => {
    const report: Report = {
      ...newReport,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setReports((prev) => [report, ...prev]);
    setAlert(`✅ Report sent to ${newReport.type}`);
    setTimeout(() => setAlert(null), 3000);
  }, []);

  return (
    <div className="app-root">
      <MapView
        viewState={viewState}
        onViewStateChange={setViewState}
        is3D={is3D}
        activeFloodPoints={clusteredPoints}
        emergencyData={emergencyData}
        clickPoints={clickPoints}
        routeCoords={routeCoords}
        routeSegments={routeSegments}
        onMapClick={onMapClick}
        currentPoint={currentPoint}
      />
      <RainEffect
        intensity={intensity}
        active={clusteredPoints.length > 0}
      />
      {activeTab === 'gov' && (
        <ControlPanel
          is3D={is3D}
          onToggle2D={handleToggle2D}
          onToggle3D={handleToggle3D}
          intensity={intensity}
          onIntensityChange={setIntensity}
          onSimulate={handleSimulate}
          computing={computing}
          computeTime={computeTime}
          onFetchWeather={handleFetchWeather}
          weatherFetching={weatherFetching}
          weatherStatus={weatherStatus}
          weatherColor={weatherColor}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={handleAutoRefresh}
          govStats={govStats}
          currentTimestep={currentTimestep}
          onTimestepChange={(t) => setCurrentTimestep(t)}
          onMaxClick={() => setCurrentTimestep(-1)}
          onClearSimulation={handleClearSimulation}
          timelineDisabled={floodTimeline.length === 0}
          routeStatus={routeStatus}
          routeColor={routeColor}
          showClearRoute={clickPoints.length > 0}
          onClearRoute={clearRoute}
          routeInfo={routeInfo}
          onFindNearest={(type: string) => {
            if (clickPoints.length > 0) {
              findNearest(clickPoints[0][1], clickPoints[0][0], type, intensity);
            }
          }}
          hasStartPoint={clickPoints.length > 0}
          depthThreshold={depthThreshold}
          onDepthThresholdChange={setDepthThreshold}
          clusterEnabled={clusterEnabled}
          onClusterToggle={() => setClusterEnabled(!clusterEnabled)}
        />
      )}

      <TopRightNav activeTab={activeTab} onTabChange={handleTabChange} />

      <BottomRightPanel
        activeTab={activeTab}
        reports={reports}
        onReport={handleReport}
        isSettingLocation={isSettingLocation}
        onToggleSetLocation={() => setIsSettingLocation(!isSettingLocation)}
        currentPoint={currentPoint}
        onFindNearest={(type: string) => {
          if (clickPoints.length > 0) {
            findNearest(clickPoints[0][1], clickPoints[0][0], type, intensity);
          } else if (currentPoint) {
            findNearest(currentPoint[1], currentPoint[0], type, intensity);
          }
        }}
        routeInfo={routeInfo}
        routeStatus={routeStatus}
        routeColor={routeColor}
        hasStartPoint={clickPoints.length > 0 || currentPoint !== null}
      />

      {alert && <div className="alert-overlay">{alert}</div>}
    </div>
  );
}

export default App;
