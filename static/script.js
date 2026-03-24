// ================= GLOBAL VARIABLES =================
let map;
let markers = {};
let stateDataCache = {};
let allDistricts = [];

let mainChart = null;
let pieChart = null;
let barChart = null;
let lineChart = null;

let compDemoChart = null;
let compTrendChart = null;

let nationalAvgStateLoad = 0;

// ================= NEIGHBOR MAP =================
const neighborMap = {
  "andhra pradesh": ["Telangana", "Chhattisgarh", "Odisha", "Karnataka", "Tamil Nadu"],
  "arunachal pradesh": ["Assam", "Nagaland"],
  "assam": ["Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Meghalaya", "West Bengal"],
  "bihar": ["Uttar Pradesh", "Jharkhand", "West Bengal"],
  "chhattisgarh": ["Madhya Pradesh", "Uttar Pradesh", "Bihar", "Jharkhand", "Odisha", "Telangana", "Maharashtra"],
  "goa": ["Maharashtra", "Karnataka"],
  "gujarat": ["Rajasthan", "Madhya Pradesh", "Maharashtra"],
  "haryana": ["Punjab", "Rajasthan", "Uttar Pradesh", "Delhi"],
  "himachal pradesh": ["Jammu and Kashmir", "Punjab", "Haryana", "Uttarakhand"],
  "jharkhand": ["Bihar", "West Bengal", "Odisha", "Chhattisgarh"],
  "karnataka": ["Goa", "Maharashtra", "Telangana", "Andhra Pradesh", "Tamil Nadu", "Kerala"],
  "kerala": ["Tamil Nadu", "Karnataka"],
  "madhya pradesh": ["Rajasthan", "Uttar Pradesh", "Chhattisgarh", "Maharashtra", "Gujarat"],
  "maharashtra": ["Gujarat", "Madhya Pradesh", "Chhattisgarh", "Telangana", "Karnataka", "Goa"],
  "manipur": ["Nagaland", "Assam", "Mizoram"],
  "meghalaya": ["Assam"],
  "mizoram": ["Tripura", "Assam", "Manipur"],
  "nagaland": ["Arunachal Pradesh", "Assam", "Manipur"],
  "odisha": ["West Bengal", "Jharkhand", "Chhattisgarh", "Andhra Pradesh"],
  "punjab": ["Jammu and Kashmir", "Himachal Pradesh", "Haryana", "Rajasthan"],
  "rajasthan": ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Gujarat"],
  "sikkim": ["West Bengal"],
  "tamil nadu": ["Kerala", "Karnataka", "Andhra Pradesh"],
  "telangana": ["Maharashtra", "Chhattisgarh", "Andhra Pradesh", "Karnataka"],
  "tripura": ["Assam", "Mizoram"],
  "uttar pradesh": ["Uttarakhand", "Haryana", "Delhi", "Rajasthan", "Madhya Pradesh", "Chhattisgarh", "Bihar"],
  "uttarakhand": ["Himachal Pradesh", "Uttar Pradesh"],
  "west bengal": ["Bihar", "Jharkhand", "Odisha", "Assam", "Sikkim"],

  // ---------- Union Territories ----------
  "delhi": ["Haryana", "Uttar Pradesh"],
  "jammu and kashmir": ["Himachal Pradesh", "Punjab"],
  "ladakh": ["Jammu and Kashmir"],
  "chandigarh": ["Punjab", "Haryana"],
  "dadra and nagar haveli and daman and diu": ["Gujarat", "Maharashtra"],
  "puducherry": ["Tamil Nadu", "Andhra Pradesh", "Kerala"]
};

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadData();
});

// ================= MAP =================
function initMap() {
    map = L.map('map').setView([22.5, 78.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// ================= DATA LOAD (FIXED) =================
function loadData() {
    fetch('/api/data')
        .then(res => res.json())
        .then(data => {

            allDistricts = data.map_data;

            // 1. KPI Updates
            document.getElementById('total-load').innerText =
                data.metrics.total_load.toLocaleString();

            const avgLoad = Math.round(
                data.metrics.total_load / data.map_data.length
            );
            document.getElementById('avg-load').innerText =
                avgLoad.toLocaleString();

            const uniqueStates =
                new Set(data.map_data.map(d => d.state)).size;

            nationalAvgStateLoad =
                Math.round(data.metrics.total_load / uniqueStates);

            // 2. Prepare Data & National Aggregates
            const stateSet = new Set();
            let nationalPred = 0; // Poore India ka Prediction
            let nationalChild = 0; // Poore India ke Bachhe

            data.map_data.forEach(d => {
                const stateKey = d.state.toLowerCase();
                if (!stateDataCache[stateKey]) stateDataCache[stateKey] = [];
                stateDataCache[stateKey].push(d);
                stateSet.add(d.state);

                // Calculations for National Graph
                nationalPred += d.predicted_load;
                nationalChild += Math.round((d.ratio_5_17 || 0.3) * d.total_bio);

                // Map Markers
                const color =
                    d.alert_status === 'High Risk' ? '#ef4444' : '#22c55e';

                const marker = L.circleMarker([d.lat, d.lng], {
                    radius: 4,
                    weight: 1,
                    fillOpacity: 0.6,
                    color,
                    fillColor: color
                }).addTo(map);

                marker.bindPopup(
                    `<b>${d.district}</b><br>Load: ${d.total_bio}`
                );
                marker.on('click', () => updateDashboardDistrict(d));

                markers[d.district.toLowerCase()] = {
                    data: d,
                    marker
                };
            });

            // 3. Populate Dropdown
            const dropdown = document.getElementById('stateSelect');
            [...stateSet].sort().forEach(state => {
                const opt = document.createElement('option');
                opt.value = state.toLowerCase();
                opt.innerText = state;
                dropdown.appendChild(opt);
            });

            // 4. Populate Comparison Dropdowns
            const compDrop1 = document.getElementById('compSelect1');
            const compDrop2 = document.getElementById('compSelect2');
            const sortedDistricts = data.map_data.sort((a, b) => a.district.localeCompare(b.district));

            sortedDistricts.forEach(d => {
                if(d.district) {
                    let opt1 = document.createElement('option');
                    opt1.value = d.district.toLowerCase();
                    opt1.innerText = d.district;
                    compDrop1.appendChild(opt1);

                    let opt2 = document.createElement('option');
                    opt2.value = d.district.toLowerCase();
                    opt2.innerText = d.district;
                    compDrop2.appendChild(opt2);
                }
            });

            // 5. Render Initial Charts (National View)
            updateMainChart('national', data.state_stats);
            
            // ✅ FIX: Ab hum null nahi bhejenge, National Data bhejenge
            renderCharts({
                label: 'National Total',
                child: Math.round((nationalChild / data.metrics.total_load) * 100),
                adult: 100 - Math.round((nationalChild / data.metrics.total_load) * 100),
                load: data.metrics.total_load,
                avg: nationalPred, // National view me Pred se compare karenge
                pred: nationalPred
            }, 'national');
        });
}

// ================= SEARCH / FILTER =================
function handleKey(e) {
    if (e.key === 'Enter') searchDistrict();
}

function filterByState() {
    const state = document.getElementById('stateSelect').value;
    if (state && stateDataCache[state]) {
        updateDashboardState(state, stateDataCache[state]);
    }
}

function searchDistrict() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    if (markers[q]) {
        const d = markers[q].data;
        markers[q].marker.openPopup();
        updateDashboardDistrict(d);
    } else {
        alert("Not found");
    }
}

// ================= AI INSIGHT ENGINE =================
function generateInsight({ load, avg, pred, childPct }) {

    let narrative = '';
    let risk = 'low';

    if (load > avg * 1.25) {
        narrative +=
            'Current load is significantly higher than the average. ';
        risk = 'high';
    } else if (load > avg) {
        narrative +=
            'Current load is slightly above the average. ';
        risk = 'medium';
    } else {
        narrative +=
            'Current load is within manageable limits. ';
    }

    if (pred > load * 1.15) {
        narrative +=
            'Trend chart indicates a sharp increase ahead. ';
        risk = 'high';
    } else if (pred > load) {
        narrative +=
            'Trend shows gradual growth in demand. ';
        if (risk !== 'high') risk = 'medium';
    } else {
        narrative +=
            'Trend suggests stable demand. ';
    }

    if (childPct > 35) {
        narrative +=
            'High child enrolment may intensify peak-time pressure. ';
    }

    return { narrative, risk };
}

// ================= STATE VIEW =================
function updateDashboardState(stateName, districts) {

    destroyAllCharts();
    document.getElementById('analysis-container').style.display = 'flex';

    let totalLoad = 0;
    let totalPred = 0;
    let childLoad = 0;
    let lat = 0, lng = 0;

    districts.forEach(d => {
        totalLoad += d.total_bio;
        totalPred += d.predicted_load;
        childLoad += (d.ratio_5_17 || 0.3) * d.total_bio;
        lat += d.lat;
        lng += d.lng;
    });

    map.flyTo([lat / districts.length, lng / districts.length], 6);

    document.getElementById('selected-card').style.display = 'block';
    document.getElementById('selected-name').innerText =
        stateName.toUpperCase() + " (STATE)";

    const childPct = Math.round((childLoad / totalLoad) * 100);

    // Recommendation
    const recBox = document.getElementById('rec-box');
    recBox.style.background = '#eff6ff';
    recBox.style.borderLeftColor = '#2563eb';

    document.getElementById('rec-title').innerText =
        "State Level Overview";
    document.getElementById('rec-title').style.color = '#1e40af';

    document.getElementById('rec-desc').innerHTML = `
        This view aggregates data from <strong>${districts.length}</strong> districts.
        The charts compare <strong>${stateName}</strong> with its neighbouring states
        and national averages to assess regional performance.
    `;

    document.getElementById('data-story-text').innerHTML = `
        <strong>What the charts show:</strong><br><br>
        • Total state load is <strong>${totalLoad.toLocaleString()}</strong> requests.<br>
        • Child enrolments constitute <strong>${childPct}%</strong> of total demand.<br>
        • Trend chart projects a future load of <strong>${totalPred}</strong>.
    `;

    // Main chart: State vs Neighbours
    const labels = [stateName];
    const data = [totalLoad];
    const colors = ['#2563eb'];

    (neighborMap[stateName] || []).forEach(n => {
        const key = n.toLowerCase();
        if (stateDataCache[key]) {
            labels.push(n);
            data.push(
                stateDataCache[key].reduce((s, x) => s + x.total_bio, 0)
            );
            colors.push('#94a3b8');
        }
    });

    updateMainChart('state', { labels, data, colors }, stateName);

    renderCharts({
        label: stateName,
        child: childPct,
        adult: 100 - childPct,
        load: totalLoad,
        avg: nationalAvgStateLoad,
        pred: totalPred
    }, 'state');
}

// ================= DISTRICT VIEW =================
function updateDashboardDistrict(d) {

    destroyAllCharts();
    document.getElementById('stateSelect').value = '';
    document.getElementById('analysis-container').style.display = 'flex';

    map.flyTo([d.lat, d.lng], 10);

    document.getElementById('selected-card').style.display = 'block';
    document.getElementById('selected-name').innerText =
        d.district + " (DISTRICT)";

    const stateDists = stateDataCache[d.state.toLowerCase()];
    const stateAvg =
        stateDists.reduce((s, x) => s + x.total_bio, 0) /
        stateDists.length;

    const childPct = Math.round((d.ratio_5_17 || 0.3) * 100);

    const insight = generateInsight({
        load: d.total_bio,
        avg: stateAvg,
        pred: d.predicted_load,
        childPct
    });

    const recBox = document.getElementById('rec-box');
    const recTitle = document.getElementById('rec-title');
    const recDesc = document.getElementById('rec-desc');

    if (insight.risk === 'high') {
        recBox.style.background = '#fef2f2';
        recBox.style.borderLeftColor = '#dc2626';
        recTitle.style.color = '#dc2626';
        recTitle.innerText = "CRITICAL: Deploy Mobile Vans";
        recDesc.innerHTML = `
            ${insight.narrative}<br><br>
            <strong>AI Recommendation:</strong>
            Deploy mobile enrolment units and extend operating hours.
        `;
    }
    else if (insight.risk === 'medium') {
        recBox.style.background = '#fff7ed';
        recBox.style.borderLeftColor = '#f97316';
        recTitle.style.color = '#ea580c';
        recTitle.innerText = "CAUTION: Monitor Closely";
        recDesc.innerHTML = `
            ${insight.narrative}<br><br>
            <strong>AI Recommendation:</strong>
            Increase staffing during peak hours and monitor trends weekly.
        `;
    }
    else {
        recBox.style.background = '#f0fdf4';
        recBox.style.borderLeftColor = '#16a34a';
        recTitle.style.color = '#16a34a';
        recTitle.innerText = "STABLE: No Immediate Action";
        recDesc.innerHTML = `
            ${insight.narrative}<br><br>
            <strong>AI Recommendation:</strong>
            Maintain current infrastructure and routine monitoring.
        `;
    }

    document.getElementById('data-story-text').innerHTML = `
        <strong>What the charts show:</strong><br><br>
        • Bar chart compares ${d.district} with nearby districts.<br>
        • Demographics show <strong>${childPct}%</strong> child enrolments.<br>
        • Trend chart forecasts <strong>${d.predicted_load}</strong> requests,
          indicating <strong>${d.predicted_load > d.total_bio ? 'rising' : 'stable'}</strong> demand.
    `;

    // District vs nearby
    const siblings =
        stateDists.filter(x => x.district !== d.district).slice(0, 4);

    const labels = [d.district];
    const data = [d.total_bio];
    const colors = ['#2563eb'];

    siblings.forEach(s => {
        labels.push(s.district);
        data.push(s.total_bio);
        colors.push('#94a3b8');
    });

    updateMainChart('district', { labels, data, colors }, d.district);

    renderCharts({
        label: d.district,
        child: childPct,
        adult: 100 - childPct,
        load: d.total_bio,
        avg: Math.round(stateAvg),
        pred: d.predicted_load
    }, 'district');
}

// ================= CHARTS =================
function updateMainChart(level, obj, title) {
    const ctx =
        document.getElementById('mainChart').getContext('2d');

    if (mainChart) mainChart.destroy();

    let chartData;

    if (level === 'national') {
        chartData = {
            labels: obj.names.slice(0, 12),
            datasets: [{
                data: obj.loads.slice(0, 12),
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        };
    } else {
        chartData = {
            labels: obj.labels,
            datasets: [{
                data: obj.data,
                backgroundColor: obj.colors,
                borderRadius: 4
            }]
        };
    }

    mainChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderCharts(data, type) {

    const pieCtx =
        document.getElementById('pieChart').getContext('2d');
    const barCtx =
        document.getElementById('barChart').getContext('2d');
    const lineCtx =
        document.getElementById('lineChart').getContext('2d');

    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Children', 'Adults'],
            datasets: [{
                data: [data.child, data.adult],
                backgroundColor: ['#f59e0b', '#3b82f6']
            }]
        }
    });

    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: [data.label, type === 'state' ? 'Nat. Avg' : 'State Avg'],
            datasets: [{
                data: [data.load, data.avg],
                backgroundColor: ['#2563eb', '#cbd5e1']
            }]
        }
    });

    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Current', 'Forecast'],
            datasets: [{
                data: [
                    data.load * 0.9,
                    data.load * 0.95,
                    data.load,
                    data.pred
                ],
                borderColor: '#8b5cf6',
                fill: true
            }]
        }
    });
}

function destroyAllCharts() {
    if (mainChart) { mainChart.destroy(); mainChart = null; }
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    if (barChart) { barChart.destroy(); barChart = null; }
    if (lineChart) { lineChart.destroy(); lineChart = null; }
}

// ================= RESET =================
function resetMap() {
    location.reload();
}


// ================= COMPARISON TOOL LOGIC =================

// ================= UPDATED COMPARISON LOGIC =================

function handleComparison() {
    const d1Name = document.getElementById('compSelect1').value;
    const d2Name = document.getElementById('compSelect2').value;

    if (!d1Name || !d2Name) {
        alert("Please select two districts to compare.");
        return;
    }

    if (d1Name === d2Name) {
        alert("Please select different districts for comparison.");
        return;
    }

    // Data Fetch
    const d1 = markers[d1Name].data;
    const d2 = markers[d2Name].data;

    // UI Enable
    document.getElementById('comp-results').style.display = 'flex';

    // 1. Update Stats Table
    document.getElementById('comp-name-1').innerText = d1.district;
    document.getElementById('comp-name-1').style.color = "#2563eb"; // Blue
    document.getElementById('comp-name-2').innerText = d2.district;
    document.getElementById('comp-name-2').style.color = "#db2777"; // Pink

    document.getElementById('comp-load-1').innerText = d1.total_bio.toLocaleString();
    document.getElementById('comp-load-2').innerText = d2.total_bio.toLocaleString();

    let c1Pct = Math.round((d1.ratio_5_17 || 0.3) * 100);
    let c2Pct = Math.round((d2.ratio_5_17 || 0.3) * 100);
    document.getElementById('comp-child-1').innerText = c1Pct + "%";
    document.getElementById('comp-child-2').innerText = c2Pct + "%";

    let r1 = d1.alert_status === 'High Risk' ? '<span style="color:red; font-weight:bold">High</span>' : '<span style="color:green">Normal</span>';
    let r2 = d2.alert_status === 'High Risk' ? '<span style="color:red; font-weight:bold">High</span>' : '<span style="color:green">Normal</span>';
    document.getElementById('comp-risk-1').innerHTML = r1;
    document.getElementById('comp-risk-2').innerHTML = r2;

    let p1 = d1.predicted_load - d1.total_bio;
    let p2 = d2.predicted_load - d2.total_bio;
    let sym1 = p1 > 0 ? "↑" : "↓";
    let sym2 = p2 > 0 ? "↑" : "↓";
    document.getElementById('comp-pred-1').innerText = `${sym1} ${Math.abs(p1)}`;
    document.getElementById('comp-pred-2').innerText = `${sym2} ${Math.abs(p2)}`;

    // 2. RENDER CHART 1: Demographics Stacked Bar
    const ctxDemo = document.getElementById('compDemoChart').getContext('2d');
    if (compDemoChart) compDemoChart.destroy();

    compDemoChart = new Chart(ctxDemo, {
        type: 'bar',
        data: {
            labels: [d1.district, d2.district],
            datasets: [
                {
                    label: 'Children',
                    data: [d1.total_bio * (c1Pct/100), d2.total_bio * (c2Pct/100)],
                    backgroundColor: '#f59e0b',
                    stack: 'Stack 0'
                },
                {
                    label: 'Adults',
                    data: [d1.total_bio * ((100-c1Pct)/100), d2.total_bio * ((100-c2Pct)/100)],
                    backgroundColor: '#64748b',
                    stack: 'Stack 0'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 3. RENDER CHART 2: Trend Comparison (Two Lines)
    const ctxTrend = document.getElementById('compTrendChart').getContext('2d');
    if (compTrendChart) compTrendChart.destroy();

    compTrendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Current', 'Forecast'],
            datasets: [
                {
                    label: d1.district,
                    data: [d1.total_bio*0.9, d1.total_bio*0.95, d1.total_bio, d1.predicted_load],
                    borderColor: '#2563eb', // Blue for D1
                    backgroundColor: '#2563eb',
                    tension: 0.3,
                    fill: false
                },
                {
                    label: d2.district,
                    data: [d2.total_bio*0.9, d2.total_bio*0.95, d2.total_bio, d2.predicted_load],
                    borderColor: '#db2777', // Pink for D2
                    backgroundColor: '#db2777',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}