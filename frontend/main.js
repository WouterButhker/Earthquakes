import * as d3 from 'd3';
import { earthquakesLayer, heatmapLayer, geo_map } from './plots/geo-map';
import { scatter_plot } from './plots/scatterplot';
import { date_selection } from './plots/date-selection';
import { detailed_view } from './plots/detailed-view';

const plots = {};

// Generate data
let earthquakeData = await d3.json('earthquakes.geojson');
let tsunamiData = await d3.json('tsunamis.geojson');
let tectonicPlatesData = await d3.json('TectonicPlateBoundaries.geojson');

// Add plots
plots['geo_map'] = geo_map;
plots['scatter_plot'] = scatter_plot;
plots['date_selection'] = date_selection;
plots['detailed_view'] = detailed_view;

// Render plots
plots['geo_map'].render(plots, [earthquakeData, tectonicPlatesData, tsunamiData.features]);
plots['scatter_plot'].render(plots, [earthquakeData.features, 'filter', 'Mag', 'Focal Depth (km)']);
plots['date_selection'].render(plots, earthquakeData.features);
plots['detailed_view'].render(plots, undefined);

// Interactive buttons
d3.select('#resetButton').on('click', function () {
    // set the value of the selectButtonXaxis and selectButtonYaxis to the default values
    d3.select('#selectButtonXaxis').property('value', 'Mag');
    d3.select('#selectButtonYaxis').property('value', 'Focal Depth (km)');
    plots['scatter_plot'].update(plots, [earthquakeData.features, 'filter', 'Mag', 'Focal Depth (km)']);
    plots['date_selection'].update(plots, earthquakeData.features);
    plots['detailed_view'].update(plots, [undefined, undefined]);
});

d3.select('#pointOfInterest1').on('click', function () {
    // get the earthquake that has an id of "3227"
    // TODO add text from website in placeholders
    const interestPoint = earthquakeData.features.filter((d) => d.properties.Id == '3227');
    plots['scatter_plot'].update(plots, [earthquakeData.features, 'filter', 'Total Missing', 'Focal Depth (km)']);
    plots['scatter_plot'].update(plots, [interestPoint, 'highlight', 'Total Missing', 'Focal Depth (km)']);
    plots['date_selection'].update(plots, interestPoint);
    plots['detailed_view'].update(plots, [interestPoint[0], tsunamiData.features]);
});
d3.select('#pointOfInterest2').on('click', function () {
    // get the earthquake that has an id of "7843"
    const interestPoint = earthquakeData.features.filter((d) => d.properties.Id == '7843');
    plots['scatter_plot'].update(plots, [
        earthquakeData.features,
        'filter',
        'Total Houses Destroyed',
        'Total Injuries',
    ]);
    plots['scatter_plot'].update(plots, [interestPoint, 'highlight', 'Total Houses Destroyed', 'Total Injuries']);
    plots['date_selection'].update(plots, interestPoint);
    plots['detailed_view'].update(plots, [interestPoint[0], tsunamiData.features]);
});

d3.select('#viewToggle').on('click', function () {
    const heatmapVisible = heatmapLayer.getVisible();
    heatmapLayer.setVisible(!heatmapVisible);
    earthquakesLayer.setVisible(heatmapVisible);
});

const viewToggle = document.getElementById('viewToggle');
const viewToggleText = document.getElementById('viewToggleText');
const sizeDropdown = document.getElementById('size');
const colorDropdown = document.getElementById('color');

viewToggle.addEventListener('change', () => {
    const isHeatmapMode = viewToggle.checked;
    sizeDropdown.disabled = isHeatmapMode;
    colorDropdown.disabled = isHeatmapMode;
    viewToggleText.innerHTML = viewToggle.checked ? 'Heatmap' : '&nbsp;&nbsp;Dotted&nbsp;&nbsp;';
});

// Options for both the dropdowns of the axis in the scatterplot
const scatterplot_xaxis_options = [
    'Mag',
    'Focal Depth (km)',
    'MMI Int',
    'Total Deaths',
    'Total Missing',
    'Total Injuries',
    'Total Damage ($Mil)',
    'Total Houses Destroyed',
    'Total Houses Damaged',
];
const scatterplot_yaxis_options = [
    'Focal Depth (km)',
    'Mag',
    'MMI Int',
    'Total Deaths',
    'Total Missing',
    'Total Injuries',
    'Total Damage ($Mil)',
    'Total Houses Destroyed',
    'Total Houses Damaged',
];

const scatterplot_categorical_options = [
    'Country',
    'MMI Int',
    'Total Death Description',
    'Total Missing Description',
    'Total Injuries Description',
    'Total Damage Description',
    'Total Houses Destroyed Description',
    'Total Houses Damaged Description',
];

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
