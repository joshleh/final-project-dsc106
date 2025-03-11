document.addEventListener("DOMContentLoaded", async function() {
    console.log("Loading datasets...");

    try {
        const [femaleTemp, maleTemp, femaleAct, maleAct] = await Promise.all([
            d3.csv("data/female_temp.csv"),
            d3.csv("data/male_temp.csv"),
            d3.csv("data/female_act.csv"),
            d3.csv("data/male_act.csv"),
        ]);

        console.log("Datasets loaded successfully.");
        console.log("Processed Data Sample:", { femaleTemp, maleTemp, femaleAct, maleAct });

        drawChart(femaleTemp, maleTemp, "tempChart", "Temperature (°C)");
        drawChart(femaleAct, maleAct, "activityChart", "Activity Level");

    } catch (error) {
        console.error("Error loading datasets:", error);
    }
});

function drawChart(femaleData, maleData, chartId, yLabel) {
    const svg = d3.select(`#${chartId}`);
    svg.selectAll("*").remove(); // Clear previous chart

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 50, bottom: 50, left: 50 };

    const xScale = d3.scaleLinear().domain([0, 14]).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain([d3.min([...femaleData, ...maleData], d => +d.value), d3.max([...femaleData, ...maleData], d => +d.value)])
        .range([height - margin.bottom, margin.top]);

    const lineFemale = d3.line()
        .x((d, i) => xScale(i / 1440))
        .y(d => yScale(+d.value));

    const lineMale = d3.line()
        .x((d, i) => xScale(i / 1440))
        .y(d => yScale(+d.value));

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

    svg.append("path")
        .datum(femaleData)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", lineFemale);

    svg.append("path")
        .datum(maleData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", lineMale);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 15)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yLabel);
}
