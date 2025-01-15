import * as d3 from 'd3';

const svg = d3.select('#scatterplot');
// Margins for svg element
const margin = { top: 40, right: 30, bottom: 50, left: 80 };
// Width/height of svg element - initially uninitialized
let width, height;

export const scatter_plot = {
    render(plots, data) {
        let [earthquakeDataFeatures, action, xaxis_label, yaxis_label] = data;

        // If width is not set, use the first client params for all next renders
        if (!width) {
            width = document.getElementById('scatterplot').clientWidth - margin.left - margin.right;
            height = document.getElementById('scatterplot').clientHeight - margin.top - margin.bottom;
        }

        // Remove the undefined features that are undefined for the chosen features
        earthquakeDataFeatures = earthquakeDataFeatures.filter(
            (d) => d.properties[xaxis_label] !== undefined && d.properties[yaxis_label] !== undefined,
        );

        // The scatterplot needs to be created from scratch, because the axis could change based on the selection
        if (action == 'filter') {
            // Extract data: create an array of objects { x_value: ..., y_value: ... }
            const points = earthquakeDataFeatures.map((d) => {
                const x_value = d.properties[xaxis_label];
                const y_value = d.properties[yaxis_label];
                return { x_value, y_value };
            });
            // If there are no points left, display a message instead of the scatterplot
            if (points.length == 0) {
                svg.selectAll('*').remove();
                svg.append('text').text('No data available').attr('x', 300).attr('y', 200);
                return;
            }

            // Clear the SVG
            svg.selectAll('*').remove();
            svg.attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

            // Create a group for the plot
            const plotGroup = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

            // Define scales
            const xExtent = d3.extent(points, (d) => d.x_value);
            const yExtent = d3.extent(points, (d) => d.y_value);
            // TODO if the maximum value is above 1.000, make the scale logarithmic
            var xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
            if (xExtent[1] > 1000) {
                xScale = d3.scaleSymlog().domain([0.1, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
            }

            var yScale = d3
                .scaleLinear()
                .domain([0, yExtent[1]])
                .nice()
                .range([height, 0])
                .unknown(height - margin.bottom);
            if (yExtent[1] > 1000) {
                yScale = d3
                    .scaleSymlog()
                    .domain([0.1, yExtent[1]])
                    .nice()
                    .range([height, 0])
                    .unknown(height - margin.bottom);
            }

            // Add axes
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            // Append axes to the plot group
            plotGroup.append('g').attr('transform', `translate(0, ${height})`).call(xAxis);

            plotGroup.append('g').call(yAxis);

            // Add axis labels
            plotGroup
                .append('text')
                .attr('class', 'axis-label')
                .attr('transform', `translate(${width / 2}, ${height + 40})`)
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', 'black')
                .text(xaxis_label);

            plotGroup
                .append('text')
                .attr('class', 'axis-label')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 15)
                .attr('x', -height / 2)
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', 'black')
                .text(yaxis_label);

            // TODO rotate the labels if a log scale is used

            // Plot the points as circles
            plotGroup
                .selectAll('circle')
                .data(points)
                .join('circle')
                .attr('cx', (d) => xScale(d.x_value))
                .attr('cy', (d) => yScale(d.y_value))
                .attr('r', 4)
                .attr('fill', 'black');

            // TODO add zooming within the map

            // Undefined dots are displayed in red
            // TODO remove this because the data is already filtered before plotting
            plotGroup
                .selectAll('circle')
                .filter((d) => d.x_value === undefined || d.y_value === undefined)
                .attr('fill', 'red');

            // Click behaviour
            // TODO this does not work but it has to be fixed
            // plotGroup.on('click', function (chosenEvent) {
            //     // Make the chosen point green and all others black
            //     d3.selectAll("circle").attr("fill", "black");
            //     // d3.select(chosenEvent.srcElement).attr("fill", "green");

            //     // Filter the current earthquake data to only include earthquakes with the same magnitude as the selected point
            //     const selectedDataFeatures = earthquakeDataFeatures.filter(
            //         (d) =>
            //             d.properties[xaxis_label] == chosenEvent.srcElement.__data__.x_value &&
            //             d.properties[yaxis_label] == chosenEvent.srcElement.__data__.y_value,
            //     );
            //     plots['date_selection'].update(plots, selectedDataFeatures);
            //     plots['detailed_view'].update(plots, [selectedDataFeatures[0], tsunamiDataFeatures]);
            // });

            // from https://observablehq.com/@d3/brushable-scatterplot
            // TODO only when ctrl is pressed
            // Brushing behavior
            const brush = d3
                .brush()
                .filter((event) => event.ctrlKey)
                .on('start brush end', ({ selection }) => {
                    let value = [];
                    if (selection) {
                        const [[x0, y0], [x1, y1]] = selection;
                        value = plotGroup
                            .selectAll('circle')
                            .style('fill', 'black')
                            .filter(
                                (d) =>
                                    x0 <= xScale(d.x_value) &&
                                    xScale(d.x_value) < x1 &&
                                    y0 <= yScale(d.y_value) &&
                                    yScale(d.y_value) < y1,
                            )
                            .style('fill', 'green')
                            .data();

                        const selectedDataFeatures = earthquakeDataFeatures.filter(
                            (d) =>
                                value.map((v) => v.x_value).includes(d.properties[xaxis_label]) &&
                                value.map((v) => v.y_value).includes(d.properties[yaxis_label]),
                        );
                        plots['date_selection'].update(plots, selectedDataFeatures);
                        plots['geo_map'].update(plots, [selectedDataFeatures]);
                    } else {
                        plotGroup.selectAll('circle').style('fill', 'black');
                    }
                });

            plotGroup.call(brush);

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
        if (action == 'highlight') {
            const dot = svg.selectAll('circle');

            const selectedData = earthquakeDataFeatures;
            const points = selectedData.map((d) => {
                const x_value = d.properties[xaxis_label];
                const y_value = d.properties[yaxis_label];
                return { x_value, y_value };
            });

            const xExtent = d3.extent(points, (d) => d.x_value);
            const yExtent = d3.extent(points, (d) => d.y_value);

            const xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, 600]);
            const yScale = d3.scaleLinear().domain([0, yExtent[1]]).nice().range([400, 0]);

            // The highlighted points are yellow and the other points are black
            // TODO put the yellow points in the foreground
            dot.attr('fill', 'black').attr('fill-opacity', 0.5);
            dot.filter(
                (d) =>
                    selectedData.map((v) => v.properties[xaxis_label]).includes(d.x_value) &&
                    selectedData.map((v) => v.properties[yaxis_label]).includes(d.y_value),
            ).attr('fill', 'yellow');
        }
    },
    update(plots, data) {
        this.render(plots, data);
    },
};

// Options for both the dropdowns of the axis in the scatterplot
// prettier-ignore
const scatterplot_xaxis_options = [
    'Mag', 'Focal Depth (km)', 'MMI Int', 'Total Deaths', 'Total Missing', 'Total Injuries',
    'Total Damage ($Mil)', 'Total Houses Destroyed', 'Total Houses Damaged',
];
// prettier-ignore
const scatterplot_yaxis_options = [
    'Focal Depth (km)', 'Mag', 'MMI Int', 'Total Deaths', 'Total Missing', 'Total Injuries',
    'Total Damage ($Mil)', 'Total Houses Destroyed', 'Total Houses Damaged',
];
// prettier-ignore
const scatterplot_categorical_options = [
    'Country', 'MMI Int', 'Total Death Description', 'Total Missing Description', 'Total Injuries Description',
    'Total Damage Description', 'Total Houses Destroyed Description', 'Total Houses Damaged Description',
];

export function addScatterplotAxisInteractions(plots, earthquakeData) {
    // Add the options to the dropdowns of the axis in the scatterplot
    d3.select('#selectButtonXaxis')
        .selectAll('myOptions')
        .data(scatterplot_xaxis_options)
        .enter()
        .append('option')
        .text(function (d) {
            return d;
        })
        .attr('value', function (d) {
            return d;
        });

    d3.select('#selectButtonYaxis')
        .selectAll('myOptions')
        .data(scatterplot_yaxis_options)
        .enter()
        .append('option')
        .text(function (d) {
            return d;
        })
        .attr('value', function (d) {
            return d;
        });

    // Event listeners for the dropdowns of the axis in the scatterplot
    d3.select('#selectButtonXaxis').on('change', function (d) {
        // recover the option that has been chosen
        var newX_label = d3.select(this).property('value');
        var newY_label = d3.select('#selectButtonYaxis').property('value');
        plots['scatter_plot'].update(plots, [earthquakeData.features, 'filter', newX_label, newY_label]);
    });

    d3.select('#selectButtonYaxis').on('change', function (d) {
        var newX_label = d3.select('#selectButtonXaxis').property('value');
        var newY_label = d3.select(this).property('value');
        plots['scatter_plot'].update(plots, [earthquakeData.features, 'filter', newX_label, newY_label]);
    });
}
