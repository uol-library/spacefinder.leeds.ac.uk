/**
 * Works out statistics for the art trail routes and stores them as properties
 * of each route's LineString feature: length, the number of artworks on the
 * route and the estimated time to walk it.
 *
 * An artwork counts as on the route if its coordinates are within
 * ARTWORK_DISTANCE metres of the line. The time allows for walking at
 * WALKING_SPEED plus MINUTES_PER_ARTWORK at each artwork.
 *
 * Coordinates are left as they are; only the properties change. The
 * FeatureCollection's description (shown with the route in Spacefinder, see
 * overlays.mjs in the theme) is set to a summary, e.g. "4.6 km, 22 artworks,
 * about 2 hours". Its other members (title, downloads, style, visible and
 * group) are kept as they are.
 *
 * Run from any directory, after editing a route or the artworks:
 *   node spacefinder/_scripts/routeStats.js [route files...]
 * With no arguments it updates route.geojson and shortroute.geojson in
 * assets/data/art/data.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROUTE_DIR           = path.resolve(__dirname, '../assets/data/art/data');
const DEFAULT_ROUTES      = ['route.geojson', 'shortroute.geojson'];
const WALKING_SPEED       = 1;  // m/s
const MINUTES_PER_ARTWORK = 2;
const ARTWORK_DISTANCE    = 50; // m from the route
const EARTH_RADIUS        = 6371008.8;

/**
 * Distance in metres between two [lon, lat] points (haversine)
 */
function distance( a, b ) {
    const rad = Math.PI / 180;
    const dLat = ( b[1] - a[1] ) * rad;
    const dLon = ( b[0] - a[0] ) * rad;
    const h = Math.sin( dLat / 2 ) ** 2 + Math.cos( a[1] * rad ) * Math.cos( b[1] * rad ) * Math.sin( dLon / 2 ) ** 2;
    return 2 * EARTH_RADIUS * Math.asin( Math.sqrt( h ) );
}

/**
 * Distance in metres from a [lon, lat] point to the nearest point of a line,
 * using a flat projection centred on the point (fine over a campus)
 */
function distanceToLine( point, coords ) {
    const kx = Math.PI / 180 * EARTH_RADIUS * Math.cos( point[1] * Math.PI / 180 );
    const ky = Math.PI / 180 * EARTH_RADIUS;
    const xy = c => [ ( c[0] - point[0] ) * kx, ( c[1] - point[1] ) * ky ];
    let nearest = Infinity;
    for ( let i = 1; i < coords.length; i++ ) {
        const [ ax, ay ] = xy( coords[i - 1] ), [ bx, by ] = xy( coords[i] );
        const dx = bx - ax, dy = by - ay;
        const t = Math.max( 0, Math.min( 1, -( ax * dx + ay * dy ) / ( dx * dx + dy * dy || 1 ) ) );
        nearest = Math.min( nearest, Math.hypot( ax + t * dx, ay + t * dy ) );
    }
    return nearest;
}

/**
 * [lon, lat] of each artwork in the art data files
 */
function artworks() {
    return fs.readdirSync( ROUTE_DIR ).filter( f => f.endsWith( '.json' ) ).map( f => {
        const geo = JSON.parse( fs.readFileSync( path.join( ROUTE_DIR, f ), 'utf8' ) ).mainEntity.spatial.geo;
        return [ parseFloat( geo.longitude ), parseFloat( geo.latitude ) ];
    });
}

/**
 * Statistics for one LineString
 */
function routeStats( coords, art ) {
    let length = 0;
    for ( let i = 1; i < coords.length; i++ ) {
        length += distance( coords[i - 1], coords[i] );
    }
    const count = art.filter( a => distanceToLine( a, coords ) <= ARTWORK_DISTANCE ).length;
    const walking = length / WALKING_SPEED / 60;
    return {
        length_m: Math.round( length ),
        artwork_count: count,
        walking_speed_mps: WALKING_SPEED,
        walking_time_min: Math.round( walking ),
        minutes_per_artwork: MINUTES_PER_ARTWORK,
        total_time_min: Math.round( walking + count * MINUTES_PER_ARTWORK ),
    };
}

/**
 * A route's length, number of artworks and time, e.g. 4.6 km, 22 artworks, about 2 hours
 */
function summary( stats ) {
    const hours = Math.round( stats.total_time_min / 30 ) / 2;
    const time = stats.total_time_min < 60 ? `${stats.total_time_min} minutes` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${( stats.length_m / 1000 ).toFixed( 1 )} km, ${stats.artwork_count} artworks, about ${time}`;
}

function main() {
    const files = process.argv.length > 2 ? process.argv.slice( 2 ).map( f => path.resolve( f ) ) : DEFAULT_ROUTES.map( f => path.join( ROUTE_DIR, f ) );
    const art = artworks();
    for ( const file of files ) {
        const { type, features, ...members } = JSON.parse( fs.readFileSync( file, 'utf8' ) );
        let description = members.description;
        for ( const feature of features ) {
            if ( feature.geometry.type !== 'LineString' ) {
                continue;
            }
            const { elevation_min_m, elevation_max_m, ascent_m, descent_m, elevation_source, ...properties } = feature.properties;
            const stats = routeStats( feature.geometry.coordinates, art );
            feature.properties = { ...properties, ...stats };
            description = summary( stats );
            console.log( path.basename( file ), stats );
        }
        /* the descriptive members before the features, so they are easy to find and edit */
        const geojson = { type, ...members, description, features };
        fs.writeFileSync( file, JSON.stringify( geojson, null, 2 ) + '\n' );
    }
}

if ( require.main === module ) {
    main();
}

module.exports = { ROUTE_DIR, DEFAULT_ROUTES, ARTWORK_DISTANCE, distanceToLine, routeStats };
