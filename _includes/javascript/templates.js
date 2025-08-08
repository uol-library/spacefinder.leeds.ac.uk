/**
 * Templates used to render spaces in the list.
 * 
 * Two functions should be defined in this file:
 * - getSpaceHTML - assembles HTML for the list view (short) and returns a HTML Element
 * - getAdditionalInfo - assembles HTML for expanded view and returns an HTML String
 */

/**
 * Renders list view for a space
 * @param {Object} space
 * @return {Element} HTML element
 */
function getSpaceHTML( space ) {
    spaceContainer = document.createElement('div');
    spaceContainer.setAttribute( 'data-id', space.id );
    spaceContainer.setAttribute( 'id', 'space' + space.id );
    spaceContainer.setAttribute( 'data-sortalpha', space.sortKey );
    spaceContainer.setAttribute( 'class', getClassList( space ) );
    let spaceHTML = '<div class="space-summary"><h3><button data-slug="' + space.slug + '" class="accordion-trigger space-title load-info" aria-expanded="false" aria-controls="additionalInfo' + space.id + '" data-spaceid="' + space.id + '">' + space.title + '</button></h3>';
    spaceHTML += '<p class="space-info"><span class="space-type space-type-' + space.space_type.replace( /[^0-9a-zA-Z]/g, '').toLowerCase() + '">' + space.space_type + '<span class="distance" id="distance' + space.id +'"></span></span>';
    spaceHTML += '';
    let loc = '';
    if ( space.floor !== '' ) {
        loc += '<span class="address-floor">' + space.floor + '</span>, ';
    }
    if ( space.building !== '' ) {
        loc += '<span class="address-building">' + space.building + '</span>, ';
    }
    if ( space.address !== '' ) {
        loc += '<span class="address-location">' + space.address + '</span>';
    }
    spaceHTML += '<span class="address">' + loc + '</span></p>';
    spaceHTML += '<div class="space-details">';
    if ( space.images.length ) {
        spaceHTML += '<img src="' + spacefinder.imageBaseURL + space.images[0].url + '" class="space-image" loading="lazy" alt="' + space.images[0].alt + '">';
    }
    spaceHTML += '<p class="description">' + space.description + '</p></div></div>';
    spaceHTML += '<div class="additionalInfo" id="additionalInfo' + space.id + '"></div>';
    spaceHTML += '</div>';
    spaceContainer.innerHTML = spaceHTML;
    return spaceContainer;
}

/**
 * Gets additional information about a space.
 * The main listing only contains a minimal amount of information about spaces - 
 * when a space is clicked on, this is augmented by additional data.
 * @param {Object} space space data
 * @return {String} HTML
 */
function getAdditionalInfo( space ) {
    splog( 'getAdditionalInfo', 'templates.js' );
    let spaceHTML = '';
    let spacenode = getSpaceNodeById( space.id );
    spaceHTML += '<section class="section-facts"><h4>Key Facts</h4><ul class="bulleticons"><li class="icon-marker switch-view"><a class="show-map" href="#">Show on map</a></li>';
    let loc = '';
    if ( space.floor !== '' ) {
        loc += space.floor + ', ';
    }
    if ( space.building !== '' ) {
        loc += space.building + ', ';
    }
    if ( space.address !== '' ) {
        loc += space.address;
    }
    loc += ' (<a target="googlemaps" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + space.lat + '%2c' + space.lng + '&amp;travelmode=walking">get directions</a>)';
    spaceHTML += '<li class="icon-address">' + loc + '</li>';
    if ( space.links && space.links.length ) {
        for ( let i = 0; i < space.links.length; i++ ) {
            spaceHTML += `<li class="${space.links[i].class}"><a href="${space.links[i].url}">${space.links[i].link_text}</a></li>`;
        }
    }
    if ( space.restricted ) {
        spaceHTML += '<li class="icon-public">Open to ' + space.access;
        if ( space.restriction ) {
            spaceHTML += ' (' + space.restriction + ')';
        }
        spaceHTML += '</li>';
    } else {
        spaceHTML += '<li class="icon-public">Open to ' + space.access + '<li>';
    }
    spaceHTML += '</ul></section>';

    spaceHTML += '<section class="section-opening"><h4>Opening Times</h4>';
    spaceHTML += '<p class="icon-time-short" data-openmsg-id="' + space.id + '">' + spacenode.getAttribute( 'data-openmsg' ) + '</p>';
    spaceHTML += '<ul class="opening-times">';
    [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ].forEach( (day, idx) => {
        let today = new Date().getDay();
        let todayidx = ( ( idx + 1 ) < 7 ) ? ( idx + 1 ): 0;
        let istodayclass = ( todayidx === today ) ? ' class="today"': '';
        if ( space.opening_hours[day].open ) {
            spaceHTML += '<li' + istodayclass + '><span class="dayname">' + day.charAt(0).toUpperCase() + day.slice(1) + '</span> <span class="opening">' + space.opening_hours[ day ].from + ' - ' + space.opening_hours[ day ].to +'</span></li>';
        } else {
            spaceHTML += '<li' + istodayclass + '><span class="dayname">' + day.charAt(0).toUpperCase() + day.slice(1) + '</span> <span class="opening">Closed</span></li>';
        }
    });
    spaceHTML += '</ul></section>';
    if ( space.contacts.length ) {
        spaceHTML += '<section class="section-contact"><h4>Contact</h4><ul class="bulleticons">';
        for ( let i = 0; i < space.contacts.length; i++ ) {
            spaceHTML += `<li class="${space.contacts[i].class}"><a href="${space.contacts[i].url}">${space.contacts[i].link_text}</a></li>`;
        }
        spaceHTML += '</ul></section>';
    }

    if ( space.facilities.length ) {
        let facilitieslist = '';
        space.facilities.forEach( fac => {
            let filterData = getFilterData( 'facilities', fac );
            if ( filterData ) {
                facilitieslist += '<li class="' + filterData.icon  + '">' + filterData.label + '</li>';
            }
        });
        if ( facilitieslist != '' ) {
            spaceHTML += '<section class="section-facilities"><h4>Facilities Available</h4><ul class="bulleticons">' + facilitieslist + '</ul></section>';
        }
    }
    return spaceHTML;
}

/**
 * Gets a list of classes for a space container to facilitate filtering
 * @param {Object} space Space data
 * @return {String} classList Space separated list of classnames
 */
function getClassList( space ) {
    var classList = 'list-space ';
    if ( space.space_type ) {
        classList += 'space_type_' + space.space_type.replace( /[^0-9a-zA-Z]/g, '' ).toLowerCase() + ' ';
    }
    if ( space.work.length ){
        classList += 'work_' + space.work.join( ' work_' ) + ' ';
    }
    if ( space.facilities.length ){
        classList += 'facilities_' + space.facilities.join( ' facilities_' ) + ' ';
    }
    if ( space.atmosphere.length ){
        classList += 'atmosphere_' + space.atmosphere.join( ' atmosphere_' ) + ' ';
    }
    if ( space.noise ) {
        classList += 'noise_' + space.noise.replace( /\W/g, '' ).toLowerCase();
    }
    return classList;
}

/**
 * Occupancy data for two libraries
 */
spacefinder.occupancyData = {
    "Edward Boyle": {
        "spaces": getSpaceIDsForBuilding( "Edward Boyle library" ),
        "capacity": 1800,
        "occupancy": 0
    },
    "Laidlaw": {
        "spaces": getSpaceIDsForBuilding( "Laidlaw library" ),
        "capacity": 640,
        "occupancy": 0
    }
};
/**
 * Get space ids for buildings
 */
function getSpaceIDsForBuilding( building ) {
    splog( 'getSpaceIDsForBuilding', 'templates.js' );
    let ids = [];
    for ( let i = 0; i < spacefinder.spaces.length; i++ ) {
        if ( spacefinder.spaces[i].building === building ) {
            ids.push( spacefinder.spaces[i].id );
        }
    }
    return ids;
}
/**
 * get occupancy data from remote JSON file and update 
 * spacefinder.occupancyData
 */
function updateOccupancy() {
    splog( 'updateOccupancy', 'templates.js' );
    let options = {
        url: "https://floorplans.library.leeds.ac.uk/capacity.json",
        key: "libraryOccupancy",
        expires: 0.015,
        callback: function( data ) {
			for( lib in spacefinder.occupancyData ) {
				if ( data.hasOwnProperty( lib ) ) {
                    splog( 'Updating occupancy for spaces in '+lib+' to '+data[lib], 'templates.js' );
                    spacefinder.occupancyData[lib].occupancy = parseInt(data[lib].occupancy);
                    spacefinder.occupancyData[lib].capacity = parseInt(data[lib].capacity);
					spacefinder.occupancyData[lib].spaces.forEach( id => {
                        let sdo = document.querySelector( '#space' + id + ' .space-details p.occupancy' );
                        if ( sdo == null ) {
                            sdo = document.createElement( 'p' );
                            sdo.classList.add( 'occupancy', 'icon-user' );
                            document.querySelector( '#space' + id + ' .space-details' ).appendChild( sdo );
                        }
                        let pco = Math.floor( ( spacefinder.occupancyData[lib].occupancy / spacefinder.occupancyData[lib].capacity ) * 100 );
                        if ( pco > 100 ) {
                            pco = 100;
                        }
                        let occupancyMsg = spacefinder.occupancyData[lib].occupancy < 50? "fewer than 50": spacefinder.occupancyData[lib].occupancy.toLocaleString('en');
                        let capacityMsg = spacefinder.occupancyData[lib].capacity.toLocaleString('en');
                        sdo.innerHTML = 'There are currently <strong>'+occupancyMsg+'</strong> people in the <strong>'+lib+' library</strong>, which has a seating capacity of approximately <strong>'+capacityMsg+'</strong>';
					});
				} else {
                    splog("No occupancy data for "+lib);
                }
			}
            updateSpaceInfoWindowContent();
        }
    }
    getJSON( options );
}
/**
 * update popups to display occupancy data
 */
function updateSpaceInfoWindowContent() {
    for ( let i = 0; i < spacefinder.spaces.length; i++ ) {
        if ( spacefinder.spaces[i].lat && spacefinder.spaces[i].lng ) {
            for( lib in spacefinder.occupancyData ) {
                if ( spacefinder.occupancyData[lib].spaces.indexOf( spacefinder.spaces[i].id ) !== -1 && spacefinder.occupancyData[lib].occupancy > 0 ) {
                    let info = [];
                    info.push( spacefinder.spaces[i].space_type );
                    if ( spacefinder.spaces[i].floor !== '' ) {
                        info.push( spacefinder.spaces[i].floor );
                    }
                    if ( spacefinder.spaces[i].building !== '' ) {
                        info.push( spacefinder.spaces[i].building );
                    }
                    let content = '<div class="spaceInfoWindow"><h3>'+spacefinder.spaces[i].title+'</h3>';
                    content += '<p class="info">' + info.join(', ') + '</p>';
                    content += '<p class="description">' + spacefinder.spaces[i].description + '</p>';
                    let occupancyMsg = spacefinder.occupancyData[lib].occupancy < 50? "fewer than 50": spacefinder.occupancyData[lib].occupancy.toLocaleString('en');
                    let capacityMsg = spacefinder.occupancyData[lib].capacity.toLocaleString('en');
                    content += '<p class="occupancy icon-user">There are currently <strong>'+occupancyMsg+'</strong> people in the <strong>'+lib+' library</strong>, which has a seating capacity of approximately <strong>'+capacityMsg+'</strong></p>';
                    content += '<button class="show-list">More info&hellip;</button></div>';
                    spacefinder.spaces[i].marker.setPopupContent( content );
                }
            }
        }
    }
}
document.addEventListener( 'DOMContentLoaded', () => {
    document.addEventListener( 'spacesloaded', () => {
        setTimeout( updateOccupancy, 1000 );
        setInterval( updateOccupancy, 30000 );
    });
});