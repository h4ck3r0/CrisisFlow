import os
from dotenv import load_dotenv
load_dotenv()
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import torch
import networkx as nx
import osmnx as ox
from train import FloodSurrogateModel, get_batched_edge_index
from pydantic import BaseModel
import numpy as np
import json
import urllib.request

app = FastAPI(title="Crisis-Flow Digital Twin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
T = 12

print("Loading Graph...")
G = ox.load_graphml("kc_valley_focused.graphml")
nodes = list(G.nodes())
num_nodes = len(nodes)

print("Loading Static Features and Model...")
startup_data = torch.load("val_dataset.pt", map_location="cpu", weights_only=False)
X_sample = startup_data["X"][0]
edge_index = startup_data["edge_index"].to(DEVICE)

static_elev = X_sample[:, 0, 0].to(DEVICE)
static_runoff = X_sample[:, 0, 4].to(DEVICE)
static_flow_acc = X_sample[:, 0, 5].to(DEVICE)

model = FloodSurrogateModel(num_nodes=num_nodes, hidden_dim=64).to(DEVICE)
model.load_state_dict(torch.load("stgcn_weights.pth", map_location=DEVICE))
model.eval()

b_edge = get_batched_edge_index(edge_index, num_nodes, 1, DEVICE)

class StormRequest(BaseModel):
    intensity: float

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    intensity: float

@app.get("/geojson/buildings")
def get_buildings():
    return FileResponse("kc_valley_buildings.geojson", media_type="application/json")

@app.get("/geojson/water")
def get_water():
    return FileResponse("kc_valley_water.geojson", media_type="application/json")

@app.post("/simulate")
def simulate_storm(req: StormRequest):
    X_new = torch.zeros((1, num_nodes, T, 6), device=DEVICE)
    envelope = torch.exp(-0.5 * ((torch.arange(T, device=DEVICE) - T/2) / 2.0)**2)

    for t in range(T):
        X_new[0, :, t, 0] = static_elev
        X_new[0, :, t, 1] = req.intensity * envelope[t]
        X_new[0, :, t, 2] = (req.intensity * envelope[:t+1].sum()) / 12.0
        X_new[0, :, t, 3] = min(t / float(T), 1.0)
        X_new[0, :, t, 4] = static_runoff
        X_new[0, :, t, 5] = static_flow_acc

    with torch.no_grad():
        preds = model(X_new, b_edge)

    all_depths = preds[0].cpu().numpy()
    if req.intensity <= 0.05:
        all_depths.fill(0.0)

    max_depths = all_depths.max(axis=1)
    node_depths = {nodes[i]: float(max_depths[i]) for i in range(num_nodes)}

    roads = []
    for u, v, edata in G.edges(data=True):
        d_u = node_depths.get(u, 0.0)
        d_v = node_depths.get(v, 0.0)
        avg_depth = (d_u + d_v) / 2.0
        roads.append({
            "from": [float(G.nodes[u]['x']), float(G.nodes[u]['y'])],
            "to":   [float(G.nodes[v]['x']), float(G.nodes[v]['y'])],
            "depth": round(avg_depth, 2)
        })

    points = [{"lon": float(G.nodes[nodes[i]]['x']), "lat": float(G.nodes[nodes[i]]['y']), "depth": float(max_depths[i])} for i in range(num_nodes)]

    timeline = []
    for t in range(T):
        timeline.append([round(float(all_depths[i, t]), 2) for i in range(num_nodes)])

    return {"roads": roads, "points": points, "timeline": timeline}

@app.get("/weather")
def get_weather():
    try:
        url = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast?latitude=12.935&longitude=77.645&current=rain,precipitation&timezone=Asia/Kolkata")
        with urllib.request.urlopen(url, timeout=5) as response:
            weather_data = json.loads(response.read().decode())
        rain = weather_data.get("current", {}).get("rain", 0)
        precipitation = weather_data.get("current", {}).get("precipitation", 0)
        total = max(rain, precipitation)
        intensity = min(total / 50.0, 1.0)
        return {"rain_mm": total, "intensity": round(max(intensity, 0.05), 2), "status": "live"}
    except Exception:
        return {"rain_mm": 0, "intensity": 0.1, "status": "fallback"}

import math

last_simulation_cache = {"intensity": None, "depth_lookup": {}}

def get_depth_lookup(intensity: float):
    cached = last_simulation_cache
    if cached["intensity"] == intensity and cached["depth_lookup"]:
        return cached["depth_lookup"]
        
    if intensity <= 0.05:
        last_simulation_cache["intensity"] = intensity
        last_simulation_cache["depth_lookup"] = {}
        return {}
        
    result = simulate_storm(StormRequest(intensity=intensity))
    flood_list = result["points"]
    lookup = {nodes[i]: flood_list[i]["depth"] for i in range(len(flood_list))}
    last_simulation_cache["intensity"] = intensity
    last_simulation_cache["depth_lookup"] = lookup
    return lookup

def compute_flood_weight(length: float, depth_u: float, depth_v: float) -> float:
    avg_depth = (depth_u + depth_v) / 2.0
    if avg_depth > 12.0:
        return length + 999999.0
    penalty = length * (math.exp(avg_depth / 3.0) - 1.0)
    return length + penalty

def get_segment_color(avg_depth: float):
    if avg_depth > 15:
        return [255, 30, 50, 255]
    elif avg_depth > 8:
        return [255, 140, 0, 255]
    elif avg_depth > 4:
        return [255, 220, 0, 240]
    else:
        return [74, 222, 128, 255]

def build_route_response(path, depth_lookup, G_routing):
    segments = []
    total_distance = 0.0
    max_depth_on_route = 0.0

    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_keys = G_routing[u][v]
        best_edge = min(edge_keys.values(), key=lambda d: d.get('flood_weight', float('inf')))
        seg_length = float(best_edge.get('length', 0.0))
        total_distance += seg_length

        d_u = depth_lookup.get(u, 0.0)
        d_v = depth_lookup.get(v, 0.0)
        avg_depth = (d_u + d_v) / 2.0
        max_depth_on_route = max(max_depth_on_route, avg_depth)

        if 'geometry' in best_edge:
            line_coords = list(best_edge['geometry'].coords)
            start_node = (float(G.nodes[u]['x']), float(G.nodes[u]['y']))
            first_geom = (line_coords[0][0], line_coords[0][1])
            if abs(start_node[0] - first_geom[0]) + abs(start_node[1] - first_geom[1]) > 0.0001:
                line_coords = line_coords[::-1]
            coords = [[float(c[0]), float(c[1])] for c in line_coords]
        else:
            coords = [
                [float(G.nodes[u]['x']), float(G.nodes[u]['y'])],
                [float(G.nodes[v]['x']), float(G.nodes[v]['y'])]
            ]

        segments.append({
            "path": coords,
            "depth": round(avg_depth, 2),
            "color": get_segment_color(avg_depth)
        })

    if max_depth_on_route > 15:
        risk = "CRITICAL"
    elif max_depth_on_route > 8:
        risk = "HIGH"
    elif max_depth_on_route > 4:
        risk = "MODERATE"
    else:
        risk = "SAFE"

    full_path = []
    for i, seg in enumerate(segments):
        if i == 0:
            full_path.extend(seg["path"])
        else:
            full_path.extend(seg["path"][1:])

    dist_km = round(total_distance / 1000.0, 2)

    def compute_eta(base_speed_kmh, max_passable_depth):
        if max_depth_on_route > max_passable_depth:
            return None
        flood_factor = max(1.0, 1.0 + (max_depth_on_route / max_passable_depth) * 2.0)
        effective_speed = base_speed_kmh / flood_factor
        time_min = (dist_km / effective_speed) * 60
        return round(time_min)

    eta = {
        "walk": compute_eta(5.0, 30.0),
        "bike": compute_eta(15.0, 8.0),
        "car": compute_eta(30.0, 20.0),
    }

    return {
        "status": "success",
        "path": full_path,
        "segments": segments,
        "distance_km": dist_km,
        "max_depth": round(max_depth_on_route, 1),
        "risk_level": risk,
        "eta": eta,
    }

@app.post("/route")
def get_route(req: RouteRequest):
    depth_lookup = get_depth_lookup(req.intensity)

    orig = ox.distance.nearest_nodes(G, req.start_lon, req.start_lat)
    dest = ox.distance.nearest_nodes(G, req.end_lon, req.end_lat)

    G_routing = G.copy()
    for u, v, k, edata in G_routing.edges(keys=True, data=True):
        length = float(edata.get('length', 1.0))
        d_u = depth_lookup.get(u, 0.0)
        d_v = depth_lookup.get(v, 0.0)
        edata['flood_weight'] = compute_flood_weight(length, d_u, d_v)

    try:
        path = nx.dijkstra_path(G_routing, orig, dest, weight='flood_weight')
        return build_route_response(path, depth_lookup, G_routing)
    except nx.NetworkXNoPath:
        return {"status": "error", "message": "No safe path found."}

class NearestRequest(BaseModel):
    lat: float
    lon: float
    facility_type: str
    intensity: float

FACILITY_COORDS = {
    "hospital": [
        (12.9199685, 77.6652549, "Manipal Hospitals"),
        (12.9305937, 77.6186159, "St. Johns Emergency Ward"),
        (12.9338175, 77.6201615, "Apollo Spectra Hospitals"),
        (12.9166101, 77.6450517, "Phoenix Hospital"),
        (12.9202359, 77.6674739, "Rainbow Childrens Hospital"),
        (12.9587074, 77.6490296, "Manipal Hospital Bengaluru"),
        (12.9191928, 77.6381223, "Greenview Hospital"),
        (12.9503234, 77.6162619, "Govt Primary Health Centre"),
        (12.9102142, 77.6244654, "Roopena Agrahara Govt Hospital"),
        (12.9343279, 77.6228848, "HCG Koramangala"),
    ],
    "police": [
        (12.9201775, 77.6513034, "HSR Police Station"),
        (12.9410977, 77.6214106, "Koramangala Police Station"),
        (12.9518683, 77.6223510, "Viveknagar Police Station"),
        (12.9190149, 77.6679644, "Bellanduru Police Station"),
        (12.9210124, 77.6206703, "Madiwala Traffic Police"),
    ],
    "fire": [
        (12.9168126, 77.6738567, "Sarjapura Road Fire Station"),
    ],
    "shelter": [
        (12.9215585, 77.6441635, "HSR Layout Shelter"),
        (12.9110130, 77.6411318, "Agara Shelter A"),
        (12.9111180, 77.6402540, "Agara Shelter B"),
        (12.9190637, 77.6387847, "Iblur Shelter"),
    ],
}

@app.post("/route/nearest")
def get_nearest_route(req: NearestRequest):
    facilities = FACILITY_COORDS.get(req.facility_type, FACILITY_COORDS["hospital"])
    depth_lookup = get_depth_lookup(req.intensity)

    best_route = None
    best_name = ""

    for f_lat, f_lon, f_name in facilities:
        f_depth = 0.0
        nearest_f_node = ox.distance.nearest_nodes(G, f_lon, f_lat)
        f_depth = depth_lookup.get(nearest_f_node, 0.0)
        if f_depth > 10:
            continue

        orig = ox.distance.nearest_nodes(G, req.lon, req.lat)
        dest = nearest_f_node

        G_routing = G.copy()
        for u, v, k, edata in G_routing.edges(keys=True, data=True):
            length = float(edata.get('length', 1.0))
            d_u = depth_lookup.get(u, 0.0)
            d_v = depth_lookup.get(v, 0.0)
            edata['flood_weight'] = compute_flood_weight(length, d_u, d_v)

        try:
            path = nx.dijkstra_path(G_routing, orig, dest, weight='flood_weight')
            route = build_route_response(path, depth_lookup, G_routing)
            if best_route is None or route["distance_km"] < best_route["distance_km"]:
                best_route = route
                best_name = f_name
        except nx.NetworkXNoPath:
            continue

    if best_route:
        best_route["facility_name"] = best_name
        return best_route
    return {"status": "error", "message": f"No accessible {req.facility_type} found."}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host=host, port=port)

