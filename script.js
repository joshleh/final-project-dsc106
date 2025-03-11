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

function createHeatmap(svgId, data) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const width = +svg.attr("width"),
          height = +svg.attr("height");

    const dataPoints = [...(data.female || []), ...(data.male || [])];

    if (dataPoints.length === 0) return;

    const sampleSize = Math.max(500, Math.floor(dataPoints.length / 10)); // Downsampling to improve performance
    const sampledData = dataPoints.filter((_, i) => i % sampleSize === 0);

    const xScale = d3.scaleLinear().domain([0, d3.max(sampledData, d => d.time)]).range([0, width]);
    const yScale = d3.scaleLinear().domain([d3.min(sampledData, d => d.value), d3.max(sampledData, d => d.value)]).range([height, 0]);

    svg.selectAll("rect")
        .data(sampledData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.time))
        .attr("y", d => yScale(d.value))
        .attr("width", 3)
        .attr("height", 3)
        .attr("fill", d => d.change > 0 ? "red" : "blue"); // Red for increasing, blue for decreasing

    // Nighttime background
    const nightBlocks = [];
    for (let i = 0; i < 24; i += 2) { // Assuming nighttime every 12 hours
        nightBlocks.push({ start: i, end: i + 1 });
    }

    svg.selectAll(".night-block")
        .data(nightBlocks)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.start))
        .attr("width", xScale(d.end) - xScale(d.start))
        .attr("y", 0)
        .attr("height", height)
        .attr("fill", "grey")
        .attr("opacity", 0.2);
}

document.addEventListener("DOMContentLoaded", loadAndProcessData);
