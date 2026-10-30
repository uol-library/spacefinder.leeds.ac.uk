/**
 * Prints the next free identifier for a new space, and warns about any
 * duplicate identifiers in assets/data/spaces/data
 */
const fs = require('fs');
const path = require('path');
const dataDir = path.resolve( __dirname, '../assets/data/spaces/data' );
const spacefiles = fs.readdirSync( dataDir, { encoding: 'utf8' } );
var nextID = 0;
var IDs = [];
// Find the next available ID by checking all existing space files
spacefiles.forEach( filename => {
    if ( filename.match( /\.json$/ ) ) {
        var data = fs.readFileSync( path.resolve( dataDir, filename ) );
        var id = JSON.parse( data ).mainEntity.identifier;
        if ( id ) {
            if ( !IDs.includes( id ) ) {
                IDs.push( id );
            } else {
                console.warn(`Duplicate ID found in ${filename}: ${id}`);
            }
            nextID = Math.max( nextID, id );
        }
    }
});
console.log(++nextID);
