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
}

export interface DashboardData {
  zones: DashboardZone[];
  resources: DashboardResource[];
  hospitals: DashboardHospital[];
  active_road_blocks: DashboardRoadBlock[];
  recent_reports: DashboardReport[];
  recent_alerts: any[];
  active_dispatches: any[];
  summary: DashboardSummary;
  // Police-specific
  police_resources?: DashboardResource[];
  active_incidents?: any[];
  // Fire-specific
  fire_resources?: DashboardResource[];
  fire_incidents?: any[];
  // Hospital-specific
  ambulances?: DashboardResource[];
  incoming_medical_incidents?: any[];
  // Citizen-specific
  zone?: DashboardZone;
  evacuation_shelters?: { name: string; lat: number; lng: number }[];
  road_blocks?: DashboardRoadBlock[];
  alerts?: any[];
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

  // Auto-fetch government dashboard on mount
  useEffect(() => {
    fetchDashboard('gov');
  }, [fetchDashboard]);

  return {
    data,
    loading,
    currentRole,
    fetchDashboard,
    submitCitizenReport,
    runTriage,
  };
}
