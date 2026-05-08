import os, time

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torch_geometric.nn as geom_nn

BATCH_SIZE = 16
EPOCHS = 100
LEARNING_RATE = 0.001
HIDDEN_DIM = 64
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("="*60)
print(f"STEP 3 — STGCN Training on {DEVICE}")
print("="*60)

class FloodDataset(Dataset):
    def __init__(self, pt_path):
        print(f"Loading {pt_path} into RAM. This may take a moment...")
        data = torch.load(pt_path, map_location="cpu")
        self.X = data["X"]
        self.y = data["y"]
        self.edge_index = data["edge_index"]
        self.y_mean = data.get("y_mean", 0.0)
        self.y_std = data.get("y_std", 1.0)
        print(f"Loaded! Shape: {self.X.shape}")

    def __len__(self):
        return self.X.shape[0]

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

def get_batched_edge_index(edge_index, num_nodes, batch_size, device):
    E = edge_index.shape[1]
    b_edge = edge_index.repeat(1, batch_size).to(device)
    offsets = torch.arange(batch_size, device=device).repeat_interleave(E) * num_nodes
    return b_edge + offsets.unsqueeze(0)

class STGCN_Cell(nn.Module):
    def __init__(self, in_dim, hidden_dim):
        super().__init__()
        self.gcn = geom_nn.GCNConv(in_dim, hidden_dim)
        self.gru = nn.GRUCell(hidden_dim, hidden_dim)

    def forward(self, x, edge_index, h):
        gcn_out = torch.relu(self.gcn(x, edge_index))
        h_new = self.gru(gcn_out, h)
        return h_new

class FloodSurrogateModel(nn.Module):
    def __init__(self, num_nodes, num_features=6, hidden_dim=HIDDEN_DIM):
        super().__init__()
        self.num_nodes = num_nodes
        self.hidden_dim = hidden_dim

        self.feat_proj = nn.Linear(num_features, 32)
        self.stgcn = STGCN_Cell(32, hidden_dim)
        self.out_proj = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Softplus()
        )

    def forward(self, X, edge_index):
        B, N, T, F = X.shape

        X_flat = X.view(B * N, T, F)

        h = torch.zeros(B * N, self.hidden_dim, device=X.device)
        predictions = []

        for t in range(T):
            x_t = self.feat_proj(X_flat[:, t, :])
            h = self.stgcn(x_t, edge_index, h)
            pred_t = self.out_proj(h)
            predictions.append(pred_t)

        out = torch.stack(predictions, dim=1)
        out = out.view(B, N, T)
        return out

def train():
    if not os.path.exists("train_dataset.pt"):
        print("ERROR: train_dataset.pt not found! Ensure Step 2 has finished generating.")
        return

    train_ds = FloodDataset("train_dataset.pt")
    val_ds   = FloodDataset("val_dataset.pt")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, pin_memory=True, num_workers=0)
    val_loader   = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, pin_memory=True, num_workers=0)

    num_nodes = train_ds.X.shape[1]
    base_edge_index = train_ds.edge_index

    model = FloodSurrogateModel(num_nodes=num_nodes).to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.MSELoss()

    cached_edge_indices = {}

    checkpoint_path = "stgcn_checkpoint.pth"
    start_epoch = 1
    best_val_loss = float('inf')

    if os.path.exists(checkpoint_path):
        print(f"Resuming from checkpoint: {checkpoint_path}")
        checkpoint = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
        model.load_state_dict(checkpoint['model_state_dict'])
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        start_epoch = checkpoint['epoch'] + 1
        best_val_loss = checkpoint['best_val_loss']
        print(f"  -> Resumed at epoch {start_epoch} (Best Val MSE: {best_val_loss:.4f})")

    print(f"\nStarting training for {EPOCHS} epochs...")

    for epoch in range(start_epoch, EPOCHS + 1):
        model.train()
        total_loss = 0
        t0 = time.time()

        for batch_idx, (batch_X, batch_y) in enumerate(train_loader):
            B = batch_X.shape[0]
            batch_X = batch_X.to(DEVICE, non_blocking=True)
            batch_y = batch_y.to(DEVICE, non_blocking=True)

            if B not in cached_edge_indices:
                cached_edge_indices[B] = get_batched_edge_index(base_edge_index, num_nodes, B, DEVICE)
            b_edge = cached_edge_indices[B]

            optimizer.zero_grad()
            preds = model(batch_X, b_edge)
            loss = criterion(preds, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        train_loss = total_loss / len(train_loader)

        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                B = batch_X.shape[0]
                batch_X = batch_X.to(DEVICE, non_blocking=True)
                batch_y = batch_y.to(DEVICE, non_blocking=True)

                if B not in cached_edge_indices:
                    cached_edge_indices[B] = get_batched_edge_index(base_edge_index, num_nodes, B, DEVICE)
                b_edge = cached_edge_indices[B]

                preds = model(batch_X, b_edge)
                val_loss += criterion(preds, batch_y).item()

        val_loss /= len(val_loader)
        t_elapsed = time.time() - t0

        print(f"Epoch {epoch:02d}/{EPOCHS} | Train MSE: {train_loss:.4f} | Val MSE: {val_loss:.4f} | Time: {t_elapsed:.1f}s")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), "stgcn_weights.pth")
            print("  -> Saved new best weights!")

        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'best_val_loss': best_val_loss,
        }, checkpoint_path)

if __name__ == "__main__":
    train()
