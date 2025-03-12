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

    createLineChart("#temperatureChart", temperatureData, "Temperature (°C)", xLabel, ["blue", "red"]);
    createLineChart("#activityChart", activityData, "Activity Level", xLabel, ["green", "orange"]);
    createHeatmap("#temperatureHeatmap", temperatureData);
    createHeatmap("#activityHeatmap", activityData);
}

function createLineChart(svgId, data, yLabel, xLabel, colors) {
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

function createHeatmap(svgId, data) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const width = +svg.attr("width"),
          height = +svg.attr("height");

    const dataPoints = [...(data.female || []), ...(data.male || [])];

    if (dataPoints.length === 0) return;

    const xScale = d3.scaleLinear().domain([0, d3.max(dataPoints, d => d.time)]).range([0, width]);
    const yScale = d3.scaleLinear().domain([d3.min(dataPoints, d => d.value), d3.max(dataPoints, d => d.value)]).range([height, 0]);

    // Nighttime background
    for (let i = 0; i < 14 * 24; i += 24) {
        svg.append("rect")
            .attr("x", xScale(i / 24))
            .attr("width", xScale((i + 12) / 24) - xScale(i / 24))
            .attr("y", 0)
            .attr("height", height)
            .attr("fill", "grey")
            .attr("opacity", 0.2);
    }

    // Data points
    svg.selectAll("circle")
        .data(dataPoints)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale(d.value))
        .attr("r", 2)
        .attr("fill", d => d.change > 0 ? "red" : "blue");
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
