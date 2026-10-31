import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const jiti = createJiti(import.meta.url, { fsCache: false, alias: {
    '#server': `${root}/server`, '~~': root, '~': `${root}/app`,
} });
for (const file of ['check_list_pagination.ts', 'check_misc_contract.ts', 'check_misc_text.ts', 'check_misc_frontend.ts', 'check_misc_messages.ts',
    'check_archive_text.ts', 'check_archive_classifications.ts', 'check_tcg_filters.ts', 'check_archive_list_layout.ts', 'check_archive_detail_layout.ts', 'check_archive_dialogues.ts', 'check_miliastra_halls.ts', 'check_achievement_stages.ts', 'check_inline_links.ts', 'check_entry_copy.ts', 'check_gallery_layout.ts']) {
    const check = await jiti.import(`./${file}`);
    if (typeof check.run === 'function') await check.run();
}
