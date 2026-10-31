import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:4013';
async function get(route: string) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    return response.json();
}
let checked = 0;
for (const category of ['serenitea', 'tcg', 'miliastra', 'misc']) {
    const aliases: Record<string, string> = JSON.parse(fs.readFileSync(`data/common/${category}/id_aliases.json`, 'utf8'));
    const sources: Record<string, string> = JSON.parse(fs.readFileSync(`data/common/${category}/source_ids.json`, 'utf8'));
    const reverse = new Map(Object.entries(sources).map(([source, canonical]) => [canonical, source]));
    const samples = new Map<string, [string, string]>();
    for (const [old, canonical] of Object.entries(aliases)) {
        const kind = canonical.split('-')[0]!;
        if (!samples.has(kind)) samples.set(kind, [old, canonical]);
        // Include a same-type duplicate within the type namespace.
        if (/-\d+$/.test(canonical) && !samples.has(kind + ':duplicate')) samples.set(kind + ':duplicate', [old, canonical]);
    }
    const prefix = category === 'misc' ? '/api/misc' : `/api/archive/${category}`;
    for (const lang of ['zh_hans', 'en']) {
        for (const [old, canonical] of samples.values()) {
            const [current, previous, raw] = await Promise.all([canonical, old, reverse.get(canonical)!]
                .map(id => get(`${prefix}/${id}?lang=${lang}`)));
            assert.deepEqual(previous, current, `Legacy Wiki ID ${old} must read the same object as ${canonical}`);
            assert.deepEqual(raw, current, `Raw source ID must keep resolving to ${canonical}`);
            checked++;
        }
        const unknown = await fetch(`${base}${prefix}/unknown--directory-alias?lang=${lang}`);
        assert.equal(unknown.status, 404);
    }
}
console.log(`${checked} bilingual namespace/duplicate samples: canonical, legacy Wiki and source ID responses match; unknown IDs return 404.`);
