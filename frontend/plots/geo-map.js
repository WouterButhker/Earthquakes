import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import { View } from 'ol';
import Map from 'ol/Map.js';
import VectorSource from 'ol/source/Vector';
import { GeoJSON } from 'ol/format';
import VectorLayer from 'ol/layer/Vector';
import HeatmapLayer from 'ol/layer/Heatmap';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Stroke, Style } from 'ol/style';
import { DragBox, Select } from 'ol/interaction';
import * as olProj from 'ol/proj';
import { platformModifierKeyOnly, click } from 'ol/events/condition';
import { getWidth } from 'ol/extent';
import * as d3 from 'd3';
import { getStyle, updateLegend } from './geo-map-styling';

export let earthquakesLayer = null;
export let heatmapLayer = null;
let allEarthquakeData = null;

// Default OSM layer
const openStreetMap = new TileLayer({
    source: new OSM(),
});

let color = d3.select('#color').property('value');
let size = d3.select('#size').property('value');

d3.select('#size').on('change', function () {
    size = d3.select(this).property('value');
    updateLegend(color, size);
    earthquakesLayer.getSource().changed();
});

d3.select('#color').on('change', function () {
    color = d3.select(this).property('value');
    updateLegend(color, size);
    earthquakesLayer.getSource().changed();
});

export const geo_map = {
    render(plots, data) {
        let [earthquakeData, tectonicPlatesData, tsunamiDataFeatures] = data;

        allEarthquakeData = earthquakeData;
        // Generate the earthquake layer
        earthquakesLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(earthquakeData, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857',
                }),
            }),
            style: earthquakeStyle,
            visible: true,
        });

        // Generate the heatmap layer
        const mapExtent = [-180, -90, 180, 90];
        const step = 1;
        const heatmapSource = new VectorSource({
            features: new GeoJSON().readFeatures(earthquakeData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            }),
        });
        heatmapSource.getFeatures().forEach((feature) => {
            const magnitude = feature.get('Mag');
            // Arbitrary weight parameters
            // TODO: Weight things dynamically on zooming? Maybe tweak manually?
            const weight = magnitude ? Math.min(magnitude / 20, 1) : 0.1;
            feature.set('weight', weight); // Scale down to avoid oversaturation
        });
        // Iterate for background heatmap
        for (let lon = mapExtent[0]; lon <= mapExtent[2]; lon += step) {
            for (let lat = mapExtent[1]; lat <= mapExtent[3]; lat += step) {
                const feature = new Feature({
                    geometry: new Point(olProj.fromLonLat([lon, lat])),
                    weight: 0.01,
                });
                heatmapSource.addFeature(feature);
            }
        }
        heatmapLayer = new HeatmapLayer({
            source: heatmapSource,
            blur: 15,
            radius: 10,
            weight: 'weight',
            gradient: ['rgba(0, 0, 139, 0.5)', 'blue', 'green', 'yellow', 'red'],
            visible: false,
        });

        // Generate the tectonic plates layer
        const tectonicPlatesLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(tectonicPlatesData, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857',
                }),
            }),
            style: new Style({
                stroke: new Stroke({
                    color: 'red',
                    width: 1,
                }),
            }),
        });

        // Create map
        const map = new Map({
            target: 'map',
            layers: [openStreetMap, tectonicPlatesLayer, heatmapLayer, earthquakesLayer],
            view: new View({
                center: [0, 0],
                zoom: 2,
            }),
        });

        updateLegend(color, size);

        // Add interactions
        const select = addSelectionInteraction(map, earthquakeData, tsunamiDataFeatures, plots);
        const dragBox = addDragBoxInteraction(map, select, earthquakeData, tsunamiDataFeatures, plots);
    },
    update(plots, data) {
        // this.render(plots, data);
        let [earthquakeDataFeatures] = data;

        console.log(earthquakeDataFeatures);

        let geojson;
        if (earthquakeDataFeatures.length === 0) {
            geojson = allEarthquakeData;
        } else {
            geojson = {
                type: 'FeatureCollection',
                features: earthquakeDataFeatures,
            };
        }
        const selectedFeatures = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });

        for (let layer of [earthquakesLayer, heatmapLayer]) {
            const source = layer.getSource();
            source.clear();
            source.addFeatures(selectedFeatures);
        }
    },
};

const earthquakeStyle = function (feature) {
    return getStyle(feature, color, size);
};

const selectedStyle = function (feature) {
    // Dot style for selected earthquakes
    if (feature.get('geometry').getType() === 'Point') {
        const style = earthquakeStyle(feature);
        style.getImage().getFill().setColor('#738cfd');
        const stroke = new Stroke({ color: '#000000', width: 2 });
        style.getImage().setStroke(stroke);
        return style;
    } else {
        return new Style({
            stroke: new Stroke({
                color: 'red',
                width: 2,
            }),
        });
    }
};

function addSelectionInteraction(map, earthquakeData, tsunamiDataFeatures, plots) {
    const select = new Select({
        style: selectedStyle,
        condition: click,
    });
    map.addInteraction(select);

    select.on('select', function () {
        const selectedFeatures = select.getFeatures();
        const selectedFeaturesArr = selectedFeatures
            .getArray()
            .filter((feature) => feature.getGeometry().getType() === 'Point');
        // get the value of the selectButtonXaxis and selectButtonYaxis
        const xaxis_label = d3.select('#selectButtonXaxis').property('value');
        const yaxis_label = d3.select('#selectButtonYaxis').property('value');
        if (selectedFeaturesArr.length !== 0) {
            // get the earthquake from the earthquakeData that has the same id as the selected datapoint
            const selectedDataPoint = earthquakeData.features.filter(
                (d) => d.properties.Id === selectedFeaturesArr[0].get('Id'),
            )[0];
            plots['detailed_view'].update(plots, [[selectedDataPoint], tsunamiDataFeatures]);
            plots['date_selection'].update(plots, [selectedDataPoint]);
            plots['scatter_plot'].update(plots, [
                earthquakeData.features,
                [selectedDataPoint],
                xaxis_label,
                yaxis_label,
                tsunamiDataFeatures,
            ]);
        } else {
            plots['detailed_view'].update(plots, [[], tsunamiDataFeatures]);
            plots['date_selection'].update(plots, earthquakeData.features);
            plots['scatter_plot'].update(plots, [
                earthquakeData.features,
                undefined,
                xaxis_label,
                yaxis_label,
                tsunamiDataFeatures,
            ]);
        }
    });

    return select;
}

function addDragBoxInteraction(map, select, earthquakeData, tsunamiDataFeatures, plots) {
    // from: https://openlayers.org/en/latest/examples/box-selection.html
    const dragBox = new DragBox({
        condition: platformModifierKeyOnly,
    });

    const selectedFeatures = select.getFeatures();

    map.addInteraction(dragBox);

    dragBox.on('boxend', function () {
        const boxExtent = dragBox.getGeometry().getExtent();

        // if the extent crosses the antimeridian process each world separately
        const worldExtent = map.getView().getProjection().getExtent();
        const worldWidth = getWidth(worldExtent);
        const startWorld = Math.floor((boxExtent[0] - worldExtent[0]) / worldWidth);
        const endWorld = Math.floor((boxExtent[2] - worldExtent[0]) / worldWidth);

        for (let world = startWorld; world <= endWorld; ++world) {
            const left = Math.max(boxExtent[0] - world * worldWidth, worldExtent[0]);
            const right = Math.min(boxExtent[2] - world * worldWidth, worldExtent[2]);
            const extent = [left, boxExtent[1], right, boxExtent[3]];

            const boxFeatures = earthquakesLayer
                .getSource()
                .getFeaturesInExtent(extent)
                .filter(
                    (feature) =>
                        !selectedFeatures.getArray().includes(feature) &&
                        feature.getGeometry().intersectsExtent(extent),
                );

            // features that intersect the box geometry are added to the
            // collection of selected features

            // if the view is not obliquely rotated the box geometry and
            // its extent are equalivalent so intersecting features can
            // be added directly to the collection
            const rotation = map.getView().getRotation();
            const oblique = rotation % (Math.PI / 2) !== 0;

            // when the view is obliquely rotated the box extent will
            // exceed its geometry so both the box and the candidate
            // feature geometries are rotated around a common anchor
            // to confirm that, with the box geometry aligned with its
            // extent, the geometries intersect
            if (oblique) {
                const anchor = [0, 0];
                const geometry = dragBox.getGeometry().clone();
                geometry.translate(-world * worldWidth, 0);
                geometry.rotate(-rotation, anchor);
                const extent = geometry.getExtent();
                boxFeatures.forEach(function (feature) {
                    const geometry = feature.getGeometry().clone();
                    geometry.rotate(-rotation, anchor);
                    if (geometry.intersectsExtent(extent)) {
                        selectedFeatures.push(feature);
                    }
                });
            } else {
                selectedFeatures.extend(boxFeatures);
            }
        }
        // get the value of the selectButtonXaxis and selectButtonYaxis
        const xaxis_label = d3.select('#selectButtonXaxis').property('value');
        const yaxis_label = d3.select('#selectButtonYaxis').property('value');
        // filter the earthquake data to only include earthquakes with the same x and y as the selected points
        const selectedData = earthquakeData.features.filter(
            (d) =>
                selectedFeatures
                    .getArray()
                    .map((f) => f.get(xaxis_label))
                    .includes(d.properties[xaxis_label]) &&
                selectedFeatures
                    .getArray()
                    .map((f) => f.get(yaxis_label))
                    .includes(d.properties[yaxis_label]),
        );

        plots['scatter_plot'].update(plots, [
            earthquakeData.features,
            selectedData,
            xaxis_label,
            yaxis_label,
            tsunamiDataFeatures,
        ]);
        plots['date_selection'].update(plots, selectedData);
        plots['detailed_view'].update(plots, [selectedData, tsunamiDataFeatures]);
    });

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
        selectedFeatures.clear();
    });
}
