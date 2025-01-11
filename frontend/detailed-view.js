import * as d3 from 'd3';

export const detailed_view = {
    render(plots, data) {
        let selectedDataPoint = data;

        const text_magnitude = d3.select('#text_magnitude').append('text');
        const text_depth = d3.select('#text_depth').append('text');
        const text_country = d3.select('#text_country').append('text');
        const text_date = d3.select('#text_date').append('text');
        const text_disasters = d3.select('#text_disasters').append('text');
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;
        const text_magnitude = d3.select('#text_magnitude').select('text');
        const text_depth = d3.select('#text_depth').select('text');
        const text_country = d3.select('#text_country').select('text');
        const text_date = d3.select('#text_date').select('text');
        const text_disasters = d3.select('#text_disasters').select('text');

        console.log(selectedDataPoint);
        if (selectedDataPoint === undefined) {
            text_magnitude.text('Nothing selected');
            text_depth.text('Nothing selected');
            text_country.text('Nothing selected');
            text_date.text('Nothing selected');
            text_disasters.text('Nothing selected');
        } else {
            // TODO add handlers for when the data is not available
            text_magnitude.text(selectedDataPoint.properties.Mag);
            text_depth.text(selectedDataPoint.properties['Focal Depth (km)']);
            text_country.text(selectedDataPoint.properties['Location Name']);
            const datestring = getDateString(selectedDataPoint.properties.Mo, selectedDataPoint.properties.Year);
            text_date.text(datestring);
            text_disasters.text(getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures));
        }
    },
};

function getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures) {
    const tsunamiID = selectedDataPoint.properties.Tsu;
    if (tsunamiID === undefined) {
        return 'No related tsunamis';
    } else {
        const selectedData = tsunamiDataFeatures.filter((d) => d.properties.Id == tsunamiID);
        console.log(selectedData);
        return selectedData[0].properties['Location Name'];
    }
}

function getDateString(month, year) {
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];

    return months[month] + ' ' + year;
}
