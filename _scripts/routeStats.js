/**
 * Works out statistics for the art trail routes and stores them as properties
 * of each route's LineString feature: length, estimated walking time,
 * elevation range and total ascent and descent.
 *
 * Elevations come from the EU-DEM (25 m grid) via the OpenTopoData API, sampled
 * every 10 m along the route and smoothed over 50 m. The grid is too coarse to
 * show short slopes such as ramps, so the elevation figures describe the route
 * as a whole, not individual gradients.
 *
 * Coordinates are left as they are; only the properties change. If the
 * elevation lookup fails, nothing is written.
 *
 * Run from any directory, after editing a route:
 *   node spacefinder/_scripts/routeStats.js [route files...]
 * With no arguments it updates route.geojson and shortroute.geojson in
 * assets/data/art/data.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROUTE_DIR      = path.resolve(__dirname, '../assets/data/art/data');
const DEFAULT_ROUTES = ['route.geojson', 'shortroute.geojson'];
const ELEVATION_URL  = 'https://api.opentopodata.org/v1/eudem25m';
const ELEVATION_NAME = 'EU-DEM 25 m (OpenTopoData)';
const USER_AGENT     = 'spacefinder (https://github.com/uol-library/spacefinder)';
const WALKING_SPEED  = 1;    // m/s
const SAMPLE_SPACING = 10;   // m between elevation samples
const SMOOTHING      = 5;    // samples in the moving average (5 x 10 m = 50 m)
const BATCH_SIZE     = 100;  // OpenTopoData's limit per request
const BATCH_DELAY    = 1100; // ms; the public API allows one request a second
const EARTH_RADIUS   = 6371008.8;

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
 * Points every SAMPLE_SPACING metres along a line, including both ends
 */
function samplePoints( coords ) {
    const points = [ coords[0] ];
    let carried = 0;
    for ( let i = 1; i < coords.length; i++ ) {
        const a = coords[i - 1], b = coords[i];
        const length = distance( a, b );
        let along = SAMPLE_SPACING - carried;
        while ( along < length ) {
            const t = along / length;
            points.push( [ a[0] + t * ( b[0] - a[0] ), a[1] + t * ( b[1] - a[1] ) ] );
            along += SAMPLE_SPACING;
        }
        carried = length - ( along - SAMPLE_SPACING );
    }
    points.push( coords[ coords.length - 1 ] );
    return points;
}

/**
 * Looks up elevations (m) for [lon, lat] points
 */
async function elevations( points ) {
    const result = [];
    for ( let i = 0; i < points.length; i += BATCH_SIZE ) {
        if ( i > 0 ) {
            await new Promise( resolve => setTimeout( resolve, BATCH_DELAY ) );
        }
        const locations = points.slice( i, i + BATCH_SIZE ).map( p => p[1].toFixed( 6 ) + ',' + p[0].toFixed( 6 ) ).join( '|' );
        const response = await fetch( ELEVATION_URL + '?locations=' + locations, { headers: { 'User-Agent': USER_AGENT } } );
        if ( ! response.ok ) {
            throw new Error( `elevation lookup failed: HTTP ${response.status}` );
        }
        const json = await response.json();
        if ( json.status !== 'OK' || json.results.some( r => r.elevation === null ) ) {
            throw new Error( 'elevation lookup failed: ' + ( json.error || 'missing values' ) );
        }
        result.push( ...json.results.map( r => r.elevation ) );
    }
    return result;
}

/**
 * Centred moving average, shrinking the window at the ends
 */
function smooth( values ) {
    const half = Math.floor( SMOOTHING / 2 );
    return values.map( ( v, i ) => {
        const window = values.slice( Math.max( 0, i - half ), i + half + 1 );
        return window.reduce( ( a, b ) => a + b, 0 ) / window.length;
    });
}

/**
 * Statistics for one LineString
 */
async function routeStats( coords ) {
    let length = 0;
    for ( let i = 1; i < coords.length; i++ ) {
        length += distance( coords[i - 1], coords[i] );
    }
    const heights = smooth( await elevations( samplePoints( coords ) ) );
    let ascent = 0, descent = 0;
    for ( let i = 1; i < heights.length; i++ ) {
        const change = heights[i] - heights[i - 1];
        if ( change > 0 ) {
            ascent += change;
        } else {
            descent -= change;
        }
    }
    return {
        length_m: Math.round( length ),
        walking_speed_mps: WALKING_SPEED,
        walking_time_min: Math.round( length / WALKING_SPEED / 60 ),
        elevation_min_m: Math.round( Math.min( ...heights ) ),
        elevation_max_m: Math.round( Math.max( ...heights ) ),
        ascent_m: Math.round( ascent ),
        descent_m: Math.round( descent ),
        elevation_source: ELEVATION_NAME,
    };
}

async function main() {
    const files = process.argv.length > 2 ? process.argv.slice( 2 ).map( f => path.resolve( f ) ) : DEFAULT_ROUTES.map( f => path.join( ROUTE_DIR, f ) );
    for ( const file of files ) {
        const geojson = JSON.parse( fs.readFileSync( file, 'utf8' ) );
        for ( const feature of geojson.features ) {
            if ( feature.geometry.type !== 'LineString' ) {
                continue;
            }
            const stats = await routeStats( feature.geometry.coordinates );
            feature.properties = { ...feature.properties, ...stats };
            console.log( path.basename( file ), stats );
        }
        fs.writeFileSync( file, JSON.stringify( geojson, null, 2 ) + '\n' );
    }
}

main().catch( err => {
    console.error( err.message );
    process.exit( 1 );
});
