import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check():
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "crisisflow")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    
    reports = await db.citizen_reports.find({"deleted_at": None}).to_list(100)
    print("REPORTS IN DB:")
    for r in reports:
        print(f"ID: {r.get('report_id')} | To: {r.get('report_to')} | Desc: {r.get('description')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
