/**
 * Cookie Consent configuration
 * @see https://cookieconsent.orestbida.com/reference/configuration-reference.html
 */
CookieConsent.run({
    categories: {
        necessary: {
            enabled: true,
            readOnly: true
        },
        performance: {},
        analytics: {}
    },
    language: {
        default: 'en',
        translations: {
            en: {
                consentModal: {
                    title: 'Tell us whether you accept cookies',
                    description: 'This website uses essential cookies to ensure its proper operation, performance cookies to help it work faster, and tracking cookies to understand how you interact with it. Performance and tracking cookies are set automatically as this application is currently being assessed in a pilot, but you can opt out at any stage.',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    showPreferencesBtn: 'Let me Choose'
                },
                preferencesModal: {
                    title: 'Cookie preferences',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    savePreferencesBtn: 'Save Settings',
                    closeIconLabel: 'Close',
                    sections: [
                        {
                            title: 'Cookie usage',
                            description: 'This website uses cookies to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="#" class="cc-link modal-trigger" data-dialoghash="privacy" data-dialogid="privacy-page">privacy policy</a>.'
                        },
                        {
                            title: 'Strictly Necessary cookies',
                            description: 'These cookies are essential for the proper functioning of this website. Without these cookies, the website would not remember your cookie preferences.',
                            linkedCategory: 'necessary'
                        },
                        {
                            title: 'Performance cookies',
                            description: 'These cookies allow the website to store data so the website works more efficiently between visits.',
                            linkedCategory: 'performance'
                        },
                        {
                            title: 'Analytics cookies',
                            description: 'Analytics tools set cookies that store anonymised information about how you got to the site and what you click on while you are visiting the site. We do not allow other organisations to use or share the data about how you use this site.',
                            linkedCategory: 'analytics'
                        },
                        {
                            title: 'More information',
                            description: 'You can manage your privacy settings, including cookies, through your browser settings. Further information about cookies can be found on the <a target="_ico" href="https://ico.org.uk/">Information Commissioners Office website</a>.',
                        }
                    ]
                }
            }
        }
    },
    guiOptions: {
        consentModal: {
            layout: 'box', 
            position: 'bottom center',
            flipButtons: false,
            equalWeightButtons: true
        },
        preferencesModal: {
            layout: 'bar',
            position: 'left'
        }
    },
    onConsent: focusOnMain,
    onChange: focusOnMain,
    onFirstAction: focusOnMain,
});
spacefinder.canUseLocalStorage = function(){
    const preferences = CookieConsent.getUserPreferences();
    return ( preferences.acceptedCategories.includes('performance') );
}
function focusOnMain() {
    document.getElementById( 'maincontainer' ).setAttribute( 'tabindex', '-1' );
    document.getElementById( 'maincontainer' ).focus();
}