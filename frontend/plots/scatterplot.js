import * as d3 from 'd3';

export const scatter_plot = {
    render(plots, data) {
        // TODO add highlight or filter boolean
        // TODO add function that only highlights the selected features

        // TODO add check if there are any values left, otherwise display a message
        let [earthquakeDataFeatures, action] = data;

        // TODO remove the undefined features that are undefined for the chosen features
        earthquakeDataFeatures = earthquakeDataFeatures.filter(
            (d) => d.properties.Mag !== undefined && d.properties['Focal Depth (km)'] !== undefined,
        );

        // The scatterplot needs to be created from scratch, because the axis could change based on the selection
        if (action == 'filter') {
            // TODO let the user choose the x and y axis
            // Extract data: create an array of objects { mag: ..., z: ... }
            const points = earthquakeDataFeatures.map((d) => {
                const mag = d.properties['Mag'];
                const z = d.properties['Focal Depth (km)'];
                return { mag, z };
            });
            if (points.length == 0) {
                d3.select('#scatterplot').text('No data available');
                console.log('No data available');
                return;
            }
            const margin = { top: 40, right: 30, bottom: 50, left: 60 },
            width = 600 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

            const svg = d3.select('#scatterplot');

            // clear the axis
            svg.selectAll('*').remove();

            svg.attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);



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
            // TODO add a dropdown for the x axis
            svg.append('text')
                .attr('class', 'axis-label')
                .attr('transform', `translate(${width / 2}, ${height + 40})`)
                .style('text-anchor', 'middle')
                .text('Magnitude');

            // TODO add a dropdown for the y axis
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

            // TODO add zooming within the map

            // Undefined dots are displayed in red
            // TODO remove this because the data is already filtered before plotting
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
            // TODO only when ctrl is pressed
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
                }),
            );

            // Include zooming
            // const gx = svg.append("g");
            // const gy = svg.append("g");

            // const zoom = d3.zoom()
            // .scaleExtent([0.5, 32])
            // .on("zoom", zoomed);
            
            // svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

            // function zoomed({transform}) {
            //     const zx = transform.rescaleX(xScale);
            //     const zy = transform.rescaleY(yScale);
            //     dot.attr("transform", transform).attr("stroke-width", 5 / transform.k);
            //     gx.call(xAxis, zx);
            //     gy.call(yAxis, zy);
            // }
        }
        // If the action is highlight, keep the features that were alredy in the scatterplot and make the selected features green, the other features are black
        else if (action == 'highlight') {
            const svg = d3.select('#scatterplot');
            const dot = svg.selectAll('circle');

            const selectedData = earthquakeDataFeatures;
            const points = selectedData.map((d) => {
                const mag = d.properties['Mag'];
                const z = d.properties['Focal Depth (km)'];
                return { mag, z };
            });

            const xExtent = d3.extent(points, (d) => d.mag);
            const yExtent = d3.extent(points, (d) => d.z);

            const xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, 600]);

            const yScale = d3.scaleLinear().domain([0, yExtent[1]]).nice().range([400, 0]);

            // The highlighted points are yellow and the other points are black
            // TODO put the yellow points in the foreground
            dot.attr('fill', 'black').attr('fill-opacity', 0.5);
            dot.filter(
                (d) =>
                    selectedData.map((v) => v.properties.Mag).includes(d.mag) &&
                    selectedData.map((v) => v.properties['Focal Depth (km)']).includes(d.z),
            ).attr('fill', 'yellow');
        }
    },
    update(plots, data) {
        this.render(plots, data);
    },
};
