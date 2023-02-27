Spacefinder
===========

This repository contains the University of Leeds wayfinding application **Spacefinder** which is a [jekyll site](https://jekyllrb.com/) using the [spacefinder jekyll theme](https://github.com/uol-library/spacefinder/) and with data about spaces on the University of Leeds campus.

How to use the Spacefinder jekyll theme
---------------------------------------

This repository uses the `remote_theme` plugin to load the Spacefinder theme from a Github repository: https://github.com/uol-library/spacefinder/

This plugin is enabled by default for Github pages, but you will need to specify it explicitly in your `Gemfile` in order to build the site locally:

```ruby
source "https://rubygems.org"
gem "github-pages", "~> 219", group: :jekyll_plugins
gem "jekyll-remote-theme"
```

You need to include the following line in you `_config.yml` file to use the theme:

```yaml
remote_theme: uol-library/spacefinder
```

The theme includes layouts and includes, but the following files **must** be in any site using the theme for it to work:

* `filters.json` - this is a markdown file which does not build when using a remote theme - it must be present in order to create `filters.json` in the `_site`.
* `spaces.json` - this is the main data file for the spaces. In this repository it is built from individual JSON files in the `spaces` directory using the node script `_scripts/concat.js`
* `_data/config.yml` - this data file defines all the filters / taxonomies used on the site
* `_includes/javascript/templates.js` - this contains two functions which are used to render space data in the UI.
* `_includes/top-bar.html` - the top navigation bar with your logo
* `_includes/pages/about.md` - About page
* `_includes/pages/privacy.md` - Privacy statement
* `_includes/pages/accessibility.md` - Accessibility statement
* `index.md` - the main page
* `_config.yml` - jekyll configuration file

Other files included in this repository cover things like:

* Icons - using icons in `assets/favicons` and the file `_includes/favicons.html`
* Photos for spaces in `assets/photos`

