import { isMapCatalogue, type MapCatalogue, type MapCataloguePage } from '@inteyvat-wiki/wiki-contracts/map';

/** Only the exported Wiki document is accepted here; game data is never interpreted. */
export function select_map_records(document: unknown, query: { search?: string; kind?: string; id?: string; offset?: number }): MapCataloguePage {
    if (!isMapCatalogue(document)) throw new Error('Invalid map catalogue export');
    const catalogue: MapCatalogue = document;
    const needle = (query.search || '').trim().toLocaleLowerCase();
    const offset = query.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid map catalogue offset');
    const matches = catalogue.items.filter(item => (!query.id || item.id === query.id)
        && (Boolean(item.label) || Boolean(item.description))
        && (!query.kind || item.kind === query.kind)
        && (!needle || [item.id, item.label, item.description, ...item.texts.map(text => text.text)]
            .some(value => value.toLocaleLowerCase().includes(needle))));
    return { schema: 1, total: matches.length, offset, items: matches.slice(offset, offset + 40) };
}
