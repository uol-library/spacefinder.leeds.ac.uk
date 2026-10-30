/**
 * Processes LibCal opening hours (from the monthly files in _data/hours) and
 * updates the openingHoursSpecification of library spaces in
 * assets/data/spaces/data with the hours for the current week (Monday to
 * Sunday). Run npm run concat afterwards to rebuild data.json.
 */
const fs = require('fs');
const path = require('path');

/**
 * LibCal library ID to spacefinder building map
 * LibCal (libid), spacefinder (building), dates
 */
const allHoursData = [
    { lid: 7782, building: "Brotherton Library", dates: {} },
    { lid: 7783, building: "Edward Boyle library", dates: {} },
    { lid: 7785, building: "Laidlaw library", dates: {} },
    { lid: 7790, building: "Worsley building", dates: {} },
    { lid: 7791, building: "Clinical Sciences building", dates: {} }
];
const libCalOpening = {};
allHoursData.forEach( l => {
    libCalOpening[ l.building ] = {};
});
const libcalfiles = fs.readdirSync( path.resolve( __dirname, '../_data/hours' ), { encoding: 'utf8' } );
libcalfiles.forEach( filename => {
    if ( filename.match(/^.*json$/ ) ) {
        var hoursData = fs.readFileSync( path.resolve( __dirname, '../_data/hours/', filename ) );
        var hoursJSON = JSON.parse( hoursData );
        hoursJSON.forEach( h => {
            allHoursData.forEach( ( lib, index, allHoursData ) => {
                if ( lib.lid == h.lid ) {
                    for ( const d in h.dates ) {
                        allHoursData[index].dates[d] = h.dates[d];
                    }
                }
            });
        });
    }
});
if ( allHoursData.length ) {
    /* get the data for the week we are updating */
    allHoursData.forEach( ( lib, index, allHoursData ) => {
        /* sort the date keys first just in case */
        let orderedDates = Object.keys(lib.dates).sort().reduce( (obj, key) => {
            obj[key] = lib.dates[key];
            return obj;
        },{});
        allHoursData[index].dates = orderedDates;
        let weekdates = getWeekDates();
        weekdates.forEach( dates => {
            libCalOpening[ lib.building ][dates.day] = getOpeningHours( lib.dates, dates );
        });
    });
    fs.writeFileSync( path.resolve( __dirname, '../_data/libcal-opening-hours.json' ), JSON.stringify( allHoursData ) );
    const dataDir = path.resolve( __dirname, '../assets/data/spaces/data' );
    const datafiles = fs.readdirSync( dataDir, { encoding: 'utf8' } );
    datafiles.forEach( filename => {
        if ( filename.match( /\.json$/ ) ) {
            const spaceData = fs.readFileSync( path.resolve( dataDir, filename ) );
            const spaceJSON = JSON.parse( spaceData );
            const ld = spaceJSON.mainEntity;
            /* libraries whose address ends with the building name, e.g. "Level 10, Edward Boyle library" */
            const lib = allHoursData.find( l => ld.additionalType === 'Library' && ld.address.streetAddress.toLowerCase().endsWith( l.building.toLowerCase() ) );
            if ( lib ) {
                const newHours = Object.values( libCalOpening[ lib.building ] );
                if ( openingHoursDiffer( ld.openingHoursSpecification, newHours ) ) {
                    ld.openingHoursSpecification = newHours;
                    fs.writeFileSync( path.resolve( dataDir, filename ), JSON.stringify( spaceJSON, null, 4 ) );
                    console.log( 'Updated opening hours for ' + filename );
                }
            }
        }
    });
}

 
/**
 * Gets an array of objects containing days of the week with their
 * corresponding dates in YYYY-MM-DD format. The dates are used to identify
 * opening hours in the JSON data feed from LibCal. Dates
 * are based on the previous monday to the current date.
 * @returns {Array} array of objects with day and datestring properties
 */
function getWeekDates() {
    let weekdates = [];
    let d = new Date();
    let days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    /* set date to previous monday */
    d.setDate( d.getDate() - ( ( d.getDay() + 6 ) % 7 ) );
    for ( let i = 0; i < 7; i++ ) {
        let datestring = d.getFullYear() + '-' + ( '0' + ( d.getMonth() + 1 ) ).slice( -2 ) + '-' + ( '0' + d.getDate() ).slice( -2 );
        weekdates.push ( { 'day': days[i], 'datestring': datestring } );
        d.setDate( d.getDate() + 1 );
    }
    return weekdates;
}

/**
 * Gets the opening hours for a specific date from the provided data.
 * @param {Object} data - the LibCal opening hours data for a specific library (keyed by date)
 * @param {Object} dates - an object with day and datestring properties to map a date to a weekday
 * @returns {Object} an object containing the opening hours for the specified date as an OpeningHoursSpecification
 */
function getOpeningHours( data, dates ) {
    let opening = {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "https://schema.org/" + dates.day
    };
    for ( const d in data ) {
        if ( d === dates.datestring ) {
            if ( data[d].status == 'open' ) {
                opening = { 
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "https://schema.org/" + dates.day,
                    "opens": normaliseTime( data[d].hours[0].from ),
                    "closes": normaliseTime( data[d].hours[0].to )
                };
            } else if ( data[d].status == "24hours" ) {
                opening = { 
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "https://schema.org/" + dates.day,
                    "opens": "00:00:00",
                    "closes": "24:00:00"
                };
            }
        }
    }
    return opening;
}

/**
 * Determines if two arrays of opening hours differ.
 * Both are OpeningHoursSpecification arrays in the same order (Monday to
 * Sunday) with their properties in the same order, so they can be compared
 * as JSON.
 * @param {Array} o1 - OpeningHoursSpecification objects from the space JSON file
 * @param {Array} o2 - OpeningHoursSpecification objects made from LibCal data
 * @returns {boolean} - True if the opening hours differ, false otherwise
 */
function openingHoursDiffer( o1, o2 ) {
    return JSON.stringify( o1 ) !== JSON.stringify( o2 );
}

/**
 * Normalises the time format from LibCal (e.g. 9:30am) to HH:MM:SS.
 * Midnight (12:00am) is 24:00:00, as LibCal uses it for closing times.
 * @param {string} libCalTime - The time string from LibCal
 * @returns {string} - The normalised time string in HH:MM:SS format
 */
function normaliseTime( libCalTime ) {
    const m = libCalTime.match( /([0-9]+):([0-9]+)\s*(am|pm)/i );
    if ( m === null ) {
        return '';
    }
    let h = +m[1] % 12;
    if ( m[3].toLowerCase() === 'pm' ) {
        h += 12;
    }
    if ( h === 0 && m[2] === '00' ) {
        h = 24;
    }
    return String( h ).padStart( 2, '0' ) + ':' + m[2] + ':00';
}
