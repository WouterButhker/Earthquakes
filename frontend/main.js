import * as d3 from 'd3';
import { earthquakesLayer, heatmapLayer, geo_map } from './geo-map';
import { scatter_plot } from './scatterplot';
import { date_selection } from './date-selection';
import { detailed_view } from './detailed-view';

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
plots['scatter_plot'].render(plots, earthquakeData.features);
plots['date_selection'].render(plots, earthquakeData.features);
plots['detailed_view'].render(plots, undefined);

// Interactive buttons
d3.select('#resetButton').on('click', function () {
    plots['scatter_plot'].update(plots, earthquakeData.features);
    plots['date_selection'].update(plots, earthquakeData.features);
});

d3.select('#toggleView').on('click', function () {
    const heatmapVisible = heatmapLayer.getVisible();
    heatmapLayer.setVisible(!heatmapVisible);
    earthquakesLayer.setVisible(heatmapVisible);
});
