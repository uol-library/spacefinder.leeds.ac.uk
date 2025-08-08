/**
 * This script takes all the files within the spaces directory and edits them before
 * saving them back there
 */
const fs = require('fs');
const path = require('path');
const spacefiles = fs.readdirSync( path.resolve( __dirname, '../spaces' ), { encoding: 'utf8' } );
spacefiles.forEach( filename => {
    if ( filename !== '.' && filename !== '..' && filename !== 'new') {
        var data = fs.readFileSync( path.resolve( __dirname, '../spaces/', filename ) );
        var jsondata = JSON.parse( data );
        delete jsondata.booking_url;
        // if ( jsondata.contacts.length ) {
        //     for ( let i = 0; i < jsondata.contacts.length; i++ ) {
        //         if ( jsondata.contacts[i].url && jsondata.contacts[i].url ===  'https://x.com/GreatFoodLeeds' ) {
        //             jsondata.contacts[i].url = 'https://www.instagram.com/greatfoodleeds/';
        //             jsondata.contacts[i].link_text = 'Follow Great Food at Leeds on Instagram';
        //             jsondata.contacts[i].class = 'icon-instagram';
        //         }
        //         if ( jsondata.contacts[i].link_text === 'Follow greatfoodleeds on facebook' ) {
        //             jsondata.contacts[i].link_text = 'Follow Great Food at Leeds on Facebook';
        //         }
        //     }
        // }
        //     jsondata.links = [];
        //     if ( jsondata.url !== '' && jsondata.url_text !== '' ) {
        //         jsondata.links.push({
        //             url: 'https://x.com/' + jsondata.url,
        //             link_text: jsondata.url_text,
        //             class: 'icon-link'
        //         });
        //     }
        // jsondata.images = [];
        // if ( jsondata.image && jsondata.image !== '' && jsondata.imagealt && jsondata.imagealt !== '' ) {
        //     jsondata.images.push({
        //         url: jsondata.image,
        //         alt: jsondata.imagealt
        //     });
        // }
        // delete jsondata.image;
        // delete jsondata.imagealt;
        //delete jsondata.phone_number;
        // if ( ! jsondata.links ) {
        //     jsondata.links = [];
        //     if ( jsondata.url !== '' && jsondata.url_text !== '' ) {
        //         jsondata.links.push({
        //             url: 'https://x.com/' + jsondata.url,
        //             link_text: jsondata.url_text,
        //             class: 'icon-link'
        //         });
        //     }
        //     if ( jsondata.campusmap_url ) {
        //         let campusmap_ref = jsondata.campusmap_ref !== '' ? ' (map reference ' + jsondata.campusmap_ref + ')': '';
        //         jsondata.links.push({
        //             url: jsondata.campusmap_url,
        //             link_text: 'View on the University campus map' + campusmap_ref,
        //             class: 'icon-uol-logo-mark'
        //         });
        //     }
        //     delete jsondata.url;
        //     delete jsondata.url_text;
        //     delete jsondata.campusmap_url;
        //     delete jsondata.campusmap_ref;
        // }
        // Put social media stuff in a different data structure
        // if ( ! jsondata.contacts ) {
        //     jsondata.contacts = [];
        //     if ( jsondata.space_type === 'Library' ) {
        //         jsondata.contacts.push({
        //             url: 'mailto:library@leeds.ac.uk',
        //             link_text: 'Email us at library@leeds.ac.uk',
        //             class: 'icon-email'
        //         });
        //         jsondata.contacts.push({
        //             url: 'tel:+441133435663 ',
        //             link_text: 'Call us on +44 (0)113 343 5663',
        //             class: 'icon-phone'
        //         });
        //         jsondata.contacts.push({
        //             url: 'https://bit.ly/4lGhXAO',
        //             link_text: 'Follow us on Instagram',
        //             class: 'icon-instagram'
        //         });
        //         jsondata.contacts.push({
        //             url: 'https://bit.ly/4nxW4FT',
        //             link_text: 'Follow us on Bluesky',
        //             class: 'icon-bluesky'
        //         });
        //         delete jsondata.phone_number;
        //         delete jsondata.email_address;
        //         delete jsondata.twitter_screen_name;
        //         delete jsondata.facebook_url;
        //     } else {
        //         if ( jsondata.phone_number ) {
        //             jsondata.contacts.push({
        //                 url: 'tel:' + jsondata.phone_number.replace( /[^0-9]+/g, '' ).replace( /^0/, '+44' ),
        //                 link_text: 'Call us on ' + jsondata.phone_number,
        //                 class: 'icon-phone'
        //             });
        //             delete jsondata.phone_number;
        //         }
        //         if ( jsondata.email_address ) {
        //             jsondata.contacts.push({
        //                 url: 'mailto:' + jsondata.email_address,
        //                 link_text: 'Email us at ' + jsondata.email_address,
        //                 class: 'icon-email'
        //             });
        //             delete jsondata.email_address;
        //         }
        //         if ( jsondata.twitter_screen_name ) {
        //             jsondata.contacts.push({
        //                 url: 'https://x.com/' + jsondata.twitter_screen_name,
        //                 link_text: 'Follow ' + jsondata.twitter_screen_name + ' on X',
        //                 class: 'icon-x'
        //             });
        //             delete jsondata.twitter_screen_name ;
        //         }
        //         if ( jsondata.facebook_url ) {
        //             jsondata.contacts.push({
        //                 url: jsondata.facebook_url,
        //                 link_text: 'Follow ' + jsondata.facebook_url.replace( 'https://www.facebook.com/', '' ) + ' on facebook',
        //                 class: 'icon-facebook-squared'
        //             });
        //             delete jsondata.facebook_url;
        //         }
        //     }
        // }
        // Write the file back out
        fs.writeFileSync( path.resolve( __dirname, '../spaces/', filename ), JSON.stringify( jsondata, null, 4 ) );
        // Write the file back out with a new filename
        // let newfilename = path.resolve( __dirname, '../spaces/new', jsondata.slug ) + '.json';
        // if ( fs.existsSync( newfilename ) ) {
        //     fs.unlinkSync( newfilename );
        // }
        // fs.writeFileSync( newfilename, JSON.stringify( jsondata, null, 4 ) );
    }
});
