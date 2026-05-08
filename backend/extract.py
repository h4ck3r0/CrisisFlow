import os, json
import numpy as np
import osmnx as ox
import geopandas as gpd
from shapely.geometry import mapping

OSM_FILE = "kc_valley_area.osm"
N_lat, S_lat, E_lon, W_lon = 12.9600, 12.9100, 77.6750, 77.6150

print("=" * 62)
print("STEP 1 — Local File Parsing (KC Valley Digital Twin)")
print(f"Coordinates: {S_lat}N to {N_lat}N | {W_lon}E to {E_lon}E")
print("=" * 62)

if not os.path.exists(OSM_FILE):
    raise FileNotFoundError(f"Missing {OSM_FILE}! Ensure it's in the same folder as this script.")

print("\n[1/4] Parsing Road Network from Local XML...")
G = ox.graph_from_xml(OSM_FILE)

print(f"      Initial nodes: {len(G.nodes):,}. Truncating to BBox...")
G = ox.truncate.truncate_graph_bbox(G, bbox=(W_lon, S_lat, E_lon, N_lat))
G = ox.truncate.largest_component(G)
print(f"      [OK] Graph Trimmed: {len(G.nodes):,} nodes | {len(G.edges):,} edges")

print("[2/4] Parsing Buildings & Water for Deck.gl...")
all_features = ox.features_from_xml(OSM_FILE)

buildings = all_features[all_features.get("building", None).notnull()].copy()
water_bodies = all_features[all_features.get("natural", None) == "water"].copy()

buildings = buildings[buildings.geometry.type.isin(["Polygon", "MultiPolygon"])].copy()
water_bodies = water_bodies[water_bodies.geometry.type.isin(["Polygon", "MultiPolygon"])].copy()

print(f"      [OK] Extracted {len(buildings):,} buildings and {len(water_bodies):,} water bodies")

print("[3/4] Modeling Elevation & Runoff features...")
cLat, cLon = 12.9357, 77.6717

for n, data in G.nodes(data=True):
    G.nodes[n]["elevation"] = 900.0 + (data["y"] - cLat) * 350.0 + (data["x"] - cLon) * 250.0 + float(np.random.uniform(-1.0, 1.0))

for u, v, k, data in G.edges(data=True, keys=True):
    highway = data.get('highway', 'residential')
    if isinstance(highway, list): highway = highway[0]

    coeff = 0.90 if highway in ['primary', 'motorway', 'trunk', 'secondary'] else 0.65
    G.nodes[u]["runoff_coeff"] = coeff
    G.nodes[v]["runoff_coeff"] = coeff

print("[4/4] Saving assets for AI and Frontend...")

ox.save_graphml(G, "kc_valley_focused.graphml")

bldg_list = []
for _, row in buildings.iterrows():
    try:
        levels = float(row.get("building:levels", 2))
        bldg_list.append({
            "type": "Feature",
            "geometry": mapping(row.geometry),
            "properties": {"height": levels * 3.5}
        })
    except: continue
with open("kc_valley_buildings.geojson", "w") as f:
    json.dump({"type": "FeatureCollection", "features": bldg_list}, f)

water_list = []
for _, row in water_bodies.iterrows():
    try:
        water_list.append({
            "type": "Feature",
            "geometry": mapping(row.geometry),
            "properties": {"name": str(row.get("name", "Water"))}
        })
    except: continue
with open("kc_valley_water.geojson", "w") as f:
    json.dump({"type": "FeatureCollection", "features": water_list}, f)

deck_nodes, deck_edges = [], []
for i, (n, data) in enumerate(G.nodes(data=True)):
    deck_nodes.append({"id": i, "lon": data['x'], "lat": data['y'], "elev": data['elevation']})
for u, v, data in G.edges(data=True):
    deck_edges.append({"source": [G.nodes[u]['x'], G.nodes[u]['y']], "target": [G.nodes[v]['x'], G.nodes[v]['y']]})

with open("deckgl_basemap.json", "w") as f:
    json.dump({"nodes": deck_nodes, "edges": deck_edges}, f)

print(f"\n{'='*62}")
print(f"DONE! Node count: {len(G.nodes):,}")
print("Files generated:")
print(" - kc_valley_focused.graphml")
print(" - kc_valley_buildings.geojson")
print(" - kc_valley_water.geojson")
print(" - deckgl_basemap.json")