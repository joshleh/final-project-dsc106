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
            value: row[0]
        })).filter(d => !isNaN(d.value));
    }

    const temperatureData = {
        female: filterValidData(femaleTempData),
        male: filterValidData(maleTempData)
    };

    const activityData = {
        female: filterValidData(femaleActData),
        male: filterValidData(maleActData)
    };

    console.log("Processed Data Sample:", temperatureData, activityData);

    createLineChart("#temperatureChart", temperatureData, "Temperature (°C)", xLabel, ["blue", "red"]);
    createLineChart("#activityChart", activityData, "Activity Level", xLabel, ["green", "orange"]);
    createHeatmap("#temperatureHeatmap", temperatureData);
    createHeatmap("#activityHeatmap", activityData);
}

function createLineChart(svgId, data, yLabel, xLabel, colors) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const margin = {top: 40, right: 70, bottom: 50, left: 80},
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max([...data.female, ...data.male], d => d.time)]).range([0, width]);
    const y = d3.scaleLinear().domain([
        d3.min([...data.female, ...data.male], d => d.value),
        d3.max([...data.female, ...data.male], d => d.value)
    ]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    const line = d3.line().x(d => x(d.time)).y(d => y(d.value));

    g.append("path").datum(data.female).attr("fill", "none").attr("stroke", colors[0]).attr("stroke-width", 2).attr("d", line);
    g.append("path").datum(data.male).attr("fill", "none").attr("stroke", colors[1]).attr("stroke-width", 2).attr("d", line);
}

function createHeatmap(svgId, data) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const width = +svg.attr("width"),
          height = +svg.attr("height");

    const xScale = d3.scaleLinear().domain([0, d3.max([...data.female, ...data.male], d => d.time)]).range([0, width]);
    const yScale = d3.scaleLinear().domain([d3.min([...data.female, ...data.male], d => d.value), d3.max([...data.female, ...data.male], d => d.value)]).range([height, 0]);

    svg.selectAll("rect").data([...data.female, ...data.male]).enter()
        .append("rect")
        .attr("x", d => xScale(d.time))
        .attr("y", d => yScale(d.value))
        .attr("width", 3)
        .attr("height", 3)
        .attr("fill", d => d3.interpolateWarm(d.value / d3.max([...data.female, ...data.male], d => d.value)));
}

document.addEventListener("DOMContentLoaded", loadAndProcessData);
