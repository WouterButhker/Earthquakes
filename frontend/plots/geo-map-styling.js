import { Circle, Fill, Stroke, Style } from 'ol/style';

const countryColorMap = {};
// prettier-ignore
const countryColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#d2f53c", "#fabebe", "#008080", "#e6beff",
    "#aa6e28", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
    "#000080", "#808080", "#3c1a1a", "#e41a1c", "#377eb8", "#4daf4a",
    "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999",
    "#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f",
    "#e5c494", "#b3b3b3", "#1b9e77", "#d95f02", "#7570b3", "#e7298a",
    "#66a61e", "#e6ab02", "#a6761d", "#666666", "#d53e4f", "#f46d43",
    "#fdae61", "#fee08b", "#e6f598", "#abdda4", "#66c2a5", "#3288bd",
    "#5e4fa2", "#1b7837", "#762a83", "#e7d4e8", "#d9f0d3", "#f7f7f7"
];

let colorIndex = 0;

const getCountryColor = (country) => {
    if (!country) return '#cccccc'; // Fallback for undefined country
    if (!countryColorMap[country]) {
        countryColorMap[country] = countryColors[colorIndex % countryColors.length];
        colorIndex++;
    }
    return countryColorMap[country];
};

export function getStyle(feature, colorProperty, sizeProperty) {
    // Define color scales for different color properties
    const colorScales = {
        Country: (value) => getCountryColor(value),
        Tsu: (value) => (value ? 'rgba(0, 0, 255, 0.7)' : '#888888'),
        Mag: (value) => (value ? `rgba(255, ${255 - value * 25}, 0, 0.7)` : '#888888'),
        'MMI Int': (value) => (value ? `rgba(255, ${255 - value * 20}, ${value * 20}, 0.7)` : '#888888'),
        'Total Death Description': (value) =>
            value ? ['#88cc88', '#ffcc00', '#ff9933', '#ff6666', '#cc0000'][value] : '#888888',
        'Total Injuries Description': (value) =>
            value ? ['#88cc88', '#ffcc00', '#ff9933', '#ff6666', '#cc0000'][value] : '#888888',
        'Total Damage Description': (value) =>
            value ? ['#88cc88', '#ffcc00', '#ff9933', '#ff6666', '#cc0000'][value] : '#888888',
        'Total Houses Destroyed Description': (value) =>
            value ? ['#88cc88', '#ffcc00', '#ff9933', '#ff6666', '#cc0000'][value] : '#888888',
        'Total Houses Damaged Description': (value) =>
            value ? ['#88cc88', '#ffcc00', '#ff9933', '#ff6666', '#cc0000'][value] : '#888888',
    };

    const defaultSize = 1;
    const scalingFactor = 2;

    // Define size scales for different size properties
    const sizeScales = {
        Mag: (value) => (value ? value * 1.5 : defaultSize), // Scale magnitude to size
        'Focal Depth (km)': (value) => (value ? Math.log(value + 1) * 3 : defaultSize),
        'MMI Int': (value) => (value ? value * 1.5 : defaultSize),
        'Total Deaths': (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        'Total Injuries': (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        'Total Damage ($Mil)': (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        'Total Houses Destroyed': (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
        'Total Houses Damaged': (value) => (value ? Math.log(value + 1) * scalingFactor : defaultSize),
    };

    // Get feature properties
    const colorValue = feature.get(colorProperty);
    const sizeValue = feature.get(sizeProperty);

    // Fallback to default styles if properties are missing or undefined
    const color = (colorScales[colorProperty] || (() => '#888888'))(colorValue);
    const size = (sizeScales[sizeProperty] || (() => 1))(sizeValue);

    // Return OpenLayers style
    return new Style({
        image: new Circle({
            radius: size,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#333333', width: 1 }),
        }),
    });
}

export const colorMapping = {
    Tsu: [
        { label: 'No Tsunami', color: '#888888' },
        { label: 'Tsunami', color: 'rgba(0, 0, 255, 0.7)' },
    ],
    Mag: [
        // Example magnitudes
        { label: 'Magnitude 2', color: 'rgba(255, 255 - 2*25, 0, 0.7)' },
        { label: 'Magnitude 5', color: 'rgba(255, 255 - 5*25, 0, 0.7)' },
        { label: 'Magnitude 7', color: 'rgba(255, 255 - 7*25, 0, 0.7)' },
        { label: 'Magnitude 9+', color: 'rgba(255, 255 - 9*25, 0, 0.7)' },
        { label: 'Unknown', color: '#888888' },
    ],

    'MMI Int': [
        { label: 'Intensity 2', color: `rgba(255, ${255 - 2 * 20}, ${2 * 20}, 0.7)` },
        { label: 'Intensity 5', color: `rgba(255, ${255 - 5 * 20}, ${5 * 20}, 0.7)` },
        { label: 'Intensity 7', color: `rgba(255, ${255 - 7 * 20}, ${7 * 20}, 0.7)` },
        { label: 'Intensity 9+', color: `rgba(255, ${255 - 9 * 20}, ${9 * 20}, 0.7)` },
        { label: 'Unknown', color: '#888888' },
    ],
    'Total Death Description': [
        { label: 'None', color: '#88cc88' },
        { label: 'Few (~1 to 50 deaths)', color: '#ffcc00' },
        { label: 'Some (~51 to 100 deaths)', color: '#ff9933' },
        { label: 'Many (~101 to 1000 deaths)', color: '#ff6666' },
        { label: 'Very many (over 1000 deaths)', color: '#cc0000' },
        { label: 'Unknown', color: '#888888' },
    ],
    'Total Injuries Description': [
        { label: 'None', color: '#88cc88' },
        { label: 'Few (~1 to 50 injuries)', color: '#ffcc00' },
        { label: 'Some(~51 to 100 injuries)', color: '#ff9933' },
        { label: 'Many (~101 to 1000 injuries)', color: '#ff6666' },
        { label: 'Very many (over 1000 injuries)', color: '#cc0000' },
        { label: 'Unknown', color: '#888888' },
    ],
    'Total Damage Description': [
        { label: 'None', color: '#88cc88' },
        { label: 'Limited (<$1 million)', color: '#ffcc00' },
        { label: 'Moderate (~$1 to $5 million)', color: '#ff9933' },
        { label: 'Severe (~$5 to $25 million)', color: '#ff6666' },
        { label: 'Extreme (~$25 million or more)', color: '#cc0000' },
        { label: 'Unknown', color: '#888888' },
    ],
    'Total Houses Destroyed Description': [
        { label: 'None', color: '#88cc88' },
        { label: 'Few (~1 to 50 houses)', color: '#ffcc00' },
        { label: 'Some (~51 to 100 houses)', color: '#ff9933' },
        { label: 'Many (~101 to 1000 houses)', color: '#ff6666' },
        { label: 'Very many (over 1000 houses)', color: '#cc0000' },
        { label: 'Unknown', color: '#888888' },
    ],
    'Total Houses Damaged Description': [
        { label: 'None', color: '#88cc88' },
        { label: 'Few (~1 to 50 houses)', color: '#ffcc00' },
        { label: 'Some (~51 to 100 houses)', color: '#ff9933' },
        { label: 'Many (~101 to 1000 houses)', color: '#ff6666' },
        { label: 'Very many (over 1000 houses)', color: '#cc0000' },
        { label: 'Unknown', color: '#888888' },
    ],
};

/**
 * Example size checkpoints for each size property
 * (these are just “sample” reference values).
 */
const sizeSamples = {
    Mag: ['Unknown', 2, 5, 7, 9],
    'Focal Depth (km)': ['Unknown', 10, 50, 100, 300],
    'MMI Int': ['Unknown', 2, 5, 7, 9],
    'Total Deaths': ['Unknown', 10, 100, 1000, 10000],
    'Total Injuries': ['Unknown', 10, 100, 1000, 10000],
    'Total Damage ($Mil)': ['Unknown', 10, 100, 1000, 10000],
    'Total Houses Destroyed': ['Unknown', 10, 100, 1000, 10000],
    'Total Houses Damaged': ['Unknown', 10, 100, 1000, 10000],
};

/**
 * Rebuild the legend contents based on the currently selected color/size properties.
 * @param {string} currentColor - The color property (as selected in #color)
 * @param {string} currentSize  - The size property (as selected in #size)
 */
export function updateLegend(currentColor, currentSize) {
    const legendEl = document.getElementById('legend');
    if (!legendEl) return;

    let html = '';

    // 1) Show a color legend for the currently active color property
    //    (ONLY if it's not 'Country' and we have a mapping for it)
    if (currentColor !== 'Country' && colorMapping[currentColor]) {
        html += `<div class="legend-section">
               <h3>Color Legend: ${currentColor}</h3>`;

        colorMapping[currentColor].forEach(({ label, color }) => {
            html += `
        <div class="legend-item">
          <div class="color-box" style="background:${color}"></div>
          <div>${label}</div>
        </div>
      `;
        });
        html += `</div>`;
    }

    // 2) Show a size legend for the currently selected size property
    if (sizeSamples[currentSize]) {
        html += `<div class="legend-section">
               <h3>Size Legend: ${currentSize}</h3>`;
        sizeSamples[currentSize].forEach((value) => {
            const radius = computeRadius(currentSize, value);
            html += `
        <div class="legend-item">
          <span 
            class="circle-sample" 
            style="width:${2 * radius}px;height:${2 * radius}px;background:#999">
          </span>
          <span>${value}</span>
        </div>`;
        });
        html += `</div>`;
    }

    legendEl.innerHTML = html;
}

/**
 * Approximate the size radius from your getStyle() logic
 * so the user can interpret the circle sizes in the legend.
 */
function computeRadius(sizeProp, value) {
    const defaultSize = 1;
    const scalingFactor = 2;

    if (value === 'Unknown') return defaultSize;

    switch (sizeProp) {
        case 'Mag':
            return value ? value * 1.5 : defaultSize;
        case 'Focal Depth (km)':
            return value ? Math.log(value + 1) * 3 : defaultSize;
        case 'MMI Int':
            return value ? value * 1.5 : defaultSize;
        case 'Total Deaths':
        case 'Total Injuries':
        case 'Total Damage ($Mil)':
        case 'Total Houses Destroyed':
        case 'Total Houses Damaged':
            return value ? Math.log(value + 1) * scalingFactor : defaultSize;
        default:
            return defaultSize;
    }
}
