"""
Utility script to clear operational data in CrisisFlow MongoDB.
Retains 'zones', 'resources', and 'hospital_capacity' (the base infrastructure).
Clears 'dispatch_orders', 'incidents', 'triage_sessions', 'citizen_reports', and 'alerts'.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def clear_db():
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "crisisflow")
    
    print(f"[Cleanup] Connecting to {url}...")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    
    collections_to_clear = [
        "dispatch_orders",
        "incidents",
        "triage_sessions",
        "citizen_reports",
        "alerts",
        "road_blocks"
    ]
    
    for coll in collections_to_clear:
        count = await db[coll].count_documents({})
        if count > 0:
            await db[coll].delete_many({})
            print(f"[Cleanup] Cleared {count} documents from '{coll}'")
        else:
            print(f"[Cleanup] Collection '{coll}' is already empty")
            
    # Reset all resources to available
    await db.resources.update_many({}, {"$set": {"status": "available", "current_zone_id": None}})
    print("[Cleanup] Reset all resources to 'available'")
            
    print("[Cleanup] Done. Infrastructure (zones, hospitals) remains intact.")
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_db())
