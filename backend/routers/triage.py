"""Triage Commander routes — start session + SSE stream."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
import json
import urllib.request
from database import get_db
from models.triage_session import TriageSessionCreate, TriageSessionUpdate, TriageSessionInDB, TriageSessionResponse
from models.incident import IncidentInDB
from models.dispatch import DispatchInDB

router = APIRouter(prefix="/api/triage", tags=["Triage"])
NOT_DELETED = {"deleted_at": None}

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@router.get("/sessions", response_model=list[TriageSessionResponse])
async def list_sessions(status: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    query = {**NOT_DELETED}
    if status: query["status"] = status
    cursor = db.triage_sessions.find(query).sort("started_at", -1)
    return [_serialize(doc) async for doc in cursor]

@router.get("/sessions/{session_id}", response_model=TriageSessionResponse)
async def get_session(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.triage_sessions.find_one({"session_id": session_id, **NOT_DELETED})
    if not doc: raise HTTPException(404, "Session not found")
    return _serialize(doc)

@router.post("/run")
async def run_triage(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Start a new Triage Commander agent session. Collects zone data and creates a session."""
    session_id = f"TRIAGE-{uuid.uuid4().hex[:8].upper()}"

    # Gather current zone data as input
    zones = await db.zones.find(NOT_DELETED).to_list(100)
    zones_input = []
    for z in zones:
        z.pop("_id", None)
        zones_input.append(z)

    record = TriageSessionInDB(session_id=session_id, zones_input=zones_input, status="running")
    doc = record.model_dump()
    await db.triage_sessions.insert_one(doc)

    # In a real implementation, this would kick off the AI agent asynchronously.
    # For now, mark as complete with summary thoughts.
    thoughts = [
        {"event_type": "analysis", "content": f"Analyzing {len(zones_input)} flood zones", "tool_name": None,
         "timestamp": datetime.now(timezone.utc).isoformat()},
        {"event_type": "priority", "content": "Prioritizing zones by risk level and population", "tool_name": "zone_ranker",
         "timestamp": datetime.now(timezone.utc).isoformat()},
    ]

    critical_zones = [z for z in zones_input if z.get("risk_level") == "critical"]
    pop_covered = sum(z.get("population_affected", 0) for z in critical_zones)

    dispatch_count = 0
    for z in critical_zones:
        # 1. Fire Dispatch (Rescue Vehicle)
        existing_fire = await db.dispatch_orders.find_one({
            "target_zone_id": z["zone_id"],
            "resource_type": "rescue_vehicle",
            "status": {"$nin": ["complete", "cancelled"]},
            **NOT_DELETED
        })
        if not existing_fire:
            fire_dispatch = DispatchInDB(
                order_id=f"DO-FIRE-{uuid.uuid4().hex[:6].upper()}",
                resource_id="auto",
                resource_type="rescue_vehicle",
                target_zone_id=z["zone_id"],
                target_ward=z["ward_name"],
                reason="Triage auto-dispatch for flood rescue",
                dispatched_by="agent"
            )
            await db.dispatch_orders.insert_one(fire_dispatch.model_dump())
            dispatch_count += 1

        # 2. Medical Incident (for Hospital) - Only as placeholder
        med_inc = IncidentInDB(
            incident_id=f"INC-MED-{uuid.uuid4().hex[:6].upper()}",
            incident_type="medical_alert",
            zone_id=z["zone_id"],
            location_name=z["ward_name"],
            severity="moderate",
            notes="Triage Flood Warning: Monitor for medical needs"
        )
        await db.incidents.insert_one(med_inc.model_dump())

        # 4. Evacuation Incident (for Police)
        pol_inc = IncidentInDB(
            incident_id=f"INC-POL-{uuid.uuid4().hex[:6].upper()}",
            incident_type="evacuation_support",
            zone_id=z["zone_id"],
            location_name=z["ward_name"],
            severity="critical",
            notes="Triage AI requested evacuation support"
        )
        await db.incidents.insert_one(pol_inc.model_dump())

    thoughts.append({
        "event_type": "dispatch", "content": f"Identified {len(critical_zones)} critical zones covering {pop_covered:,} people. Generated {dispatch_count} dispatches and {dispatch_count} requests.",
        "tool_name": "dispatch_planner", "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    thoughts.append({
        "event_type": "complete", "content": "Triage session completed", "tool_name": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    await db.triage_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "thoughts": thoughts,
            "dispatch_count": dispatch_count,
            "population_covered": pop_covered,
            "status": "complete",
            "completed_at": datetime.now(timezone.utc),
        }},
    )

    return {"session_id": session_id, "status": "complete", "dispatch_count": dispatch_count, "population_covered": pop_covered}

@router.get("/stream/{session_id}")
async def stream_triage(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """SSE endpoint to stream triage session thoughts."""
    doc = await db.triage_sessions.find_one({"session_id": session_id, **NOT_DELETED})
    if not doc: raise HTTPException(404, "Session not found")

    import json, asyncio

    async def event_generator():
        thoughts = doc.get("thoughts", [])
        for t in thoughts:
            yield f"data: {json.dumps(t)}\n\n"
            await asyncio.sleep(0.3)
        yield f"data: {json.dumps({'event_type': 'done', 'content': 'Stream complete'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/auto-command")
async def auto_command(db: AsyncIOMotorDatabase = Depends(get_db)):
    """AI Commander: Categorizes reports using Gemini and runs flood triage."""
    # 1. Fetch unassigned reports
    reports = await db.citizen_reports.find({"report_to": {"$in": ["government", None]}, "deleted_at": None}).to_list(100)
    
    api_key = os.getenv("GEMINI_API_KEY")
    errors = []
    processed_count = 0
    assignments = {"police": 0, "hospital": 0, "fire": 0}

    for r in reports:
        if not api_key: 
            errors.append("Missing GEMINI_API_KEY in .env")
            break
        
        prompt = (
            f"Categorize this report into EXACTLY one: POLICE, HOSPITAL, or FIRE.\n"
            f"- POLICE: Stranded/stuck, evacuation, traffic.\n"
            f"- HOSPITAL: Injuries, pain, medical.\n"
            f"- FIRE: Water rescue, pumping.\n\n"
            f"Report: {r['description']}\n"
            f"One word response only."
        )

        import asyncio
        max_retries = 2
        success = False

        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    await asyncio.sleep(3) # Wait longer on retry
                
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
                req_data = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
                req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="POST")
                
                with urllib.request.urlopen(req, timeout=15) as response:
                    resp_json = json.loads(response.read().decode("utf-8"))
                    
                    if 'candidates' not in resp_json:
                        errors.append(f"Gemini error for report {r['report_id']}: {resp_json}")
                        break
                        
                    category = resp_json['candidates'][0]['content']['parts'][0]['text'].strip().upper()
                    
                    # Determine role assignment
                    to_role = "police" if "POLICE" in category else "hospital" if "HOSPITAL" in category else "fire"
                    
                    # 1. Update report
                    await db.citizen_reports.update_one({"report_id": r["report_id"]}, {"$set": {"report_to": to_role}})
                    
                    # 2. Create the task in the agency's dashboard
                    if to_role == "police":
                        await db.incidents.insert_one(IncidentInDB(
                            incident_id=f"INC-AI-{uuid.uuid4().hex[:6].upper()}",
                            incident_type="evacuation_support",
                            zone_id=r.get("zone_id", "unknown"),
                            location_name=r.get("ward_name", "Assigned Location"),
                            severity="high",
                            notes=f"AI Auto-Assigned: {r['description']}"
                        ).model_dump())
                    elif to_role == "hospital":
                        await db.dispatch_orders.insert_one(DispatchInDB(
                            order_id=f"DO-AI-AMB-{uuid.uuid4().hex[:6].upper()}",
                            resource_id="auto",
                            resource_type="ambulance",
                            target_zone_id=r.get("zone_id", "unknown"),
                            target_ward=r.get("ward_name", "Medical Site"),
                            reason=f"AI Medical Response: {r['description']}",
                            dispatched_by="ai_commander",
                            status="pending"
                        ).model_dump())
                    elif to_role == "fire":
                        await db.dispatch_orders.insert_one(DispatchInDB(
                            order_id=f"DO-AI-FIRE-{uuid.uuid4().hex[:6].upper()}",
                            resource_id="auto",
                            resource_type="rescue_vehicle",
                            target_zone_id=r.get("zone_id", "unknown"),
                            target_ward=r.get("ward_name", "Flood Site"),
                            reason=f"AI Rescue Response: {r['description']}",
                            dispatched_by="ai_commander",
                            status="pending"
                        ).model_dump())
                    
                    processed_count += 1
                    assignments[to_role] += 1
                    success = True
                    break # Exit retry loop on success

            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < max_retries:
                    continue # Retry on 429
                errors.append(f"Report {r['report_id']} failed: {str(e)}")
                break
            except Exception as e:
                errors.append(f"Report {r['report_id']} unexpected error: {str(e)}")
                break
        
        if not success:
            continue

    return {
        "status": "complete",
        "reports_processed": processed_count,
        "assignments": assignments,
        "errors": errors
    }

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.triage_sessions.find_one_and_update(
        {"session_id": session_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}}, return_document=True)
    if not result: raise HTTPException(404, "Session not found")
    return {"status": "deleted", "session_id": session_id}
