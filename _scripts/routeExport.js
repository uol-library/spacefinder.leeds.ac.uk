/**
 * Exports the art trail routes as GPX and KML files for people to download
 * and use in mapping and walking apps.
 *
 * Each file holds the route line and a waypoint for each artwork on the
 * route (within ARTWORK_DISTANCE metres of it, as in routeStats.js), in the
 * order they are visited. Waypoints carry the artwork's name, creator, date,
 * medium and description: as plain text in GPX, and as HTML in KML.
 *
 * Run from any directory, after editing a route or the artworks:
 *   node spacefinder/_scripts/routeExport.js [route files...]
 * With no arguments it exports route.geojson and shortroute.geojson in
 * assets/data/art/data. Each export is written next to its route, with the
 * same name and a .gpx or .kml extension.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { ROUTE_DIR, DEFAULT_ROUTES, ARTWORK_DISTANCE, distanceToLine, routeStats } = require('./routeStats');

const TITLES = {
    'route':      'Campus Public Art Trail',
    'shortroute': 'Campus Public Art Trail (short route)',
};
const CREATOR = 'University of Leeds Library';

/* Named entities used in the artwork text */
const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    ndash: '–', mdash: '—', hellip: '…', copy: '©', pound: '£',
    auml: 'ä', eacute: 'é', uuml: 'ü',
};

/**
 * Replaces HTML entities with the characters they stand for
 */
function decodeEntities( text ) {
    return text.replace( /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, ( entity, name ) => {
        if ( name[0] === '#' ) {
            return String.fromCodePoint( name[1].toLowerCase() === 'x' ? parseInt( name.slice( 2 ), 16 ) : parseInt( name.slice( 1 ), 10 ) );
        }
        if ( ! ( name in ENTITIES ) ) {
            throw new Error( `unknown HTML entity ${entity}: add it to ENTITIES` );
        }
        return ENTITIES[ name ];
    });
}

/**
 * Plain text from HTML, with a blank line between paragraphs
 */
function plainText( html ) {
    return decodeEntities( html.replace( /<\/p>\s*/gi, '\n\n' ).replace( /<[^>]*>/g, '' ) ).trim();
}

/**
 * Escapes text for XML
 */
function xml( text ) {
    return String( text ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
}

/**
 * Artworks from the art data files, with the details used in the exports
 */
function artworks() {
    return fs.readdirSync( ROUTE_DIR ).filter( f => f.endsWith( '.json' ) ).sort().map( f => {
        const work = JSON.parse( fs.readFileSync( path.join( ROUTE_DIR, f ), 'utf8' ) ).mainEntity;
        const geo = work.spatial.geo;
        const by = [ work.creator && work.creator.name, work.dateCreated ].filter( Boolean ).join( ', ' );
        return {
            name: plainText( work.name ),
            summary: [ by, work.artMedium ].filter( Boolean ).join( '. ' ),
            location: work.spatial.address && work.spatial.address.streetAddress || '',
            html: decodeEntities( work.description || '' ),
            coords: [ parseFloat( geo.longitude ), parseFloat( geo.latitude ) ],
        };
    });
}

/**
 * The artworks on a route, in the order they are visited. The route passes
 * some artworks more than once, so each is placed where the route comes
 * closest to it (the first such place, if there is a tie).
 */
function artworksOnRoute( coords, art ) {
    return art.map( work => {
        let index = 0, nearest = Infinity;
        for ( let i = 1; i < coords.length; i++ ) {
            const d = distanceToLine( work.coords, [ coords[i - 1], coords[i] ] );
            if ( d < nearest ) {
                nearest = d;
                index = i;
            }
        }
        return { work, index, nearest };
    }).filter( a => a.nearest <= ARTWORK_DISTANCE ).sort( ( a, b ) => a.index - b.index ).map( a => a.work );
}

/**
 * One-line description of a route from its statistics
 */
function routeDescription( stats ) {
    return `${( stats.length_m / 1000 ).toFixed( 1 )} km and ${stats.artwork_count} artworks: about ${stats.total_time_min} minutes, `
        + `allowing ${stats.minutes_per_artwork} minutes at each artwork. Step-free; starts and finishes at Walking Figure in the Parkinson Building.`;
}

const lonlat = c => `lat="${c[1].toFixed( 6 )}" lon="${c[0].toFixed( 6 )}"`;

function gpx( title, description, coords, works ) {
    const waypoints = works.map( ( w, i ) => `  <wpt ${lonlat( w.coords )}>
    <name>${xml( `${i + 1}. ${w.name}` )}</name>
    <cmt>${xml( [ w.summary, w.location ].filter( Boolean ).join( '. ' ) )}</cmt>
    <desc>${xml( [ w.summary, w.location, plainText( w.html ) ].filter( Boolean ).join( '\n\n' ) )}</desc>
    <type>Artwork</type>
  </wpt>
` ).join( '' );
    const points = coords.map( c => `      <trkpt ${lonlat( c )}/>\n` ).join( '' );
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${xml( CREATOR )}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${xml( title )}</name>
    <desc>${xml( description )}</desc>
  </metadata>
${waypoints}  <trk>
    <name>${xml( title )}</name>
    <desc>${xml( description )}</desc>
    <trkseg>
${points}    </trkseg>
  </trk>
</gpx>
`;
}

function kml( title, description, coords, works ) {
    const placemarks = works.map( ( w, i ) => `    <Placemark>
      <name>${xml( `${i + 1}. ${w.name}` )}</name>
      <styleUrl>#artwork</styleUrl>
      <description><![CDATA[${[ w.summary, w.location ].filter( Boolean ).map( t => `<p><strong>${xml( t )}</strong></p>` ).join( '' )}${w.html}]]></description>
      <Point><coordinates>${w.coords[0].toFixed( 6 )},${w.coords[1].toFixed( 6 )}</coordinates></Point>
    </Placemark>
` ).join( '' );
    const points = coords.map( c => `${c[0].toFixed( 6 )},${c[1].toFixed( 6 )}` ).join( '\n          ' );
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xml( title )}</name>
    <description>${xml( description )}</description>
    <Style id="route">
      <LineStyle><color>ffc06515</color><width>4</width></LineStyle>
    </Style>
    <Style id="artwork">
      <IconStyle><Icon><href>https://maps.google.com/mapfiles/kml/paddle/purple-circle.png</href></Icon></IconStyle>
    </Style>
    <Placemark>
      <name>${xml( title )}</name>
      <description>${xml( description )}</description>
      <styleUrl>#route</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${points}
        </coordinates>
      </LineString>
    </Placemark>
${placemarks}  </Document>
</kml>
`;
}

function main() {
    const files = process.argv.length > 2 ? process.argv.slice( 2 ).map( f => path.resolve( f ) ) : DEFAULT_ROUTES.map( f => path.join( ROUTE_DIR, f ) );
    const art = artworks();
    for ( const file of files ) {
        const base = path.basename( file, path.extname( file ) );
        const title = TITLES[ base ] || base;
        const line = JSON.parse( fs.readFileSync( file, 'utf8' ) ).features.find( f => f.geometry.type === 'LineString' );
        const coords = line.geometry.coordinates;
        const works = artworksOnRoute( coords, art );
        const description = routeDescription( routeStats( coords, art.map( w => w.coords ) ) );
        const out = path.join( path.dirname( file ), base );
        fs.writeFileSync( out + '.gpx', gpx( title, description, coords, works ) );
        fs.writeFileSync( out + '.kml', kml( title, description, coords, works ) );
        console.log( `${base}: ${works.length} artworks; ${description}` );
        works.forEach( ( w, i ) => console.log( `  ${i + 1}. ${w.name}` ) );
    }
}

main();
