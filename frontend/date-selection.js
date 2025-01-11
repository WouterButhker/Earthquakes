import * as d3 from 'd3';

export const date_selection = {
    render(plots, data) {
        let earthquakeDataFeatures = data;

        const margin = { top: 50, right: 30, bottom: 50, left: 60 },
            width = 450 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#dateSelection");

        // clear the axis
        svg.selectAll("*").remove();

        // TODO maybe keep the axis and only update the data
        svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        // Extract month/year from timestamp and count occurrences
        const counts = d3.rollup(
            earthquakeDataFeatures,
            v => v.length,
            d => {
                return parseInt(d.properties.Year);
            },
            d => {
                return parseInt(d.properties.Mo - 1); // 0-based month: 0 = January
            }
        );

        // Convert the rollup to a flat array for easier scales
        // This array will look like: [{year: ..., month: ..., count: ...}, ...]
        let yearMonthData = [];
        for (let [year, monthMap] of counts.entries()) {
            for (let [month, count] of monthMap.entries()) {
                yearMonthData.push({ year, month, count });
            }
        }

        // Determine the range of years and define months
        const years = Array.from(d3.group(yearMonthData, d => d.year).keys()).sort((a, b) => a - b);
        const months = d3.range(0, 12); // 0=Jan, 11=Dec

        // Create scales
        const xScale = d3.scaleBand()
            .domain(months)
            .range([0, width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(years)
            .range([0, height])
            .padding(0.05);

        // Color scale based on counts
        const countExtent = d3.extent(yearMonthData, d => d.count);
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, countExtent[1]]);

        // Draw the cells
        g.selectAll(".cell")
            .data(yearMonthData)
            .join("rect")
            .attr("class", "cell")
            .attr("x", d => xScale(d.month))
            .attr("y", d => yScale(d.year))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.count));

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => {
                // Format month numbers to names
                const formatMonth = d3.timeFormat("%b");
                return formatMonth(new Date(2020, d, 1));
            });

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d);

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);

        g.append("g")
            .call(yAxis);

        // Axis labels
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .text("Month");

        g.append("text")
            .attr("class", "axis-label")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .text("Year");

        // Optional: Add a legend for the color scale
        const legendWidth = 200, legendHeight = 20;

        const legendGroup = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top - 30})`);

        const legendScale = d3.scaleLinear()
            .domain([0, countExtent[1]])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickSize(-legendHeight);

        // Add a gradient for the legend
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        const legendInterpolator = d3.interpolateBlues;
        const numStops = 10;
        d3.range(numStops).forEach(i => {
            gradient.append("stop")
                .attr("offset", (i / (numStops - 1)) * 100 + "%")
                .attr("stop-color", legendInterpolator(i / (numStops - 1)));
        });

        legendGroup.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        legendGroup.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0,${legendHeight})`)
            .call(legendAxis)
            .select(".domain").remove();

        legendGroup.append("text")
            .attr("class", "legend")
            .attr("y", -5)
            .attr("x", legendWidth / 2)
            .attr("text-anchor", "middle")
            .text("Count");
    },
    update(plots, data) {
        this.render(plots, data);
    }
}