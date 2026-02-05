<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';

interface ColorPack {
    label: string;
    primary_color: string;
}

interface AdminSettings {
    theme: string;
    color_pack: string;
    primary_color: string;
    border_radius: string;
    posts_per_page: number;
}

const DEFAULT_SETTINGS: AdminSettings = {
    theme: 'default',
    color_pack: 'default',
    primary_color: '#1877f2',
    border_radius: 'rounded',
    posts_per_page: 10,
};

const title = ref('Modern Feed');
const settings = reactive<AdminSettings>({ ...DEFAULT_SETTINGS });
const colorPacks = ref<Record<string, ColorPack>>({});
const saving = ref(false);
const resetting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

declare global {
    interface Window {
        fcomMfAdmin?: {
            ajaxUrl: string;
            nonce: string;
            settings: Record<string, string | number>;
            colorPacks?: Record<string, ColorPack>;
        };
    }
}

function applyInitial(): void {
    const raw = window.fcomMfAdmin?.settings;
    const packs = window.fcomMfAdmin?.colorPacks;
    if (packs && typeof packs === 'object') {
        colorPacks.value = packs;
    }
    if (!raw) return;
    settings.theme = typeof raw.theme === 'string' ? raw.theme : DEFAULT_SETTINGS.theme;
    settings.color_pack = typeof raw.color_pack === 'string' ? raw.color_pack : DEFAULT_SETTINGS.color_pack;
    settings.primary_color = typeof raw.primary_color === 'string' ? raw.primary_color : DEFAULT_SETTINGS.primary_color;
    settings.border_radius = typeof raw.border_radius === 'string' ? raw.border_radius : DEFAULT_SETTINGS.border_radius;
    settings.posts_per_page = typeof raw.posts_per_page === 'number' ? raw.posts_per_page : DEFAULT_SETTINGS.posts_per_page;
}

watch(
    () => settings.color_pack,
    (pack) => {
        const def = colorPacks.value[pack]?.primary_color;
        if (def) settings.primary_color = def;
    }
);

function buildSettingsFormData(): FormData {
    const form = new FormData();
    form.append('action', 'fcom_mf_save_settings');
    form.append('nonce', window.fcomMfAdmin?.nonce ?? '');
    form.append('settings[theme]', settings.theme);
    form.append('settings[color_pack]', settings.color_pack);
    form.append('settings[primary_color]', settings.primary_color);
    form.append('settings[border_radius]', settings.border_radius);
    form.append('settings[posts_per_page]', String(settings.posts_per_page));
    return form;
}

async function save(): Promise<void> {
    message.value = null;
    saving.value = true;
    try {
        const res = await fetch(window.fcomMfAdmin?.ajaxUrl ?? '', {
            method: 'POST',
            credentials: 'same-origin',
            body: buildSettingsFormData(),
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
            message.value = { type: 'success', text: data.data?.message ?? 'Settings saved.' };
        } else {
            message.value = { type: 'error', text: data.data?.message ?? 'Failed to save.' };
        }
    } catch (e) {
        message.value = { type: 'error', text: 'Request failed.' };
    } finally {
        saving.value = false;
    }
}

async function resetToDefault(): Promise<void> {
    message.value = null;
    resetting.value = true;
    try {
        const form = new FormData();
        form.append('action', 'fcom_mf_reset_settings');
        form.append('nonce', window.fcomMfAdmin?.nonce ?? '');
        const res = await fetch(window.fcomMfAdmin?.ajaxUrl ?? '', {
            method: 'POST',
            credentials: 'same-origin',
            body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
            const next = data.data?.settings;
            if (next && typeof next === 'object') {
                settings.theme = next.theme ?? DEFAULT_SETTINGS.theme;
                settings.color_pack = next.color_pack ?? DEFAULT_SETTINGS.color_pack;
                settings.primary_color = next.primary_color ?? DEFAULT_SETTINGS.primary_color;
                settings.border_radius = next.border_radius ?? DEFAULT_SETTINGS.border_radius;
                settings.posts_per_page = next.posts_per_page ?? DEFAULT_SETTINGS.posts_per_page;
            } else {
                Object.assign(settings, DEFAULT_SETTINGS);
            }
            message.value = { type: 'success', text: data.data?.message ?? 'Settings reset to default.' };
        } else {
            message.value = { type: 'error', text: data.data?.message ?? 'Reset failed.' };
        }
    } catch (e) {
        message.value = { type: 'error', text: 'Request failed.' };
    } finally {
        resetting.value = false;
    }
}

onMounted(() => {
    applyInitial();
});
</script>

<template>
    <div class="admin" id="fcom-modern-dashboard-app">
        <header class="admin__header">
            <h1 class="admin__title">{{ title }}</h1>
            <p class="admin__subtitle">Theme, colors & feed options</p>
        </header>

        <div class="admin__grid">
            <!-- Appearance card -->
            <section class="card">
                <h2 class="card__title">Appearance</h2>

                <div class="field">
                    <span class="field__label">Theme</span>
                    <div class="pills">
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.theme === 'default' }"
                            @click="settings.theme = 'default'"
                        >
                            Light
                        </button>
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.theme === 'dark' }"
                            @click="settings.theme = 'dark'"
                        >
                            Dark
                        </button>
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.theme === 'auto' }"
                            @click="settings.theme = 'auto'"
                        >
                            Auto
                        </button>
                    </div>
                </div>

                <div class="field">
                    <span class="field__label">Color</span>
                    <div class="swatches">
                        <button
                            v-for="(pack, id) in colorPacks"
                            v-show="id !== 'custom'"
                            :key="id"
                            type="button"
                            class="swatch"
                            :class="{ 'swatch--active': settings.color_pack === id }"
                            :title="pack.label"
                            @click="settings.color_pack = id"
                        >
                            <span
                                class="swatch__dot"
                                :style="pack.primary_color ? { background: pack.primary_color } : {}"
                            />
                            <span class="swatch__label">{{ pack.label }}</span>
                        </button>
                        <button
                            type="button"
                            class="swatch swatch--custom"
                            :class="{ 'swatch--active': settings.color_pack === 'custom' }"
                            title="Custom"
                            @click="settings.color_pack = 'custom'"
                        >
                            <span class="swatch__dot swatch__dot--custom" />
                            <span class="swatch__label">Custom</span>
                        </button>
                    </div>
                    <div v-if="settings.color_pack === 'custom'" class="field__inline">
                        <input
                            v-model="settings.primary_color"
                            type="color"
                            class="input-color"
                            aria-label="Primary color"
                        />
                        <input
                            v-model="settings.primary_color"
                            type="text"
                            class="input-text"
                            placeholder="#1877f2"
                            maxlength="7"
                        />
                    </div>
                </div>

                <div class="field">
                    <span class="field__label">Corners</span>
                    <div class="pills">
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.border_radius === 'sharp' }"
                            @click="settings.border_radius = 'sharp'"
                        >
                            Sharp
                        </button>
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.border_radius === 'rounded' }"
                            @click="settings.border_radius = 'rounded'"
                        >
                            Rounded
                        </button>
                        <button
                            type="button"
                            class="pills__item"
                            :class="{ 'pills__item--active': settings.border_radius === 'pill' }"
                            @click="settings.border_radius = 'pill'"
                        >
                            Pill
                        </button>
                    </div>
                </div>
            </section>

            <!-- Feed card -->
            <section class="card card--narrow">
                <h2 class="card__title">Feed</h2>
                <div class="field field--row">
                    <label class="field__label">Posts per page</label>
                    <input
                        v-model.number="settings.posts_per_page"
                        type="number"
                        min="5"
                        max="50"
                        class="input-num"
                        aria-label="Posts per page"
                    />
                </div>
                <p class="card__hint">5–50. Shortcode can override.</p>
            </section>
        </div>

        <footer class="admin__footer">
            <div class="admin__actions">
                <button
                    type="button"
                    class="btn btn--primary"
                    :disabled="saving"
                    @click="save"
                >
                    {{ saving ? 'Saving…' : 'Save' }}
                </button>
                <button
                    type="button"
                    class="btn btn--ghost"
                    :disabled="resetting"
                    @click="resetToDefault"
                >
                    {{ resetting ? 'Resetting…' : 'Reset to default' }}
                </button>
            </div>
            <p v-if="message" class="admin__message" :class="'admin__message--' + message.type">
                {{ message.text }}
            </p>
        </footer>
    </div>
</template>

<style scoped>
.notice-error {
  display:none;
}
.admin {
    max-width: 640px;
    padding: 16px 0 24px;
}

.admin__header {
    margin-bottom: 20px;
}

.admin__title {
    font-size: 22px;
    font-weight: 600;
    color: #1e1e1e;
    margin: 0 0 2px;
    letter-spacing: -0.02em;
}

.admin__subtitle {
    font-size: 13px;
    color: #646970;
    margin: 0;
}

.admin__grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
}

@media (min-width: 560px) {
    .admin__grid {
        grid-template-columns: 1fr minmax(180px, 0.5fr);
    }
}

.card {
    background: #fff;
    border: 1px solid #dcdcde;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.card--narrow {
    align-self: start;
}

.card__title {
    font-size: 13px;
    font-weight: 600;
    color: #1e1e1e;
    margin: 0 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.card__hint {
    font-size: 12px;
    color: #787c82;
    margin: 8px 0 0;
}

.field {
    margin-bottom: 14px;
}

.field:last-of-type {
    margin-bottom: 0;
}

.field__label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #1e1e1e;
    margin-bottom: 8px;
}

.field__inline {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
}

.field--row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.field--row .field__label {
    margin-bottom: 0;
}

.pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.pills__item {
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #50575e;
    background: #f6f7f7;
    border: 1px solid #dcdcde;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.pills__item:hover {
    background: #eee;
    border-color: #c3c4c7;
}

.pills__item--active {
    color: #fff;
    background: #2271b1;
    border-color: #2271b1;
}

.pills__item--active:hover {
    background: #135e96;
    border-color: #135e96;
}

.swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.swatch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    color: #50575e;
    background: #fff;
    border: 1px solid #dcdcde;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.swatch:hover {
    border-color: #8c8f94;
    box-shadow: 0 0 0 1px #8c8f94;
}

.swatch--active {
    border-color: #2271b1;
    box-shadow: 0 0 0 2px #2271b1;
}

.swatch__dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
}

.swatch__dot--custom {
    background: linear-gradient(135deg, #f43f5e 0%, #8b5cf6 50%, #22c55e 100%);
}

.swatch__label {
    white-space: nowrap;
}

.input-color {
    width: 36px;
    height: 32px;
    padding: 2px;
    border: 1px solid #8c8f94;
    border-radius: 6px;
    cursor: pointer;
    background: #fff;
}

.input-text {
    width: 88px;
    padding: 6px 10px;
    font-size: 13px;
    font-family: ui-monospace, monospace;
    border: 1px solid #8c8f94;
    border-radius: 6px;
}

.input-num {
    width: 72px;
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid #8c8f94;
    border-radius: 6px;
}

.admin__footer {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #dcdcde;
}

.admin__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.btn--primary {
    color: #fff;
    background: #2271b1;
}

.btn--primary:hover:not(:disabled) {
    background: #135e96;
}

.btn--ghost {
    color: #50575e;
    background: transparent;
}

.btn--ghost:hover:not(:disabled) {
    background: #f6f7f7;
    color: #1e1e1e;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.admin__message {
    font-size: 13px;
    margin: 10px 0 0;
}

.admin__message--success {
    color: #00a32a;
}

.admin__message--error {
    color: #d63638;
}
</style>
