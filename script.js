async function loadCSV(file) {
    try {
        const response = await fetch(`data/${file}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${file}: ${response.statusText}`);
        }
        const text = await response.text();
        return text.trim().split('\n').map(row => row.split(',').map(parseFloat));
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function loadAndProcessData() {
    console.log("Loading datasets...");
    const femaleTempData = await loadCSV('female_temp.csv');
    const maleTempData = await loadCSV('male_temp.csv');
    const femaleActData = await loadCSV('female_act.csv');
    const maleActData = await loadCSV('male_act.csv');

    if (!femaleTempData.length || !maleTempData.length || !femaleActData.length || !maleActData.length) {
        console.error("One or more datasets failed to load.");
        return;
    }

    console.log("Datasets loaded successfully.");

    const selectedRange = document.getElementById("timeRange").value;
    const selectedGender = document.getElementById("genderFilter").value;

    let start = 0, end = femaleTempData.length;
    let xLabel = "Time (Days)";
    let timeDivisor = 1440;

    if (selectedRange.startsWith("week")) {
        start = selectedRange === "week1" ? 0 : 7 * 1440;
        end = start + 7 * 1440;
    } else if (selectedRange.startsWith("day")) {
        start = (parseInt(selectedRange.replace("day", "")) - 1) * 1440;
        end = start + 1440;
        xLabel = "Time (Minutes)";
        timeDivisor = 1;
    }

    function filterValidData(dataArray) {
        return dataArray.slice(start, end).map((row, i) => ({
            time: i / timeDivisor,
            value: row[0],
            change: i > 0 ? row[0] - dataArray[i - 1][0] : 0
        })).filter(d => !isNaN(d.value));
    }

    let temperatureData = {};
    let activityData = {};

    if (selectedGender === "both" || selectedGender === "female") {
        temperatureData.female = filterValidData(femaleTempData);
        activityData.female = filterValidData(femaleActData);
    }
    if (selectedGender === "both" || selectedGender === "male") {
        temperatureData.male = filterValidData(maleTempData);
        activityData.male = filterValidData(maleActData);
    }

    createLineChart("#temperatureChart", temperatureData, "Temperature (°C)", xLabel, ["blue", "red"], selectedRange);
    createLineChart("#activityChart", activityData, "Activity Level", xLabel, ["green", "orange"], selectedRange);
    createBarGraph("#temperatureBarGraph", temperatureData.female, temperatureData.male, 
        "Temperature Difference (°C)", xLabel, selectedRange);
    createBarGraph("#activityBarGraph", activityData.female, activityData.male, 
        "Activity Difference", xLabel, selectedRange);
}

function createLineChart(svgId, data, yLabel, xLabel, colors, timeRange) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 70, bottom: 70, left: 80 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max([...data.female || [], ...data.male || []], d => d.time)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min([...data.female || [], ...data.male || []], d => d.value),
            d3.max([...data.female || [], ...data.male || []], d => d.value)
        ])
        .range([height, 0]);

    // Remove existing nighttime backgrounds
    g.selectAll(".nighttime-rect").remove();

    let nightIntervals = [];

    if (timeRange.startsWith("Day")) {
        // Day mode: Lights off from 0 to 720 minutes (first half of the day)
        nightIntervals.push({ start: 0, end: 720 });
    } else if (timeRange.startsWith("Week")) {
        // Week mode: Every 12-hour cycle repeats over 7 days
        for (let i = 0; i < 7; i++) {
            nightIntervals.push({ start: i, end: i + 0.5 }); // First half of each day is night
        }
    } else {
        // All 14 Days mode
        for (let i = 0; i < 14; i++) {
            nightIntervals.push({ start: i, end: i + 0.5 });
        }
    }

    // Append night background rectangles
    nightIntervals.forEach(({ start, end }) => {
        g.append("rect")
            .attr("class", "nighttime-rect")
            .attr("x", x(start))
            .attr("width", x(end) - x(start))
            .attr("y", 0)
            .attr("height", height)
            .attr("fill", "grey")
            .attr("opacity", 0.2);
    });

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value));

    if (data.female) {
        g.append("path")
            .datum(data.female)
            .attr("fill", "none")
            .attr("stroke", colors[0])
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    if (data.male) {
        g.append("path")
            .datum(data.male)
            .attr("fill", "none")
            .attr("stroke", colors[1])
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    // X-Axis Label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(xLabel);

    // Y-Axis Label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yLabel);
}


function createBarGraph(svgId, femaleData, maleData, yLabel, xLabel, timeRange) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove(); // Clear previous graph

    const margin = { top: 40, right: 70, bottom: 70, left: 80 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Compute Differences (Female - Male)
    const differences = femaleData.map((d, i) => ({
        time: d.time,
        value: d.value - (maleData[i]?.value || 0) // Ensure male data exists
    }));

    const x = d3.scaleLinear()
        .domain([0, d3.max(differences, d => d.time)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(differences, d => d.value),
            d3.max(differences, d => d.value)
        ])
        .range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    // Append Bars
    g.selectAll(".bar")
        .data(differences)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.time))
        .attr("width", width / differences.length) // Adjust width to match dataset density
        .attr("y", d => (d.value >= 0 ? y(d.value) : y(0)))
        .attr("height", d => Math.abs(y(d.value) - y(0)))
        .attr("fill", d => (d.value >= 0 ? "red" : "blue")); // Red for Female > Male, Blue for Male > Female

    // X-Axis Label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(xLabel);

    // Y-Axis Label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yLabel);
}

// Sidebar Toggle for Background Info
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.style.width === "300px") {
        sidebar.style.width = "0";
    } else {
        sidebar.style.width = "300px";
    }
}

document.addEventListener("DOMContentLoaded", loadAndProcessData);
