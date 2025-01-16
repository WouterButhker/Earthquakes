import * as d3 from 'd3';

export const detailed_view = {
    render(plots, data) {
        let selectedDataPoint = data;

        const detailed_text = d3.select('#detailed_text').append('text');
        detailed_text.text('[no earthquake selected]');
    },
    update(plots, data) {
        let [selectedDataPoint, tsunamiDataFeatures] = data;

        if (selectedDataPoint === undefined || (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 0)) {
            d3.select('#detailed_text').select('text').text('[no earthquake selected]');
            d3.select('#poi_text').text('[no earthquakes selected]');
            return
        }
        if (Array.isArray(selectedDataPoint) && selectedDataPoint.length > 1) {
            d3.select('#detailed_text').select('text').text('[multiple earthquakes selected. Please select a single earthquake to view details]');
            d3.select('#poi_text').text('[multiple earthquakes selected]');
            return;
        } else if (Array.isArray(selectedDataPoint) && selectedDataPoint.length === 1) {
            selectedDataPoint = selectedDataPoint[0];
        }

        // Change the Point of Interest text
        changePOI(selectedDataPoint);
        const detailed_text = d3.select('#detailed_text').select('text');

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
        
    },
};

// Update Point of Interest text
function changePOI(selectedDataPoint) {
    const id = selectedDataPoint.properties.Id;
    const poi_text = d3.select('#poi_text');

    if (id === 3227) {
        const weblink = "https://www.ngdc.noaa.gov/hazel/view/hazards/earthquake/event-more-info/3227";
        const information = "There was a catastrophic earthquake in the Kanto region. The source of the earthquake, and the moderate tsunami which it generated, included Sagami Gulf and the Boso Peninsula, as well as adjacent areas of the sea and land, and apparently was oriented latitudinally. The assumed length of the source was 150-200 km.";
        
        const new_poi_text = '<a href="' + weblink + '" target="_blank">Link to official information</a><br>' + information;
        poi_text.html(new_poi_text);
    }
    else if (id === 7843) {
        const weblink = "https://www.ngdc.noaa.gov/hazel/view/hazards/earthquake/event-more-info/7843";
        const information = "At least 69,185 people killed, 374,171 injured and 18,467 missing and presumed dead in the Chengdu-Lixian-Guangyuan area. More than 45.5 million people in 10 provinces and regions were affected. At least 15 million people were evacuated from their homes and more than 5 million were left homeless. An estimated 5.36 million buildings collapsed and more than 21 million buildings were damaged in Sichuan and in parts of Chongqing, Gansu, Hubei, Shaanxi and Yunnan.";
    
        const new_poi_text = '<a href="' + weblink + '" target="_blank">Link to official information</a><br>' + information;
        poi_text.html(new_poi_text);
    }
    else {
        poi_text.html('[no point of interest selected]');
    }

}


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
