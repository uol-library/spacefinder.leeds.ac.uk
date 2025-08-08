/**
 * This script takes all the files within the spaces directory and edits them before
 * saving them back there
 */
const fs = require('fs');
const path = require('path');
const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
var nextID = 0;
var IDs = [];
// Find the next available ID by checking all existing space files
spacefiles.forEach( filename => {
    if ( filename !== '.' && filename !== '..' && filename !== 'new') {
        var data = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
        var jsondata = JSON.parse( data );
        if ( jsondata.id ) {
            if ( !IDs.includes(jsondata.id) ) {
                IDs.push(jsondata.id);
            } else {
                console.warn(`Duplicate ID found in ${filename}: ${jsondata.id}`);
            }
        }
        nextID = Math.max(nextID, jsondata.id );
    }
});
console.log(++nextID);