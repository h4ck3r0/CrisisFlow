"""
Seed data for CrisisFlow — realistic KC Valley Basin flood scenario.
Inserts zones, resources, hospitals, road blocks, and citizen reports.
"""
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase


async def seed_database(db: AsyncIOMotorDatabase):
    """Insert seed data if collections are empty. Idempotent — skips if data exists."""

    # Check if already seeded
    if await db.zones.count_documents({}) > 0:
        print("[Seed] Data already exists — skipping")
        return

    now = datetime.now(timezone.utc)

    # ── 5 Flood Zones ─────────────────────────────────────────────
    zones = [
        {
            "zone_id": "zone-bellandur",
            "ward_name": "Bellandur",
            "depth_meters": 1.8,
            "area_sqkm": 3.2,
            "population_affected": 45000,
            "has_hospital": True,
            "has_school": True,
            "road_accessibility": 0.3,
            "lat": 12.9250,
            "lng": 77.6680,
            "risk_level": "critical",
            "prediction_timestamp": now,
            "stgcn_confidence": 0.94,
            "deleted_at": None,
        },
        {
            "zone_id": "zone-sarjapur",
            "ward_name": "Sarjapur Road",
            "depth_meters": 1.2,
            "area_sqkm": 2.8,
            "population_affected": 32000,
            "has_hospital": False,
            "has_school": True,
            "road_accessibility": 0.45,
            "lat": 12.9100,
            "lng": 77.6740,
            "risk_level": "severe",
            "prediction_timestamp": now,
            "stgcn_confidence": 0.91,
            "deleted_at": None,
        },
        {
            "zone_id": "zone-hsr",
            "ward_name": "HSR Layout",
            "depth_meters": 0.9,
            "area_sqkm": 4.1,
            "population_affected": 28000,
            "has_hospital": True,
            "has_school": True,
            "road_accessibility": 0.55,
            "lat": 12.9180,
            "lng": 77.6440,
            "risk_level": "high",
            "prediction_timestamp": now,
            "stgcn_confidence": 0.88,
            "deleted_at": None,
        },
        {
            "zone_id": "zone-koramangala",
            "ward_name": "Koramangala",
            "depth_meters": 0.5,
            "area_sqkm": 3.5,
            "population_affected": 15000,
            "has_hospital": True,
            "has_school": True,
            "road_accessibility": 0.7,
            "lat": 12.9350,
            "lng": 77.6200,
            "risk_level": "moderate",
            "prediction_timestamp": now,
            "stgcn_confidence": 0.85,
            "deleted_at": None,
        },
        {
            "zone_id": "zone-silkboard",
            "ward_name": "Silk Board Junction",
            "depth_meters": 1.5,
            "area_sqkm": 1.9,
            "population_affected": 38000,
            "has_hospital": False,
            "has_school": False,
            "road_accessibility": 0.2,
            "lat": 12.9170,
            "lng": 77.6230,
            "risk_level": "critical",
            "prediction_timestamp": now,
            "stgcn_confidence": 0.96,
            "deleted_at": None,
        },
    ]

    # ── 8 Resources ───────────────────────────────────────────────
    resources = [
        {
            "resource_id": "PUMP-001", "resource_type": "pump", "name": "Kirloskar 10HP Dewatering Pump",
            "capacity": 1, "status": "available", "current_zone_id": None,
            "owner_role": "government", "home_station": "BBMP Ward Office HSR",
            "lat": 12.9180, "lng": 77.6440, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "PUMP-002", "resource_type": "pump", "name": "Portable Submersible Pump 5HP",
            "capacity": 1, "status": "deployed", "current_zone_id": "zone-bellandur",
            "owner_role": "fire", "home_station": "Sarjapura Road Fire Station",
            "lat": 12.9250, "lng": 77.6680, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "BOAT-001", "resource_type": "rescue_vehicle", "name": "NDRF Rescue Vehicle Alpha",
            "capacity": 8, "status": "available", "current_zone_id": None,
            "owner_role": "government", "home_station": "NDRF 3rd Battalion Bengaluru",
            "lat": 12.9300, "lng": 77.6350, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "BOAT-002", "resource_type": "rescue_vehicle", "name": "Fire Dept Rescue Truck",
            "capacity": 6, "status": "available", "current_zone_id": None,
            "owner_role": "fire", "home_station": "Sarjapura Road Fire Station",
            "lat": 12.9168, "lng": 77.6738, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "AMB-001", "resource_type": "ambulance", "name": "108 Emergency Ambulance Unit 1",
            "capacity": 2, "status": "available", "current_zone_id": None,
            "owner_role": "hospital", "home_station": "Victoria Hospital",
            "lat": 12.9580, "lng": 77.5730, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "AMB-002", "resource_type": "ambulance", "name": "108 Emergency Ambulance Unit 2",
            "capacity": 2, "status": "deployed", "current_zone_id": "zone-silkboard",
            "owner_role": "hospital", "home_station": "Wockhardt KC Valley",
            "lat": 12.9170, "lng": 77.6230, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "NDRF-001", "resource_type": "ndrf_team", "name": "NDRF Team Alpha — 12 personnel",
            "capacity": 12, "status": "available", "current_zone_id": None,
            "owner_role": "government", "home_station": "NDRF 3rd Battalion Bengaluru",
            "lat": 12.9300, "lng": 77.6350, "last_updated": now, "deleted_at": None,
        },
        {
            "resource_id": "FIRE-001", "resource_type": "fire_engine", "name": "Tata LPT Fire Tender",
            "capacity": 4, "status": "available", "current_zone_id": None,
            "owner_role": "fire", "home_station": "Sarjapura Road Fire Station",
            "lat": 12.9168, "lng": 77.6738, "last_updated": now, "deleted_at": None,
        },
    ]

    # ── 2 Hospitals ───────────────────────────────────────────────
    hospitals = [
        {
            "hospital_id": "hosp-victoria", "hospital_name": "Victoria Hospital",
            "zone_id": "zone-koramangala",
            "general_beds_available": 45, "general_beds_total": 120,
            "icu_beds_available": 5, "icu_beds_total": 20,
            "emergency_beds_available": 12, "emergency_beds_total": 30,
            "ambulances_available": 3, "ambulances_total": 5,
            "blood_o_positive": 25, "iv_fluids_bags": 200, "tetanus_doses": 150,
            "last_updated": now, "deleted_at": None,
        },
        {
            "hospital_id": "hosp-wockhardt", "hospital_name": "Wockhardt KC Valley",
            "zone_id": "zone-hsr",
            "general_beds_available": 20, "general_beds_total": 60,
            "icu_beds_available": 2, "icu_beds_total": 8,
            "emergency_beds_available": 6, "emergency_beds_total": 15,
            "ambulances_available": 1, "ambulances_total": 2,
            "blood_o_positive": 10, "iv_fluids_bags": 80, "tetanus_doses": 60,
            "last_updated": now, "deleted_at": None,
        },
    ]

    # ── 3 Road Blocks ────────────────────────────────────────────
    road_blocks = [
        {
            "block_id": "RB-001", "road_name": "Outer Ring Road near Bellandur",
            "zone_id": "zone-bellandur", "reason": "Water logging — 1.5m deep",
            "depth_at_block": 1.5, "blocked_by": "BBMP Traffic Control",
            "status": "active", "broadcast_to": ["google_maps", "waze", "bmtc"],
            "blocked_at": now - timedelta(hours=3), "cleared_at": None, "deleted_at": None,
        },
        {
            "block_id": "RB-002", "road_name": "Silk Board Flyover Underpass",
            "zone_id": "zone-silkboard", "reason": "Complete submersion — vehicles stranded",
            "depth_at_block": 2.1, "blocked_by": "Traffic Police",
            "status": "active", "broadcast_to": ["google_maps", "waze", "bmtc", "radio"],
            "blocked_at": now - timedelta(hours=5), "cleared_at": None, "deleted_at": None,
        },
        {
            "block_id": "RB-003", "road_name": "Sarjapur Road Service Lane",
            "zone_id": "zone-sarjapur", "reason": "Storm drain overflow",
            "depth_at_block": 0.8, "blocked_by": "BBMP",
            "status": "active", "broadcast_to": ["google_maps"],
            "blocked_at": now - timedelta(hours=1), "cleared_at": None, "deleted_at": None,
        },
    ]

    # ── 5 Citizen Reports ────────────────────────────────────────
    citizen_reports = [
        {
            "report_id": "CR-001", "zone_id": "zone-bellandur", "ward_name": "Bellandur",
            "description": "Water entered ground floor of apartment complex near Bellandur lake",
            "photo_url": None, "gemini_depth_estimate": 1.2, "gemini_confidence": 0.87,
            "verified": True, "lat": 12.9260, "lng": 77.6700,
            "reported_at": now - timedelta(hours=2), "send_msg": False, "deleted_at": None,
        },
        {
            "report_id": "CR-002", "zone_id": "zone-silkboard", "ward_name": "Silk Board Junction",
            "description": "Cars stuck under Silk Board flyover. Water is waist-deep.",
            "photo_url": "https://example.com/flood-silkboard.jpg",
            "gemini_depth_estimate": 1.0, "gemini_confidence": 0.92,
            "verified": True, "lat": 12.9175, "lng": 77.6225,
            "reported_at": now - timedelta(hours=4), "send_msg": False, "deleted_at": None,
        },
        {
            "report_id": "CR-003", "zone_id": "zone-hsr", "ward_name": "HSR Layout",
            "description": "HSR Sector 2 main road flooded. Unable to reach main road.",
            "photo_url": None, "gemini_depth_estimate": None, "gemini_confidence": None,
            "verified": False, "lat": 12.9190, "lng": 77.6450,
            "reported_at": now - timedelta(minutes=45), "send_msg": False, "deleted_at": None,
        },
        {
            "report_id": "CR-004", "zone_id": "zone-sarjapur", "ward_name": "Sarjapur Road",
            "description": "Storm water drain overflowing near Wipro junction. Sewage mixing.",
            "photo_url": "https://example.com/drain-overflow.jpg",
            "gemini_depth_estimate": 0.6, "gemini_confidence": 0.78,
            "verified": True, "lat": 12.9110, "lng": 77.6750,
            "reported_at": now - timedelta(hours=1), "send_msg": False, "deleted_at": None,
        },
        {
            "report_id": "CR-005", "zone_id": "zone-koramangala", "ward_name": "Koramangala",
            "description": "Minor waterlogging on 80 Feet Road. Drains coping for now.",
            "photo_url": None, "gemini_depth_estimate": 0.2, "gemini_confidence": 0.65,
            "verified": False, "lat": 12.9360, "lng": 77.6210,
            "reported_at": now - timedelta(minutes=20), "send_msg": False, "deleted_at": None,
        },
    ]

    # Insert all
    await db.zones.insert_many(zones)
    await db.resources.insert_many(resources)
    await db.hospital_capacity.insert_many(hospitals)
    await db.road_blocks.insert_many(road_blocks)
    await db.citizen_reports.insert_many(citizen_reports)

    print(f"[Seed] Inserted: {len(zones)} zones, {len(resources)} resources, "
          f"{len(hospitals)} hospitals, {len(road_blocks)} road blocks, "
          f"{len(citizen_reports)} citizen reports")
