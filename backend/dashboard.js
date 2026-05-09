const API = window.location.origin;
let DB = {}; // cached dashboard data
let currentRole = 'gov', currentTab = 0;

async function fetchDash(role) {
  const map = {gov:'government',police:'police',hospital:'hospital',fire:'fire',citizen:'citizen'};
  try {
    const r = await fetch(`${API}/api/dashboard/${map[role]}`);
    DB = await r.json();
  } catch(e) { console.error('Dashboard fetch failed', e); }
}

function ago(dt) {
  if (!dt) return '';
  const ms = Date.now() - new Date(dt).getTime();
  const m = Math.floor(ms/60000);
  return m < 1 ? 'just now' : m < 60 ? m+'m ago' : Math.floor(m/60)+'h ago';
}

function riskColor(r) {
  return {critical:'#ef4444',severe:'#f97316',high:'#f59e0b',moderate:'#22c55e'}[r]||'#94a3b8';
}
function statusColor(s) {
  return {available:'#4ade80',deployed:'#fb923c',maintenance:'#94a3b8',offline:'#94a3b8',active:'#f87171',cleared:'#4ade80'}[s]||'#94a3b8';
}
function depthColor(d) {
  return d > 1.5 ? '#ef4444' : d > 1.0 ? '#f97316' : d > 0.5 ? '#f59e0b' : '#22c55e';
}

const ROLES = {
  gov:{label:'Government · BBMP',sub:'Control room · Full access',icon:'ti-building-government',color:'#3b7bff',bg:'#0d1f42',border:'#1a3a73',avatar:'GV',tabs:['Overview','Reports','Resources','Triage']},
  police:{label:'Police Control',sub:'Traffic & evacuation',icon:'ti-shield',color:'#22c55e',bg:'#0d2a1a',border:'#14532d',avatar:'PD',tabs:['Zones','Road Blocks','Incidents','Alerts']},
  hospital:{label:'Hospital Network',sub:'Victoria & Wockhardt',icon:'ti-activity',color:'#f87171',bg:'#2a0d0d',border:'#7f1d1d',avatar:'HS',tabs:['Capacity','Resources','Incidents']},
  fire:{label:'Fire Station',sub:'KC Valley Units',icon:'ti-flame',color:'#fb923c',bg:'#2a1200',border:'#7c2d12',avatar:'FS',tabs:['Incidents','Resources','Dispatches']},
  citizen:{label:'Citizen View',sub:'Public alert dashboard',icon:'ti-user',color:'#a78bfa',bg:'#1a1040',border:'#4c1d95',avatar:'ME',tabs:['My Area','Alerts','Report']}
};

// ── Zone rendering on map ──
function renderMapZones() {
  const zones = DB.zones || [];
  const positions = [
    {left:'22%',top:'18%',w:110,h:85},{left:'44%',top:'28%',w:95,h:75},
    {left:'32%',top:'52%',w:85,h:68},{left:'57%',top:'56%',w:80,h:62},
    {left:'16%',top:'62%',w:82,h:65}
  ];
  const c = document.getElementById('zonesContainer');
  c.innerHTML = zones.map((z,i) => {
    const p = positions[i] || positions[0];
    const col = riskColor(z.risk_level);
    const pct = Math.min(z.depth_meters / 2.5 * 100, 100);
    const flags = [z.has_hospital?'🏥':'',z.has_school?'🏫':''].filter(Boolean).join(' ');
    return `<div class="zone" style="left:${p.left};top:${p.top};width:${p.w}px;height:${p.h}px;background:${col}12;border-color:${col}44;color:${col}" data-zid="${z.zone_id}"
      onmouseenter="showTip(event,'${z.zone_id}')" onmouseleave="hideTip()">
      <div class="zone-flood" style="background:${col}25;height:${pct}%"></div>
      <div class="zone-content">
        <div class="zone-depth" style="color:${col}">${z.depth_meters}m</div>
        <div class="zone-id">${z.ward_name}</div>
        ${flags?`<div class="zone-flags">${flags}</div>`:''}
      </div></div>`;
  }).join('');

  // Pins for deployed resources
  const res = (DB.resources||[]).filter(r=>r.status==='deployed');
  const icons = {pump:'💧',rescue_boat:'🚤',ambulance:'🚑',fire_engine:'🚒',ndrf_team:'⛑',police_unit:'🚔'};
  const pinPos = [{left:'24%',top:'11%'},{left:'46%',top:'21%'},{left:'18%',top:'55%'},{left:'62%',top:'40%'},{left:'38%',top:'38%'}];
  document.getElementById('pinsContainer').innerHTML = res.slice(0,5).map((r,i) => {
    const pp = pinPos[i]||pinPos[0];
    return `<div class="pin" style="left:${pp.left};top:${pp.top}">
      <div class="pin-bubble" style="background:var(--bg2);color:var(--role-color)">${icons[r.resource_type]||'📦'}</div>
      <div class="pin-stem" style="background:var(--role-color)"></div>
      <div class="pin-label">${r.resource_id}</div></div>`;
  }).join('');

  // STGCN badge
  const avgConf = zones.length ? (zones.reduce((s,z)=>s+z.stgcn_confidence,0)/zones.length*100).toFixed(1) : '--';
  document.getElementById('stgcnTime').textContent = '1.7s';
  document.getElementById('stgcnAcc').textContent = `${avgConf}% accuracy · t+120min`;
}

function showTip(e, zid) {
  const z = (DB.zones||[]).find(x=>x.zone_id===zid);
  if(!z) return;
  const tip = document.getElementById('zoneTip');
  tip.innerHTML = `<div style="font-size:10px;font-family:var(--mono);color:var(--txt3);margin-bottom:6px">${z.zone_id}</div>
    <div style="font-size:12px;font-weight:500;color:var(--txt);margin-bottom:8px">${z.ward_name}</div>
    <div class="tip-row"><span>Depth</span><span class="tip-val">${z.depth_meters}m</span></div>
    <div class="tip-row"><span>Population</span><span class="tip-val">${z.population_affected.toLocaleString()}</span></div>
    <div class="tip-row"><span>Road access</span><span class="tip-val">${(z.road_accessibility*100).toFixed(0)}%</span></div>
    <div class="tip-row"><span>Risk</span><span class="tip-val" style="color:${riskColor(z.risk_level)}">${z.risk_level.toUpperCase()}</span></div>`;
  const rect = e.currentTarget.getBoundingClientRect();
  tip.style.left = (rect.right+8)+'px'; tip.style.top = rect.top+'px';
  tip.classList.add('show');
}
function hideTip(){document.getElementById('zoneTip').classList.remove('show')}

// ── Zone rows helper ──
function zoneRowsHTML(zones) {
  const maxD = Math.max(...zones.map(z=>z.depth_meters),1);
  return zones.sort((a,b)=>b.depth_meters-a.depth_meters).map(z=>{
    const col = riskColor(z.risk_level), pct = (z.depth_meters/maxD*100).toFixed(0);
    return `<div class="zone-row"><span class="zone-row-id">${z.zone_id.replace('zone-','').toUpperCase()}</span>
      <span class="zone-row-name">${z.ward_name}</span>
      <div class="zr-bar-wrap"><div class="zr-bar" style="width:${pct}%;background:${col}"></div></div>
      <span class="zr-depth" style="color:${col}">${z.depth_meters}m</span></div>`;
  }).join('');
}

// ── Resource row helper ──
function resRowHTML(r, iconName) {
  const sc = statusColor(r.status);
  const icons = {pump:'ti-droplet',rescue_boat:'ti-sailboat',ambulance:'ti-ambulance',fire_engine:'ti-truck',ndrf_team:'ti-badge',police_unit:'ti-car'};
  const ic = iconName || icons[r.resource_type] || 'ti-box';
  return `<div class="res-row">
    <div class="res-icon" style="background:var(--role-bg);color:var(--role-color)"><i class="ti ${ic}" style="font-size:14px"></i></div>
    <div style="flex:1"><div class="res-name">${r.name}</div><div class="res-sub">${r.home_station}</div></div>
    <span class="res-status" style="background:${sc}18;color:${sc}">${r.status.toUpperCase()}</span></div>`;
}
