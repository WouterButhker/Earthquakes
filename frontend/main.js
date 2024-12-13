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


async function main() {
    let earthquakeData = d3.json('query.json');
    let tectonicPlatesData = d3.json('TectonicPlateBoundaries.geojson');
    earthquakeData = await earthquakeData;
    tectonicPlatesData = await tectonicPlatesData;

    loadOpenLayers(earthquakeData, tectonicPlatesData)
    loadScatterplot(earthquakeData)
    loadDateSelection(earthquakeData)
}


function loadOpenLayers(earthquakeData, tectonicPlatesData) {

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


    const earthquakesLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(earthquakeData, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        }),
        style: earthquakeStyle
    })


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

function loadScatterplot(earthquakeData) {
    const margin = {top: 40, right: 30, bottom: 50, left: 60},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#scatterplot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Extract data: create an array of objects { mag: ..., z: ... }
    const points = earthquakeData.features.map(d => {
        const mag = d.properties.mag;
        const coords = d.geometry.coordinates; // [x, y, z]
        const z = coords[2];
        return { mag, z };
    });

    const xExtent = d3.extent(points, d => d.mag);
    const yExtent = d3.extent(points, d => d.z);

    const xScale = d3.scaleLinear()
        .domain(xExtent).nice()
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(yExtent).nice()
        .range([height, 0]);

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    // Add axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${width/2}, ${height+40})`)
        .style("text-anchor", "middle")
        .text("Magnitude");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .text("Depth");

    // Plot the points as circles
    svg.selectAll("circle")
        .data(points)
        .join("circle")
        .attr("cx", d => xScale(d.mag))
        .attr("cy", d => yScale(d.z))
        .attr("r", 4);

}

function loadDateSelection(earthquakeData) {
    const margin = { top: 50, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#dateSelection")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    // Extract month/year from timestamp and count occurrences
    const counts = d3.rollup(
        earthquakeData.features,
        v => v.length,
        d => {
            const date = new Date(d.properties.time);
            return date.getFullYear();
        },
        d => {
            const date = new Date(d.properties.time);
            return date.getMonth(); // 0-based month: 0 = January
        }
    );

    // Convert the rollup to a flat array for easier scales
    // This array will look like: [{year: ..., month: ..., count: ...}, ...]
    let yearMonthData = [];
    for (let [year, monthMap] of counts.entries()) {
        for (let [month, count] of monthMap.entries()) {
            yearMonthData.push({ year, month, count });
        }
    }

    // Determine the range of years and define months
    const years = Array.from(d3.group(yearMonthData, d => d.year).keys()).sort((a,b) => a - b);
    const months = d3.range(0, 12); // 0=Jan, 11=Dec

    // Create scales
    const xScale = d3.scaleBand()
        .domain(months)
        .range([0, width])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(years)
        .range([0, height])
        .padding(0.05);

    // Color scale based on counts
    const countExtent = d3.extent(yearMonthData, d => d.count);
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, countExtent[1]]);

    // Draw the cells
    g.selectAll(".cell")
        .data(yearMonthData)
        .join("rect")
        .attr("class", "cell")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScale(d.year))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.count));

    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => {
            // Format month numbers to names
            const formatMonth = d3.timeFormat("%b");
            return formatMonth(new Date(2020, d, 1));
        });

    const yAxis = d3.axisLeft(yScale)
        .tickFormat(d => d);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    g.append("g")
        .call(yAxis);

    // Axis labels
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width/2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Month");

    g.append("text")
        .attr("class", "axis-label")
        .attr("y", -40)
        .attr("x", -height/2)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Year");

    // Optional: Add a legend for the color scale
    const legendWidth = 200, legendHeight = 20;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top - 30})`);

    const legendScale = d3.scaleLinear()
        .domain([0, countExtent[1]])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickSize(-legendHeight);

    // Add a gradient for the legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    const legendInterpolator = d3.interpolateBlues;
    const numStops = 10;
    d3.range(numStops).forEach(i => {
        gradient.append("stop")
            .attr("offset", (i/(numStops-1))*100 + "%")
            .attr("stop-color", legendInterpolator(i/(numStops-1)));
    });

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    legendGroup.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${legendHeight})`)
        .call(legendAxis)
        .select(".domain").remove();

    legendGroup.append("text")
        .attr("class", "legend")
        .attr("y", -5)
        .attr("x", legendWidth/2)
        .attr("text-anchor", "middle")
        .text("Count");
}


main();
