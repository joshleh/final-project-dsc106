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
        
        createLineChart("#temp-chart", femaleTemp, maleTemp, "Temperature (°C)");
        createLineChart("#activity-chart", femaleAct, maleAct, "Activity Level");
    }

    function createLineChart(container, femaleData, maleData, yAxisLabel) {
        const width = 800, height = 400;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const margin = { top: 20, right: 50, bottom: 50, left: 70 },
            graphWidth = width - margin.left - margin.right,
            graphHeight = height - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(femaleData, d => d.time))
            .range([0, graphWidth]);

        const yScale = d3.scaleLinear()
            .domain([
                d3.min([...femaleData, ...maleData], d => d.value),
                d3.max([...femaleData, ...maleData], d => d.value)
            ])
            .range([graphHeight, 0]);

        const xAxis = d3.axisBottom(xScale).ticks(10);
        const yAxis = d3.axisLeft(yScale).ticks(6);

        g.append("g")
            .attr("transform", `translate(0, ${graphHeight})`)
            .call(xAxis);

        g.append("g")
            .call(yAxis);

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -graphHeight / 2)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(yAxisLabel);

        const line = d3.line()
            .x(d => xScale(d.time))
            .y(d => yScale(d.value));

        g.append("path")
            .datum(femaleData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", line);

        g.append("path")
            .datum(maleData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);

        g.append("text")
            .attr("x", graphWidth / 2)
            .attr("y", graphHeight + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text("Time (Days)");
    }
});
