import { useState, useCallback, useEffect } from 'react';
import { API_URL } from '../constants';
import { ROLES, type RoleId } from '../constants/roles';

export interface DashboardZone {
  zone_id: string;
  ward_name: string;
  depth_meters: number;
  area_sqkm: number;
  population_affected: number;
  has_hospital: boolean;
  has_school: boolean;
  road_accessibility: number;
  lat: number;
  lng: number;
  risk_level: 'critical' | 'severe' | 'high' | 'moderate';
  stgcn_confidence: number;
}

export interface DashboardResource {
  resource_id: string;
  resource_type: string;
  name: string;
  capacity: number;
  status: 'available' | 'deployed' | 'maintenance' | 'offline';
  current_zone_id: string | null;
  owner_role: string;
  home_station: string;
  lat: number;
  lng: number;
}

export interface DashboardHospital {
  hospital_id: string;
  hospital_name: string;
  zone_id: string;
  general_beds_available: number;
  general_beds_total: number;
  icu_beds_available: number;
  icu_beds_total: number;
  emergency_beds_available: number;
  emergency_beds_total: number;
  ambulances_available: number;
  ambulances_total: number;
  blood_o_positive: number;
  iv_fluids_bags: number;
  tetanus_doses: number;
}

export interface DashboardRoadBlock {
  block_id: string;
  road_name: string;
  zone_id: string;
  reason: string;
  depth_at_block: number;
  status: 'active' | 'cleared';
  lat?: number;
  lng?: number;
}

export interface DashboardReport {
  report_id: string;
  zone_id: string;
  ward_name: string;
  description: string;
  photo_url: string | null;
  gemini_depth_estimate: number | null;
  gemini_confidence: number | null;
  verified: boolean;
  reported_at: string;
  lat: number | null;
  lng: number | null;
}

export interface DashboardSummary {
  total_zones?: number;
  critical_zones?: number;
  active_dispatches?: number;
  available_resources?: number;
  total_population_affected?: number;
  active_blocks?: number;
  active_incidents?: number;
  available_units?: number;
  total_beds_available?: number;
  icu_available?: number;
  ambulances_available?: number;
  average_depth?: number;
}

export interface DashboardAlert {
  severity: 'evacuation' | 'warning' | 'info' | 'all_clear';
  message?: string;
  ward_name?: string;
  channel?: string;
  recipients_count?: number;
  sent_at: string;
}

export interface DashboardDispatch {
  order_id: string;
  resource_id: string;
  resource_type: string;
  target_zone_id: string;
  target_ward: string;
  reason: string;
  status: 'pending' | 'deployed' | 'complete' | 'cancelled';
  dispatched_at: string;
  dispatched_by: string;
}

export interface DashboardIncident {
  incident_id: string;
  incident_type: string;
  zone_id: string;
  location_name: string;
  severity: string;
  status: 'pending' | 'active' | 'resolved';
  notes?: string;
  reported_at?: string;
}

export interface TriageSession {
  session_id: string;
  started_at: string;
  status: 'running' | 'complete' | 'failed';
  dispatch_count: number;
  population_covered: number;
}

export interface DashboardData {
  zones: DashboardZone[];
  resources: DashboardResource[];
  hospitals: DashboardHospital[];
  active_road_blocks: DashboardRoadBlock[];
  recent_reports: DashboardReport[];
  recent_alerts: DashboardAlert[];
  active_dispatches: DashboardDispatch[];
  summary: DashboardSummary;
  // Police-specific
  police_resources?: DashboardResource[];
  active_incidents?: DashboardIncident[];
  // Fire-specific
  fire_resources?: DashboardResource[];
  fire_incidents?: DashboardIncident[];
  // Hospital-specific
  ambulances?: DashboardResource[];
  incoming_medical_incidents?: DashboardIncident[];
  // Citizen-specific
  zone?: DashboardZone;
  evacuation_shelters?: { name: string; lat: number; lng: number }[];
  road_blocks?: DashboardRoadBlock[];
  alerts?: DashboardAlert[];
  triage_sessions?: TriageSession[];
}

type RoleType = RoleId;

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType>('gov');

  const fetchDashboard = useCallback(async (role: RoleType) => {
    setLoading(true);
    try {
      const apiRole = ROLES[role]?.apiRole || role;
      const res = await fetch(`${API_URL}/api/dashboard/${apiRole}`);
      const json = await res.json();
      setData(json);
      setCurrentRole(role);
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitCitizenReport = useCallback(async (
    description: string,
    lat?: number,
    lng?: number,
    zone_id?: string,
  ) => {
    try {
      const res = await fetch(`${API_URL}/api/citizen-reports/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, lat, lng, zone_id }),
      });
      const json = await res.json();
      // Refresh dashboard to show new report
      await fetchDashboard(currentRole);
      return json;
    } catch (e) {
      console.error('Report submit failed:', e);
      return null;
    }
  }, [currentRole, fetchDashboard]);

  const runTriage = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/triage/run`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('Triage failed:', e);
      return null;
    }
  }, []);

  const createBarricade = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`${API_URL}/barricade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
      });
      const json = await res.json();
      await fetchDashboard('police');
      return json;
    } catch (e) {
      console.error('Barricade creation failed:', e);
      return null;
    }
  }, [fetchDashboard]);

  const deleteBarricade = useCallback(async (blockId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/road-blocks/${blockId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      await fetchDashboard('police');
      return json;
    } catch (e) {
      console.error('Barricade deletion failed:', e);
      return null;
    }
  }, [fetchDashboard]);

  // Auto-fetch government dashboard on mount
  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      if (isMounted) {
        await fetchDashboard('gov');
      }
    };
    initFetch();
    return () => { isMounted = false; };
  }, [fetchDashboard]);

  return {
    data,
    loading,
    currentRole,
    fetchDashboard,
    submitCitizenReport,
    runTriage,
    createBarricade,
    deleteBarricade,
  };
}
