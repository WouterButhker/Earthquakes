import * as d3 from 'd3';
import { all } from 'ol/events/condition';

const svg = d3.select('#scatterplot');
// Margins for svg element
const margin = { top: 40, right: 30, bottom: 50, left: 80 };
// Width/height of svg element - initially uninitialized
let width, height;

export const scatter_plot = {
    render(plots, data) {
        let [allDataFeatures, pointsToHighlight, xaxis_label, yaxis_label] = data;
        // set the value of the selectButtonXaxis and selectButtonYaxis to the chosen labels
        d3.select('#selectButtonXaxis').property('value', xaxis_label);
        d3.select('#selectButtonYaxis').property('value', yaxis_label);

        // If width is not set, use the first client params for all next renders
        if (!width) {
            width = document.getElementById('scatterplot').clientWidth - margin.left - margin.right;
            height = document.getElementById('scatterplot').clientHeight - margin.top - margin.bottom;
        }

        // Remove the undefined features that are undefined for the chosen features
        allDataFeatures = allDataFeatures.filter(
            (d) => d.properties[xaxis_label] !== undefined && d.properties[yaxis_label] !== undefined,
        );

        // The scatterplot needs to be created
        // Extract data: create an array of objects { x_value: ..., y_value: ... }
        const all_points = allDataFeatures.map((d) => {
            const x_value = d.properties[xaxis_label];
            const y_value = d.properties[yaxis_label];
            return { x_value, y_value };
        });

        // If there are no points left, display a message instead of the scatterplot
        if (all_points.length == 0) {
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
        const xExtent = d3.extent(all_points, (d) => d.x_value);
        const yExtent = d3.extent(all_points, (d) => d.y_value);
        var xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
        if (xExtent[1] > 1000) {
            xScale = d3.scaleSymlog().domain([0.1, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
        }

        var yScale = d3.scaleLinear().domain([0, yExtent[1]]).nice().range([height, 0]).unknown(height - margin.bottom);
        if (yExtent[1] > 1000) {
            yScale = d3.scaleSymlog().domain([0.1, yExtent[1]]).nice().range([height, 0]).unknown(height - margin.bottom);
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
                        .style('fill', 'blue').attr('stroke', 'black')
                        .data();

                    const selectedDataFeatures = allDataFeatures.filter(
                        (d) =>
                            value.map((v) => v.x_value).includes(d.properties[xaxis_label]) &&
                            value.map((v) => v.y_value).includes(d.properties[yaxis_label]),
                    );
                    plots['date_selection'].update(plots, selectedDataFeatures);
                } else {
                    plotGroup.selectAll('circle').style('fill', 'black');
                }
            });

        plotGroup.call(brush);

        if (pointsToHighlight === undefined) {
            this.update(plots, [allDataFeatures, undefined, xaxis_label, yaxis_label]);
        }
        else {
            this.update(plots, [allDataFeatures, pointsToHighlight, xaxis_label, yaxis_label]);
        }

        // TODO add zooming within the map
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
    },
    update(plots, data) {
        // this.render(plots, data);
        let [allDataFeatures, pointsToHighlight, xaxis_label, yaxis_label] = data;

        allDataFeatures = allDataFeatures.filter(
            (d) => d.properties[xaxis_label] !== undefined && d.properties[yaxis_label] !== undefined,
        );
        const all_points = allDataFeatures.map((d) => {
            const x_value = d.properties[xaxis_label];
            const y_value = d.properties[yaxis_label];
            return { x_value, y_value };
        });
        // Define scales
        const xExtent = d3.extent(all_points, (d) => d.x_value);
        const yExtent = d3.extent(all_points, (d) => d.y_value);
        var xScale = d3.scaleLinear().domain([0, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
        if (xExtent[1] > 1000) {
            xScale = d3.scaleSymlog().domain([0.1, xExtent[1]]).nice().range([0, width]).unknown(margin.left);
        }

        var yScale = d3.scaleLinear().domain([0, yExtent[1]]).nice().range([height, 0]).unknown(height - margin.bottom);
        if (yExtent[1] > 1000) {
            yScale = d3.scaleSymlog().domain([0.1, yExtent[1]]).nice().range([height, 0]).unknown(height - margin.bottom);
        }


        // Remove the undefined features that are undefined for the chosen highlighted points
        if (pointsToHighlight !== undefined) {
            pointsToHighlight = pointsToHighlight.filter(
                (d) => d.properties[xaxis_label] !== undefined && d.properties[yaxis_label] !== undefined,
            );
            const highlight_points = pointsToHighlight.map((d) => {
                const x_value = d.properties[xaxis_label];
                const y_value = d.properties[yaxis_label];
                const id_value = d.properties.Id;
                return { x_value, y_value, id_value };
            });
        
            // Remove the undefined features that are undefined for the all the points
            // Filter the data such that the highlighted points are not in all the points
            const allDataFeatures_without_highlight = allDataFeatures.filter(
                (d) => !pointsToHighlight.map((d) => d.properties.Id).includes(d.properties.Id),
            );
            const all_points_without_highlighted = allDataFeatures_without_highlight.map((d) => {
                const x_value = d.properties[xaxis_label];
                const y_value = d.properties[yaxis_label];
                const id_value = d.properties.Id;
                return { x_value, y_value, id_value };
            });

            const plotGroup = svg.select('g');

            // Plot the points as circles where all_points_without_highlighted are black and highlight_points are blue
            // Add black points
            plotGroup
                .selectAll('.black-point')
                .data(all_points_without_highlighted)
                .join('circle')
                .attr('class', 'black-point')
                .attr('cx', (d) => xScale(d.x_value))
                .attr('cy', (d) => yScale(d.y_value))
                .attr('r', 4)
                .attr('fill', 'black');

            // Add highlighted points
            plotGroup
                .selectAll('.highlighted-point')
                .data(highlight_points)
                .join('circle')
                .attr('class', 'highlighted-point')
                .attr('cx', (d) => xScale(d.x_value))
                .attr('cy', (d) => yScale(d.y_value))
                .attr('r', 4)
                .attr('fill', 'blue')
                .raise();

        } else {
            const plotGroup = svg.select('g');

            plotGroup
                .selectAll('circle')
                .data(all_points)
                .join('circle')
                .attr('cx', (d) => xScale(d.x_value))
                .attr('cy', (d) => yScale(d.y_value))
                .attr('r', 4)
                .attr('fill', 'black');
        }
        
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

    // TODO keep the highlighted points when changing the axes
    // Event listeners for the dropdowns of the axis in the scatterplot
    d3.select('#selectButtonXaxis').on('change', function (d) {
        // Retrieve the x and y axis labels
        var newX_label = d3.select(this).property('value');
        var newY_label = d3.select('#selectButtonYaxis').property('value');

        // Retrieve all id_values from the highlighted points
        const highlight_points = d3.selectAll('.highlighted-point').data();
        const highlighted_ids = new Set(highlight_points.map((d) => d.id_value));

        // Get all the points from the ids of the highlighted points
        const highlightedDatePoints = earthquakeData.features.filter(
            (d) => highlighted_ids.has(d.properties.Id),
        );

        // Render the new scatterplot
        plots['scatter_plot'].render(plots, [earthquakeData.features, highlightedDatePoints, newX_label, newY_label]);
    });

    d3.select('#selectButtonYaxis').on('change', function (d) {
        // Retrieve the x and y axis labels
        var newX_label = d3.select('#selectButtonXaxis').property('value');
        var newY_label = d3.select(this).property('value');

        // Retrieve all id_values from the highlighted points
        const highlight_points = d3.selectAll('.highlighted-point').data();
        const highlighted_ids = new Set(highlight_points.map((d) => d.id_value));

        // Get all the points from the ids of the highlighted points
        const highlightedDatePoints = earthquakeData.features.filter(
            (d) => highlighted_ids.has(d.properties.Id),
        );

        // Render the new scatterplot
        plots['scatter_plot'].render(plots, [earthquakeData.features, undefined, newX_label, newY_label]);
    });
}
