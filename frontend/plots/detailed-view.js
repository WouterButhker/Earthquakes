import * as d3 from 'd3';

export const detailed_view = {
    render(plots, data) {
        let selectedDataPoint = data;

        const detailed_text = d3.select('#detailed_text').append('text');
        detailed_text.text('[no earthquake selected]');
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;
        // console.log(selectedDataPoint);

        if (selectedDataPoint === undefined || (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 0)) {
            d3.select('#detailed_text').select('text').text('[no earthquake selected]');
            return;
        }

        if (Array.isArray(selectedDataPoint) && selectedDataPoint.length > 1) {
            d3.select('#detailed_text').select('text').text('[multiple earthquakes selected. Please select a single earthquake to view details]');
            return;
        } else if (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 1) {
            selectedDataPoint = selectedDataPoint[0];
        }

        const detailed_text = d3.select('#detailed_text').select('text');

        if (selectedDataPoint === undefined) {
            console.log('selected datapoint undefined');
            detailed_text.text('[no earthquake selected]');
        } else {
            // Get a list of all the available properties of the selectedDataPoint
            const listofProperties = Object.keys(selectedDataPoint.properties);

            // TODO filter the list of properties to only show the relevant properties

            var new_detailed_text = listofProperties
                .map((d) => d + ': ' + selectedDataPoint.properties[d])
                .join('<br>');

            const related_tsunami = getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures);
            // If there is a related tsunami, join the related tsunami to the detailed text
            if (related_tsunami !== 'No related tsunamis') {
                new_detailed_text += '<br>Related Tsunami: ' + related_tsunami;
            }

            // set html text as the new detailed text
            detailed_text.html(new_detailed_text);
        }
    },
};

function getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures) {
    const tsunamiID = selectedDataPoint.properties.Tsu;
    if (tsunamiID === undefined) {
        return 'No related tsunamis';
    } else {
        const selectedData = tsunamiDataFeatures.filter((d) => d.properties.Id == tsunamiID);
        console.log('related tsunami data: ', selectedData);
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
