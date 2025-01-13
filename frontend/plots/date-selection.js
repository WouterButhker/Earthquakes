import * as d3 from 'd3';

export const date_selection = {
    render(plots, data) {
        let earthquakeDataFeatures = data;

        const margin = { top: 50, right: 30, bottom: 50, left: 60 },
            width = 450 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#dateSelection');

        // clear the axis
        svg.selectAll('*').remove();

        // TODO maybe keep the axis and only update the data
        svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const counts = d3.rollup(
            earthquakeDataFeatures,
            (v) => v.length, // Counting occurrences
            (d) => parseInt(d.properties.Year),
            (d) => {
                // Default to January (0) if the month is undefined or invalid
                const month = parseInt(d.properties.Mo);
                return isNaN(month) ? 0 : month - 1; // 0-based month, adjust if necessary
            }
        );

        // Find the range of years in the dataset
        const minYear = d3.min(earthquakeDataFeatures, d => parseInt(d.properties.Year));
        const maxYear = d3.max(earthquakeDataFeatures, d => parseInt(d.properties.Year));


        // Determine the range of years in the dataset
        const yearExtent = d3.extent(earthquakeDataFeatures, (d) => parseInt(d.properties.Year));

        // Generate full year and month data
        let yearMonthData = [];
        for (let year = yearExtent[0]; year <= yearExtent[1]; year++) {
            let monthMap = counts.get(year);
            if (!monthMap) {
                monthMap = new Map(Array.from({ length: 12 }, (_, i) => [i, 0])); // Create empty month map for missing years
            } else {
                // Ensure all months are present in the monthMap
                for (let i = 1; i < 12; i++) {
                    if (!monthMap.has(i)) {
                        monthMap.set(i, 0); // Set count to 0 for missing months
                    }
                }
            }

            for (let [month, count] of monthMap.entries()) {
                yearMonthData.push({ year, month, count });
            }
        }

        console.log(yearMonthData);

        const all_years = yearMonthData.map(d => d.year);
        
        let uniqueYears = new Set(all_years);
        let numUniqueYears = uniqueYears.size;

        let rangeSize = 0;
        let yrRange = Math.abs(minYear - maxYear);


        console.log(`unique years: ${numUniqueYears}`);
        console.log(`min and max years: ${minYear} - ${maxYear}`);
        console.log(`Year range: ${yrRange}`);

        if (yrRange > 500){
            rangeSize = 500;
        }
        else if (yrRange > 100 && yrRange <= 500){
            rangeSize = 100;
        }
        else if (yrRange > 10 && yrRange <= 100){
            rangeSize = 10;
        }
        else if (yrRange >= 0 && yrRange <= 10){
            rangeSize = 1;
        }

        console.log(`Range size: ${rangeSize}`);

        let yearRanges = [];

        function createYearRanges(minYear, maxYear, rangeSize){
            for (let start = minYear; start <= maxYear; start += rangeSize) {
                yearRanges.push({
                    start: start,
                    end: Math.min(start + rangeSize - 1, maxYear)
                });
            }
            return yearRanges;
        }
        
        yearRanges = createYearRanges(minYear, maxYear, rangeSize);
        

        function aggregateDataByYearRange(startYear, endYear) {
            const filteredData = yearMonthData.filter(d => d.year >= startYear && d.year <= endYear);
            return d3.rollups(filteredData, 
                v => d3.sum(v, leaf => leaf.count), // Summing function
                d => d.month // Grouping function
            ).map(([month, count]) => ({ month, count}));
        }
        
        // Iterate over each year range and store results
        const count_data = yearRanges.map(range => ({
            range: range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
            data: aggregateDataByYearRange(range.start, range.end)
        }));
        
        console.log(count_data);

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

        // Check if all ranges are only one year
        const allSingleYear = yearRanges.every(range => range.start === range.end);

        g.append('text')
            .attr('class', 'axis-label')
            .attr('y', -45)
            .attr('x', -height / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text(allSingleYear ? 'Year' : 'Year Ranges');

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
