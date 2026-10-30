/**
 * Scheduled jobs for Spacefinder
 *
 * Cron-style update tool used to process the JSON-LD files in
 * assets/data/spaces/data according to settings in the "crontab"
 * (_data/crontab.json). Run npm run concat afterwards to rebuild data.json.
 *
 * Each "job" should be a JSON object with a date (d-m-yyyy) and updates array.
 *
 * Updates match spaces on whatever field is specified in the match property of
 * an update, with the value given in the term property of the update. This way,
 * multiple spaces can be matched to update them with the same information.
 *
 * Updates can be carried out on a single field or multiple fields for each space
 * matched - single fields use the properties field and value, multiple fields use
 * the properties fields and values (which must be identically sized arrays).
 *
 * Fields are dotted paths in the Article, e.g. to change the opening hours of
 * space 90 on 1 September 2025:
 *
 *     {
 *         "date": "1-9-2025",
 *         "updates": [
 *             {
 *                 "match": "mainEntity.identifier",
 *                 "term": 90,
 *                 "field": "mainEntity.openingHoursSpecification",
 *                 "value": [ ... ]
 *             }
 *         ]
 *     }
 *
 * This is run daily by the GitHub action cron-updates (.github/workflows/cronUpdates.yml).
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve( __dirname, '../assets/data/spaces/data' );
const crontab = fs.readFileSync( path.resolve( __dirname, '../_data/crontab.json' ), { encoding: 'utf8' } );
const cronJSON = JSON.parse( crontab );
const today = new Date();
const checkDay = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear();
const newCrontab = {jobs:[]};
let updateCrontab = false;
cronJSON.jobs.forEach( job => {
    /* first match the date */
    if ( job.date == checkDay ) {
        /* match for today - flag crontab file for update and loop through space files */
        updateCrontab = true;
        const spacefiles = fs.readdirSync( dataDir, { encoding: 'utf8' } );
        spacefiles.forEach( filename => {
            if ( filename.match( /\.json$/ ) ) {
                /* get and parse data for space */
                const spaceJSON = JSON.parse( fs.readFileSync( path.resolve( dataDir, filename ) ) );
                let update = false;
                /* go through jobs looking for matches */
                job.updates.forEach( s => {
                    if ( getField( spaceJSON, s.match ) == s.term ) {
                        if ( s.hasOwnProperty( 'field' ) && s.hasOwnProperty( 'value' ) ) {
                            setField( spaceJSON, s.field, s.value );
                            update = true;
                        } else if ( s.hasOwnProperty( 'fields' ) && s.hasOwnProperty( 'values' ) ) {
                            if ( s.fields.length == s.values.length ) {
                                for ( let i = 0; i < s.fields.length; i++ ) {
                                    setField( spaceJSON, s.fields[i], s.values[i] );
                                }
                                update = true;
                            }
                        }
                    }
                });
                /* write changes back to filesystem */
                if ( update ) {
                    fs.writeFileSync( path.resolve( dataDir, filename ), JSON.stringify( spaceJSON, null, 4 ) );
                    console.log( 'Updated ' + filename );
                }
            }
        });
    } else {
        /* retain any non-matching jobs */
        newCrontab.jobs.push(job);
    }
});
/* if any dates have been processed, rewrite the crontab file omitting the matched data */
if ( updateCrontab ) {
    fs.writeFileSync( path.resolve( __dirname, '../_data/crontab.json' ), JSON.stringify( newCrontab, null, '    ' ) );
}

/**
 * Gets the value at a dotted path in an object
 * @param {Object} obj
 * @param {String} field e.g. mainEntity.identifier
 * @returns {*} value, or undefined if the path doesn't exist
 */
function getField( obj, field ) {
    return field.split( '.' ).reduce( ( o, key ) => ( o === undefined || o === null ) ? undefined : o[key], obj );
}

/**
 * Sets the value at a dotted path in an object, creating objects on the way if needed
 * @param {Object} obj
 * @param {String} field e.g. mainEntity.openingHoursSpecification
 * @param {*} value
 */
function setField( obj, field, value ) {
    const keys = field.split( '.' );
    const last = keys.pop();
    keys.forEach( key => {
        if ( typeof obj[key] !== 'object' || obj[key] === null ) {
            obj[key] = {};
        }
        obj = obj[key];
    });
    obj[last] = value;
}
