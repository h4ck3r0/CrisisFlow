import os, json, time, math, glob
import numpy as np
import torch
import torch.nn.functional as F
import osmnx as ox
import networkx as nx
from scipy import sparse

T              = 12
NUM_SAMPLES    = 8000
VAL_SPLIT      = 0.15
FIELD_CAPACITY = 100.0
DRAIN_RATE     = 0.05
FLOW_ITERS     = 3
BATCH_SIZE     = 200
SEED           = 42

torch.manual_seed(SEED)
np.random.seed(SEED)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("=" * 62)
print("STEP 2 — Dataset Builder  [GPU Accelerated Version]")
print(f"  {NUM_SAMPLES} samples  |  T={T}  |  6 features  |  Device: {device}")
print("=" * 62)

print("\n[1/6] Loading graph...")

if not os.path.exists("kc_valley_focused.graphml"):
    raise FileNotFoundError("Run extract.py first — kc_valley_focused.graphml not found")

G        = ox.load_graphml("kc_valley_focused.graphml")
nodes    = list(G.nodes())
N        = len(nodes)
node_idx = {n: i for i, n in enumerate(nodes)}
print(f"      {N:,} nodes  |  {len(G.edges()):,} edges")

print("[2/6] Extracting static node features...")
elevations  = np.array([float(G.nodes[n]["elevation"]) for n in nodes], dtype=np.float32)
runoff_base = np.array([float(G.nodes[n].get("runoff_coeff",0.5)) for n in nodes], dtype=np.float32)
lats        = np.array([float(G.nodes[n]["y"]) for n in nodes], dtype=np.float32)
lons        = np.array([float(G.nodes[n]["x"]) for n in nodes], dtype=np.float32)

elev_norm = (elevations - elevations.min()) / (np.ptp(elevations) + 1e-6)

elev_norm_t   = torch.tensor(elev_norm, device=device)
runoff_base_t = torch.tensor(runoff_base, device=device)

print("[3/6] Flow accumulation + PyTorch sparse flow matrices...")
flow_lil = sparse.lil_matrix((N, N), dtype=np.float32)

for u, v, data in G.edges(data=True):
    i, j = node_idx[u], node_idx[v]
    diff = elevations[i] - elevations[j]
    if diff > 0:
        flow_lil[i, j] += 0.12 * min(diff / 5.0, 1.0)
    elif diff < 0:
        flow_lil[j, i] += 0.12 * min(-diff / 5.0, 1.0)

flow_csr = flow_lil.tocsr()
flow_acc = np.ones(N, dtype=np.float32)
for _ in range(8):
    flow_acc = 1.0 + np.array(flow_csr.T.dot(flow_acc)).flatten() * 0.02

flow_acc_norm = (flow_acc - flow_acc.min()) / (np.ptp(flow_acc) + 1e-6)
flow_acc_norm_t = torch.tensor(flow_acc_norm, device=device)

row_sum  = np.array(flow_csr.sum(axis=1)).flatten()
scale    = np.where(row_sum > 0.4, 0.4 / (row_sum + 1e-8), 1.0)
flow_csr = flow_csr.multiply(scale[:, None]).tocsr()
flow_csr_T = flow_csr.T.tocsr()

def scipy_to_torch_csr(mat):
    return torch.sparse_csr_tensor(
        torch.tensor(mat.indptr, dtype=torch.int32),
        torch.tensor(mat.indices, dtype=torch.int32),
        torch.tensor(mat.data, dtype=torch.float32),
        size=mat.shape,
        device=device
    )

flow_csr_pt = scipy_to_torch_csr(flow_csr)
flow_csr_T_pt = scipy_to_torch_csr(flow_csr_T)

print("[4/6] Building edge_index for PyG...")
edge_list = []
for u, v in G.edges():
    i, j = node_idx[u], node_idx[v]
    edge_list.extend([[i, j], [j, i]])
edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()

print("[5/6] GPU Rainfall generator setup (Conv2d Gaussian)...")
lats_norm = (lats - lats.min()) / (lats.max() - lats.min() + 1e-8)
lons_norm = (lons - lons.min()) / (lons.max() - lons.min() + 1e-8)
grid_size = 100
grid_lats = torch.tensor((lats_norm * (grid_size - 1)).astype(int).clip(0, grid_size - 1), device=device)
grid_lons = torch.tensor((lons_norm * (grid_size - 1)).astype(int).clip(0, grid_size - 1), device=device)

k_size = 15
sigma = 3.0
x_cord = torch.arange(k_size, dtype=torch.float32, device=device)
x_grid = x_cord.repeat(k_size).view(k_size, k_size)
y_grid = x_grid.t()
xy_grid = torch.stack([x_grid, y_grid], dim=-1)
mean = (k_size - 1) / 2.0
variance = sigma ** 2.
gaussian_kernel = (1. / (2. * math.pi * variance)) * torch.exp(
    -torch.sum((xy_grid - mean) ** 2., dim=-1) / (2 * variance)
)
gaussian_kernel = gaussian_kernel / torch.sum(gaussian_kernel)
gaussian_kernel = gaussian_kernel.view(1, 1, k_size, k_size)

print(f"[6/6] Generating {NUM_SAMPLES} samples in batches of {BATCH_SIZE}...")

def make_rain_batch(b_size):
    peak_mm = torch.empty(b_size, device=device).uniform_(2, 140)
    storm_t = torch.empty(b_size, device=device).uniform_(2, T - 2)

    t_steps = torch.arange(T, device=device).unsqueeze(0).expand(b_size, -1)
    time_env = torch.exp(-0.5 * ((t_steps - storm_t.unsqueeze(1)) / 3.0)**2)

    grid_noise = torch.randn(b_size, 1, grid_size, grid_size, device=device)
    pad = k_size // 2
    smooth = F.conv2d(grid_noise, gaussian_kernel, padding=pad)

    sampled = smooth[:, 0, grid_lats, grid_lons]

    s_mean = sampled.mean(dim=1, keepdim=True)
    s_std = sampled.std(dim=1, keepdim=True) + 1e-8
    sampled = (sampled - s_mean) / s_std

    rain = (peak_mm.view(b_size, 1, 1) / 2) * \
           (1 + sampled.unsqueeze(-1)) * \
           time_env.unsqueeze(1)

    return torch.clamp(rain, min=0.0)

def simulate_batch(rain_b):
    B = rain_b.shape[0]
    soil  = torch.zeros((B, N), device=device)
    depth = torch.zeros((B, N), device=device)
    X_feat = []
    y_seq  = []

    topo = (1 - elev_norm_t) ** 2

    elev_feat   = elev_norm_t.expand(B, -1)
    runoff_feat = runoff_base_t.expand(B, -1)
    flow_feat   = flow_acc_norm_t.expand(B, -1)

    for t in range(T):
        rain_t = rain_b[:, :, t]

        sat = torch.clamp(soil / FIELD_CAPACITY, 0, 1)
        eff_run = torch.clamp(runoff_base_t + sat * (1 - runoff_base_t) * 0.6, 0, 1)

        runoff = rain_t * eff_run * 0.1
        infil  = rain_t * (1 - eff_run) * 0.1

        soil = torch.clamp(soil + infil - DRAIN_RATE * soil, 0, FIELD_CAPACITY)

        depth_new = runoff * topo * (1 + flow_acc_norm_t)
        depth_new = depth_new + depth * 0.65

        for _ in range(FLOW_ITERS):
            depth_T = depth_new.t()
            outflow = torch.sparse.mm(flow_csr_pt, depth_T).t()
            inflow  = torch.sparse.mm(flow_csr_T_pt, depth_T).t()
            depth_new = torch.clamp(depth_new - outflow + inflow, min=0.0)

        depth_new *= (1.0 - DRAIN_RATE)
        depth_new = torch.minimum(depth_new, torch.tensor(FIELD_CAPACITY, device=device))
        depth = depth_new

        cum = rain_b[:, :, :t+1].sum(dim=2) * 0.1

        feat_t = torch.stack([
            elev_feat,
            rain_t / 120.0,
            torch.clamp(cum / 12.0, 0, 1),
            soil / FIELD_CAPACITY,
            runoff_feat,
            flow_feat
        ], dim=2)

        X_feat.append(feat_t)
        y_seq.append(depth.clone())

    X = torch.stack(X_feat, dim=2)
    y = torch.stack(y_seq,  dim=2)
    return X, y

t0 = time.time()
num_batches = math.ceil(NUM_SAMPLES / BATCH_SIZE)

for b in range(num_batches):
    current_b_size = min(BATCH_SIZE, NUM_SAMPLES - b * BATCH_SIZE)

    rain_b = make_rain_batch(current_b_size)

    X_batch, y_batch = simulate_batch(rain_b)

    np.save(f"batch_X_{b:03d}.npy", X_batch.cpu().numpy())
    np.save(f"batch_y_{b:03d}.npy", y_batch.cpu().numpy())

    if (b + 1) % 5 == 0 or b == num_batches - 1:
        elapsed = time.time() - t0
        samples_done = (b + 1) * BATCH_SIZE
        eta = elapsed / samples_done * (NUM_SAMPLES - samples_done)
        print(f"      {samples_done:,}/{NUM_SAMPLES:,}  "
              f"elapsed={elapsed/60:.1f}min  eta={eta/60:.1f}min")

y_batches = [np.load(f"batch_y_{i:03d}.npy") for i in range(num_batches)]
y_all = np.concatenate(y_batches, axis=0)

elapsed = time.time() - t0
print(f"      Done in {elapsed/60:.1f} min")

y_mean = float(y_all.mean())
y_std  = float(y_all.std() + 1e-8)
print(f"      y stats: mean={y_mean:.3f} cm  std={y_std:.3f} cm  max={y_all.max():.2f} cm")

split  = int(NUM_SAMPLES * (1 - VAL_SPLIT))
idx    = np.random.permutation(NUM_SAMPLES)
tr_idx, v_idx = idx[:split], idx[split:]

X_all = np.concatenate([np.load(f"batch_X_{i:03d}.npy") for i in range(num_batches)], axis=0)

X_tr, y_tr = X_all[tr_idx], y_all[tr_idx]
X_v, y_v   = X_all[v_idx], y_all[v_idx]

for f in glob.glob("batch_*.npy"):
    os.remove(f)

torch.save({"X": torch.from_numpy(X_tr), "y": torch.from_numpy(y_tr), "edge_index": edge_index, "y_mean": y_mean, "y_std": y_std}, "train_dataset.pt")
torch.save({"X": torch.from_numpy(X_v), "y": torch.from_numpy(y_v), "edge_index": edge_index, "y_mean": y_mean, "y_std": y_std}, "val_dataset.pt")

meta = {
    "num_nodes": N, "num_timesteps": T, "num_features": 6,
    "feature_names": ["elevation_norm", "rainfall_norm", "cumrain_norm", "soil_moisture_norm", "runoff_coeff", "flow_acc_norm"],
    "y_shape": "S, N, T  (full sequence prediction)",
    "train_samples": int(len(X_tr)), "val_samples": int(len(X_v)),
    "y_mean": y_mean, "y_std": y_std, "y_unit": "cm water depth",
    "node_ids": [str(n) for n in nodes],
}
with open("dataset_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

size_gb = (X_tr.nbytes + y_tr.nbytes) / 1e9
print(f"\n{'='*62}")
print(f"Step 2 complete")
print(f"  train_dataset.pt   {len(X_tr):,} samples  (~{size_gb:.2f} GB)")
print(f"  val_dataset.pt     {len(X_v):,} samples")
print(f"  dataset_meta.json")
print("Next: python step3_train_stgcn.py")