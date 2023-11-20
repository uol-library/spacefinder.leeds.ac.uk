/**
 * Processes LibCal opening hours by updating spaces and dumping monthly / weekly
 * opening hours in the hours folder
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
                    for ( d in h.dates ) {
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
            libCalOpening[ lib.building ][dates.day] = getOpeningHours( lib.dates, dates.datestring );
        });
    });
    console.log( libCalOpening );
    fs.writeFileSync(path.resolve( __dirname, '../_data/libcal-opening-hours.json' ), JSON.stringify(allHoursData), err => {
        if (err) {
            console.error(err);
            return;
        }
    });
    const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
    spacefiles.forEach( filename => {
        if ( filename !== '.' && filename !== '..' ) {
            var spaceData = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
            const spaceJSON = JSON.parse( spaceData );
            if ( spaceJSON.space_type == 'Library' ) {
                let update = false;
                if ( libCalOpening.hasOwnProperty( spaceJSON.building ) ) {
                    if ( openingHoursDiffer( spaceJSON.opening_hours, libCalOpening[ spaceJSON.building ] ) ) {

                    }
                } else {
                    console.log(spaceJSON.building + ' does not have any hours defined');
                    console.log(spaceJSON);
                }
                // check the flag to see if an update has been performed
                if ( update ) {
                    fs.writeFileSync(path.resolve( __dirname, '../spaces/', filename ), JSON.stringify(spaceJSON), err => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                    });
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
    let days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    /* set date to previous monday */
    d.setDate( d.getDate() - ( ( d.getDay() + 6 ) % 7 ) );
    for ( let i = 0; i < 7; i++ ) {
        let datestring = d.getFullYear() + '-' + ( '0' + ( d.getMonth() + 1 ) ).slice( -2 ) + '-' + ( '0' + d.getDate() ).slice( -2 );
        weekdates.push ( { 'day': days[i], 'datestring': datestring } );
        d.setDate( d.getDate() + 1 );
    }
    return weekdates;
}
function getOpeningHours( data, datestr ) {
    let opening = { 'open': false, 'from': '', 'to': '' };
    for ( d in data ) {
        if ( d === datestr ) {
            if ( data[d].status == 'open' ) {
                opening = { 'open': true, 'from': data[d].hours[0].from, 'to': data[d].hours[0].to };
            } else if ( data[d].status == "24hours" ) {
                opening = { 'open': true, 'from': '0:00am', 'to': '24:00pm' };
            }
        }
    }
    return opening;
}
function openingHoursDiffer( o1, o2 ) {
    let differ = false;
    ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].forEach( day => {
        if ( o1[day].open != o2[day].open || o1[day].from != o2[day].from || o1[day].to != o2[day].to ) {
            differ = true;
        }
    });
    return differ;
}
