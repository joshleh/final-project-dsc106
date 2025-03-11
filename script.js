document.addEventListener("DOMContentLoaded", function () {
    console.log("Loading datasets...");

    Promise.all([
        d3.csv("data/female_temp.csv"),
        d3.csv("data/male_temp.csv"),
        d3.csv("data/female_act.csv"),
        d3.csv("data/male_act.csv")
    ]).then(([femaleTemp, maleTemp, femaleAct, maleAct]) => {
        console.log("Datasets loaded successfully.");

        let processedData = {
            femaleTemp: femaleTemp.map((d, i) => ({ time: i, value: parseFloat(d.temperature) || 0 })),
            maleTemp: maleTemp.map((d, i) => ({ time: i, value: parseFloat(d.temperature) || 0 })),
            femaleAct: femaleAct.map((d, i) => ({ time: i, value: parseFloat(d.activity) || 0 })),
            maleAct: maleAct.map((d, i) => ({ time: i, value: parseFloat(d.activity) || 0 }))
        };

        console.log("Processed Data Sample:", processedData);
        updateCharts(processedData);

        document.getElementById("timeRange").addEventListener("change", function () {
            updateCharts(processedData);
        });

        document.getElementById("toggleEstrus").addEventListener("click", function () {
            toggleEstrusCycle(processedData);
        });
    }).catch(error => console.error("Error loading data:", error));
});

function updateCharts(data) {
    let timeRange = document.getElementById("timeRange").value;
    let timeLimit = determineTimeLimit(timeRange);

    let tempDataFemale = data.femaleTemp.slice(0, timeLimit);
    let tempDataMale = data.maleTemp.slice(0, timeLimit);
    let actDataFemale = data.femaleAct.slice(0, timeLimit);
    let actDataMale = data.maleAct.slice(0, timeLimit);

    createLineChart("#temperatureChart", tempDataFemale, tempDataMale, "Temperature (°C)", "Time");
    createLineChart("#activityChart", actDataFemale, actDataMale, "Activity Level", "Time");
}

function determineTimeLimit(range) {
    switch (range) {
        case "all": return 20160;
        case "week1": return 10080;
        case "week2": return 20160;
        case "day1": return 1440;
        case "day2": return 2880;
        case "day3": return 4320;
        case "day4": return 5760;
        case "day5": return 7200;
        case "day6": return 8640;
        case "day7": return 10080;
        case "day8": return 11520;
        case "day9": return 12960;
        case "day10": return 14400;
        case "day11": return 15840;
        case "day12": return 17280;
        case "day13": return 18720;
        case "day14": return 20160;
        default: return 20160;
    }
}

function createLineChart(svgSelector, femaleData, maleData, yAxisLabel, xAxisLabel) {
    let svg = d3.select(svgSelector).attr("width", 850).attr("height", 300);
    svg.selectAll("*").remove();

    let margin = { top: 20, right: 30, bottom: 50, left: 50 },
        width = 800 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    let x = d3.scaleLinear().domain([0, femaleData.length]).range([0, width]);
    let y = d3.scaleLinear()
        .domain([
            Math.min(d3.min(femaleData, d => d.value), d3.min(maleData, d => d.value)),
            Math.max(d3.max(femaleData, d => d.value), d3.max(maleData, d => d.value))
        ])
        .range([height, 0]);

    let lineFemale = d3.line().x(d => x(d.time)).y(d => y(d.value));
    let lineMale = d3.line().x(d => x(d.time)).y(d => y(d.value));

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("path").datum(femaleData).attr("fill", "none").attr("stroke", "blue").attr("stroke-width", 2).attr("d", lineFemale);
    g.append("path").datum(maleData).attr("fill", "none").attr("stroke", "red").attr("stroke-width", 2).attr("d", lineMale);

    g.append("text").attr("x", width / 2).attr("y", height + 40).attr("class", "axis-label").text(xAxisLabel);
    g.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -40).attr("class", "axis-label").text(yAxisLabel);
}

function toggleEstrusCycle(data) {
    console.log("Toggling Estrus Cycle...");
    let filteredData = {
        femaleTemp: data.femaleTemp.filter((_, i) => i % 5760 >= 2880), // Only show estrus days
        maleTemp: data.maleTemp.filter((_, i) => i % 5760 >= 2880),
        femaleAct: data.femaleAct.filter((_, i) => i % 5760 >= 2880),
        maleAct: data.maleAct.filter((_, i) => i % 5760 >= 2880),
    };
    updateCharts(filteredData);
}
