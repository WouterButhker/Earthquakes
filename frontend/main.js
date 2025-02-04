import * as d3 from 'd3';
import { earthquakesLayer, heatmapLayer, geo_map, cmap } from './plots/geo-map';
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
plots['scatter_plot'].render(plots, [
    earthquakeData.features,
    undefined,
    'Mag',
    'Focal Depth (km)',
    tsunamiData.features,
]);
plots['date_selection'].render(plots, [earthquakeData.features, earthquakeData.features, tsunamiData.features]);
plots['detailed_view'].render(plots, cmap);

/* ========================================================================== */
/* ======================== Top-view interactions =========================== */
/* ========================================================================== */

// Reset button
d3.select('#resetButton').on('click', function () {
    plots['scatter_plot'].render(plots, [
        earthquakeData.features,
        undefined,
        'Mag',
        'Focal Depth (km)',
        tsunamiData.features,
    ]);
    d3.selectAll('.poi-button').classed('selected', false);
    plots['scatter_plot'].render(plots, [earthquakeData.features, undefined, 'Mag', 'Focal Depth (km)', tsunamiData.features]);
    plots['date_selection'].update(plots, [earthquakeData.features, earthquakeData.features, tsunamiData.features]);
    plots['detailed_view'].update(plots, [undefined, undefined]);
    plots['geo_map'].update(plots, [[]]);
});

// Toggle between heatmap and points
const viewToggle = document.getElementById('viewToggle');
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
});

let isTsunamiOnly = false;
d3.select('#tsunamiToggle').on('click', function () {
    isTsunamiOnly = !isTsunamiOnly;
    let data = earthquakeData.features;
    if (isTsunamiOnly) data = earthquakeData.features.filter((d) => d.properties.Tsu);

    plots['scatter_plot'].render(plots, [data, undefined, 'Mag', 'Focal Depth (km)', tsunamiData.features]);
    plots['date_selection'].update(plots, [data, data, tsunamiData.features]);
    plots['detailed_view'].update(plots, [undefined, undefined]);
    plots['geo_map'].update(plots, [data]);
});

/* ========================================================================== */
/* ========================== Points of interest ============================ */
/* ========================================================================== */

d3.select('#pointOfInterest1').on('click', function () {
    d3.selectAll('.poi-button').classed('selected', false);
    d3.select(this).classed('selected', true);
    // get the earthquake that has an id of "3227"
    const interestPoint = earthquakeData.features.filter((d) => d.properties.Id == '3227');

    plots['scatter_plot'].render(plots, [
        earthquakeData.features,
        interestPoint,
        'Total Missing',
        'Focal Depth (km)',
        tsunamiData.features,
    ]);
    plots['date_selection'].update(plots, [earthquakeData.features, interestPoint, tsunamiData.features]);
    plots['detailed_view'].update(plots, [interestPoint, tsunamiData.features]);
    plots['geo_map'].update(plots, [interestPoint]);
});
d3.select('#pointOfInterest2').on('click', function () {
    d3.selectAll('.poi-button').classed('selected', false);
    d3.select(this).classed('selected', true);
    // get the earthquake that has an id of "7843"
    const interestPoint = earthquakeData.features.filter((d) => d.properties.Id == '7843');

    plots['scatter_plot'].render(plots, [
        earthquakeData.features,
        interestPoint,
        'Total Houses Destroyed',
        'Total Injuries',
        tsunamiData.features,
    ]);
    plots['date_selection'].update(plots, [earthquakeData.features, interestPoint, tsunamiData.features]);
    plots['detailed_view'].update(plots, [interestPoint, tsunamiData.features]);
    plots['geo_map'].update(plots, [interestPoint]);
});
d3.select('#pointOfInterest3').on('click', function () {
    d3.selectAll('.poi-button').classed('selected', false);
    d3.select(this).classed('selected', true);
    // get the earthquake that has an id of "10036"
    const interestPoint = earthquakeData.features.filter((d) => d.properties.Id == '10036');

    plots['scatter_plot'].render(plots, [
        earthquakeData.features,
        interestPoint,
        'Mag',
        'Total Damage ($Mil)',
        tsunamiData.features,
    ]);
    plots['date_selection'].update(plots, [earthquakeData.features, interestPoint, tsunamiData.features]);
    plots['detailed_view'].update(plots, [interestPoint, tsunamiData.features]);
    // TODO set the geo map dot size to 'total damage' and the dot color to 'total injuries'
    plots['geo_map'].update(plots, [interestPoint]);
});

addScatterplotAxisInteractions(plots, earthquakeData, tsunamiData);
