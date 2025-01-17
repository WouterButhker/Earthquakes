import * as d3 from 'd3';

let descriptionMapping = null;

export const detailed_view = {
    render(plots, cmap) {
        const detailed_text = d3.select('#detailed_text').append('text');
        detailed_text.text('[no earthquake selected]');
        // Store description mapping from legend colormap
        descriptionMapping = new Map();
        for (const [key, value] of Object.entries(cmap)) {
            descriptionMapping.set(key, value.map(d => d.label));
        }
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;

        if (selectedDataPoint === undefined || (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 0)) {
            d3.select('#detailed_text').select('text').text('[no earthquake selected]');
            d3.select('#poi_text').text('[no earthquakes selected]');
            return;
        }
        if (Array.isArray(selectedDataPoint) && selectedDataPoint.length > 1) {
            d3.select('#detailed_text')
                .select('text')
                .text('[multiple earthquakes selected. Please select a single earthquake to view details]');
            d3.select('#poi_text').text('[multiple earthquakes selected]');
            return;
        } else if (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 1) {
            selectedDataPoint = selectedDataPoint[0];
        }

        // Update Point of Interest text
        changePOI(selectedDataPoint);

        // Update the detailed text
        d3.select('#detailed_text').select('text').html(generateDetails(selectedDataPoint, tsunamiDataFeatures));
    },
};

// Update Point of Interest text
function changePOI(selectedDataPoint) {
    const id = selectedDataPoint.properties.Id;
    const poi_text = d3.select('#poi_text');

    if (id === 3227) {
        const weblink = 'https://www.ngdc.noaa.gov/hazel/view/hazards/earthquake/event-more-info/3227';
        const information =
            'There was a catastrophic earthquake in the Kanto region. The source of the earthquake, and the moderate tsunami which it generated, included Sagami Gulf and the Boso Peninsula, as well as adjacent areas of the sea and land, and apparently was oriented latitudinally. The assumed length of the source was 150-200 km.';

        const new_poi_text =
            '<a href="' + weblink + '" target="_blank">Link to official information</a><br>' + information;
        poi_text.html(new_poi_text);
    } else if (id === 7843) {
        const weblink = 'https://www.ngdc.noaa.gov/hazel/view/hazards/earthquake/event-more-info/7843';
        const information =
            'At least 69,185 people killed, 374,171 injured and 18,467 missing and presumed dead in the Chengdu-Lixian-Guangyuan area. More than 45.5 million people in 10 provinces and regions were affected. At least 15 million people were evacuated from their homes and more than 5 million were left homeless. An estimated 5.36 million buildings collapsed and more than 21 million buildings were damaged in Sichuan and in parts of Chongqing, Gansu, Hubei, Shaanxi and Yunnan.';

        const new_poi_text =
            '<a href="' + weblink + '" target="_blank">Link to official information</a><br>' + information;
        poi_text.html(new_poi_text);
    } else {
        poi_text.html('[no point of interest selected]');
    }
}

function generateDetails(selectedDataPoint, tsunamiDataFeatures) {
    const listofProperties = Object.keys(selectedDataPoint.properties);
    const fieldMap = new Map();

    // Handle paired fields and descriptions
    const processedFields = new Set();
    listofProperties.forEach((field) => {
        // Handle description fields
        // if (field.endsWith(' Description')) {
        //     const baseField = field.replace(' Description', '');
        //     if (listofProperties.includes(baseField)) {
        //         const value = selectedDataPoint.properties[baseField];
        //         fieldMap.set(baseField, value); // Add to the map
        //     } else {
        //         const descValue = selectedDataPoint.properties[field];
        //         const mappedValue = descValue;
        //         // const mappedValue = descriptionMapping.get(baseField)[descValue] || descValue;
        //         fieldMap.set(baseField, mappedValue); // Add to the map
        //     }
        //     processedFields.add(baseField);
        //     processedFields.add(field);
        // Handle regular fields
        // } else if (!processedFields.has(field)) {



        const value = selectedDataPoint.properties[field];
        fieldMap.set(field, value);
        processedFields.add(field);
    });

    // Format time field
    const timeFields = ['Year', 'Mo', 'Dy', 'Hr', 'Mn', 'Sec'];
    const timeParts = timeFields.map((field) => selectedDataPoint.properties[field]).filter((part) => part !== undefined);
    if (timeParts.length > 0) {
        const [year, month, day, hour, minute, second] = timeParts;
        const formattedTime = formatDateTime(year, month, day, hour, minute, second);
        fieldMap.set('Time', formattedTime);
    }

    // Add related tsunami information
    const related_tsunami = getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures);
    if (related_tsunami !== 'No related tsunamis') {
        fieldMap.set('Related Tsunami', related_tsunami); // Add tsunami info to the map
    }

    // Generate HTML from the map
    let new_detailed_text = '';
    const deletedFields = new Set(['Id', 'Tsu'].concat(timeFields));
    for (const field of deletedFields) fieldMap.delete(field);
    fieldMap.forEach((value, key) => new_detailed_text += `${key}: ${value}<br>`);

    return new_detailed_text;
}

function getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures) {
    const tsunamiID = selectedDataPoint.properties.Tsu;
    if (tsunamiID === undefined) {
        return 'No related tsunamis';
    } else {
        const selectedData = tsunamiDataFeatures.filter((d) => d.properties.Id == tsunamiID);
        return selectedData[0].properties['Location Name'];
    }
}

function formatDateTime(year, month, day, hour, minute, second) {
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

    const monthName = month ? months[month - 1] : '-';
    const dateParts = [
        monthName,
        ' ',
        day ? day.toString().padStart(2, '0') : '-',
        ', ',
        year || '-',
        ' ',
        hour !== undefined ? hour.toString().padStart(2, '0') : '-',
        ':',
        minute !== undefined ? minute.toString().padStart(2, '0') : '-',
        ':',
        second !== undefined ? second.toString().padStart(2, '0') : '-',
    ].filter(Boolean);

    return dateParts.length > 0 ? dateParts.join('') : 'Unknown time';
}
