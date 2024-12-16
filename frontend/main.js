import * as d3 from 'd3';
import TileLayer from "ol/layer/Tile";
import {OSM, TileWMS, XYZ} from "ol/source";
import {View} from "ol";
import Map from 'ol/Map.js';
import VectorSource from "ol/source/Vector";
import {GeoJSON} from "ol/format";
import VectorLayer from "ol/layer/Vector";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {DragBox, Select} from "ol/interaction";
import {platformModifierKeyOnly} from "ol/events/condition";
import {getWidth} from "ol/extent";


function main() {
    loadOpenLayers()
}


async function loadOpenLayers() {

    const earthquakeStyle = function (feature) {
        return new Style({
            image: new CircleStyle({
                radius: feature.get('mag') * 1,
                fill: new Fill({
                    color: 'red'
                })
            })
        })
    }

    const earthquakeData = await d3.json('query.json');
    const earthquakesLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(earthquakeData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        }),
        style: earthquakeStyle
    })

    const tectonicPlatesData = await d3.json('TectonicPlateBoundaries.geojson');
    const tectonicPlatesLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(tectonicPlatesData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        }),
        style: new Style({
            stroke: new Stroke({
                color: 'blue',
                width: 2
            })
        })
    })

    const openStreetMap = new TileLayer({
        source: new OSM()
    });

    const map = new Map({
        target: 'map',
        layers: [
            openStreetMap,
            tectonicPlatesLayer,
            earthquakesLayer
        ],
        view: new View({
            center: [0, 0],
            zoom: 2,
        }),
    });

    const selectedStyle = function (feature) {
        if (feature.get('geometry').getType() === 'Point') {
            const style = earthquakeStyle(feature);
            style.getImage().getFill().setColor('green');
            return style
        }
        return new Style({
            stroke: new Stroke({
                color: 'green',
                width: 2
            })
        })
    }

    // a normal select interaction to handle click
    const select = new Select({
        style: selectedStyle
    });
    map.addInteraction(select);

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

            const boxFeatures = earthquakesLayer.getSource()
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
    });

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
        selectedFeatures.clear();
    });

}


main();
