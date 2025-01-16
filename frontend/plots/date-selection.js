import * as d3 from 'd3';

const svg = d3.select('#dateSelection');
// Margins for svg element
const margin = { top: 50, right: 30, bottom: 50, left: 60 };
// Width/height of svg element - initially uninitialized
let width, height;
/// Width/height of the legend
const legendWidth = 200,
    legendHeight = 20;
// Offset for year label from the y-axis (avoid overlap with years)
const yearLabelOffset = 25;

export const date_selection = {
    render(plots, data) {
        let earthquakeDataFeatures = data;

        // If width is not set, use the first client params for all next renders
        if (!width) {
            width = document.getElementById('dateSelection').clientWidth - margin.left - margin.right;
            height = document.getElementById('dateSelection').clientHeight - margin.top - margin.bottom;
        }

        // Clear the SVG
        svg.selectAll('*').remove();
        svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g').attr('transform', `translate(${margin.left + yearLabelOffset},${margin.top})`);

        const counts = d3.rollup(
            earthquakeDataFeatures,
            (v) => v.length, // Counting occurrences
            (d) => parseInt(d.properties.Year),
            (d) => {
                // Default to January (0) if the month is undefined or invalid
                const month = parseInt(d.properties.Mo);
                return isNaN(month) ? 0 : month - 1; // 0-based month, adjust if necessary
            },
        );

        // Find the range of years in the dataset
        const minYear = d3.min(earthquakeDataFeatures, (d) => parseInt(d.properties.Year));
        const maxYear = d3.max(earthquakeDataFeatures, (d) => parseInt(d.properties.Year));

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

        const all_years = yearMonthData.map((d) => d.year);

        let uniqueYears = new Set(all_years);
        let numUniqueYears = uniqueYears.size;

        let rangeSize = 0;
        let yrRange = Math.abs(minYear - maxYear);

        console.log(`unique years: ${numUniqueYears}`);
        console.log(`min and max years: ${minYear} - ${maxYear}`);
        console.log(`Year range: ${yrRange}`);

        if (yrRange > 500) {
            rangeSize = 500;
        } else if (yrRange > 100 && yrRange <= 500) {
            rangeSize = 100;
        } else if (yrRange > 10 && yrRange <= 100) {
            rangeSize = 10;
        } else if (yrRange >= 0 && yrRange <= 10) {
            rangeSize = 1;
        }

        console.log(`Range size: ${rangeSize}`);

        let yearRanges = createYearRanges(minYear, maxYear, rangeSize);

        // Iterate over each year range and store results
        const count_data = yearRanges.map((range) => ({
            range: range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
            data: aggregateDataByYearRange(yearMonthData, range.start, range.end),
        }));

        console.log(count_data);

        // Create scales
        const xScale = d3
            .scaleBand()
            .domain(d3.range(0, 12)) // Months are 0-indexed (0 = January, 11 = December)
            .range([0, width])
            .padding(0.05);

        const yScale = d3
            .scaleBand()
            .domain(count_data.map((d) => d.range))
            .range([0, height])
            .padding(0.05);

        // Color scale based on counts
        const countExtent = d3.extent(count_data.flatMap((range) => range.data.map((d) => d.count)));
        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, countExtent[1]]);

        // Append the rows for each year range
        const rows = g
            .selectAll('.row')
            .data(count_data)
            .enter()
            .append('g')
            .attr('class', 'row')
            .attr('transform', (d) => `translate(0,${yScale(d.range)})`);

        // Append cells to each row
        rows.selectAll('.cell')
            .data((d) => d.data)
            .enter()
            .append('rect')
            .attr('class', 'cell')
            .attr('x', (d) => xScale(d.month))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .style('fill', (d) => colorScale(d.count));

        // Add x-axis
        const xAxis = d3.axisBottom(xScale).tickFormat((d) => {
            // Format month numbers to names
            const formatMonth = d3.timeFormat('%b');
            return formatMonth(new Date(2020, d, 1));
        });
        g.append('g').attr('transform', `translate(0,${height})`).call(xAxis);

        // Add y-axis
        const yAxis = d3.axisLeft(yScale).tickFormat((d) => d);
        g.append('g')
            .call(yAxis)
            .selectAll('.tick') // Selecting all the y-axis ticks which are bound to your year range data
            .on('click', (event, d) => {
                const yearRange = d.match(/(?<!\d)-?\d+/g).map(Number);
                const startYear = yearRange[0];
                const endYear = yearRange[1];
                console.log(startYear, endYear);
                let selectedData = selectData(earthquakeDataFeatures, startYear, endYear);

                // Prevent rendering if no data is found
                if (selectedData.length === 0) {
                    console.log('No data found for selected year range');
                    return;
                }
                plots['date_selection'].update(plots, selectedData);
            });

        // Add month label
        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .attr('text-anchor', 'middle')
            .text('Month');

        // Add year label
        const allSingleYear = yearRanges.every((range) => range.start === range.end);
        g.append('text')
            .attr('class', 'axis-label')
            .attr('y', -45)
            .attr('x', -height / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text(allSingleYear ? 'Year' : 'Year Ranges')
            .attr('dy', -yearLabelOffset);

        generateLegend(margin.left + (width - legendWidth) / 2, countExtent);

        const brush = d3.brush()
            .extent([[0, 0], [width, height]])
            .on('start brush end', brushed);

        const brushG = g.append('g')
            .attr('class', 'brush')
            .call(brush);

              
        function brushed(event) {
            const selection = event.selection;
            if (!selection) {
                console.log('No selection');
                return;
            }
            
            const [[x0, y0], [x1, y1]] = selection;
            
            // Check for any overlap between the selection and the cell positions for rows and columns
            const selectedRanges = count_data.filter(d => {
                const yPosition = yScale(d.range);
                const yHeight = yScale.bandwidth();
                // Check if there's any overlap in the Y-axis
                return y0 <= yPosition + yHeight && yPosition <= y1;
            });
            
            const selectedMonths = d3.range(0, 12).filter(month => {
                const xPosition = xScale(month);
                const xWidth = xScale.bandwidth();
                // Check if there's any overlap in the X-axis
                return x0 <= xPosition + xWidth && xPosition <= x1;
            });
            
            // Print selected data and their corresponding year ranges to the console
            selectedRanges.forEach(range => {
                console.log(`Selected Year Range: ${range.range}`);
                range.data.filter(md => selectedMonths.includes(md.month))
                .forEach(data => {
                    console.log(`Month: ${data.month + 1}, Count: ${data.count}`);
                });
            });
            
            // Update the cell colors based on selection
            rows.selectAll('.cell')
                .style('fill', function (d) {
                    const isInRange = selectedRanges.some(range => range.range === this.parentNode.__data__.range);
                    const isMonthSelected = selectedMonths.includes(d.month);
                    return isInRange && isMonthSelected ? '#32CD32' : colorScale(d.count);
                });
        }
        

        function clearBrush() {
            svg.select('.brush').call(brush.move, null);
            }

    },
    update(plots, data) {
        this.render(plots, data);
    },
};

function aggregateDataByYearRange(yearMonthData, startYear, endYear) {
    const filteredData = yearMonthData.filter((d) => d.year >= startYear && d.year <= endYear);
    return d3
        .rollups(
            filteredData,
            (v) => d3.sum(v, (leaf) => leaf.count), // Summing function
            (d) => d.month, // Grouping function
        )
        .map(([month, count]) => ({ month, count }));
}

function createYearRanges(minYear, maxYear, rangeSize) {
    let yearRanges = [];
    for (let start = minYear; start <= maxYear; start += rangeSize) {
        yearRanges.push({
            start: start,
            end: Math.min(start + rangeSize - 1, maxYear),
        });
    }
    return yearRanges;
}

function selectData(earthquakeDataFeatures, startYear, endYear) {
    const selectedData = earthquakeDataFeatures.filter((feature) => {
        const year = parseInt(feature.properties.Year);
        return year >= startYear && year <= endYear;
    });
    return selectedData;
}

function generateLegend(leftOffset, countExtent) {
    const legendGroup = svg.append('g').attr('transform', `translate(${leftOffset},${margin.top - 40})`);
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

    // Add legend axis
    legendGroup
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(0,${legendHeight})`)
        .call(legendAxis)
        .select('.domain')
        .remove();

    // Add legend title
    legendGroup
        .append('text')
        .attr('class', 'legend')
        .attr('x', legendWidth + 10)
        .attr('y', 15)
        .attr('text-anchor', 'start')
        .text('Counts');
}