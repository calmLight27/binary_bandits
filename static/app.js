// Init Map
const map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap' }).addTo(map);

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(() => calculateCoverage());

// Layers
let markerLayer = L.markerClusterGroup({
    disableClusteringAtZoom: 16, 
    spiderfyOnMaxZoom: false
}).addTo(map);
let unionLayer = L.layerGroup().addTo(map);
let polyLayer = L.layerGroup().addTo(map);
let boundaryLayer = new L.FeatureGroup().addTo(map);

// State
let currentBoundaryItem = null;

// --- COLOR GENERATOR ---
function getColor(cat) {
    const map = {
        'hospital': '#e74c3c', 'school': '#f1c40f', 'atm': '#3498db',
        'bank': '#9b59b6', 'park': '#27ae60', 'commercial': '#e67e22',
        'residential': '#95a5a6', 'police': '#34495e', 'fire_station': '#d35400'
    };
    if(map[cat]) return map[cat];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// --- VISUALIZER ---
async function calculateCoverage() {
    const density = document.getElementById('densityInput').value;
    try {
        const res = await fetch(`/api/resources?density=${density}`);
        const data = await res.json();
        updateVisuals(data, true);
    } catch(e) { console.error(e); }
}

function updateVisuals(data, showRanges) {
    markerLayer.clearLayers();
    unionLayer.clearLayers();
    polyLayer.clearLayers();
    boundaryLayer.clearLayers();
    
    if (data.length === 0) return;

    const services = data.filter(d => d.category !== 'project_boundary');
    const boundary = data.find(d => d.category === 'project_boundary');
    currentBoundaryItem = boundary;

    // Draw Boundary
    if (boundary && boundary.shape_data) {
        const poly = L.polygon(boundary.shape_data, {
            color: "#333", dashArray: "10, 10", fill: false, weight: 2
        });
        boundaryLayer.addLayer(poly);
        map.fitBounds(poly.getBounds(), {padding:[20,20]});
    } else if (services.length > 0) {
        const points = turf.featureCollection(services.map(d => turf.point([d.lon, d.lat])));
        const bboxPoly = turf.bboxPolygon(turf.bbox(points));
        L.geoJSON(bboxPoly, {
            style: { color: "#333", dashArray: "5, 5", fill: false, weight: 2 }
        }).eachLayer(l => boundaryLayer.addLayer(l));
    }

    // Draw Services
    const categories = [...new Set(services.map(d => d.category))];
    categories.forEach(cat => {
        const items = services.filter(d => d.category === cat);
        const color = getColor(cat);
        let rangePolys = [];

        items.forEach(item => {
            if (item.geom_type === 'polygon') {
                L.polygon(item.shape_data, {
                    color: color, fillColor: color, fillOpacity: 0.4, weight: 2
                }).bindPopup(createEditPopup(item)).addTo(polyLayer);
            } else {
                // Marker
                const icon = L.divIcon({
                    className: 'custom-pin',
                    html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`
                });
                
                const marker = L.marker([item.lat, item.lon], { icon: icon, draggable: true })
                    .bindPopup(createEditPopup(item))
                    .addTo(markerLayer);

                marker.on('dragend', async (e) => {
                    await updateService(item.id, { lat: e.target.getLatLng().lat, lon: e.target.getLatLng().lng });
                });

                if (showRanges) {
                    rangePolys.push(turf.circle([item.lon, item.lat], item.range, {steps:32, units:'kilometers'}));
                }
            }
        });

        // Range Union
        if (showRanges && rangePolys.length > 0) {
            if (rangePolys.length < 300) {
                try {
                    let merged = rangePolys[0];
                    for(let i=1; i<rangePolys.length; i++) merged = turf.union(merged, rangePolys[i]);
                    L.geoJSON(merged, {
                        style: { color: color, fillColor: color, fillOpacity: 0.15, weight: 1 },
                        interactive: false
                    }).addTo(unionLayer);
                } catch(e) {}
            } else {
                rangePolys.forEach(poly => {
                    L.geoJSON(poly, {
                         style: { color: color, fillColor: color, fillOpacity: 0.1, weight: 0 },
                         interactive: false
                    }).addTo(unionLayer);
                });
            }
        }
    });

    drawChart(services);
}

// --- BUILDER MODE (FIXED & NUCLEAR) ---
let isBuilderMode = false; 

function toggleBuilderMode() {
    const btn = document.getElementById("builder-btn");
    const status = document.getElementById("builder-status");
    const sel = document.getElementById('builderService'); 
    
    // Check if selection exists
    if (!isBuilderMode && !sel.value) { 
        alert("⚠️ Please select a service type first (e.g., Hospital)!"); 
        return; 
    }

    isBuilderMode = !isBuilderMode; // Toggle State

    if (isBuilderMode) {
        // --- TURN ON ---
        
        // 1. Button Visuals
        btn.innerHTML = "🚫 Stop Building";
        btn.style.background = "#e74c3c"; 
        btn.style.borderColor = "#c0392b";
        
        // 2. FORCE CROSSHAIR CURSOR (Inject Style Tag)
        const style = document.createElement('style');
        style.id = 'cursor-override';
        style.innerHTML = `#map, #map * { cursor: crosshair !important; }`;
        document.head.appendChild(style);
        
        // 3. Status Text
        if(status) status.innerHTML = `Status: Placing <b>${sel.value}</b>`;
        
        // 4. Start Listening
        map.on('click', handleMapClick);

    } else {
        // --- TURN OFF ---

        // 1. Reset Button
        btn.innerHTML = "📍 Enable Build Mode";
        btn.style.background = ""; 
        btn.style.borderColor = "";
        
        // 2. Remove Cursor Override
        const style = document.getElementById('cursor-override');
        if (style) style.remove();
        
        // 3. Reset Status
        if(status) status.innerText = "Status: View Only";

        // 4. Stop Listening
        map.off('click', handleMapClick);
    }
}

async function handleMapClick(e) {
    if (!isBuilderMode) return;

    const sel = document.getElementById('builderService');
    const category = sel.value;

    const name = prompt(`Name for new ${category}?`, "New Facility");
    if (!name) return; 

    const capStr = prompt(`Capacity for ${name}? (Scale 1-100)`, "50");
    const capacity = parseInt(capStr) || 50;

    await apiAdd({
        name: name,
        category: category,
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        capacity: capacity,
        geom_type: 'point'
    });
}

// --- BOUNDARY EDITING ---
function enableBoundaryEdit() {
    document.getElementById('btn-edit-boundary').style.display = 'none';
    document.getElementById('btn-save-boundary').style.display = 'flex';
    boundaryLayer.eachLayer(l => {
        l.setStyle({ color: '#ef4444', dashArray: null, weight: 3 });
        if(l.editing) l.editing.enable();
    });
    if (boundaryLayer.getLayers().length === 0) {
        new L.Draw.Rectangle(map).enable();
        map.on(L.Draw.Event.CREATED, e => boundaryLayer.addLayer(e.layer));
    }
}

async function saveBoundary() {
    if (boundaryLayer.getLayers().length === 0) return;
    const layer = boundaryLayer.getLayers()[0];
    const coords = layer.getLatLngs()[0].map(p => [p.lat, p.lng]);
    
    if (currentBoundaryItem) await fetch(`/api/delete/${currentBoundaryItem.id}`, {method:'DELETE'});
    
    await apiAdd({
        name: "Project Boundary", category: "project_boundary",
        geom_type: "polygon", coordinates: coords
    });
    
    document.getElementById('btn-edit-boundary').style.display = 'flex';
    document.getElementById('btn-save-boundary').style.display = 'none';
    calculateCoverage();
}

async function resetBoundary() {
    if(confirm("Reset boundary?")) {
        if (currentBoundaryItem) await fetch(`/api/delete/${currentBoundaryItem.id}`, {method:'DELETE'});
        calculateCoverage();
    }
}

// --- API HELPERS ---
async function apiAdd(payload) {
    await fetch('/api/add', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    calculateCoverage();
}

async function updateService(id, payload) {
    await fetch(`/api/update/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    calculateCoverage(); 
}

function createEditPopup(item) {
    return `
        <div class="popup-form">
            <b>${item.name}</b>
            <small>${item.category.toUpperCase()}</small>
            <label>Name:</label>
            <input type="text" id="name-${item.id}" value="${item.name}">
            <label>Capacity:</label>
            <input type="number" id="cap-${item.id}" value="${item.capacity}">
            <div class="popup-actions">
                <button onclick="saveEdit(${item.id})" class="btn-save">💾 Save</button>
                <button onclick="deleteService(${item.id})" class="btn-del">🗑️ Del</button>
            </div>
        </div>`;
}

window.saveEdit = async function(id) {
    const newName = document.getElementById(`name-${id}`).value;
    const newCap = document.getElementById(`cap-${id}`).value;
    await updateService(id, { name: newName, capacity: parseInt(newCap) });
};

window.deleteService = async function(id) {
    if(confirm("Delete?")) { await fetch(`/api/delete/${id}`, {method:'DELETE'}); calculateCoverage(); }
}

// --- SYNC & CHARTS ---
document.getElementById('densitySlider').addEventListener('input', function() { document.getElementById('densityInput').value = this.value; });
document.getElementById('densityInput').addEventListener('input', function() { document.getElementById('densitySlider').value = this.value; });
function clearCoverage() { markerLayer.clearLayers(); unionLayer.clearLayers(); boundaryLayer.clearLayers(); }
function drawChart(data) {
    let counts = {}; data.forEach(d => counts[d.category] = (counts[d.category]||0)+1);
    let chartData = [['Category', 'Count']]; for (let [k,v] of Object.entries(counts)) chartData.push([k,v]);
    var chart = new google.visualization.PieChart(document.getElementById('chart_div'));
    chart.draw(google.visualization.arrayToDataTable(chartData), { pieHole: 0.4, legend: 'none', chartArea:{width:'90%',height:'90%'} });
}
