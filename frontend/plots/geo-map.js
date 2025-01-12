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
import {Circle, Fill, Stroke, Style} from 'ol/style';
import { DragBox, Select } from 'ol/interaction';
import * as olProj from 'ol/proj';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { getWidth } from 'ol/extent';
import * as d3 from "d3";

export let earthquakesLayer = null;
export let heatmapLayer = null;

// Default OSM layer
const openStreetMap = new TileLayer({
    source: new OSM(),
});

let color = d3.select("#color").property("value");
let size = d3.select("#size").property("value");

d3.select("#size").on("change", function () {
    size = d3.select(this).property("value");
    earthquakesLayer.getSource().changed();
});

d3.select("#color").on("change", function () {
    color = d3.select(this).property("value");
    earthquakesLayer.getSource().changed();
});


export const geo_map = {
    render(plots, data) {
        let [earthquakeData, tectonicPlatesData, tsunamiDataFeatures] = data;

        // Generate the earthquake layer
        earthquakesLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(earthquakeData, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857',
                }),
            }),
            style: earthquakeStyle,
            visible: false,
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
            visible: true,
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
                    color: 'blue',
                    width: 2,
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

        // Add interactions
        const select = addSelectionInteraction(map, earthquakeData, tsunamiDataFeatures, plots);
        const dragBox = addDragBoxInteraction(map, select, earthquakeData, plots);
    },
    update(plots, data) {
        this.render(plots, data);
    },
};

const earthquakeStyle = function (feature) {
    return getStyle(feature, color, size);
};

// Dot style for selected earthquakes
const selectedStyle = function (feature) {
    if (feature.get('geometry').getType() === 'Point') {
        const style = earthquakeStyle(feature);
        style.getImage().getFill().setColor('green');
        return style;
    }
    return new Style({
        stroke: new Stroke({
            color: 'green',
            width: 2,
        }),
    });
};

function addSelectionInteraction(map, earthquakeData, tsunamiDataFeatures, plots) {
    const select = new Select({ style: selectedStyle });
    map.addInteraction(select);

    map.on('click', function () {
        // TODO check whether a feature was actually clicked (and not the map)
        // Filter the earthquake data to only include earthquakes with the same magnitude and depth as the selected point
        const selectedData = earthquakeData.features.filter(
            (d) =>
                selectedFeatures
                    .getArray()
                    .map((f) => f.get('Mag'))
                    .includes(d.properties.Mag) &&
                selectedFeatures
                    .getArray()
                    .map((f) => f.get('Focal Depth (km)'))
                    .includes(d.properties['Focal Depth (km)']),
        );

        plots['date_selection'].update(plots, selectedData);
        plots['scatter_plot'].update(plots, selectedData);
        plots['detailed_view'].update(plots, [selectedData[0], tsunamiDataFeatures]);
    });

    return select;
}

function addDragBoxInteraction(map, select, earthquakeData, plots) {
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
        // filter the earthquake data to only include earthquakes with the same magnitude as the selected points
        const selectedData = earthquakeData.features.filter(
            (d) =>
                selectedFeatures
                    .getArray()
                    .map((f) => f.get('Mag'))
                    .includes(d.properties.Mag) &&
                selectedFeatures
                    .getArray()
                    .map((f) => f.get('Focal Depth (km)'))
                    .includes(d.properties['Focal Depth (km)']),
        );

        plots['scatter_plot'].update(plots, selectedData);
        plots['date_selection'].update(plots, selectedData);
    });

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
        selectedFeatures.clear();
    });
}

const countryColorMap = {};
const countryColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#d2f53c", "#fabebe", "#008080", "#e6beff",
    "#aa6e28", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
    "#000080", "#808080", "#000000", "#e41a1c", "#377eb8", "#4daf4a",
    "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999",
    "#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f",
    "#e5c494", "#b3b3b3", "#1b9e77", "#d95f02", "#7570b3", "#e7298a",
    "#66a61e", "#e6ab02", "#a6761d", "#666666", "#d53e4f", "#f46d43",
    "#fdae61", "#fee08b", "#e6f598", "#abdda4", "#66c2a5", "#3288bd",
    "#5e4fa2", "#1b7837", "#762a83", "#e7d4e8", "#d9f0d3", "#f7f7f7"
];

let colorIndex = 0;

const getCountryColor = (country) => {
    if (!country) return "#cccccc"; // Fallback for undefined country
    if (!countryColorMap[country]) {
        countryColorMap[country] = countryColors[colorIndex % countryColors.length];
        colorIndex++;
    }
    return countryColorMap[country];
};

function getStyle(feature, colorProperty, sizeProperty) {
    // Define color scales for different color properties
    const colorScales = {
        "Country": (value) => getCountryColor(value),
        "Tsu": (value) => value ? "rgba(0, 0, 255, 0.7)" : "#888888",
        "Mag": (value) =>
            value ? `rgba(255, ${255 - value * 25}, 0, 0.7)` : "#ffcc00",
        "MMI Int": (value) =>
            value ? `rgba(255, ${255 - value * 20}, ${value * 20}, 0.7)` : "#99ccff",
        "Total Death Description": (value) =>
            value ? ["#88cc88", "#ffcc00", "#ff9933", "#ff6666", "#cc0000"][value - 1] : "#cccccc",
        "Total Injuries Description": (value) =>
            value ? ["#88cc88", "#ffcc00", "#ff9933", "#ff6666", "#cc0000"][value - 1] : "#cccccc",
        "Total Damage Description": (value) =>
            value ? ["#88cc88", "#ffcc00", "#ff9933", "#ff6666", "#cc0000"][value - 1] : "#cccccc",
        "Total Houses Destroyed Description": (value) =>
            value ? ["#88cc88", "#ffcc00", "#ff9933", "#ff6666", "#cc0000"][value - 1] : "#cccccc",
        "Total Houses Damaged Description": (value) =>
            value ? ["#88cc88", "#ffcc00", "#ff9933", "#ff6666", "#cc0000"][value - 1] : "#cccccc",
    };

    const defaultSize = 1;
    const scalingFactor = 2;

    // Define size scales for different size properties
    const sizeScales = {
        "Mag": (value) => (value ? value * 1.5  : defaultSize), // Scale magnitude to size
        "Focal Depth (km)": (value) => (value ? Math.log(value + 1) * 3 : defaultSize),
        "MMI Int": (value) => (value ? value * 1.5 : defaultSize),
        "Total Deaths": (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        "Total Injuries": (value) => (value ? Math.log(value + 1) * scalingFactor: defaultSize),
        "Total Damage ($Mil)": (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        "Total Houses Destroyed": (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        "Total Houses Damaged": (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
    };

    // Get feature properties
    const colorValue = feature.get(colorProperty);
    const sizeValue = feature.get(sizeProperty);

    // Fallback to default styles if properties are missing or undefined
    const color = (colorScales[colorProperty] || (() => "#000000"))(colorValue);
    const size = (sizeScales[sizeProperty] || (() => 10))(sizeValue);

    // Return OpenLayers style
    return new Style({
        image: new Circle({
            radius: size,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: "#333333", width: 1 }),
        }),
    });
}
