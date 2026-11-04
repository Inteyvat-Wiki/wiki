import { read_object, read_pages } from '../server/utils/page';
import { read_common, read_lang } from '../server/utils/read';
import { get_content_item, get_content_pages, get_archive_item, getCharacter } from '../app/utils/api';
import { create_archive_processor } from '../server/utils/archive';
import type { ExportDocument, DisplayResponse, ContentPages } from '@inteyvat-wiki/wiki-contracts/registry';
import type { ArchiveItem, ArchivePage } from '@inteyvat-wiki/wiki-contracts/archive';
import type { LoadingSituation, MiscItem } from '@inteyvat-wiki/wiki-contracts/misc';
import type { OutfitItem, OutfitPages } from '@inteyvat-wiki/wiki-contracts/outfit';

// Compile-only: do not import this file in the runtime suite.
async function contracts() {
    const raw: ExportDocument<'character'> = await read_object('character', 'amber', 'en');
    const pages: ContentPages<'weapon'> = await read_pages('weapon', 'en');
    const display: DisplayResponse<'character'> = await getCharacter('amber');
    const card: DisplayResponse<'tcg'> = await get_archive_item('tcg', 'card-a');
    const clientPages: ContentPages<'task'> = await get_content_pages('task');
    const outfit: OutfitItem = await get_content_item('outfit', 'glider-wings');
    const outfits: OutfitPages = await read_pages('outfit', 'en');
    // @ts-expect-error Outfit is not an archive/misc record.
    const wrongOutfit: MiscItem = outfit;
    // @ts-expect-error Unknown raw discriminants cannot enter outfit pages.
    const rawOutfitType: OutfitPages[number]['type'] = 'FLYCLOAK';
    void [outfits, wrongOutfit, rawOutfitType];
    // @ts-expect-error result is selected by category, not by the caller's requested type
    await read_object<DisplayResponse<'character'>>('character', 'amber', 'en');
    // @ts-expect-error ordinary content excludes map
    await read_pages('map', 'en');
    // @ts-expect-error directories and HTTP URL segments are different namespaces
    await read_object('quest-item', 'a', 'en');
    // @ts-expect-error character exports have unresolved skill details
    const wrongDisplay: DisplayResponse<'character'> = raw;
    // @ts-expect-error category-specific page result cannot be forged
    const wrongPages: ContentPages<'character'> = await read_pages('weapon', 'en');
    // @ts-expect-error category-specific client response cannot be forged
    const wrongClient: DisplayResponse<'character'> = await get_content_item('weapon', 'a');
    // @ts-expect-error API no longer accepts arbitrary route values
    await getCharacter(['amber']);
    // @ts-expect-error parsed JSON is unknown until it crosses an explicit boundary
    const unvalidated: MiscItem = await read_lang('misc/items/a', 'en');
    // @ts-expect-error common JSON is unknown too (apart from the validated map index)
    const unchecked: string[] = await read_common('misc/ids');
    const tcg: ArchivePage<'tcg'> = { id: 'a', name: '', type: 'card', description: '', icon: null, star: null, show: true, items: ['a'], related_items: [] };
    const processor = create_archive_processor({ traveller: undefined, traveller_name: undefined, wanderer_name: undefined, littleone_name: undefined }, (key: string) => key);
    const kept: ArchivePage<'tcg'> = processor.page(tcg);
    // @ts-expect-error processor preserves archive category, not a broad archive union
    const wrongArchive: ArchivePage<'serenitea'> = processor.page(tcg);
    // @ts-expect-error misc is not an archive page
    const wrongMisc: ArchivePage = { ...tcg, type: 'tutorial' };
    // @ts-expect-error invalid card ID cannot hide in a fixture
    const wrongCard: ArchiveItem['card_type'] = { id: 'equip', name: '' };
    // @ts-expect-error action owns its fields
    const wrongSituation: LoadingSituation = { id: '1', action: 'login', areas: [] };
    // @ts-expect-error finite tutorial categories
    const wrongTutorial: MiscItem['tutorial_category'] = 'unknown';
    // @ts-expect-error finite message kinds
    const wrongKind: NonNullable<MiscItem['message_thread']>['nodes'][number]['kind'] = 'unknown';
    void [pages, display, card, clientPages, wrongDisplay, wrongPages, wrongClient, unvalidated, unchecked, kept, wrongArchive, wrongMisc, wrongCard, wrongSituation, wrongTutorial, wrongKind];
}
void contracts;
