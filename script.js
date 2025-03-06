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

    if (selectedRange.startsWith("week")) {
        start = selectedRange === "week1" ? 0 : 7 * 1440;
        end = start + 7 * 1440;
    } else if (selectedRange.startsWith("day")) {
        start = (parseInt(selectedRange.replace("day", "")) - 1) * 1440;
        end = start + 1440;
        xLabel = "Time (Minutes)";
    }

    function filterValidData(dataArray, index) {
        return dataArray.slice(start, end).map((row, i) => ({
            time: i / (selectedRange.startsWith("day") ? 1 : 1440),
            value: row[index]
        })).filter(d => !isNaN(d.value));
    }

    const temperatureData = {
        female: filterValidData(femaleTempData, 0),
        male: filterValidData(maleTempData, 0)
    };

    const activityData = {
        female: filterValidData(femaleActData, 0),
        male: filterValidData(maleActData, 0)
    };

    console.log("Processed Data Sample:", temperatureData, activityData);

    createLineChart("#temperatureChart", temperatureData, "Temperature (°C)", xLabel, ["blue", "red"]);
    createLineChart("#activityChart", activityData, "Activity Level", xLabel, ["green", "orange"]);
}

function createLineChart(svgId, data, yLabel, xLabel, colors) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const margin = {top: 20, right: 50, bottom: 50, left: 70},
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 14]).range([0, width]);
    const y = d3.scaleLinear().domain([
        d3.min([...data.female, ...data.male], d => d.value),
        d3.max([...data.female, ...data.male], d => d.value)
    ]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).append("text")
        .attr("fill", "black").attr("x", width / 2).attr("y", 40).text(xLabel);
    g.append("g").call(d3.axisLeft(y)).append("text")
        .attr("fill", "black").attr("x", -40).attr("y", -10).text(yLabel);
}

document.addEventListener("DOMContentLoaded", loadAndProcessData);
