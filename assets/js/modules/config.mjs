/**
 * SpaceFinder configuration
 */
export const spacefinder = {
    /* debug logging (see getLogger in utilities.mjs): on in development, or with ?sfdebug in the URL */
    debug: true || new URLSearchParams( window.location.search ).has( 'sfdebug' ),

    /* CSS breakpoints */
    breakpoints: {
        large: 1000,
        med: 600,
        small: 400
    },

    /**
     * whether the application can use local storage
     * defaults to false here, but can be determined by cookie policy
     * this function should be redefined in cookieconsent.mjs
     */
    canUseLocalStorage: function() { return false; },
    
    /* map related config */
    map: null,
    osm: null,
    esri_sat: null,
    currentLoc: {'lat': 53.806529, 'lng': -1.555291 },
    startZoom: 16,
    mapBounds: null,
    mapZoom: null,
    mapLoaded: false,
    mapReady: false,
    resizeTimeout: null,

    /* geolocation related config */
    personLoc: {'lat': 53.806529, 'lng': -1.555291 },
    personMarker: null,
    personWatcher: false,
    geoActive: false,
    watchID: false,
    permission: false,

    /* data related config */
    data: {},
    /* datasets, from _data/config.yml - the first is the default */
    dataSources: [{"key":"spaces","label":"Study spaces","icon":"icon-desk"},{"key":"buildings","label":"Buildings","icon":"icon-marker"},{"key":"art","label":"Public Art Trail","icon":"icon-views","filters":false,"overlays":{"title":"Public Art Trail","description":"Two step-free walks around the artworks. Download a route to follow it in a mapping or walking app."}}],
    defaultDataSource: "spaces",
    /* set from the URL by routing.mjs before the data is loaded */
    currentDataSource: "spaces",
    /* relative to the page's origin, so the dataset modules import the same copy of this module as main.js */
    dataDir: '/assets/data/',
    /* each dataset's overlays (see overlays.mjs): the .geojson files in its data folder, relative to dataDir */
    overlayFiles: {
        "spaces": [],
        "buildings": [],
        "art": ["art/data/route.geojson", "art/data/shortroute.geojson", ],
    },
    /* path of the site, which routes (e.g. spaces/1915) are added to */
    basePath: '/',
    /* "history" for URLs like /spaces/1915, "hash" for URLs like /#/spaces/1915, "none" to leave the URL alone */
    routing: "history",
    /* old first parts of routes, and what replaces them, e.g. { "space": "spaces" } */
    routeAliases: {"space":"spaces"} || {},
    /* origins of pages which can embed the app in an iframe and use it with postMessage (see embed.mjs) */
    embedOrigins: null || [],
    placesLoaded: false,

    /* filter related config */
    filtersLoaded: false
};