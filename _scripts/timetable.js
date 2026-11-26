/**
 * Updates the timetable links (mainEntity.url) of spaces from the
 * University timetable's list of locations, and reports IT clusters that
 * are in the timetable but not linked from a space (and vice versa).
 *
 * The location IDs in timetable links change from one academic year to the
 * next, so spaces are matched to timetable locations by name, using the
 * mapping in _data/timetable-locations.json:
 *
 *   { "<space file name, without .json>": "<timetable location name>" }
 *
 * To link another space, add it to that file. If a room is renamed in the
 * timetable, the script says so and suggests likely matches.
 *
 * Usage:
 *   node _scripts/timetable.js              fetch the current year's data and update spaces
 *   node _scripts/timetable.js --dry-run    report what would change without writing anything
 *   node _scripts/timetable.js --file x.json  use a saved copy of the data instead of fetching it
 *   node _scripts/timetable.js --save x.json  also save the fetched data to a file
 *
 * The data comes from https://mytimetable.leeds.ac.uk/overview/location/data,
 * which only ever returns the current academic year: its "d" parameter is
 * ignored. Run `npm run concat` afterwards to rebuild assets/data/spaces/data.json.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_URL    = 'https://mytimetable.leeds.ac.uk/overview/location/data';
const LINK_PREFIX = 'https://mytimetable.leeds.ac.uk/link?timetable.id=';
const SPACES_DIR  = path.resolve(__dirname, '../assets/data/spaces/data');
const MAP_FILE    = path.resolve(__dirname, '../_data/timetable-locations.json');
// Timetable locations that look like IT clusters
const CLUSTER_RE  = /cluster|computer/i;

const args   = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const option = name => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : null;
};

/* Collapse runs of whitespace, as some timetable names contain double spaces */
const clean = s => s.replace(/\s+/g, ' ').trim();

/* Normalises room numbers so that "GR.04", "G04" and "g.04" all compare equal */
const normRoom = s => s.toUpperCase().replace(/\./g, '').replace(/^GR(?=\d)/, 'G');

/* Room numbers in a space name, e.g. "Worsley Building - 8.049O (Fourman)" -> ["8049O"] */
const spaceRooms = name => (name.match(/\b[A-Z]{0,2}\.?\d[\d.]*[A-Z]?\b/gi) || []).map(normRoom);

/* Room numbers in a timetable name, e.g. "Clarendon Building Cluster (GR.04)" -> ["G04"] */
const timetableRooms = name => [...name.matchAll(/\(([^)]*)\)/g)]
    .flatMap(m => m[1].split(/\s*(?:&|and)\s*/))
    .map(normRoom);

async function loadTimetable() {
    const file = option('--file');
    let text;
    if (file) {
        text = fs.readFileSync(path.resolve(file), 'utf8');
    } else {
        const res = await fetch(DATA_URL, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`${DATA_URL} returned ${res.status} ${res.statusText}`);
        text = await res.text();
        const save = option('--save');
        if (save) fs.writeFileSync(path.resolve(save), text);
    }
    return JSON.parse(text).data;
}

function loadSpaces() {
    return fs.readdirSync(SPACES_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .map(filename => {
            const file = path.join(SPACES_DIR, filename);
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            return { slug: filename.replace(/\.json$/, ''), file, data };
        })
        .filter(s => s.data.mainEntity);
}

function suggest(space, clusters) {
    const rooms = spaceRooms(space.data.mainEntity.name);
    return clusters.filter(loc => timetableRooms(loc.name).some(r => rooms.includes(r)));
}

async function main() {
    const locations = await loadTimetable();
    const byName    = new Map(locations.map(loc => [clean(loc.name), loc]));
    const clusters  = locations.filter(loc => CLUSTER_RE.test(loc.name));
    const years     = [...new Set(locations.map(loc => loc.key.split('!')[0]))];
    const mapping   = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    const spaces    = loadSpaces();
    const bySlug    = new Map(spaces.map(s => [s.slug, s]));
    const problems  = [];

    console.log(`Timetable data: ${locations.length} locations, year ${years.join(', ')}\n`);

    // 1. Update the mapped spaces
    let changed = 0;
    for (const [slug, locName] of Object.entries(mapping)) {
        const space = bySlug.get(slug);
        if (!space) {
            problems.push(`${slug}: no space file called ${slug}.json`);
            continue;
        }
        const loc = byName.get(clean(locName));
        if (!loc) {
            const options = suggest(space, clusters).map(l => `"${l.name}"`).join(', ');
            problems.push(`${slug}: "${locName}" is not in the timetable data` +
                (options ? `; did it become ${options}?` : ''));
            continue;
        }
        const url = LINK_PREFIX + loc.key;
        if (space.data.mainEntity.url !== url) {
            console.log(`${dryRun ? 'Would update' : 'Updated'} ${slug}\n    ${space.data.mainEntity.url || '(no link)'}\n -> ${url}`);
            space.data.mainEntity.url = url;
            if (!dryRun) fs.writeFileSync(space.file, JSON.stringify(space.data, null, 4));
            changed++;
        }
    }
    console.log(`\n${changed} space(s) ${dryRun ? 'would be ' : ''}updated, ${Object.keys(mapping).length - changed} already up to date or not found.\n`);

    // 2. Timetable links that the mapping doesn't know about
    for (const s of spaces) {
        if ((s.data.mainEntity.url || '').startsWith(LINK_PREFIX) && !mapping[s.slug]) {
            problems.push(`${s.slug}: has a timetable link but isn't in _data/timetable-locations.json, so it won't be updated`);
        }
    }

    // 3. Two spaces linked to the same location
    const seen = new Map();
    for (const [slug, locName] of Object.entries(mapping)) {
        if (seen.has(locName)) problems.push(`${slug} and ${seen.get(locName)} both link to "${locName}"`);
        seen.set(locName, slug);
    }

    if (problems.length) {
        console.log('Problems:');
        problems.forEach(p => console.log(`  - ${p}`));
        console.log();
    }

    // 4. IT cluster spaces with no timetable link
    const linked = new Set(Object.values(mapping).map(clean));
    const unlinkedSpaces = spaces.filter(s => s.data.mainEntity.additionalType === 'IT Cluster' && !mapping[s.slug]);
    if (unlinkedSpaces.length) {
        console.log('IT cluster spaces with no timetable link (possible matches in brackets):');
        for (const s of unlinkedSpaces) {
            const options = suggest(s, clusters).filter(l => !linked.has(clean(l.name)));
            const status  = s.data.creativeWorkStatus === 'Published' ? '' : ` [${s.data.creativeWorkStatus}]`;
            console.log(`  - ${s.slug}${status}: ${s.data.mainEntity.name}` +
                (options.length ? `\n      [${options.map(l => l.name).join(' | ')}]` : ''));
        }
        console.log();
    }

    // 5. Timetable clusters that no space links to
    const unlinkedClusters = clusters.filter(l => !linked.has(clean(l.name)));
    if (unlinkedClusters.length) {
        console.log('Timetable locations that look like IT clusters but no space links to:');
        unlinkedClusters
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(l => console.log(`  - ${clean(l.name)} (capacity ${l.capacity})`));
        console.log();
    }

    if (changed && !dryRun) console.log('Now run `npm run concat` to rebuild assets/data/spaces/data.json');
    if (problems.length) process.exitCode = 1;
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
