"""
Motor async MongoDB client for CrisisFlow.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "crisisflow")

client: AsyncIOMotorClient = None  # type: ignore
db: AsyncIOMotorDatabase = None  # type: ignore


async def connect_db():
    """Create Motor client and connect to MongoDB Atlas."""
    global client, db
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    # Verify connectivity
    await client.admin.command("ping")
    print(f"[MongoDB] Connected to {DATABASE_NAME}")


async def close_db():
    """Close Motor client."""
    global client
    if client:
        client.close()
        print("[MongoDB] Connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — returns the database handle."""
    return db


async def create_indexes():
    """Create indexes for fast queries."""
    # resources
    await db.resources.create_index("resource_id", unique=True)
    await db.resources.create_index("status")
    await db.resources.create_index("current_zone_id")
    await db.resources.create_index("resource_type")

    # zones
    await db.zones.create_index("zone_id", unique=True)
    await db.zones.create_index("risk_level")

    # dispatch_orders
    await db.dispatch_orders.create_index("order_id", unique=True)
    await db.dispatch_orders.create_index("status")
    await db.dispatch_orders.create_index("target_zone_id")
    await db.dispatch_orders.create_index("resource_id")

    # alerts
    await db.alerts.create_index("alert_id", unique=True)
    await db.alerts.create_index("zone_id")
    await db.alerts.create_index("severity")

    # citizen_reports
    await db.citizen_reports.create_index("report_id", unique=True)
    await db.citizen_reports.create_index("zone_id")
    await db.citizen_reports.create_index("reported_at")
    await db.citizen_reports.create_index("verified")

    # incidents
    await db.incidents.create_index("incident_id", unique=True)
    await db.incidents.create_index("status")
    await db.incidents.create_index("zone_id")
    await db.incidents.create_index("incident_type")

    # hospital_capacity
    await db.hospital_capacity.create_index("hospital_id", unique=True)
    await db.hospital_capacity.create_index("zone_id")

    # road_blocks
    await db.road_blocks.create_index("block_id", unique=True)
    await db.road_blocks.create_index("zone_id")
    await db.road_blocks.create_index("status")

    # triage_sessions
    await db.triage_sessions.create_index("session_id", unique=True)
    await db.triage_sessions.create_index("status")

    print("[MongoDB] Indexes created")
