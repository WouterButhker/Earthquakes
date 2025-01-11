import * as d3 from 'd3';

export const scatter_plot = {
    render(plots, data) {
        let earthquakeDataFeatures = data;

        // remove the undefined magnitudes and depth from the input
        earthquakeDataFeatures = earthquakeDataFeatures.filter(
            (d) => d.properties.Mag !== undefined && d.properties['Focal Depth (km)'] !== undefined,
        );
        const margin = { top: 40, right: 30, bottom: 50, left: 60 },
            width = 600 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#scatterplot');

        // clear the axis
        svg.selectAll('*').remove();

        // TODO maybe keep the axis and only update the data
        svg.attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Extract data: create an array of objects { mag: ..., z: ... }
        const points = earthquakeDataFeatures.map((d) => {
            const mag = d.properties['Mag'];
            const z = d.properties['Focal Depth (km)'];
            return { mag, z };
        });

        const xExtent = d3.extent(points, (d) => d.mag);
        const yExtent = d3.extent(points, (d) => d.z);

        const xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, width]).unknown(margin.left);

        const yScale = d3
            .scaleLinear()
            .domain([0, yExtent[1]])
            .nice()
            .range([height, 0])
            .unknown(height - margin.bottom);

        // Add axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        svg.append('g').attr('transform', `translate(0,${height})`).call(xAxis);

        svg.append('g').call(yAxis);

        // Add axis labels
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${width / 2}, ${height + 40})`)
            .style('text-anchor', 'middle')
            .text('Magnitude');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', +15)
            .attr('x', -height / 2)
            .style('text-anchor', 'middle')
            .text('Depth');

        // Plot the points as circles
        const dot = svg
            .selectAll('circle')
            .data(points)
            .join('circle')
            .attr('cx', (d) => xScale(d.mag))
            .attr('cy', (d) => yScale(d.z))
            .attr('r', 4)
            .attr('fill', 'black');

        // Undefined dots are displayed in red
        // TODO how to handle this?
        dot.filter((d) => d.mag === undefined || d.z === undefined).attr('fill', 'red');

        svg.on('click', function (chosenEvent) {
            // Make the chosen point green and all others black
            // d3.selectAll("circle").attr("fill", "black");
            // d3.select(chosenEvent.srcElement).attr("fill", "green");

            // Filter the current earthquake data to only include earthquakes with the same magnitude as the selected point
            // const selectedData = earthquakeDataFeatures.filter(d => selectedFeatures.getArray().map(f => f.get('Mag')).includes(d.properties.Mag) && selectedFeatures.getArray().map(f => f.get('Focal Depth (km)')).includes(d.properties["Focal Depth (km)"]));
            const selectedDataFeatures = earthquakeDataFeatures.filter(
                (d) =>
                    d.properties.Mag == chosenEvent.srcElement.__data__.mag &&
                    d.properties['Focal Depth (km)'] == chosenEvent.srcElement.__data__.z,
            );
            plots['date_selection'].update(plots, selectedDataFeatures);
        });

        // from https://observablehq.com/@d3/brushable-scatterplot
        svg.call(
            d3.brush().on('start brush end', ({ selection }) => {
                let value = [];
                if (selection) {
                    const [[x0, y0], [x1, y1]] = selection;
                    value = dot
                        .style('fill', 'black')
                        .filter(
                            (d) => x0 <= xScale(d.mag) && xScale(d.mag) < x1 && y0 <= yScale(d.z) && yScale(d.z) < y1,
                        )
                        .style('fill', 'green')
                        .data();

                    const selectedDataFeatures = earthquakeDataFeatures.filter(
                        (d) =>
                            value.map((v) => v.mag).includes(d.properties.Mag) &&
                            value.map((v) => v.z).includes(d.properties['Focal Depth (km)']),
                    );
                    plots['date_selection'].update(plots, selectedDataFeatures);
                } else {
                    dot.style('fill', 'black');
                }

                // Inform downstream cells that the selection has changed.
                // TODO use this instead of calling the function to update the plots
                svg.property('value', value).dispatch('input');
            }),
        );
    },
    update(plots, data) {
        this.render(plots, data);
    },
};
