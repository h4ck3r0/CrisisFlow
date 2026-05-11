# 🚨 CrisisFlow: Real-Time 3D Digital Twin Command Center

**A Living City Replica Powered by Live Weather, AI Predictions & Real Geospatial Data**

CrisisFlow is a digital twin platform that creates a real-time, 3D virtual replica of Bangalore for crisis management. It integrates live weather data from Open-Meteo, AI-powered flood predictions with STGCN, and actual city geospatial data to coordinate emergency response across government, police, hospitals, fire departments, and citizens during urban disasters.

---

## 🎯 What is CrisisFlow?

**A 3D Digital Twin City for Crisis Response**

When a crisis strikes—like urban flooding—coordination between government, police, hospitals, and fire departments is critical. CrisisFlow solves this by creating a **living 3D replica of the city** that combines:

- **Real 3D City Map**: Authentic Bangalore with actual building footprints, roads, and water networks from OpenStreetMap
- **Live Weather Integration**: Real-time rainfall & precipitation data (Open-Meteo API, refreshed every 30 seconds)
- **AI-Powered Flood Prediction**: STGCN neural network forecasts water spread on the digital twin
- **Unified Emergency Dashboard**: Multi-role command center for government, police, hospitals, fire, and citizens
- **Real-Time Resource Coordination**: Track and dispatch resources across the city instantly
- **Interactive 3D/2D Views**: Immersive visualization of crisis zones and emergency response

Think of it as **watching your city in real-time** while an AI predicts what happens next—and coordinating every emergency responder with one integrated platform.

---

## ✨ Key Features

### 1. **Real-Time 3D Digital Twin** 🌊
- **Live Geospatial Map**: Real Bangalore city with actual building footprints, water networks, and terrain from OpenStreetMap
- **3D/2D Visualization**: High-performance Deck.gl rendering for immersive city view
- **AI Flood Forecasting**: STGCN neural network predicts water spread with live weather data
- **Live Weather Integration**: Real-time rainfall & precipitation from Open-Meteo API (updated every 30 seconds)
- **Real-time Simulation**: Adjustable flood intensity and depth thresholds on the digital twin
- **Hybrid Approach**: Combines real geospatial data + AI predictions + live environmental sensors

### 2. **Multi-Role Dashboards** 👥
Each stakeholder sees a tailored view:
- **🏛 Government (BBMP)**: Full system overview, control room access
- **🛡 Police**: Traffic management, road blocks, evacuation routes
- **🏥 Hospital Network**: Capacity planning, ambulance fleet management
- **🚒 Fire Department**: Resource deployment, incident response
- **👤 Citizens**: Report incidents, access safety information

### 3. **Real-Time Data Management** 📊
- **Incidents**: Track active crises with severity, location, and status
- **Alerts**: System-wide notifications for critical events
- **Resources**: Manage ambulances, fire trucks, personnel, and equipment
- **Dispatches**: Coordinate response teams to incidents
- **Citizen Reports**: Crowdsource crisis information with location data
- **Hospitals**: Monitor capacity and capability status
- **Road Blocks**: Manage traffic control and evacuation routes
- **Triage Sessions**: Medical resource coordination

### 4. **Interactive 3D City Digital Twin** 🗺️
- **Real Geospatial Base**: Authentic Bangalore city with building geometries, roads systems
- **3D/2D Toggle**: Switch between immersive 3D view and 2D tactical view
- **Live Layer Stacking**: Buildings, water networks, flood zones, resource locations all on one map
- **Dynamic Flood Overlay**: Animated water progression based on AI predictions + real weather
- **Interactive Controls**: Click to place markers, draw evacuation routes, deploy resources on the digital twin
- **Real-time Indicators**: Weather status, traffic conditions, incident markers update live

### 5. **Route Optimization & Logistics** 🛣️
- Find optimal paths for emergency vehicles
- Avoid flooded areas automatically
- Calculate nearest hospitals, fire stations, or resources
- Real-time routing updates as conditions change

---

## 🏗️ Architecture

### **Backend** (Python + FastAPI)
```
backend/
├── main.py              # FastAPI entry point
├── database.py          # MongoDB connection (Motor async)
├── api.py              # STGCN digital twin API
├── models/             # Data models (Incident, Alert, Resource, etc.)
├── routers/            # REST API endpoints
├── train.py            # STGCN model training
└── seed.py             # Sample data initialization
```

**Key Technology Stack:**
- **FastAPI**: High-performance async web framework
- **MongoDB**: Document database for crisis data
- **PyTorch + PyTorch Geometric**: Deep learning for flood prediction
- **OSMnx + GeoPandas**: Geospatial data processing
- **Networkx**: Graph analytics for routing

### **Frontend** (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── components/          # UI components (MapView, Dashboards, Panels)
│   ├── hooks/               # Custom React hooks
│   │   ├── useDashboard     # MongoDB data fetching
│   │   ├── useFloodSimulation  # AI simulation control
│   │   ├── useRouting       # Route calculation
│   │   ├── useWeather       # Weather integration
│   │   └── useFloodClustering  # Spatial clustering
│   ├── constants/           # Role configs, view states, UI settings
│   └── types/               # TypeScript interfaces
└── vite.config.ts          # Build configuration
```

**Key Technology Stack:**
- **React 19**: Modern UI framework
- **TypeScript**: Type-safe frontend development
- **Deck.gl**: High-performance geospatial visualization
- **MapLibre GL**: Open-source map rendering
- **Vite**: Fast development build tool

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB (local or Atlas)
- GPU (optional, but recommended for STGCN)

### Backend Setup

1. **Clone the repository**
   ```bash
   cd crisisflow/backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   Create a `.env` file:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=crisisflow
   WEATHER_API_URL=https://api.open-meteo.com/v1/forecast?latitude=12.935&longitude=77.645&current=rain,precipitation&timezone=Asia/Kolkata
   ```

4. **Create a virtual environment** (optional but recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

5. **Start the backend**
   ```bash
   python main.py
   ```
   Server runs on `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 📡 API Endpoints

### Dashboard & Analytics
- `GET /api/dashboard/{role}` - Fetch dashboard data for a specific role
- `GET /api/dashboard/stats/{role}` - Role-specific statistics

### Incidents & Alerts
- `GET /api/incidents` - List all incidents
- `POST /api/incidents` - Create new incident
- `GET /api/alerts` - Fetch active alerts
- `POST /api/alerts` - Issue new alert

### Resources & Dispatch
- `GET /api/resources` - List available resources
- `GET /api/dispatches` - View active dispatch assignments
- `POST /api/dispatches` - Create dispatch order

### Geospatial & Zones
- `GET /api/zones` - Get flood/administrative zones
- `GET /api/hospitals` - Hospital locations and capacity
- `GET /api/road-blocks` - Active traffic control points

### Citizen Engagement
- `GET /api/citizen-reports` - Crowd-sourced crisis reports
- `POST /api/citizen-reports` - Submit incident report

### AI Simulation & Weather
- `GET /api/weather` - Get real-time rainfall (Open-Meteo API integration)
- `POST /api/simulate-flood` - Run STGCN flood prediction with current weather
- `GET /api/simulation/{id}` - Get simulation results

---

## 🧠 How the Digital Twin Works

The **Digital Twin** is a real-time virtual replica of Bangalore that combines:
- **Real geospatial data** (actual city geometry)
- **Live weather feeds** (real rainfall from Open-Meteo API)
- **AI predictions** (STGCN neural network)
- **3D visualization** (immersive city view)

**Process:**
1. **Real Geospatial Foundation**: Base map loaded with actual buildings, roads, water networks from OpenStreetMap
2. **Live Weather Input**: Real rainfall data from Open-Meteo API (refreshed every 30 seconds)
3. **Graph Construction**: City represented as graph where nodes = zones/buildings, edges = water flow paths
4. **STGCN Prediction**: AI model uses past flood patterns + current weather to forecast water spread
5. **Temporal Modeling**: Sequences of past states + current conditions → minute-by-minute predictions
6. **3D Visualization**: Predictions render as animated water levels on the real city map

**Data Integration:**
- **Real-time**: Live weather (Open-Meteo API), incident reports, resource locations
- **Real Geospatial**: Building footprints, drainage systems, terrain elevation (OpenStreetMap)
- **Historical**: Past flood events and weather records (model training data)
- **Result**: A living, breathing digital replica that mirrors reality

---

## 🎮 Using CrisisFlow

### As a Government Official
- View system overview and resource allocation
- Monitor all incidents and dispatches
- Access triage and medical capacity data
- Control simulation parameters and view forecasts

### As a Police Officer
- See assigned zones and active road blocks
- Manage traffic control and evacuation routes
- Respond to incidents with tactical routes
- Coordinate with other services

### As a Hospital Administrator
- Monitor bed capacity and triage queues
- Track ambulance fleet and assignments
- Receive incident alerts for incoming casualties
- Plan resource deployment

### As a Citizen
- Report crisis observations with location
- Access safety information and evacuation zones
- Receive alerts and emergency notifications
- Find nearest hospital or emergency services

---

## 📁 Project Structure

```
crisisflow/
├── backend/                    # FastAPI server + AI models
│   ├── main.py                # Application entry point
│   ├── database.py            # MongoDB setup
│   ├── api.py                 # STGCN API endpoints
│   ├── train.py               # Model training script
│   ├── models/                # Pydantic data schemas
│   │   ├── incident.py
│   │   ├── alert.py
│   │   ├── resource.py
│   │   ├── dispatch.py
│   │   ├── hospital.py
│   │   ├── citizen_report.py
│   │   ├── road_block.py
│   │   ├── triage_session.py
│   │   └── zone.py
│   ├── routers/               # REST API route handlers
│   │   ├── incidents.py
│   │   ├── alerts.py
│   │   ├── resources.py
│   │   ├── dispatches.py
│   │   ├── hospitals.py
│   │   ├── citizen_reports.py
│   │   ├── road_blocks.py
│   │   ├── triage.py
│   │   ├── zones.py
│   │   └── dashboard.py
│   ├── requirements.txt       # Python dependencies
│   └── *.json, *.geojson      # Geospatial data files
│
├── frontend/                   # React TypeScript app
│   ├── src/
│   │   ├── App.tsx            # Root component
│   │   ├── components/        # UI components
│   │   │   ├── MapView.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── GovDashboard.tsx
│   │   │   ├── RolePanel.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── RainEffect.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   ├── constants/         # Configuration
│   │   ├── types/             # TypeScript interfaces
│   │   └── assets/            # Images, icons
│   ├── package.json
│   └── vite.config.ts
│
└── Crisis_flow/               # Original prototype (legacy)
```

---

## 🔧 Configuration

### Environment Variables (.env)

**Backend:**
```
MONGODB_URL=mongodb://localhost:27017  # MongoDB connection string
DATABASE_NAME=crisisflow               # Database name
STGCN_MODEL_PATH=./stgcn_checkpoint.pth  # AI model checkpoint
```

**Frontend:**
Set API base URL in your component configuration or environment:
```
VITE_API_URL=http://localhost:8000
```

---

## 📊 Data Models

### Incident
```
- incident_id: Unique identifier
- incident_type: flood, traffic, medical, etc.
- zone_id: Geographic zone affected
- location_name: Human-readable location
- severity: critical, high, moderate, low
- status: active, resolved, escalated
- assigned_resources: List of resource IDs
- notes: Additional context
- reported_at, resolved_at: Timestamps
```

### Resource
```
- resource_id: Unique identifier
- resource_type: ambulance, fire_truck, personnel, etc.
- location: Current lat/lon
- status: available, deployed, standby
- capacity: Number of personnel or items
- zone_id: Assigned zone
```

### Alert
```
- alert_id: Unique identifier
- alert_type: system, weather, incident, resource
- severity: critical, high, medium, low
- message: Alert text
- recipient_role: gov, police, hospital, fire, citizen
- created_at: Timestamp
```

---

## 🛠️ Development

### Run Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd ../frontend
npm run lint
```

### Model Training
```bash
cd backend
python train.py --epochs 100 --batch-size 32
```

### Clear & Re-seed Database
```bash
cd backend
python clear_data.py
python seed.py
```

---

## 🐛 Troubleshooting

**Backend won't start:**
- Ensure MongoDB is running: `mongod`
- Check `.env` file is configured correctly
- Verify port 8000 is not in use

**Frontend won't connect to backend:**
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in `main.py`
- Verify network connectivity

**Flood simulation not working:**
- Check STGCN model file exists: `backend/stgcn_checkpoint.pth`
- Verify geospatial data files are loaded (GeoJSON, OSM files)
- Monitor GPU availability: `nvidia-smi`

---

## 🚦 Performance Optimization

- **Backend**: FastAPI with async/await for concurrent request handling
- **Frontend**: Deck.gl for high-performance 3D rendering; React hooks for efficient re-renders
- **Simulation**: PyTorch GPU acceleration for neural network inference
- **Database**: MongoDB indexes on frequently queried fields (zone_id, incident_type, status)

---

## 📚 Technology Highlights

| Layer | Technology | Why? |
|-------|-----------|------|
| **Web Framework** | FastAPI | Type-safe, async, auto-documentation |
| **Database** | MongoDB + Motor | Flexible schema, async driver |
| **AI/ML** | PyTorch Geometric | Graph neural networks for spatial data |
| **Frontend** | React + TypeScript | Component reusability, type safety |
| **3D Mapping** | Deck.gl | 60fps 3D rendering for real geospatial data |
| **Weather API** | Open-Meteo | Free, real-time rainfall data for Bangalore |
| **Build** | Vite | 10x faster than Webpack |

---

## 👥 Stakeholder Roles

| Role | Focus | Key Features |
|------|-------|--------------|
| **Government** | System overview, coordination | All dashboards, full control |
| **Police** | Traffic, evacuation, security | Road blocks, routing, zone management |
| **Hospital** | Medical response, triage | Capacity planning, ambulance fleet |
| **Fire** | Resource deployment | Equipment tracking, incident response |
| **Citizen** | Safety, reporting | Report submission, alerts, guidance |

---

## 🔒 Security Considerations

- Implement role-based access control (RBAC) in API routes
- Authenticate users before dashboard access
- Sanitize citizen reports for spam/misinformation
- Use HTTPS in production
- Secure MongoDB with credentials and IP whitelisting

---

## 🌟 Future Enhancements

- [ ] Real-time SMS/push notifications
- [ ] Machine learning for incident severity prediction
- [ ] Integration with emergency 911 systems
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Historical analytics and reporting
- [ ] Predictive resource pre-positioning
- [ ] Blockchain for incident audit trails

---

## 📝 License

[Add your license here]

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Contact the development team

---

**CrisisFlow: Turning Crisis Data into Coordinated Action** 🚨💡
