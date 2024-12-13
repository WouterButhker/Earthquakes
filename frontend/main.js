import * as d3 from 'd3';

async function loadData() {
    const data = await d3.json('query.json');
    console.log(data);
    console.log("Test");


    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

// Map and projection
    var projection = d3.geoNaturalEarth1()
        .scale(width / 1.3 / Math.PI)
        .translate([width / 2, height / 2])

// Load external data and boot

    // Draw the map
    svg.append("g")
        .selectAll("path")
        .data(data.features)
        .enter().append("path")
        .attr("fill", "#69b3a2")
        .attr("d", d3.geoPath()
            .projection(projection)
        )
        .style("stroke", "#fff")

}

loadData();
