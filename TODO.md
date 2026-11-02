# TODO

Where things were left on 2 November 2026 (`develop` branch), for this site
and for the theme, [uol-library/spacefinder](https://github.com/uol-library/spacefinder)
(`../spacefinder`).

This site's `develop` builds with the theme's `develop` as its theme
(`_config_dev.yml`). The data, its scripts and the daily jobs live here.
Done: the scripts use the JSON-LD in `assets/data/*/data`, `_config_dev.yml`
holds only the overrides, and `.github/workflows/build.yml` builds the site
and pushes it to the `build` (from `main`) or `build-dev` (from `develop`)
branch for the Apache servers to copy.

## This site

- **Deployment:** set up the servers to pull the build branches and copy
  them to the DocumentRoot.
- **Data fixes:** wrong campus map entries are matched to `relation/7686369`
  in `assets/data/campusmap/osm/campusmap-osm.json`. See
  `campusmap-osm-review.md`.
- **Release:** when the theme is ready, merge the theme's `develop` to its
  `main`, then change `remote_theme` back to `uol-library/spacefinder` and
  merge this repo's `develop`. The dataset modules here use `getSiteURL()`
  and `getLogger()`, which are only in the theme's `develop`, so always push
  the theme's `develop` before this repo's.
- Checking the campus map for updates is on hold, because its data isn't
  reliable.

## Art trail

- The route is done for now: `route.geojson` (full) and `shortroute.geojson`,
  fitted to OpenStreetMap and step-free, with statistics
  (`npm run routeStats`) and GPX/KML exports (`npm run routeExport`).
- Still to check on the ground: the estimated west pavement of Woodhouse
  Lane beside the steps at way/985764210, and the end of the flight near
  Hermes (way/22951906). The accessible path beside the Clarendon Building
  is missing from OSM (it's being added); check the route against it
  afterwards.
- Walk the route and record the viewing point coordinates.
- Then decide how to show each artwork's description: either when the user
  gets near it, or as clickable pins beside the route. The route stays
  separate from the artwork pins. Hermes can't go on the route because it's
  on a wall above a pond.
- Show the routes in the app, with links to download the GPX and KML files.

## The theme

The aim: core scripts plus datasets that can be added by putting a folder in
`assets/data/<key>/` (`data.json`, `filters.json`, `<key>.mjs`, optional
`images/`; the theme's own examples are in `examples/`) and listing it under
`datasources` in `_data/config.yml`.

- **Full screen.** The list and filters are now a Leaflet control on the
  map (`layout.mjs`), so the map can go full screen with them. Check the
  fullscreen control keeps the panel usable (it uses the Fullscreen API on
  the map container), especially on phones, where the panel and the
  controls on the right don't both fit.
- **Documentation site.** It's in the theme's `docs/` (Just the Docs theme):
  the old wiki pages, guides, and API pages generated with `npm run docs`.
  Preview it with `npm run docs:serve`.
  - To publish it: merge to `main`, then turn on GitHub Pages for `main`,
    `/docs`. It will be at <https://uol-library.github.io/spacefinder/>.
  - Once it's live, replace the GitHub wiki with a link to it, or turn the
    wiki off, so there's only one copy to keep up to date.
  - Add the data model pages for any new datasets.
- **Testing.** `npm run test:routing` (in the theme) builds the site in the
  three routing modes and runs 109 browser scenarios, using headless Chrome
  and the example datasets, including the app in an iframe. It needs
  Bundler and Chrome. `-- --no-build` reuses the last builds. It doesn't
  test clicking map markers, or the Apache rewrite rules.
