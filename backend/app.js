const { DeckGL, GeoJsonLayer, ScatterplotLayer, PathLayer, HeatmapLayer } = deck;

let API_URL = window.location.origin === 'null' ? 'http://127.0.0.1:8000' : window.location.origin;
// If running locally as a file, fallback to localhost:8000
if (window.location.protocol === 'file:') {
    API_URL = 'http://127.0.0.1:8000';
}

const INITIAL_VIEW_STATE = {
    longitude: 77.6450,
    latitude: 12.9350,
    zoom: 13.5,
    pitch: 0,
    bearing: 0
};

const EMERGENCY_INFRA = [
    {name: "Fortis Hospital", type: "hospital", lon: 77.6220, lat: 12.9340},
    {name: "Apollo Clinic HSR", type: "hospital", lon: 77.6480, lat: 12.9180},
    {name: "Koramangala Fire Station", type: "fire", lon: 77.6300, lat: 12.9420},
    {name: "Madiwala Fire Station", type: "fire", lon: 77.6200, lat: 12.9220},
    {name: "HSR Police Station", type: "police", lon: 77.6500, lat: 12.9150},
    {name: "Koramangala Police", type: "police", lon: 77.6250, lat: 12.9380},
    {name: "Community Shelter A", type: "shelter", lon: 77.6350, lat: 12.9500},
    {name: "Community Shelter B", type: "shelter", lon: 77.6550, lat: 12.9280}
];

const INFRA_COLORS = {
    hospital: [255, 68, 68],
    fire: [255, 136, 0],
    police: [68, 136, 255],
    shelter: [68, 204, 136]
};

let floodPoints = [];
let floodTimeline = [];
let currentTimestep = -1;
let routeCoords = null;
let clickPoints = [];
let is3D = false;
let autoRefreshInterval = null;

const deckgl = new DeckGL({
    container: 'map',
    initialViewState: INITIAL_VIEW_STATE,
    controller: true,
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    onClick: handleMapClick,
    getTooltip: ({object}) => {
        if (!object) return null;
        if (object.depth !== undefined) {
            let status = 'Safe';
            let color = '#4ade80';
            if (object.depth > 10) { status = 'CRITICAL'; color = '#ff2244'; }
            else if (object.depth > 5) { status = 'HIGH RISK'; color = '#ff8800'; }
            else if (object.depth > 2) { status = 'MODERATE'; color = '#ffcc00'; }
            return {
                html: `<div style="font-family:Inter,sans-serif">
                    <strong style="color:${color};font-size:18px;font-family:Outfit,sans-serif">${object.depth.toFixed(1)} cm</strong><br/>
                    <span style="color:#8b9bb4;font-size:11px;text-transform:uppercase">Water Depth</span><br/>
                    <span style="color:${color};font-weight:600;font-size:12px">${status}</span>
                </div>`,
                style: {
                    backgroundColor: 'rgba(11, 15, 25, 0.95)',
                    border: `1px solid ${color}`,
                    borderRadius: '10px',
                    padding: '12px 16px',
                    boxShadow: `0 4px 20px ${color}33`
                }
            };
        }
        if (object.name && object.type) {
            const accessible = object.accessible !== false;
            const statusText = accessible ? '✅ Accessible' : '❌ Flooded Area';
            const statusColor = accessible ? '#4ade80' : '#ff3366';
            return {
                html: `<div style="font-family:Inter,sans-serif">
                    <strong style="color:white;font-size:14px;font-family:Outfit,sans-serif">${object.name}</strong><br/>
                    <span style="color:#8b9bb4;font-size:11px;text-transform:uppercase">${object.type}</span><br/>
                    <span style="color:${statusColor};font-weight:600;font-size:12px">${statusText}</span>
                </div>`,
                style: {
                    backgroundColor: 'rgba(11, 15, 25, 0.95)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px',
                    padding: '12px 16px'
                }
            };
        }
        if (object.properties && object.properties.name) return object.properties.name;
        return null;
    },
    layers: []
});

function getActiveFloodPoints() {
    if (currentTimestep === -1 || floodTimeline.length === 0) return floodPoints;
    return floodPoints.map((p, i) => ({
        lon: p.lon,
        lat: p.lat,
        depth: floodTimeline[currentTimestep][i]
    }));
}

function getEmergencyWithStatus() {
    const active = getActiveFloodPoints();
    if (active.length === 0) return EMERGENCY_INFRA.map(f => ({...f, accessible: true}));
    return EMERGENCY_INFRA.map(f => {
        let minDist = Infinity;
        let nearDepth = 0;
        for (const p of active) {
            const dist = Math.abs(p.lon - f.lon) + Math.abs(p.lat - f.lat);
            if (dist < minDist) {
                minDist = dist;
                nearDepth = p.depth;
            }
        }
        return {...f, accessible: nearDepth < 5};
    });
}

function renderLayers() {
    const activePoints = getActiveFloodPoints();
    const emergencyData = getEmergencyWithStatus();

    const layers = [
        new GeoJsonLayer({
            id: 'buildings-3d',
            data: 'kc_valley_buildings.geojson',
            filled: true,
            extruded: is3D,
            wireframe: is3D,
            getElevation: d => d.properties.height || 10,
            getFillColor: is3D ? [30, 35, 55, 200] : [20, 25, 40, 80],
            getLineColor: [60, 70, 100, 80],
            elevationScale: is3D ? 1 : 0,
            pickable: false
        }),

        new GeoJsonLayer({
            id: 'water-bodies',
            data: 'kc_valley_water.geojson',
            filled: true,
            extruded: false,
            getFillColor: [15, 60, 130, 160],
            getLineColor: [0, 140, 255, 80],
            lineWidthMinPixels: 1,
            pickable: true
        }),

        new HeatmapLayer({
            id: 'flood-heatmap',
            data: activePoints,
            getPosition: d => [d.lon, d.lat],
            getWeight: d => Math.max(d.depth, 0),
            radiusPixels: 35,
            intensity: 1.5,
            threshold: 0.03,
            colorRange: [
                [0, 60, 140, 0],
                [0, 160, 255, 100],
                [0, 220, 255, 160],
                [255, 220, 0, 200],
                [255, 130, 0, 230],
                [255, 30, 50, 255]
            ],
            opacity: 0.75,
            pickable: false
        }),

        new ScatterplotLayer({
            id: 'flood-dots',
            data: activePoints.filter(d => d.depth > 2),
            pickable: true,
            opacity: 0.5,
            stroked: false,
            filled: true,
            radiusMinPixels: 3,
            radiusMaxPixels: 12,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => d.depth * 2,
            getFillColor: d => {
                if (d.depth > 10) return [255, 40, 60, 180];
                if (d.depth > 5)  return [255, 150, 0, 150];
                return [0, 200, 255, 120];
            }
        }),

        new ScatterplotLayer({
            id: 'emergency-markers',
            data: emergencyData,
            pickable: true,
            opacity: 1,
            stroked: true,
            filled: true,
            radiusMinPixels: 8,
            radiusMaxPixels: 14,
            lineWidthMinPixels: 2,
            getPosition: d => [d.lon, d.lat],
            getRadius: 40,
            getFillColor: d => {
                const base = INFRA_COLORS[d.type] || [255, 255, 255];
                return d.accessible ? [...base, 255] : [...base, 100];
            },
            getLineColor: d => d.accessible ? [255, 255, 255, 200] : [255, 50, 50, 255]
        }),

        new ScatterplotLayer({
            id: 'markers',
            data: clickPoints.map((c, i) => ({pos: c, type: i})),
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: true,
            radiusMinPixels: 10,
            radiusMaxPixels: 16,
            lineWidthMinPixels: 3,
            getPosition: d => d.pos,
            getRadius: 30,
            getFillColor: d => d.type === 0 ? [0, 255, 130, 255] : [255, 80, 80, 255],
            getLineColor: [255, 255, 255, 220]
        }),

        new PathLayer({
            id: 'ai-route-glow',
            data: routeCoords ? [{path: routeCoords}] : [],
            pickable: false,
            widthMinPixels: 14,
            widthMaxPixels: 20,
            getPath: d => d.path,
            getColor: [0, 180, 255, 50],
            getWidth: 14,
            rounded: true
        }),

        new PathLayer({
            id: 'ai-route',
            data: routeCoords ? [{path: routeCoords}] : [],
            pickable: false,
            widthMinPixels: 5,
            widthMaxPixels: 8,
            getPath: d => d.path,
            getColor: [0, 180, 255, 240],
            getWidth: 5,
            rounded: true
        })
    ];

    deckgl.setProps({layers});
}

renderLayers();

const intensitySlider = document.getElementById('rain-intensity');
const intensityVal = document.getElementById('intensity-val');
const simulateBtn = document.getElementById('simulate-btn');
const timeLabel = document.getElementById('compute-time');
const routeStatus = document.getElementById('route-status');
const clearRouteBtn = document.getElementById('clear-route-btn');
const btn2D = document.getElementById('btn-2d');
const btn3D = document.getElementById('btn-3d');
const weatherBtn = document.getElementById('weather-btn');
const autoRefreshBtn = document.getElementById('auto-refresh-btn');
const weatherStatus = document.getElementById('weather-status');
const timelineSlider = document.getElementById('timeline-slider');
const timelineVal = document.getElementById('timeline-val');
const timelineMaxBtn = document.getElementById('timeline-max-btn');

intensitySlider.addEventListener('input', (e) => {
    intensityVal.innerText = parseFloat(e.target.value).toFixed(2);
});

btn2D.addEventListener('click', () => {
    is3D = false;
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
    deckgl.setProps({
        initialViewState: {
            ...INITIAL_VIEW_STATE,
            pitch: 0,
            bearing: 0,
            transitionDuration: 800
        }
    });
    renderLayers();
});

btn3D.addEventListener('click', () => {
    is3D = true;
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
    deckgl.setProps({
        initialViewState: {
            ...INITIAL_VIEW_STATE,
            pitch: 45,
            bearing: -20,
            transitionDuration: 800
        }
    });
    renderLayers();
});

timelineSlider.addEventListener('input', (e) => {
    currentTimestep = parseInt(e.target.value);
    timelineMaxBtn.classList.remove('active');
    timelineVal.innerText = `${currentTimestep * 10} min`;
    renderLayers();
    updateGovStats(getActiveFloodPoints());
});

timelineMaxBtn.addEventListener('click', () => {
    currentTimestep = -1;
    timelineMaxBtn.classList.add('active');
    timelineVal.innerText = 'Peak (Max)';
    renderLayers();
    updateGovStats(getActiveFloodPoints());
});

simulateBtn.addEventListener('click', async () => {
    const intensity = parseFloat(intensitySlider.value);
    simulateBtn.disabled = true;
    simulateBtn.innerText = "COMPUTING...";

    const startTime = performance.now();

    try {
        const response = await fetch(`${API_URL}/simulate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({intensity})
        });

        const data = await response.json();
        floodPoints = data.points;
        floodTimeline = data.timeline || [];

        const endTime = performance.now();
        timeLabel.innerText = `${(endTime - startTime).toFixed(0)} ms`;

        timelineSlider.disabled = false;

        updateGovStats(getActiveFloodPoints());
        renderLayers();

        if (clickPoints.length === 2) calculateRoute();

    } catch (e) {
        console.error("API Error:", e);
        alert("Failed to connect to API. Make sure api.py is running!");
    } finally {
        simulateBtn.disabled = false;
        simulateBtn.innerText = "SIMULATE STORM";
    }
});

function updateGovStats(points) {
    const total = points.length;
    if (total === 0) return;
    const affected = points.filter(p => p.depth > 0.5).length;
    const critical = points.filter(p => p.depth > 10).length;
    const dangerous = points.filter(p => p.depth > 5).length;
    const maxDepth = Math.max(...points.map(p => p.depth));

    document.getElementById('gov-affected').innerText = `${affected.toLocaleString()} / ${total.toLocaleString()}`;
    document.getElementById('gov-critical').innerText = critical.toLocaleString();
    document.getElementById('gov-max-depth').innerText = `${maxDepth.toFixed(1)} cm`;
    document.getElementById('gov-dangerous').innerText = dangerous.toLocaleString();

    document.getElementById('gov-critical').style.color = critical > 0 ? '#ff3366' : '#4ade80';
    document.getElementById('gov-dangerous').style.color = dangerous > 100 ? '#ff8800' : '#4ade80';
}

async function fetchWeather() {
    weatherBtn.innerText = '🌧 Fetching...';
    try {
        const resp = await fetch(`${API_URL}/weather`);
        const data = await resp.json();
        intensitySlider.value = data.intensity;
        intensityVal.innerText = data.intensity.toFixed(2);
        weatherStatus.innerText = data.status === 'live'
            ? `Live: ${data.rain_mm} mm/h rainfall in Bangalore`
            : 'Using fallback data';
        weatherStatus.style.color = data.status === 'live' ? '#4ade80' : '#ff8800';
        return data.intensity;
    } catch (e) {
        weatherStatus.innerText = 'Weather fetch failed';
        weatherStatus.style.color = '#ff3366';
        return null;
    } finally {
        weatherBtn.innerText = '🌧 Live Weather';
    }
}

weatherBtn.addEventListener('click', async () => {
    await fetchWeather();
});

autoRefreshBtn.addEventListener('click', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        autoRefreshBtn.classList.remove('active');
        autoRefreshBtn.innerText = '⟳ Auto';
    } else {
        autoRefreshBtn.classList.add('active');
        autoRefreshBtn.innerText = '⟳ Live';
        runAutoRefresh();
        autoRefreshInterval = setInterval(runAutoRefresh, 30000);
    }
});

async function runAutoRefresh() {
    await fetchWeather();
    simulateBtn.click();
}

function handleMapClick(info) {
    if (!info.coordinate) return;

    if (clickPoints.length >= 2) {
        clickPoints = [];
        routeCoords = null;
        routeStatus.innerText = "Waiting for input...";
        routeStatus.style.color = '#8b9bb4';
        clearRouteBtn.style.display = 'none';
    }

    clickPoints.push(info.coordinate);
    renderLayers();

    if (clickPoints.length === 1) {
        routeStatus.innerText = "Click destination on the map...";
        clearRouteBtn.style.display = 'block';
    } else if (clickPoints.length === 2) {
        calculateRoute();
    }
}

clearRouteBtn.addEventListener('click', () => {
    clickPoints = [];
    routeCoords = null;
    routeStatus.innerText = "Waiting for input...";
    routeStatus.style.color = '#8b9bb4';
    clearRouteBtn.style.display = 'none';
    renderLayers();
});

async function calculateRoute() {
    routeStatus.innerText = "AI calculating safest path...";
    routeStatus.style.color = '#8b9bb4';
    const intensity = parseFloat(intensitySlider.value);

    try {
        const response = await fetch(`${API_URL}/route`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                start_lon: clickPoints[0][0],
                start_lat: clickPoints[0][1],
                end_lon: clickPoints[1][0],
                end_lat: clickPoints[1][1],
                intensity
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            routeCoords = data.path;
            routeStatus.innerText = "Safe route found!";
            routeStatus.style.color = '#4ade80';
        } else {
            routeCoords = null;
            routeStatus.innerText = "No safe route. All paths flooded.";
            routeStatus.style.color = "#ff3366";
        }
        renderLayers();

    } catch (e) {
        console.error("Routing Error:", e);
        routeStatus.innerText = "Error calculating route.";
        routeStatus.style.color = "#ff3366";
    }
}
