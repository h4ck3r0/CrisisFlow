"""Dashboard aggregation endpoints for each role."""
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboards"])
ND = {"deleted_at": None}

def _clean(docs):
    for d in docs:
        d.pop("_id", None)
    return docs

@router.get("/government")
async def government_dashboard(db: AsyncIOMotorDatabase = Depends(get_db)):
    zones_f = db.zones.find(ND).to_list(100)
    dispatches_f = db.dispatch_orders.find({**ND, "status": {"$nin": ["complete", "cancelled"]}}).sort([("dispatched_at", -1), ("_id", -1)]).to_list(100)
    alerts_f = db.alerts.find(ND).sort("sent_at", -1).to_list(20)
    triage_f = db.triage_sessions.find(ND).sort("started_at", -1).to_list(5)
    resources_f = db.resources.find(ND).to_list(100)
    hospitals_f = db.hospital_capacity.find(ND).to_list(20)
    reports_f = db.citizen_reports.find({"report_to": {"$in": ["government", None]}, **ND}).sort("reported_at", -1).to_list(20)

    zones, dispatches, alerts, triage, resources, hospitals, reports = await asyncio.gather(
        zones_f, dispatches_f, alerts_f, triage_f, resources_f, hospitals_f, reports_f
    )
    return {
        "zones": _clean(zones),
        "active_dispatches": _clean(dispatches),
        "recent_alerts": _clean(alerts),
        "triage_sessions": _clean(triage),
        "resources": _clean(resources),
        "hospitals": _clean(hospitals),
        "recent_reports": _clean(reports),
        "summary": {
            "total_zones": len(zones),
            "critical_zones": sum(1 for z in zones if z.get("risk_level") == "critical"),
            "active_dispatches": len(dispatches),
            "available_resources": sum(1 for r in resources if r.get("status") == "available"),
            "total_population_affected": sum(z.get("population_affected", 0) for z in zones if z.get("depth_meters", 0) > 0.05),
            "average_depth": round(sum(z.get("depth_meters", 0) for z in zones) / len(zones), 2) if zones else 0,
        },
    }

@router.get("/police")
async def police_dashboard(db: AsyncIOMotorDatabase = Depends(get_db)):
    zones_f = db.zones.find(ND).to_list(100)
    blocks_f = db.road_blocks.find({**ND, "status": "active"}).to_list(100)
    incidents_f = db.incidents.find({
        **ND, 
        "incident_type": {"$in": ["evacuation_support", "traffic_block", "citizen_report"]},
        "status": {"$ne": "resolved"}
    }).sort("reported_at", -1).to_list(100)
    police_res_f = db.resources.find({**ND, "owner_role": "police"}).to_list(50)
    reports_f = db.citizen_reports.find({"report_to": "police", **ND}).sort("reported_at", -1).to_list(20)

    zones, blocks, incidents, police_res, reports = await asyncio.gather(
        zones_f, blocks_f, incidents_f, police_res_f, reports_f
    )
    return {
        "zones": _clean(zones),
        "active_road_blocks": _clean(blocks),
        "active_incidents": _clean(incidents),
        "police_resources": _clean(police_res),
        "recent_reports": _clean(reports),
        "summary": {
            "active_blocks": len(blocks),
            "active_incidents": len(incidents),
            "available_units": sum(1 for r in police_res if r.get("status") == "available"),
        },
    }

@router.get("/hospital")
async def hospital_dashboard(db: AsyncIOMotorDatabase = Depends(get_db)):
    hospitals_f = db.hospital_capacity.find(ND).to_list(20)
    incidents_f = db.incidents.find({**ND, "incident_type": "medical", "status": {"$ne": "resolved"}}).to_list(50)
    ambulances_f = db.resources.find({**ND, "resource_type": "ambulance"}).to_list(50)
    reports_f = db.citizen_reports.find({"report_to": "hospital", **ND}).sort("reported_at", -1).to_list(20)

    hospitals, incidents, ambulances, reports = await asyncio.gather(
        hospitals_f, incidents_f, ambulances_f, reports_f
    )
    total_beds = sum(h.get("general_beds_available", 0) + h.get("emergency_beds_available", 0) for h in hospitals)
    return {
        "hospitals": _clean(hospitals),
        "incoming_medical_incidents": _clean(incidents),
        "ambulances": _clean(ambulances),
        "recent_reports": _clean(reports),
        "summary": {
            "total_hospitals": len(hospitals),
            "total_beds_available": total_beds,
            "icu_available": sum(h.get("icu_beds_available", 0) for h in hospitals),
            "ambulances_available": sum(1 for a in ambulances if a.get("status") == "available"),
        },
    }

@router.get("/fire")
async def fire_dashboard(db: AsyncIOMotorDatabase = Depends(get_db)):
    fire_incidents_f = db.incidents.find({
        **ND, "incident_type": {"$in": ["water_rescue", "structure_risk", "pump_deployment"]},
        "status": {"$ne": "resolved"},
    }).to_list(100)
    fire_res_f = db.resources.find({**ND, "owner_role": "fire"}).to_list(50)
    dispatches_f = db.dispatch_orders.find({
        **ND, "resource_type": {"$in": ["fire_engine", "rescue_vehicle", "pump"]},
        "status": {"$nin": ["complete", "cancelled"]},
    }).sort([("dispatched_at", -1), ("_id", -1)]).to_list(100)

    incidents, fire_res, dispatches = await asyncio.gather(fire_incidents_f, fire_res_f, dispatches_f)
    return {
        "fire_incidents": _clean(incidents),
        "fire_resources": _clean(fire_res),
        "active_dispatches": _clean(dispatches),
        "summary": {
            "active_incidents": len(incidents),
            "available_engines": sum(1 for r in fire_res if r.get("status") == "available"),
            "active_dispatches": len(dispatches),
        },
    }

@router.get("/citizen")
async def citizen_dashboard(zone_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    if zone_id:
        zone = await db.zones.find_one({"zone_id": zone_id, **ND})
        zone_data = zone if zone else {}
        if zone_data: zone_data.pop("_id", None)
        alerts_q = {**ND, "zone_id": zone_id}
    else:
        zone_data = {}
        alerts_q = ND

    alerts = await db.alerts.find(alerts_q).sort("sent_at", -1).to_list(10)
    blocks = await db.road_blocks.find({**ND, "status": "active"} if not zone_id else {**ND, "zone_id": zone_id, "status": "active"}).to_list(20)
    shelters = []
    return {
        "zone": zone_data,
        "alerts": _clean(alerts),
        "road_blocks": _clean(blocks),
        "evacuation_shelters": shelters,
        "helpline": "1070 (NDRF) / 112 (Emergency)",
    }
