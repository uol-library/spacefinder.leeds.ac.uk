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
 *
 * The art trail routes (route.geojson and shortroute.geojson in data/, made
 * with the route scripts in _scripts) are overlays: the theme lists them above
 * the artworks and draws them on the map (see overlays.mjs in the theme). Their
 * titles, colours and download links are in the GeoJSON files, and the heading
 * above them is in _data/config.yml.
 *
 * These are called using the module namespace object, which is added to the spacefinder.data object when this module is loaded.
 * i.e. spacefinder.data.art.getPlaceHTML( artwork ) will call the getPlaceHTML function in this module.
 */
import { spacefinder } from '../../js/modules/config.mjs';
import { decodeHTML, getDirectionsLink, createPlaceElement, getInfoWindowHTML, getSiteURL } from '../../js/modules/utilities.mjs';
import { getPublishedEntities } from '../../js/modules/jsonld.mjs';

export const namespace = 'art';

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

    /* the audio trail: links to the tracks on SoundCloud (not embedded, as the player sets cookies) */
    let audio = Array.isArray( ld.audio ) ? ld.audio: ( ld.audio ? [ ld.audio ]: [] );
    if ( audio.length ) {
        html += '<section class="section-audio"><h4>Audio Trail</h4><ul class="bulleticons">';
        audio.forEach( track => {
            html += '<li class="icon-music"><a href="' + track.url + '" target="_blank" rel="noopener">' + track.name + '</a> (SoundCloud)</li>';
        });
        html += '</ul></section>';
    }

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
