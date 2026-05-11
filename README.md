# 🚨 CrisisFlow

**An Intelligent, Multi-Role Crisis Management Platform for Urban Disasters**

CrisisFlow is a unified command center designed to coordinate emergency response across multiple stakeholders during urban crises—particularly floods. It combines AI-powered flood simulation, real-time resource management, and role-based dashboards to empower government, emergency services, and citizens with actionable intelligence.

---

## 🎯 What is CrisisFlow?

When a crisis strikes—like urban flooding—coordination between government, police, hospitals, and fire departments is critical. CrisisFlow solves this by:

- **Predicting** flood progression using an AI-powered STGCN (Spatio-Temporal Graph Convolutional Network) digital twin
- **Coordinating** resources across agencies through a unified dashboard
- **Tracking** incidents, dispatches, and citizen reports in real-time
- **Optimizing** emergency routes and resource allocation
- **Communicating** crisis information to different stakeholder roles

Think of it as a **command center dashboard** that speaks the language of every emergency responder.

---

## ✨ Key Features

### 1. **AI-Powered Flood Forecasting** 🌊
- **STGCN Digital Twin**: Neural network model that learns and predicts flood patterns
- **Spatio-temporal analysis**: Understands how water flows through geography over time
- **Real-time simulation**: Adjustable flood intensity and depth thresholds
- Trained on historical geospatial data (building geometry, water networks, terrain)

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

### 4. **Interactive Geospatial Mapping** 🗺️
- **Deck.gl visualization**: High-performance 3D/2D mapping
- **Geospatial layers**: Buildings, water networks, zones
- **Flood overlay**: Visual representation of predicted flood progression
- **Interactive controls**: Click to place markers, draw routes, manage barriers
- **Weather integration**: Real-time weather status display

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

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   Create a `.env` file:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=crisisflow
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

### AI Simulation
- `POST /api/simulate-flood` - Run STGCN flood prediction
- `GET /api/simulation/{id}` - Get simulation results

---

## 🧠 How the STGCN Digital Twin Works

The **STGCN (Spatio-Temporal Graph Convolutional Network)** is a neural network trained on historical flood data to predict how water spreads across the city.

**Process:**
1. **Graph Construction**: Represents the city as a graph where nodes are zones/buildings and edges are water flow paths
2. **Temporal Modeling**: Uses sequences of past flood states to predict future ones
3. **Spatial Convolution**: Each location's water level considers nearby locations
4. **Prediction**: Generates minute-by-minute or hour-by-hour flood progression
5. **Visualization**: Results overlay on the interactive map as heatmaps

**Training Data:**
- Building footprints (GeoJSON)
- Water networks and drainage systems
- Historical weather and incident records
- Terrain elevation data (OpenStreetMap)

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
| **Mapping** | Deck.gl | 60fps 3D rendering for large datasets |
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
