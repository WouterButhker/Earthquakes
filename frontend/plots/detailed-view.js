import * as d3 from 'd3';

export const detailed_view = {
    render(plots, data) {
        let selectedDataPoint = data;

        const detailed_text = d3.select('#detailed_text').append('text');
        detailed_text.text('[no earthquake selected]');
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;
        const detailed_text = d3.select('#detailed_text').select('text');

        if (selectedDataPoint === undefined) {
            console.log('selected datapoint undefined');
            detailed_text.text('[no earthquake selected]');
        } else {
            // Get a list of all the available properties of the selectedDataPoint
            const listofProperties = Object.keys(selectedDataPoint.getProperties());
            // TODO set each property to a new line
            const new_detailed_text = listofProperties.map((d) => d + ': ' + selectedDataPoint.getProperties()[d]).join("<br>");
            // set html text as the new detailed text
            detailed_text.html(new_detailed_text);
            // text_date.text(getDateString(selectedDataPoint.properties.Mo, selectedDataPoint.properties.Year));
            // text_disasters.text(getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures));
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
