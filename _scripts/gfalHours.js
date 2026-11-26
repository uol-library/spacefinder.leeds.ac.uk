/**
 * Updates the opening hours of cafés from the opening hours table on the
 * Great Food at Leeds (GFAL) website:
 * https://gfal.leeds.ac.uk/where-to-eat/opening-hours/
 *
 * The page itself is behind a firewall which blocks scripts, so its content
 * is fetched from the WordPress REST API instead. The table has a row for each
 * outlet, with a link to the outlet's page, a service update (e.g. "Open") and
 * the opening hours as text (e.g. "Mon – Fri: 8am – 5pm<br>Sat & Sun: 10am – 2pm").
 * Rows are matched to spaces by that link, which is the space's mainEntity.url.
 *
 * These are general term-time hours. Days which aren't mentioned are closed.
 * A space is left unchanged, and the row reported, if the service update
 * doesn't start with "Open" or the hours can't be read completely.
 *
 * Usage:
 *   node _scripts/gfalHours.js              fetch the page and update spaces
 *   node _scripts/gfalHours.js --dry-run    report what would change without writing anything
 *   node _scripts/gfalHours.js --file x.json  use a saved copy of the API response instead of fetching it
 *
 * Run `npm run concat` afterwards to rebuild assets/data/spaces/data.json.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const API_URL    = 'https://gfal.leeds.ac.uk/wp-json/wp/v2/pages?slug=opening-hours';
const SPACES_DIR = path.resolve(__dirname, '../assets/data/spaces/data');
const DAYS       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const args   = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const option = name => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : null;
};

/* Links on the page and in the space data differ in trailing slashes and case */
const normUrl = u => u.trim().toLowerCase().replace(/\/+$/, '');

/* Removes tags and decodes the entities WordPress uses, keeping line breaks */
function toText(html) {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/[–—]/g, '-')
        .replace(/[ \t ]+/g, ' ')
        .trim();
}

/* Day name or abbreviation (Mon, Tues, Thur, Thursday...) to an index into DAYS */
function dayIndex(word) {
    return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(word.slice(0, 3).toLowerCase());
}

/* "8am", "8:30pm", "8.30 pm", "noon" to HH:MM:SS. Midnight is 24:00:00. */
function normaliseTime(t) {
    if (/^(noon|midday)$/i.test(t)) return '12:00:00';
    const m = t.match(/^(\d{1,2})(?:[:.](\d\d))?\s*(am|pm)$/i);
    if (!m) return null;
    let h = +m[1] % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    if (h === 0 && !m[2]) h = 24;
    return String(h).padStart(2, '0') + ':' + (m[2] || '00') + ':00';
}

const DAY  = '(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*';
const TIME = '(?:\\d{1,2}(?:[:.]\\d\\d)?\\s*[ap]m|noon|midday)';
const RULE = new RegExp(
    `(${DAY}(?:\\s*(?:-|to|&|,|and)\\s*${DAY})*)\\s*:?\\s*` +
    `(?:(${TIME})\\s*(?:-|to)\\s*(${TIME})|(closed))`, 'gi');

/**
 * Parses the opening hours text into an object keyed by day index, with
 * { opens, closes } for open days and null for days that are said to be
 * closed. Returns null if any of the text can't be understood.
 */
function parseHours(text) {
    const hours = {};
    const leftover = text.replace(RULE, (match, days, from, to, closed) => {
        const indexes = new Set();
        // "Mon - Fri" is a range, "Sat & Sun" or "Mon, Wed" are lists
        days.split(/\s*(?:&|,|and)\s*/i).forEach(part => {
            const [a, b] = part.split(/\s*(?:-|to)\s*/i).map(dayIndex);
            for (let d = a; d <= (b === undefined ? a : b); d++) indexes.add(d);
        });
        const value = closed ? null : { opens: normaliseTime(from), closes: normaliseTime(to) };
        indexes.forEach(d => { hours[d] = value; });
        return '';
    });
    if (/[a-z0-9]/i.test(leftover) || !Object.keys(hours).length) return null;
    return hours;
}

/* An openingHoursSpecification for Monday to Sunday, in the same form as the LibCal script */
function toSpecification(hours) {
    return DAYS.map((day, i) => {
        const spec = { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + day };
        if (hours[i]) {
            spec.opens  = hours[i].opens;
            spec.closes = hours[i].closes;
        }
        return spec;
    });
}

/* A short description of opening hours for the log, e.g. "Mon 08:00-17:00, Sat closed" */
function describe(spec) {
    return (spec || []).map(s => {
        const day = s.dayOfWeek.replace(/.*\//, '').slice(0, 3);
        return s.opens ? `${day} ${s.opens.slice(0, 5)}-${s.closes.slice(0, 5)}` : `${day} closed`;
    }).join(', ');
}

async function loadPage() {
    const file = option('--file');
    let text;
    if (file) {
        text = fs.readFileSync(path.resolve(file), 'utf8');
    } else {
        const res = await fetch(API_URL, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`${API_URL} returned ${res.status} ${res.statusText}`);
        text = await res.text();
    }
    const pages = JSON.parse(text);
    if (!pages.length) throw new Error('The opening hours page was not found');
    return pages[0];
}

function parseTable(html) {
    const table = (html.match(/<table[\s\S]*?<\/table>/i) || [])[0];
    if (!table) throw new Error('No table found on the opening hours page');
    return (table.match(/<tr[\s\S]*?<\/tr>/gi) || [])
        .map(row => (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []))
        .filter(cells => cells.length >= 3)
        .map(cells => {
            const link = cells[0].match(/href="([^"]+)"/i);
            return {
                name:   toText(cells[0]).replace(/\s+/g, ' '),
                url:    link ? normUrl(link[1]) : null,
                status: toText(cells[1]).replace(/\s+/g, ' '),
                text:   toText(cells[2])
            };
        });
}

async function main() {
    const page = await loadPage();
    const rows = parseTable(page.content.rendered);
    console.log(`GFAL opening hours page, last modified ${page.modified}: ${rows.length} outlets\n`);

    const spaces = fs.readdirSync(SPACES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(filename => {
            const file = path.join(SPACES_DIR, filename);
            return { filename, file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
        })
        .filter(s => s.data.mainEntity && s.data.mainEntity.url);
    const byUrl = new Map(spaces.map(s => [normUrl(s.data.mainEntity.url), s]));

    const problems = [];
    const matched  = new Set();
    let changed = 0;

    for (const row of rows) {
        const space = row.url && byUrl.get(row.url);
        if (!space) {
            problems.push(`${row.name}: no space links to ${row.url || '(no link)'}`);
            continue;
        }
        matched.add(space.filename);
        if (!/^open\b/i.test(row.status)) {
            problems.push(`${row.name}: service update is "${row.status}", so ${space.filename} was left unchanged`);
            continue;
        }
        if (row.status.toLowerCase() !== 'open') {
            console.log(`Note: ${row.name} service update is "${row.status}"`);
        }
        const hours = parseHours(row.text);
        if (!hours) {
            problems.push(`${row.name}: couldn't read the hours "${row.text.replace(/\n/g, ' / ')}", so ${space.filename} was left unchanged`);
            continue;
        }
        const ld      = space.data.mainEntity;
        const newSpec = toSpecification(hours);
        if (JSON.stringify(ld.openingHoursSpecification) !== JSON.stringify(newSpec)) {
            console.log(`${dryRun ? 'Would update' : 'Updated'} ${space.filename}\n    ${describe(ld.openingHoursSpecification)}\n -> ${describe(newSpec)}`);
            ld.openingHoursSpecification = newSpec;
            if (!dryRun) fs.writeFileSync(space.file, JSON.stringify(space.data, null, 4));
            changed++;
        }
    }

    console.log(`\n${changed} space(s) ${dryRun ? 'would be ' : ''}updated.`);

    // Cafés with a GFAL link which aren't on the opening hours page (e.g. closed or unpublished ones)
    spaces
        .filter(s => /gfal\.leeds\.ac\.uk/.test(s.data.mainEntity.url) && !matched.has(s.filename))
        .forEach(s => console.log(`Note: ${s.filename} [${s.data.creativeWorkStatus}] isn't on the opening hours page, so its hours weren't checked`));
    if (problems.length) {
        console.log('\nProblems:');
        problems.forEach(p => console.log(`  - ${p}`));
        process.exitCode = 1;
    }
    if (changed && !dryRun) console.log('\nNow run `npm run concat` to rebuild assets/data/spaces/data.json');
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
