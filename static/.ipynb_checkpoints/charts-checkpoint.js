let ageChart = null;
let compareChart = null;

function searchDistrict() {
    const district = document.getElementById("districtInput").value;
    const errorMsg = document.getElementById("errorMsg");
    const resultSection = document.getElementById("resultSection");
    const loader = document.getElementById("loadingSpinner");

    // Reset UI
    errorMsg.innerText = "";
    resultSection.classList.add("hidden");
    
    if (!district) {
        errorMsg.innerText = "Please enter a valid district name.";
        return;
    }

    // Show Loader
    loader.classList.remove("hidden");

    fetch(`/search?district=${district}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                errorMsg.innerText = data.error;
                return;
            }

            // Populate Text Data
            document.getElementById("districtTitle").innerText = `${data.district}, ${data.state}`;
            
            // Counters with formatting
            document.getElementById("totalBio").innerText = data.total_bio.toLocaleString();
            document.getElementById("adultPercent").innerText = data.ratio_17_plus + "%";
            document.getElementById("childPercent").innerText = data.ratio_5_17 + "%";
            
            // Comparison Text
            const diff = data.total_bio - data.state_avg_bio;
            const diffText = diff > 0 ? `+${diff.toLocaleString()} above avg` : `${diff.toLocaleString()} below avg`;
            document.getElementById("stateCompText").innerText = diffText;

            // Insights
            document.getElementById("insight").innerText = data.key_insight;
            document.getElementById("recommendation").innerText = data.recommendation;

            // Badge Logic
            const badge = document.getElementById("clusterBadge");
            badge.className = "badge"; // reset
            badge.innerText = data.cluster;
            
            if (data.cluster === "High Load") badge.classList.add("high");
            else if (data.cluster === "Medium Load") badge.classList.add("medium");
            else badge.classList.add("low");

            // Show Results
            resultSection.classList.remove("hidden");

            // Render Charts
            renderAgeChart(data.ratio_5_17, data.ratio_17_plus);
            renderCompareChart(data.total_bio, data.state_avg_bio);
        })
        .catch(err => {
            errorMsg.innerText = "Server error. Please try again later.";
            console.error(err);
        })
        .finally(() => {
            loader.classList.add("hidden");
        });
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        searchDistrict();
    }
}

/* ================= CHART LOGIC ================= */

function renderAgeChart(child, adult) {
    const ctx = document.getElementById("ageChart").getContext("2d");
    if (ageChart) ageChart.destroy();

    ageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Children (5-17)', 'Adults (17+)'],
            datasets: [{
                data: [child, adult],
                backgroundColor: ['#f97316', '#10b981'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            }
        }
    });
}

function renderCompareChart(districtVal, stateVal) {
    const ctx = document.getElementById("compareChart").getContext("2d");
    if (compareChart) compareChart.destroy();

    compareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['This District', 'State Average'],
            datasets: [{
                label: 'Biometric Load',
                data: [districtVal, stateVal],
                backgroundColor: ['#2563eb', '#9ca3af'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}