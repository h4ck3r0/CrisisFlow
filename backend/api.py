import os
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
        url = "https://api.open-meteo.com/v1/forecast?latitude=12.935&longitude=77.645&current=rain,precipitation&timezone=Asia/Kolkata"
        with urllib.request.urlopen(url, timeout=5) as response:
            weather_data = json.loads(response.read().decode())
        rain = weather_data.get("current", {}).get("rain", 0)
        precipitation = weather_data.get("current", {}).get("precipitation", 0)
        total = max(rain, precipitation)
        intensity = min(total / 50.0, 1.0)
        return {"rain_mm": total, "intensity": round(max(intensity, 0.05), 2), "status": "live"}
    except Exception:
        return {"rain_mm": 0, "intensity": 0.1, "status": "fallback"}

@app.post("/route")
def get_route(req: RouteRequest):
    result = simulate_storm(StormRequest(intensity=req.intensity))
    flood_list = result["points"]
    depth_lookup = {nodes[i]: flood_list[i]["depth"] for i in range(len(flood_list))}

    orig = ox.distance.nearest_nodes(G, req.start_lon, req.start_lat)
    dest = ox.distance.nearest_nodes(G, req.end_lon, req.end_lat)

    G_routing = G.copy()
    for u, v, k, edata in G_routing.edges(keys=True, data=True):
        length = float(edata.get('length', 1.0))
        depth = depth_lookup.get(v, 0.0)
        if depth > 10.0:
            penalty = 999999.0
        else:
            penalty = length * (depth / 2.0)
        edata['flood_weight'] = length + penalty

    try:
        path = nx.dijkstra_path(G_routing, orig, dest, weight='flood_weight')
        coords = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_keys = G_routing[u][v]
            best_edge = min(edge_keys.values(), key=lambda d: d.get('flood_weight', float('inf')))
            if 'geometry' in best_edge:
                line_coords = list(best_edge['geometry'].coords)
                start_node = (float(G.nodes[u]['x']), float(G.nodes[u]['y']))
                first_geom = (line_coords[0][0], line_coords[0][1])
                if abs(start_node[0] - first_geom[0]) + abs(start_node[1] - first_geom[1]) > 0.0001:
                    line_coords = line_coords[::-1]
                segment = [[float(c[0]), float(c[1])] for c in line_coords]
            else:
                segment = [
                    [float(G.nodes[u]['x']), float(G.nodes[u]['y'])],
                    [float(G.nodes[v]['x']), float(G.nodes[v]['y'])]
                ]
            if i == 0:
                coords.extend(segment)
            else:
                coords.extend(segment[1:])
        return {"status": "success", "path": coords}
    except nx.NetworkXNoPath:
        return {"status": "error", "message": "No safe path found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
