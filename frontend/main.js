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
    let earthquakeData = d3.json('earthquakes.geojson');
    let tsunamiData = d3.json('tsunamis.geojson');
    let tectonicPlatesData = d3.json('TectonicPlateBoundaries.geojson');
    earthquakeData = await earthquakeData;
    tsunamiData = await tsunamiData;
    tectonicPlatesData = await tectonicPlatesData;
    
    loadOpenLayers(earthquakeData, tectonicPlatesData)
    loadScatterplot(earthquakeData.features)
    loadDateSelection(earthquakeData.features)
    loadDetailedView(undefined)

    // Reset the plots when clicking the reset button
    d3.select("#resetButton").on("click", function() {
        updatePlots(earthquakeData.features);
    });
}


function loadOpenLayers(earthquakeData, tectonicPlatesData) {

    const earthquakeStyle = function (feature) {
        let size = feature.get('Mag') ? feature.get('Mag') : 5;
        return new Style({
            image: new CircleStyle({
                radius: size,
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

    map.on("click", function() {
        // TODO check whether a feature was actually clicked (and not the map)
        // Filter the earthquake data to only include earthquakes with the same magnitude and depth as the selected point
        const selectedData = earthquakeData.features.filter(d => selectedFeatures.getArray().map(f => f.get('Mag')).includes(d.properties.Mag) && selectedFeatures.getArray().map(f => f.get('Focal Depth (km)')).includes(d.properties["Focal Depth (km)"]));
        // Update the plots
        updatePlots(selectedData);
        updateDetailedView(selectedData[0]);
    });


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
        // filter the earthquake data to only include earthquakes with the same magnitude as the selected points
        const selectedData = earthquakeData.features.filter(d => selectedFeatures.getArray().map(f => f.get('Mag')).includes(d.properties.Mag) && selectedFeatures.getArray().map(f => f.get('Focal Depth (km)')).includes(d.properties["Focal Depth (km)"]));        // update the plots
        updatePlots(selectedData);
    });

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
        selectedFeatures.clear();
    });

}

function loadScatterplot(earthquakeDataFeatures) {
    const margin = {top: 40, right: 30, bottom: 50, left: 60},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#scatterplot");
    
    // clear the axis
    svg.selectAll("*").remove();

    // TODO maybe keep the axis and only update the data
    svg.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Extract data: create an array of objects { mag: ..., z: ... }
    const points = earthquakeDataFeatures.map(d => {
        const mag = d.properties["Mag"]
        const z = d.properties["Focal Depth (km)"]
        return { mag, z };
    });

    const xExtent = d3.extent(points, d => d.mag);
    const yExtent = d3.extent(points, d => d.z);

    const xScale = d3.scaleLinear()
        .domain([0, xExtent[1]]).nice()
        .range([0, width])
        .unknown(margin.left);

    const yScale = d3.scaleLinear()
        .domain([0, yExtent[1]]).nice()
        .range([height, 0])
        .unknown(height - margin.bottom);

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
        .attr("y", +15)
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .text("Depth");

    // Plot the points as circles
    const dot = svg.selectAll("circle")
        .data(points)
        .join("circle")
        .attr("cx", d => xScale(d.mag))
        .attr("cy", d => yScale(d.z))
        .attr("r", 4)
        .attr("fill", "black");

    // Undefined dots are displayed in red
    // TODO how to handle this?
    dot.filter(d => d.mag === undefined || d.z === undefined)
        .attr("fill", "red");
    
    svg.on("click", function(chosenEvent) {
        // Make the chosen point green and all others black
        // d3.selectAll("circle").attr("fill", "black");
        // d3.select(chosenEvent.srcElement).attr("fill", "green");
        
        // Filter the current earthquake data to only include earthquakes with the same magnitude as the selected point
        // const selectedData = earthquakeDataFeatures.filter(d => selectedFeatures.getArray().map(f => f.get('Mag')).includes(d.properties.Mag) && selectedFeatures.getArray().map(f => f.get('Focal Depth (km)')).includes(d.properties["Focal Depth (km)"]));
        const selectedDataFeatures = earthquakeDataFeatures.filter(d => d.properties.Mag == chosenEvent.srcElement.__data__.mag && d.properties["Focal Depth (km)"] == chosenEvent.srcElement.__data__.z);
        // Update the plots
        updateDateSelection(selectedDataFeatures);
    });

    // from https://observablehq.com/@d3/brushable-scatterplot
    svg.call(d3.brush().on("start brush end", ({selection}) => {
        let value = [];
        if (selection) {
          const [[x0, y0], [x1, y1]] = selection;
          value = dot
            .style("fill", "black")
            .filter(d => x0 <= xScale(d.mag) && xScale(d.mag) < x1 && y0 <= yScale(d.z) && yScale(d.z) < y1)
            .style("fill", "green")
            .data();
            
            const selectedDataFeatures = earthquakeDataFeatures.filter(d => value.map(v => v.mag).includes(d.properties.Mag) && value.map(v => v.z).includes(d.properties["Focal Depth (km)"]));
            updateDateSelection(selectedDataFeatures);
        } else {
            dot.style("fill", "black");
        }
    
        // Inform downstream cells that the selection has changed.
        // TODO use this instead of calling the function to update the plots
        svg.property("value", value).dispatch("input");
      }));
}

function loadDateSelection(earthquakeDataFeatures) {
    const margin = { top: 50, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#dateSelection");

    // clear the axis
    svg.selectAll("*").remove();
    
    // TODO maybe keep the axis and only update the data
    svg.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    // Extract month/year from timestamp and count occurrences
    const counts = d3.rollup(
        earthquakeDataFeatures,
        v => v.length,
        d => {
            return parseInt(d.properties.Year);
        },
        d => {
            return parseInt(d.properties.Mo - 1); // 0-based month: 0 = January
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

function loadDetailedView(selectedDataPoint) {
    const detailed_view = d3.select("#detailedview")
        .append("text")
        .attr("y", 50);

    if (selectedDataPoint === undefined) {
        detailed_view.text("Nothing selected");
    } else {
        detailed_view.text("Selected magnitude: " + selectedDataPoint.properties.Mag);
    }
}

function updateDetailedView(selectedDataPoint) {
    const detailed_view = d3.select("#detailedview")
        .select("text");

    console.log(selectedDataPoint);
    if (selectedDataPoint === undefined) {
        detailed_view.text("Nothing selected");
    } else {
        // add magnitude and depth on new lines
        detailed_view.text("Magnitude: " + selectedDataPoint.properties.Mag 
            + " Depth: " + selectedDataPoint.properties["Focal Depth (km)"]
            + " Country: " + selectedDataPoint.properties.Country);
    }
}

function updateScatterplot(selectedDataFeatures) {
    // Update the scatterplot based on the selected features
    loadScatterplot(selectedDataFeatures);
}

function updateDateSelection(selectedDataFeatures) {
    // Update the scatterplot based on the selected features
    loadDateSelection(selectedDataFeatures);
}

function updatePlots(selectedDataFeatures) {
    // Update the plots based on the selected features
    loadScatterplot(selectedDataFeatures);
    loadDateSelection(selectedDataFeatures);
    // TODO update the map as well
}

main();
