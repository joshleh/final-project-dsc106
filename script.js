document.addEventListener("DOMContentLoaded", function () {
    console.log("Loading datasets...");

    Promise.all([
        d3.csv("data/female_temp.csv"),
        d3.csv("data/male_temp.csv"),
        d3.csv("data/female_act.csv"),
        d3.csv("data/male_act.csv")
    ]).then(function (files) {
        console.log("Datasets loaded successfully.");
        processAndRenderData(files);
    }).catch(function (error) {
        console.error("Error loading datasets:", error);
    });

    function processAndRenderData(files) {
        let femaleTemp = files[0].map(d => ({ time: +d.time, value: +d.temperature }));
        let maleTemp = files[1].map(d => ({ time: +d.time, value: +d.temperature }));
        let femaleAct = files[2].map(d => ({ time: +d.time, value: +d.activity }));
        let maleAct = files[3].map(d => ({ time: +d.time, value: +d.activity }));

        console.log("Processed Data Sample:", { femaleTemp, maleTemp, femaleAct, maleAct });
        
        createHeatmap("temperatureChart", femaleTemp, maleTemp, "Temperature (°C)");
        createHeatmap("activityChart", femaleAct, maleAct, "Activity Level");
    }

    function createHeatmap(chartId, femaleData, maleData, label) {
        const svg = d3.select(`#${chartId}`);
        svg.selectAll("*").remove();

        const width = +svg.attr("width"), height = +svg.attr("height");
        const cellSize = 10;
        const cols = Math.floor(width / cellSize), rows = Math.floor(height / cellSize);
        
        const xScale = d3.scaleLinear().domain([0, 14]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
        const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

        svg.selectAll("rect.female")
            .data(femaleData)
            .enter()
            .append("rect")
            .attr("class", "female")
            .attr("x", d => xScale(d.time % 14))
            .attr("y", height / 2 - cellSize / 2)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .style("fill", d => colorScale(d.value));

        svg.selectAll("rect.male")
            .data(maleData)
            .enter()
            .append("rect")
            .attr("class", "male")
            .attr("x", d => xScale(d.time % 14))
            .attr("y", height / 2 + cellSize / 2)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .style("fill", d => colorScale(d.value));
    }

    document.getElementById("toggleEstrus").addEventListener("click", function() {
        console.log("Estrus toggle clicked");
        // Implement estrus filtering logic here
    });
});
