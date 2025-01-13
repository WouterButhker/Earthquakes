import * as d3 from 'd3';

export const date_selection = {
    render(plots, data) {
        let earthquakeDataFeatures = data;
        console.log(earthquakeDataFeatures);

        const margin = { top: 50, right: 30, bottom: 50, left: 60 },
            width = 450 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#dateSelection');

        // clear the axis
        svg.selectAll('*').remove();

        svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Extract month/year from timestamp and count occurrences
        const counts = d3.rollup(
            earthquakeDataFeatures,
            (v) => v.length,
            (d) => {
                return parseInt(d.properties.Year);
            },
            (d) => {
                return parseInt(d.properties.Mo - 1); // 0-based month: 0 = January
            },
        );

        // Convert the rollup to a flat array for easier scales
        // This array will look like: [{year: ..., month: ..., count: ...}, ...]
        let yearMonthData = [];
        for (let [year, monthMap] of counts.entries()) {
            for (let [month, count] of monthMap.entries()) {
                yearMonthData.push({ year, month, count });
            }
        }

        const all_years = yearMonthData.map(d => d.year);
        const minYear = d3.min(all_years);
        const maxYear = d3.max(all_years);

        // Define the range size, e.g., every 5 years
        const rangeSize = 300;

        // Create year ranges
        let yearRanges = [];
        for (let start = minYear; start <= maxYear; start += rangeSize) {
            yearRanges.push({
                start: start,
                end: Math.min(start + rangeSize - 1, maxYear)
            });
        }

        function aggregateDataByYearRange(startYear, endYear) {
            const filteredData = yearMonthData.filter(d => d.year >= startYear && d.year <= endYear);
            return d3.rollups(filteredData, 
                v => d3.sum(v, leaf => leaf.count), // Summing function
                d => d.month // Grouping function
            ).map(([month, count]) => ({ month, count}));
        }
        
        // Iterate over each year range and store results
        const count_data = yearRanges.map(range => ({
            range: `${range.start}-${range.end}`,
            data: aggregateDataByYearRange(range.start, range.end)
        }));
        

        // Determine the range of years and define months
        // const ranges = Array.from(d3.group(count_data, d => d.range).keys()).sort((a,b) => a - b);
        // const months = d3.range(0, 12); // 0=Jan, 11=Dec

        function selectData(startYear, endYear){
            const selectedData = earthquakeDataFeatures.filter(feature => {
            const year = parseInt(feature.properties.Year);
            return year >= startYear && year <= endYear;
            });
            return selectedData;
        }

        // Create scales
        const xScale = d3.scaleBand()
            .domain(d3.range(0, 12)) // Months are 0-indexed (0 = January, 11 = December)
            .range([0, width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(count_data.map(d => d.range))
            .range([0, height])
            .padding(0.05);

        // Color scale based on counts
        const countExtent = d3.extent(count_data.flatMap(range => range.data.map(d => d.count)));
        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, countExtent[1]]);

        // Append the rows for each year range
        const rows = g.selectAll(".row")
            .data(count_data)
            .enter().append("g")
            .attr("class", "row")
            .attr("transform", d => `translate(0,${yScale(d.range)})`);

        // Append cells to each row
        rows.selectAll(".cell")
            .data(d => d.data)
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", d => xScale(d.month))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .style("fill", d => colorScale(d.count));


        // Create axes
        const xAxis = d3.axisBottom(xScale).tickFormat((d) => {
            // Format month numbers to names
            const formatMonth = d3.timeFormat('%b');
            return formatMonth(new Date(2020, d, 1));
        });

        const yAxis = d3.axisLeft(yScale).tickFormat((d) => d);

        g.append('g').attr('transform', `translate(0,${height})`).call(xAxis);

        g.append('g')
            .call(yAxis)
            .selectAll('.tick') // Selecting all the y-axis ticks which are bound to your year range data
            .on('click', (event, d) => {
                const yearRange = d.match(/(?<!\d)-?\d+/g).map(Number);
                const startYear = yearRange[0];
                const endYear = yearRange[1];
                console.log(startYear, endYear);
                let selectedData = selectData(startYear, endYear);   

                plots['date_selection'].update(plots, selectedData);
            });

        // Axis labels
        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .attr('text-anchor', 'middle')
            .text('Month');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('y', -40)
            .attr('x', -height / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Year Range');

        // Optional: Add a legend for the color scale
        const legendWidth = 200,
            legendHeight = 20;

        const legendGroup = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 30})`);

        const legendScale = d3.scaleLinear().domain([0, countExtent[1]]).range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale).ticks(5).tickSize(-legendHeight);

        // Add a gradient for the legend
        const defs = svg.append('defs');
        const gradient = defs
            .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        const legendInterpolator = d3.interpolateBlues;
        const numStops = 10;
        d3.range(numStops).forEach((i) => {
            gradient
                .append('stop')
                .attr('offset', (i / (numStops - 1)) * 100 + '%')
                .attr('stop-color', legendInterpolator(i / (numStops - 1)));
        });

        legendGroup
            .append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        legendGroup
            .append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(0,${legendHeight})`)
            .call(legendAxis)
            .select('.domain')
            .remove();

        legendGroup
            .append('text')
            .attr('class', 'legend')
            .attr('y', -5)
            .attr('x', legendWidth / 2)
            .attr('text-anchor', 'middle')
            .text('Count');
    },
    update(plots, data) {
        this.render(plots, data);
    },
};
