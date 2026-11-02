/**
 * Templates used to render artworks on the public art trail in the list.
 *
 * Artwork data is schema.org JSON-LD (an Article whose mainEntity is a
 * VisualArtwork). Text in the JSON-LD is HTML (it uses entities such as
 * &rsquo;), so it is used as HTML, apart from the name, which is converted to
 * plain text for the title.
 *
 * onloadPlaceData adds the fields the core modules use (id, slug, title,
 * lat, lng) and keeps the JSON-LD for the artwork in the ld property.
 *
 * The following functions are defined in this file:
 *
 * - getPlaceHTML - assembles HTML for the list view (short) and returns a HTML Element
 * - getAdditionalInfo - assembles HTML for expanded view and returns an HTML String (rendered hidden with the list, shown when the artwork is selected)
 * - getInfoWindowContent - assembles HTML for the map infoWindow and returns an HTML String
 * - onloadPlaceData - called when the data is loaded, can be used to set up any additional data structures or intervals
 * - onrenderPlaceData - called when the data is rendered, can be used to set up any additional data structures or intervals
 * - onunloadPlaceData - called when the data is unloaded, can be used to clear any intervals or event listeners
 *
 * The art trail routes (route.geojson and shortroute.geojson in data/, made
 * with the route scripts in _scripts) are drawn on the map, and listed above
 * the artworks with links to download them as GPX and KML. Their colours are
 * set in _includes/custom-head.html.
 *
 * These are called using the module namespace object, which is added to the spacefinder.data object when this module is loaded.
 * i.e. spacefinder.data.art.getPlaceHTML( artwork ) will call the getPlaceHTML function in this module.
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { decodeHTML, getDirectionsLink, createPlaceElement, getInfoWindowHTML, getSiteURL, getLogger } from '../../js/modules/utilities.mjs';
import { getPublishedEntities } from '../../js/modules/jsonld.mjs';
import { GeoJSON } from 'leaflet';

export const namespace = 'art';

const log = getLogger( 'art' );

/* The art trail routes, in the order they are listed */
const ROUTES = [
    { key: 'route', title: 'Full route' }, /* shown when the art dataset loads */
    { key: 'shortroute', title: 'Short route' }
];

/* the routes' map layers (route key: GeoJSON layer) */
let routeLayers = {};

/* counts route loads, so a load for a dataset that has been unloaded is ignored */
let routeLoad = 0;

/**
 * Makes a URL slug from a plain text title
 * @param {String} str
 * @return {String}
 */
function slugify( str ) {
    return str.normalize( 'NFKD' ).replace( /[̀-ͯ]/g, '' ).toLowerCase().replace( /&/g, ' and ' ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );
}

/**
 * Gets the artist's name with their dates, e.g. William Chattaway (1927&ndash;2019)
 * @param {Object} creator
 * @return {String} HTML
 */
function getArtist( creator ) {
    if ( ! creator ) {
        return '';
    }
    let dates = '';
    if ( creator.birthDate && creator.deathDate ) {
        dates = ' (' + creator.birthDate + '&ndash;' + creator.deathDate + ')';
    } else if ( creator.birthDate ) {
        dates = ' (b. ' + creator.birthDate + ')';
    }
    return creator.name + dates;
}

/**
 * Renders list view for an artwork
 * @param {Object} artwork
 * @return {Element} HTML element
 */
export function getPlaceHTML( artwork ) {
    let ld = artwork.ld;
    let details = '';
    if ( artwork.images.length ) {
        details += '<img src="' + getSiteURL( artwork.images[0].contentUrl ) + '" class="place-image" loading="lazy" alt="' + artwork.images[0].description + '">';
    }
    details += '<p class="description">' + artwork.images[0].description + '</p>';
    return createPlaceElement( artwork, {
        classList: 'artwork',
        typeLabel: getArtist( ld.creator ),
        typeClass: ld.artform,
        address: ld.spatial.address.streetAddress,
        details: details
    } );
}

/**
 * Gets additional information about an artwork.
 * @param {Object} artwork artwork data
 * @return {String} HTML
 */
export function getAdditionalInfo( artwork ) {
    let ld = artwork.ld;
    let html = '<section class="section-facts"><h4>Key Facts</h4><ul class="bulleticons">';
    if ( artwork.lat && artwork.lng ) {
        html += '<li class="icon-marker switch-view"><a class="show-map" href="#">Show on map</a></li>';
        html += '<li class="icon-address">' + ld.spatial.address.streetAddress + ' (' + getDirectionsLink( artwork.lat, artwork.lng ) + ')</li>';
    } else {
        html += '<li class="icon-address">' + ld.spatial.address.streetAddress + '</li>';
    }
    html += '<li class="icon-user">' + getArtist( ld.creator ) + '</li>';
    html += '<li class="icon-time-long">' + ld.dateCreated + ( ld.temporal ? ' (' + ld.temporal + ')': '' ) + '</li>';
    html += '<li class="icon-info-circled">' + ld.artMedium + '</li>';
    let contributors = Array.isArray( ld.contributor ) ? ld.contributor: ( ld.contributor ? [ ld.contributor ]: [] );
    let described = contributors.filter( c => c.description );
    let named = contributors.filter( c => ! c.description );
    described.forEach( c => {
        html += '<li class="icon-info-circled">' + c.description + '</li>';
    });
    if ( named.length ) {
        html += '<li class="icon-user">With ' + named.map( c => c.name ).join( ' and ' ) + '</li>';
    }
    html += '</ul></section>';

    html += '<section class="section-about"><h4>About</h4>' + ld.description + '</section>';

    if ( artwork.images.length > 1 ) {
        html += '<section class="section-images"><h4>Images</h4>';
        artwork.images.forEach( image => {
            html += '<figure><img src="' + getSiteURL( image.contentUrl ) + '" loading="lazy" class="place-image" alt="' + image.description + '"><figcaption>' + image.description + '</figcaption></figure>';
        });
        html += '</section>';
    }
    return html;
}

/**
 * Returns HTML for an individual artwork's infoWindow
 * @param {Object} artwork
 * @returns {String} HTML content for artwork infoWindow
 */
export function getInfoWindowContent( artwork ) {
    return getInfoWindowHTML( artwork.title, [ getArtist( artwork.ld.creator ), artwork.ld.dateCreated ] );
}

/**
 * Function called when the data is loaded
 * Turns the JSON-LD into the place objects used by the core modules
 * @param {*} data - JSON-LD data for the artworks
 */
export function onloadPlaceData( data ) {
    spacefinder.data[namespace].places = getPublishedEntities( data ).map( ld => {
        let title = decodeHTML( ld.name );
        return {
            id: ld.identifier,
            slug: slugify( title ),
            title: title,
            lat: Number( ld.spatial.geo.latitude ),
            lng: Number( ld.spatial.geo.longitude ),
            images: Array.isArray( ld.image ) ? ld.image: ( ld.image ? [ ld.image ]: [] ),
            ld: ld
        };
    });
}

/**
 * Gets a route's length, number of artworks and time, e.g. 4.6 km, 22 artworks, about 2 hours
 * @param {Object} stats the properties of the route's LineString (from routeStats.js)
 * @return {String}
 */
function getRouteStats( stats ) {
    let hours = Math.round( stats.total_time_min / 30 ) / 2;
    let time = stats.total_time_min < 60 ? stats.total_time_min + ' minutes': hours + ( hours === 1 ? ' hour': ' hours' );
    return ( stats.length_m / 1000 ).toFixed( 1 ) + ' km, ' + stats.artwork_count + ' artworks, about ' + time;
}

/**
 * Lists the routes above the artworks
 * @param {Array} routes objects from ROUTES, each with its GeoJSON in geojson
 */
function renderRoutes( routes ) {
    let html = '<h3>Public Art Trail</h3><p>Two step-free walks around the artworks. Download a route to follow it in a mapping or walking app.</p><ul>';
    routes.forEach( route => {
        let file = getSiteURL( '/assets/data/art/data/' + route.key );
        html += '<li class="art-route art-route-' + route.key + '">';
        html += '<button class="art-route-toggle" data-route="' + route.key + '" aria-pressed="false" title="Show this route on the map">' + route.title + '</button> ';
        html += '<span class="art-route-stats">' + getRouteStats( route.geojson.features[0].properties ) + '</span>';
        html += '<span class="art-route-links"><a href="' + file + '.gpx" download>GPX</a> <a href="' + file + '.kml" download>KML</a></span></li>';
    });
    html += '</ul>';
    let section = document.createElement( 'section' );
    section.id = 'art-routes';
    section.innerHTML = html;
    section.addEventListener( 'click', event => {
        let button = event.target.closest( '.art-route-toggle' );
        if ( button ) {
            showRoute( button.getAttribute( 'data-route' ) );
        }
    });
    document.getElementById( 'listcontent' ).prepend( section );
}

/**
 * Shows one route on the map, and hides the others
 * @param {String} key route key
 */
function showRoute( key ) {
    if ( ! routeLayers[ key ] ) {
        return;
    }
    Object.entries( routeLayers ).forEach( ( [ k, layer ] ) => {
        if ( k === key ) {
            layer.addTo( spacefinder.map );
        } else {
            layer.remove();
        }
    });
    document.querySelectorAll( '#art-routes .art-route-toggle' ).forEach( button => {
        button.setAttribute( 'aria-pressed', button.getAttribute( 'data-route' ) === key );
    });
}

/**
 * Loads the routes, draws them on the map and lists them
 */
async function loadRoutes() {
    let load = ++routeLoad;
    let routes;
    try {
        routes = await Promise.all( ROUTES.map( async route => {
            let response = await fetch( getSiteURL( '/assets/data/art/data/' + route.key + '.geojson' ) );
            return { ...route, geojson: await response.json() };
        }) );
    } catch ( error ) {
        log.error( 'Could not load the art trail routes', error );
        return;
    }
    /* the art dataset has been unloaded */
    if ( load !== routeLoad ) {
        return;
    }
    /* only one route is shown at a time: the first, until another is chosen */
    routes.forEach( route => {
        routeLayers[ route.key ] = new GeoJSON( route.geojson, {
            className: 'art-route-line art-route-' + route.key,
            weight: 8
        }).bindTooltip( route.title, { sticky: true } );
    });
    renderRoutes( routes );
    showRoute( routes[0].key );
    log( 'Drew ' + routes.length + ' routes' );
}

/**
 * Function called after the data is rendered
 */
export function onrenderPlaceData() {
    loadRoutes();
}

/**
 * Function called when the data is unloaded
 */
export function onunloadPlaceData() {
    routeLoad++;
    Object.values( routeLayers ).forEach( layer => layer.remove() );
    routeLayers = {};
}
