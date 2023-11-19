/**
 * Get the library opening hours from the LibCal API
 * 
 */
const fs = require('fs');
const path = require('path');

const identityUrl = "https://leeds.libcal.com/1.1/oauth/token";
const hoursUrl = "https://leeds.libcal.com/1.1/hours/";
const libraryIDs = [7782,7784,7786,7783,7785,7790,7791];
const clientId = "163";
const clientSecret = process.env.CLIENT_SECRET;

async function GetOpeningHours() {
    const response = await fetch( identityUrl, {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        })
    });

    const grant = await response.json();

    let today = new Date();
    for (let i  = 0; i < 6; i++ ) {
        let params = new URLSearchParams({
            from: getDateStr( new Date( today.getFullYear(), ( today.getMonth() + i ), 1 ) ),
            to: getDateStr ( new Date( today.getFullYear(), ( today.getMonth() + i + 1 ), 0 ) )
        });
        let url = hoursUrl + libraryIDs.join( ',' ) + '?' + params.toString();
        try {
            const hoursquery = await fetch( url, {
                headers: {
                    "Authorization": "Bearer " + grant.access_token,
                    "Accept": "application/json"
                },
                method: "GET"
            });
            const result = await hoursquery.json();
            let filedate = new Date( today.getFullYear(), ( today.getMonth() + i ), 1 );
            let filename = "" + filedate.getFullYear() + ( '0' + ( filedate.getMonth() + 1 ) ).slice( -2 ) + ".json";
            fs.writeFileSync( path.resolve( __dirname, '../_data/hours/', filename ), JSON.stringify( result ) );
        } catch ( error ) {
            console.error( "problem with fetching " + url );
        }
    }
}

GetOpeningHours();

function getDateStr( d ) {
    let month = ( '0' + ( d.getMonth() + 1 ) ).slice( -2 );
    let day = ( '0' + d.getDate() ).slice( -2 );
    return d.getFullYear() + '-' + month + '-' + day;
}