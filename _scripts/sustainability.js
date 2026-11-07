/**
 * Downloads the Sustainability Service's "Sustainable Travel Map" (Google My
 * Maps) as KML and converts it to GeoJSON in assets/data/sustainability.
 *
 * Each My Maps layer becomes a "layer" property on its features, and the
 * marker colour and icon number are taken from the placemark's style id so the
 * map can be styled to match. The output is written with a stable order so
 * that changes to the My Map show up as small diffs.
 *
 * It also writes the cycling overlay for the buildings dataset
 * (assets/data/buildings/data/cycling.geojson, see overlays.mjs in the theme):
 * cycle parking, maintenance and hire, with a category for each point which
 * sets its marker. The categories, their icons, colours and labels are in
 * CYCLING below: edit them here, as the file is replaced each time.
 *
 * Run from any directory:
 *   node spacefinder/_scripts/sustainability.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const MAP_ID      = '1-8z7E-07p6NCXwpV3dJHHyMKArmHLXo';
const KML_URL     = `https://www.google.com/maps/d/kml?mid=${MAP_ID}&forcekml=1`;
const VIEWER_URL  = `https://www.google.com/maps/d/viewer?mid=${MAP_ID}`;
const OUTPUT_FILE = path.resolve(__dirname, '../assets/data/sustainability/sustainable-travel.geojson');
const CYCLING_FILE = path.resolve(__dirname, '../assets/data/buildings/data/cycling.geojson');

// The cycling overlay's categories. Each matches points by My Maps layer and
// icon number, and by colour if one is given (the parking colours show who
// can use it). The first category a point matches is its category.
const CYCLING = [
    { key: 'parking-public', layer: 'Cycle Parking', icon: '1522', colour: '#097138', marker: { icon: 'icon-bike-rack', colour: '#097138', label: 'Cycle parking' } },
    { key: 'parking-staff',  layer: 'Cycle Parking', icon: '1522', colour: '#A52714', marker: { icon: 'icon-bike-rack', colour: '#A52714', label: 'Cycle parking for staff and postgraduates' } },
    { key: 'parking-hooplr', layer: 'Cycle Parking', icon: '1522', colour: '#0288D1', marker: { icon: 'icon-bike-rack', colour: '#0288D1', label: 'Weatherproof cycle storage (book with Hooplr)' } },
    { key: 'maintenance',    layer: 'Cycles: maintenance and/or hire', icon: ['1590', '1603'], marker: { icon: 'icon-bike-rack', colour: '#424242', label: 'Repairs and maintenance' } },
    { key: 'hire',           layer: 'Cycles: maintenance and/or hire', icon: '1632', marker: { icon: 'icon-bike-rack', colour: '#F9A825', label: 'Bike hire' } },
];

// Text content of the first <tag> in xml, with CDATA unwrapped and entities decoded.
function text(xml, tag) {
    const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
    if (!m) return '';
    const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    if (cdata) return cdata[1].trim();
    return m[1]
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
        .trim();
}

function blocks(xml, tag) {
    return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, 'g')) || [];
}

function coordinates(str) {
    return str.trim().split(/\s+/).map(c => c.split(',').slice(0, 2).map(Number));
}

function geometry(placemark) {
    if (placemark.includes('<Point>')) {
        return { type: 'Point', coordinates: coordinates(text(placemark, 'coordinates'))[0] };
    }
    if (placemark.includes('<LineString>')) {
        return { type: 'LineString', coordinates: coordinates(text(placemark, 'coordinates')) };
    }
    if (placemark.includes('<Polygon>')) {
        return { type: 'Polygon', coordinates: [coordinates(text(text(placemark, 'outerBoundaryIs'), 'coordinates'))] };
    }
    return null;
}

function feature(placemark, layer) {
    const style = text(placemark, 'styleUrl').match(/icon-(\d+)-([0-9A-F]{6})/i);
    // Image URLs are dropped: Google issues new ones on every download (which
    // would change this file on every run) and some of them are already broken
    const description = text(placemark, 'description').replace(/<img [^>]*>(<br>)*/g, '').trim();
    return {
        type: 'Feature',
        properties: {
            layer:       layer,
            name:        text(placemark, 'name'),
            description: description,
            colour:      style ? '#' + style[2].toUpperCase() : null,
            icon:        style ? style[1] : null,
        },
        geometry: geometry(placemark),
    };
}

// The category of a feature from the Sustainable Travel Map, or null
function cyclingCategory(props) {
    const match = CYCLING.find(c => c.layer === props.layer && [].concat(c.icon).includes(props.icon) && (!c.colour || c.colour === props.colour));
    return match ? match.key : null;
}

// The cycling overlay: the cycling layers' points, with their categories
function cycling(features) {
    const points = [];
    features.filter(f => CYCLING.some(c => c.layer === f.properties.layer)).forEach(f => {
        const category = cyclingCategory(f.properties);
        if (!category) {
            console.warn(`  No cycling category for ${f.properties.name} (${f.properties.layer}, icon ${f.properties.icon}, ${f.properties.colour}): it will be a circle`);
        }
        points.push({
            type: 'Feature',
            properties: { name: f.properties.name, description: f.properties.description, category: category },
            geometry: f.geometry,
        });
    });
    return {
        type: 'FeatureCollection',
        title: 'Cycling',
        description: `Cycle parking, repairs and bike hire, from the <a href="${VIEWER_URL}">Sustainable Travel Map</a>`,
        style: { color: '#097138' },
        markers: {
            property: 'category',
            categories: Object.fromEntries(CYCLING.map(c => [c.key, c.marker])),
        },
        features: points,
    };
}

async function main() {
    const response = await fetch(KML_URL);
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    const kml = await response.text();

    const features = [];
    blocks(kml, 'Folder').forEach(folder => {
        const layer = text(folder, 'name');
        blocks(folder, 'Placemark').forEach(p => features.push(feature(p, layer)));
    });
    if (!features.length) {
        throw new Error('No placemarks found - has the KML format changed?');
    }

    const geojson = {
        type: 'FeatureCollection',
        name: text(kml, 'name'),
        source: VIEWER_URL,
        features: features,
    };
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 4));

    const cyclingGeojson = cycling(features);
    fs.writeFileSync(CYCLING_FILE, JSON.stringify(cyclingGeojson, null, 4));
    console.log(`Wrote ${cyclingGeojson.features.length} cycling points to ${path.relative(process.cwd(), CYCLING_FILE)}`);

    const counts = {};
    features.forEach(f => counts[f.properties.layer] = (counts[f.properties.layer] || 0) + 1);
    console.log(`Wrote ${features.length} features to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    Object.entries(counts).forEach(([layer, n]) => console.log(`  ${layer}: ${n}`));
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
