import * as d3 from 'd3';

let descriptionMapping = null;
let content = document.getElementById('details-content');
const descFields = ['Deaths', 'Injuries', 'Missing', 'Damage ($Mil)', 'Houses Destroyed', 'Houses Damaged'];
const timeFields = ['Year', 'Mo', 'Dy', 'Hr', 'Mn', 'Sec'];
const skippedFields = ['Id', 'Tsu', 'Region', 'Latitude', 'Longitude'].concat(timeFields);
const tsunamiSkippedFields = ['Id', 'Tsu', 'Region', 'Latitude', 'Longitude', 'Earthquake Magnitude'].concat(timeFields);

export const detailed_view = {
    render(plots, cmap) {
        const detailed_text = d3.select('#detailed_text').append('text');
        detailed_text.text('[no earthquake selected]');
        // Store description mapping from legend colormap
        descriptionMapping = new Map();
        for (const [key, value] of Object.entries(cmap)) {
            let baseField = key.replace(' Description', '').replace('Total ', '');
            if (baseField == 'Damage') baseField = 'Damage ($Mil)';
            descriptionMapping.set(
                baseField,
                value.map((d) => d.label),
            );
        }
        content.innerHTML = "<div class='details-section'>[no earthquake selected]</div>";
        d3.select('#poi_text').text('[no earthquakes selected]');
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;

        if (selectedDataPoint === undefined || (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 0)) {
            content.innerHTML = "<div class='details-section'>[no earthquake selected]</div>";
            d3.select('#poi_text').text('[no earthquakes selected]');
            return;
        }
        // if (Array.isArray(selectedDataPoint) && selectedDataPoint.length > 1) {
        //     let multipleText = '[multiple earthquakes selected. Please select a single earthquake to view details]';
        //     content.innerHTML = `<div class='details-section'>${multipleText}</div>`;
        //     d3.select('#poi_text').text('[multiple earthquakes selected]');
        //     return;
        // }
        else if (Array.isArray(selectedDataPoint)) {
            selectedDataPoint = selectedDataPoint[0];
        }

        // Update Point of Interest text
        changePOI(selectedDataPoint);

        // Update the detailed text
        content.innerHTML = generateDetails(selectedDataPoint, tsunamiDataFeatures);
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
    } else if (id === 10036) {
        const weblink = 'https://www.ngdc.noaa.gov/hazel/view/hazards/earthquake/event-more-info/10036';
        const information =
            'Fourteen people killed, 200 injured and at least 50 buildings destroyed due to a fertilizer factory explosion at West. Damage estimated at about 100 million U.S. dollars. The magnitude measures only the ground motion, not the air wave, so is substantially less than the true size of the event.';

        const new_poi_text =
            '<a href="' + weblink + '" target="_blank">Link to official information</a><br>' + information;
        poi_text.html(new_poi_text);
    } else {
        poi_text.html('[no point of interest selected]');
    }
}

function generateDetails(selectedDataPoint, tsunamiDataFeatures) {
    const fieldMap = new Map(),
        tsunamiFieldMap = new Map();
    for (let [props, map, skipped] of [
        [selectedDataPoint.properties, fieldMap, skippedFields],
        [getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures), tsunamiFieldMap, tsunamiSkippedFields],
    ]) {
        if (!props) continue;
        let listofProperties = Object.keys(props);
        // Handle paired fields and descriptions
        const pairFields = new Map();
        for (let base of descFields) {
            // Process both regular and total fields
            for (let prefix of ['', 'Total ']) {
                let f = prefix + base;
                let desc = `${f} Description`.replace(' ($Mil)', '');
                // Use a value if present
                if (listofProperties.includes(f)) {
                    const value = props[f];
                    pairFields.set(f, value);
                    // Else use a remapped description if present
                } else if (listofProperties.includes(desc)) {
                    const descValue = props[desc];
                    const mappedValue = descriptionMapping.get(base)[parseInt(descValue)] || descValue;
                    pairFields.set(f, mappedValue);
                }
            }
        }
        // Handle other fields
        listofProperties.forEach((field) => {
            // Skipped pair
            if (
                field.includes('Description') ||
                descFields.includes(field.replace('Total ', '')) ||
                skipped.includes(field)
            )
                return;
            const value = props[field];
            map.set(field, value);
        });
        // Append paired fields
        for (const [field, value] of pairFields) map.set(field, value);
        // Format time field
        const timeParts = timeFields.map((f) => props[f]).filter((p) => p !== undefined);
        if (timeParts.length > 0) {
            const [year, month, day, hour, minute, second] = timeParts;
            const formattedTime = formatDateTime(year, month, day, hour, minute, second);
            map.set('Time', formattedTime);
        }
    }

    // Generate HTML from the map
    let new_detailed_text = "<div class='details-section'> <b>Earthquake Details:</b><br>";
    fieldMap.forEach((value, key) => (new_detailed_text += `${key}: ${value}<br>`));
    new_detailed_text += '</div>';
    if (tsunamiFieldMap.size > 0) {
        new_detailed_text += "<div class='details-section'> <b>Related Tsunami Details:</b><br>";
        tsunamiFieldMap.forEach((value, key) => (new_detailed_text += `${key}: ${value}<br>`));
        new_detailed_text += '</div>';
    }
    return new_detailed_text;
}

function getRelatedTsunamis(selectedDataPoint, tsunamiDataFeatures) {
    const tsunamiID = selectedDataPoint.properties.Tsu;
    if (!tsunamiID) return undefined;
    else {
        const selectedData = tsunamiDataFeatures.filter((d) => d.properties.Id == tsunamiID);
        return selectedData[0].properties;
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
