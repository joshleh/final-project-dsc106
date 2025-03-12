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
    createLineChart("#activityChart", activityData, "Activity Level", xLabel, ["blue", "red"], selectedRange);
    createBarGraph("#temperatureBarGraph", temperatureData.female, temperatureData.male, 
        "Temperature Difference (°C)", xLabel, selectedRange);
    createBarGraph("#activityBarGraph", activityData.female, activityData.male, 
        "Activity Difference", xLabel, selectedRange);
}

function createLineChart(svgId, data, yLabel, xLabel, colors, timeRange) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 70, bottom: 90, left: 80 };
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
    let timeDivisor = 1; // Default for minute-based time (Day mode)

    if (timeRange.startsWith("day")) {
        nightIntervals.push({ start: 0, end: 720 });
    } else if (timeRange.startsWith("week")) {
        timeDivisor = 1440;
        for (let i = 0; i < 7; i++) {
            nightIntervals.push({ start: i * 1440, end: i * 1440 + 720 });
        }
    } else {
        timeDivisor = 1440;
        for (let i = 0; i < 14; i++) {
            nightIntervals.push({ start: i * 1440, end: i * 1440 + 720 });
        }
    }

    nightIntervals.forEach(({ start, end }) => {
        g.append("rect")
            .attr("class", "nighttime-rect")
            .attr("x", x(start / timeDivisor))
            .attr("width", x(end / timeDivisor) - x(start / timeDivisor))
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

    // Create Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "4px");

    // Create Focus Circles for Hover
    const focusFemale = g.append("circle")
        .attr("r", 5)
        .attr("fill", colors[0])
        .style("visibility", "hidden");

    const focusMale = g.append("circle")
        .attr("r", 5)
        .attr("fill", colors[1])
        .style("visibility", "hidden");

    // Append Female Line
    if (data.female) {
        g.append("path")
            .datum(data.female)
            .attr("fill", "none")
            .attr("stroke", colors[0])
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    // Append Male Line
    if (data.male) {
        g.append("path")
            .datum(data.male)
            .attr("fill", "none")
            .attr("stroke", colors[1])
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    // Transparent overlay for mouse interaction
    g.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const timeValue = x.invert(mouseX);

            const nearestFemale = data.female
                ? data.female.reduce((a, b) => (Math.abs(b.time - timeValue) < Math.abs(a.time - timeValue) ? b : a))
                : null;

            const nearestMale = data.male
                ? data.male.reduce((a, b) => (Math.abs(b.time - timeValue) < Math.abs(a.time - timeValue) ? b : a))
                : null;

            tooltip.style("visibility", "visible");

            let tooltipText = `Time: ${timeValue.toFixed(2)}`;

            if (nearestFemale) {
                focusFemale
                    .attr("cx", x(nearestFemale.time))
                    .attr("cy", y(nearestFemale.value))
                    .style("visibility", "visible");
                tooltipText += ` | Female: ${nearestFemale.value.toFixed(2)}`;
            }

            if (nearestMale) {
                focusMale
                    .attr("cx", x(nearestMale.time))
                    .attr("cy", y(nearestMale.value))
                    .style("visibility", "visible");
                tooltipText += ` | Male: ${nearestMale.value.toFixed(2)}`;
            }

            tooltip.text(tooltipText)
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
            focusFemale.style("visibility", "hidden");
            focusMale.style("visibility", "hidden");
        });

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
    
    // ✅ Legend Below the Graph (Move it lower)
    const legend = svg.append("g").attr("transform", `translate(${width / 2 - 50}, ${height + 100})`);

    legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 20).attr("height", 10).attr("fill", "blue");
    legend.append("text").attr("x", 25).attr("y", 10).text("Female").style("font-size", "14px");

    legend.append("rect").attr("x", 150).attr("y", 0).attr("width", 20).attr("height", 10).attr("fill", "red");
    legend.append("text").attr("x", 175).attr("y", 10).text("Male").style("font-size", "14px");
}

function createBarGraph(svgId, femaleData, maleData, yLabel, xLabel, timeRange) {
    const svg = d3.select(svgId);
    svg.selectAll("*").remove(); // Clear previous graph

    const margin = { top: 40, right: 70, bottom: 90, left: 80 }, // Increased bottom margin for legend
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // ✅ Compute Differences (Always Female - Male, Even If One is Missing)
    // const differences = [];
    // const maxLength = Math.max(femaleData?.length || 0, maleData?.length || 0);
    
    // for (let i = 0; i < maxLength; i++) {
    //     const femaleValue = femaleData?.[i]?.value ?? 0;
    //     const maleValue = maleData?.[i]?.value ?? 0;
    //     differences.push({
    //         time: i,
    //         value: (femaleData?.[i]?.value ?? previousFemaleValue) - (maleData?.[i]?.value ?? previousMaleValue)
    //     });
    // }

    let previousFemaleValue = 0;
    let previousMaleValue = 0;
    for (let i = 0; i < maxLength; i++) {
        const femaleValue = femaleData?.[i]?.value ?? previousFemaleValue;
        const maleValue = maleData?.[i]?.value ?? previousMaleValue;
    
        differences.push({
            time: i,
            value: femaleValue - maleValue  // Always Female - Male
        });
    
        // ✅ Update previous values for next iteration (so missing values use the last known value)
        if (femaleData?.[i]) previousFemaleValue = femaleData[i].value;
        if (maleData?.[i]) previousMaleValue = maleData[i].value;
    }    

    // ✅ Set Up X and Y Scales
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

    // ✅ Add Nighttime Grey Bars (Now Uses the Same Logic as Line Chart)
    let nightIntervals = [];
    let timeDivisor = 1;
    let totalDays = 1;  // Default: single day mode

    if (timeRange.startsWith("day")) {
        nightIntervals.push({ start: 0, end: 720 });
    } else if (timeRange.startsWith("week")) {
        timeDivisor = 1440; 
        totalDays = 7;  // Week mode
    } else {
        timeDivisor = 1440; 
        totalDays = 14;  // All 14 days mode
    }

    // ✅ Ensure Correct Nighttime Intervals Across Days
    for (let i = 0; i < totalDays; i++) {
        nightIntervals.push({ start: i * 1440, end: i * 1440 + 720 });
    }

    // ✅ Append Nighttime Rectangles Properly
    nightIntervals.forEach(({ start, end }) => {
        g.append("rect")
            .attr("class", "nighttime-rect")
            .attr("x", x(start))  // ✅ Remove division by timeDivisor, since x is already scaled
            .attr("width", x(end) - x(start))  // ✅ Ensure width covers the correct period
            .attr("y", 0)
            .attr("height", height)
            .attr("fill", "grey")
            .attr("opacity", 0.2);
    });

    // ✅ Tooltip for Hover
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "4px");

    // ✅ Append Bars (Fix Coloring Issue)
    g.selectAll(".bar")
        .data(differences)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.time))
        .attr("width", width / differences.length) // Adjust width to match dataset density
        .attr("y", d => (d.value >= 0 ? y(d.value) : y(0)))
        .attr("height", d => Math.abs(y(d.value) - y(0)))
        .attr("fill", d => (d.value >= 0 ? "blue" : "red")) // ✅ Fix: Always Female - Male colors
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .text(`Time: ${d.time}, Difference: ${d.value.toFixed(2)}`);
            d3.select(this).style("opacity", 0.7);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
            d3.select(this).style("opacity", 1);
        });

    // ✅ X-Axis Label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(xLabel);

    // ✅ Y-Axis Label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yLabel);

    // ✅ Legend Below the Graph (Move it lower)
    const legend = svg.append("g").attr("transform", `translate(${width / 2 - 50}, ${height + 100})`);

    legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 20).attr("height", 10).attr("fill", "blue");
    legend.append("text").attr("x", 25).attr("y", 10).text("Female > Male").style("font-size", "14px");

    legend.append("rect").attr("x", 150).attr("y", 0).attr("width", 20).attr("height", 10).attr("fill", "red");
    legend.append("text").attr("x", 175).attr("y", 10).text("Male > Female").style("font-size", "14px");
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
