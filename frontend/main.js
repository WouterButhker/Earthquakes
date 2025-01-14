import * as d3 from 'd3';
import { earthquakesLayer, heatmapLayer, geo_map } from './plots/geo-map';
import { scatter_plot, addScatterplotAxisInteractions } from './plots/scatterplot';
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

/* ========================================================================== */
/* ======================== Top-view interactions =========================== */
/* ========================================================================== */

// Reset button
d3.select('#resetButton').on('click', function () {
    // set the value of the selectButtonXaxis and selectButtonYaxis to the default values
    d3.select('#selectButtonXaxis').property('value', 'Mag');
    d3.select('#selectButtonYaxis').property('value', 'Focal Depth (km)');
    plots['scatter_plot'].update(plots, [earthquakeData.features, 'filter', 'Mag', 'Focal Depth (km)']);
    plots['date_selection'].update(plots, earthquakeData.features);
    plots['detailed_view'].update(plots, [undefined, undefined]);
});

// Toggle between heatmap and points
const viewToggle = document.getElementById('viewToggle');
const viewToggleText = document.getElementById('viewToggleText');
const sizeDropdown = document.getElementById('size');
const colorDropdown = document.getElementById('color');

d3.select('#viewToggle').on('click', function () {
    const heatmapVisible = heatmapLayer.getVisible();
    heatmapLayer.setVisible(!heatmapVisible);
    earthquakesLayer.setVisible(heatmapVisible);
});

viewToggle.addEventListener('change', () => {
    const isHeatmapMode = viewToggle.checked;
    sizeDropdown.disabled = isHeatmapMode;
    colorDropdown.disabled = isHeatmapMode;
    viewToggleText.innerHTML = viewToggle.checked ? 'Heatmap' : '&nbsp;&nbsp;Dotted&nbsp;&nbsp;';
});

/* ========================================================================== */
/* ========================== Points of interest ============================ */
/* ========================================================================== */

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

addScatterplotAxisInteractions(plots, earthquakeData);
