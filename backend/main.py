"""
CrisisFlow Backend — Unified server.
Runs STGCN Digital Twin (from api.py) + MongoDB CRUD on a SINGLE port.

Start with:  python main.py
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db, create_indexes, get_db
from seed import seed_database

# Import the STGCN router (this triggers model loading at import time)
from api import stgcn_router

from routers import (
    resources,
    zones,
    dispatches,
    alerts,
    citizen_reports,
    incidents,
    hospitals,
    road_blocks,
    dashboard,
    triage,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect to MongoDB, create indexes, seed data."""
    import traceback
    try:
        await connect_db()
        await create_indexes()
        from database import db
        await seed_database(db)
        print("[CrisisFlow] Backend ready — STGCN + MongoDB on single port")
    except Exception as e:
        print(f"[CrisisFlow] *** STARTUP ERROR: {e} ***")
        traceback.print_exc()
        raise
    yield
    await close_db()


app = FastAPI(
    title="CrisisFlow Emergency Response API",
    description="Real-time flood emergency response system for Bengaluru's KC Valley Basin. "
                "Combines STGCN flood simulation with MongoDB-backed emergency operations.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── STGCN Digital Twin routes (from api.py) ──
app.include_router(stgcn_router)

# ── MongoDB CRUD routes ──
app.include_router(resources.router)
app.include_router(zones.router)
app.include_router(dispatches.router)
app.include_router(alerts.router)
app.include_router(citizen_reports.router)
app.include_router(incidents.router)
app.include_router(hospitals.router)
app.include_router(road_blocks.router)
app.include_router(dashboard.router)
app.include_router(triage.router)

# ── Dashboard HTML ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/dashboard")
async def serve_dashboard():
    return FileResponse(os.path.join(BASE_DIR, "dashboard.html"), media_type="text/html")

@app.get("/dashboard.js")
async def serve_dashboard_js():
    return FileResponse(os.path.join(BASE_DIR, "dashboard.js"), media_type="application/javascript")

@app.get("/dashboard_app.js")
async def serve_dashboard_app_js():
    return FileResponse(os.path.join(BASE_DIR, "dashboard_app.js"), media_type="application/javascript")


@app.get("/")
async def root():
    return {
        "service": "CrisisFlow Emergency Response API",
        "version": "1.0.0",
        "docs": "/docs",
        "stgcn_endpoints": {
            "simulate": "/simulate",
            "route": "/route",
            "route_nearest": "/route/nearest",
            "weather": "/weather",
            "geojson_buildings": "/geojson/buildings",
            "geojson_water": "/geojson/water",
        },
        "mongodb_endpoints": {
            "resources": "/api/resources",
            "zones": "/api/zones",
            "dispatches": "/api/dispatches",
            "alerts": "/api/alerts",
            "citizen_reports": "/api/citizen-reports",
            "incidents": "/api/incidents",
            "hospitals": "/api/hospitals",
            "road_blocks": "/api/road-blocks",
            "dashboards": "/api/dashboard/{role}",
            "triage": "/api/triage/run",
        },
    }


@app.get("/health")
async def health():
    from database import db
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected", "stgcn": "loaded"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    print(f"[CrisisFlow] Starting unified server on {host}:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# trigger reload
