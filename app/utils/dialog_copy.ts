import type { TaskDialog } from '~/types/travel_log';

function get_plain_text(html: string) {
    const document = new DOMParser().parseFromString(html, 'text/html');
    for (const element of document.querySelectorAll('br')) element.replaceWith('\n');
    return document.body.textContent?.trim() || '';
}

export function format_dialog(dialog: TaskDialog) {
    const content = get_plain_text(dialog.content);
    if (!content) return '';
    const speaker = dialog.role === 'select' ? '[player]'
        : dialog.role === 'black_screen' ? '[blackscreen]'
        : get_plain_text(dialog.speaker || '') || '[text]';
    return `${speaker}：${content}`;
}

export async function copy_dialog_text(text: string) {
    if (!text) {
        ElMessage({ message: $t('travel-log.copy_empty'), type: 'info', plain: true });
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        ElMessage({ message: $t('normal.copied'), type: 'success', plain: true });
    } catch {
        ElMessage({ message: $t('travel-log.copy_failed'), type: 'error', plain: true });
    }
}
