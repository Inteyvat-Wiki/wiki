import type { Settings } from "~/types/settings";

let settings: Ref<Settings> = ref({} as Settings);
let initialized = false;

export function init_settings() {
    if (initialized) return;

    const saved_settings = localStorage.getItem('settings');
    if (saved_settings) {
        settings.value = { ...JSON.parse(saved_settings) };
    }

    localStorage.setItem('settings', JSON.stringify(settings.value));

    watch(settings, () => {
        localStorage.setItem('settings', JSON.stringify(settings.value));
        console.log(settings.value);
    }, { deep: true });

    initialized = true;
}

export function get_settings() {
    return settings;
}

export async function get_settings_value() {
    while (!initialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return settings.value;
}