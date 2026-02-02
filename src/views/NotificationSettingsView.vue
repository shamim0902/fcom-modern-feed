<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useAuthStore, useUiStore } from '@/stores';

interface NotificationPrefs {
    com_my_post_mail: 'yes' | 'no';
    reply_my_com_mail: 'yes' | 'no';
    mention_mail: 'yes' | 'no';
    digest_mail: 'yes' | 'no';
    message_email_frequency?: 'default' | 'hourly' | 'daily' | 'weekly' | 'disabled';
}

interface Space {
    id: number;
    title: string;
    icon?: string;
    shape_svg?: string;
    pref: '' | 'admin_only_posts' | 'all_member_posts';
}

interface SpaceGroup {
    id: number;
    title: string;
    spaces: Space[];
}

interface NotificationPrefsResponse {
    user_globals: NotificationPrefs;
    spaceGroups: SpaceGroup[];
    digestEmailDay: string;
    default_messaging_email_frequency?: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);

const prefs = ref<NotificationPrefs>({
    com_my_post_mail: 'yes',
    reply_my_com_mail: 'yes',
    mention_mail: 'yes',
    digest_mail: 'yes',
});
const spaceGroups = ref<SpaceGroup[]>([]);
const digestEmailDay = ref('');
const defaultMessagingFrequency = ref('');
const hasChat = ref(false);

const username = computed(() => route.params.username as string);

async function fetchPreferences(): Promise<void> {
    if (!username.value) {
        error.value = 'No username provided';
        loading.value = false;
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const response = await api.get<NotificationPrefsResponse>(
            `profile/${encodeURIComponent(username.value)}/notification-preferences`
        );

        prefs.value = response.user_globals;
        spaceGroups.value = response.spaceGroups || [];
        digestEmailDay.value = response.digestEmailDay || '';
        defaultMessagingFrequency.value = response.default_messaging_email_frequency || '';
        // Chat feature check - not currently supported in this plugin
        hasChat.value = false;
    } catch (e: unknown) {
        console.error('Notification preferences fetch error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to load notification preferences';
        }
    } finally {
        loading.value = false;
    }
}

async function savePreferences(): Promise<void> {
    if (saving.value) return;

    saving.value = true;
    error.value = null;

    try {
        // Build space preferences object
        const spacePrefs: Record<number, string> = {};
        spaceGroups.value.forEach((group) => {
            group.spaces.forEach((space) => {
                spacePrefs[space.id] = space.pref;
            });
        });

        const response = await api.post<{ message: string }>(
            `profile/${encodeURIComponent(username.value)}/notification-preferences`,
            {
                user_globals: prefs.value,
                space_prefs: spacePrefs,
            }
        );

        uiStore.showSuccess(response.message || 'Settings saved successfully');
    } catch (e: unknown) {
        console.error('Save preferences error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to save preferences';
        }
        uiStore.showError(error.value);
    } finally {
        saving.value = false;
    }
}

function goBack(): void {
    router.push(`/u/${username.value}`);
}

function navigateToMembers(): void {
    router.push({ name: 'members' });
}

function togglePref(key: keyof NotificationPrefs): void {
    if (key === 'message_email_frequency') return;
    prefs.value[key] = prefs.value[key] === 'yes' ? 'no' : 'yes';
}

onMounted(() => {
    if (!authStore.isLoggedIn) {
        error.value = 'Please login to access notification settings';
        loading.value = false;
        return;
    }
    fetchPreferences();
});
</script>

<template>
    <div class="fcom-mf-notification-settings">
        <!-- Breadcrumb -->
        <div class="fcom-mf-notification-settings__header">
            <div class="fcom-mf-notification-settings__breadcrumb">
                <button @click="navigateToMembers" class="fcom-mf-breadcrumb__link">Members</button>
                <span class="fcom-mf-breadcrumb__separator">/</span>
                <button @click="goBack" class="fcom-mf-breadcrumb__link">My Profile</button>
                <span class="fcom-mf-breadcrumb__separator">/</span>
                <span class="fcom-mf-breadcrumb__current">Notification Settings</span>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-notification-settings__loading">
            <div class="fcom-mf-spinner"></div>
            <p>Loading notification settings...</p>
        </div>

        <!-- Error State (not logged in or no access) -->
        <div v-else-if="error && !prefs" class="fcom-mf-error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>{{ error }}</h2>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back
            </button>
        </div>

        <!-- Settings Form -->
        <div v-else class="fcom-mf-notification-settings__content">
            <!-- Error Alert -->
            <div v-if="error" class="fcom-mf-alert fcom-mf-alert--error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {{ error }}
            </div>

            <!-- Global Email Notifications -->
            <div class="fcom-mf-settings-card">
                <div class="fcom-mf-settings-card__header">
                    <div class="fcom-mf-settings-card__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                    </div>
                    <div class="fcom-mf-settings-card__title">
                        <h3>Global Email Notifications</h3>
                        <p>These settings will be applied across all spaces you're a member of.</p>
                    </div>
                </div>

                <div class="fcom-mf-settings-card__body">
                    <!-- Comment on my post -->
                    <div class="fcom-mf-setting-item">
                        <label class="fcom-mf-toggle">
                            <input
                                type="checkbox"
                                :checked="prefs.com_my_post_mail === 'yes'"
                                @change="togglePref('com_my_post_mail')"
                            />
                            <span class="fcom-mf-toggle__slider"></span>
                            <span class="fcom-mf-toggle__label">Email me when someone comments on my post</span>
                        </label>
                        <p class="fcom-mf-setting-item__description" :class="{ 'fcom-mf-setting-item__description--disabled': prefs.com_my_post_mail !== 'yes' }">
                            {{ prefs.com_my_post_mail === 'yes'
                                ? 'You will receive an email when someone leaves a comment on your post.'
                                : 'No email will be sent for comments on your post.'
                            }}
                        </p>
                    </div>

                    <!-- Reply to my comment -->
                    <div class="fcom-mf-setting-item">
                        <label class="fcom-mf-toggle">
                            <input
                                type="checkbox"
                                :checked="prefs.reply_my_com_mail === 'yes'"
                                @change="togglePref('reply_my_com_mail')"
                            />
                            <span class="fcom-mf-toggle__slider"></span>
                            <span class="fcom-mf-toggle__label">Email me when someone replies to my comments</span>
                        </label>
                        <p class="fcom-mf-setting-item__description" :class="{ 'fcom-mf-setting-item__description--disabled': prefs.reply_my_com_mail !== 'yes' }">
                            {{ prefs.reply_my_com_mail === 'yes'
                                ? 'You will receive an email when someone replies to your comments.'
                                : 'No email will be sent when someone replies to your comments.'
                            }}
                        </p>
                    </div>

                    <!-- Mentions -->
                    <div class="fcom-mf-setting-item">
                        <label class="fcom-mf-toggle">
                            <input
                                type="checkbox"
                                :checked="prefs.mention_mail === 'yes'"
                                @change="togglePref('mention_mail')"
                            />
                            <span class="fcom-mf-toggle__slider"></span>
                            <span class="fcom-mf-toggle__label">Email me when someone mentions me in a post or comment</span>
                        </label>
                        <p class="fcom-mf-setting-item__description" :class="{ 'fcom-mf-setting-item__description--disabled': prefs.mention_mail !== 'yes' }">
                            {{ prefs.mention_mail === 'yes'
                                ? 'You will receive an email when someone mentions you in a comment or post.'
                                : 'No emails will be sent when someone mentions you.'
                            }}
                        </p>
                    </div>

                    <!-- Weekly digest -->
                    <div class="fcom-mf-setting-item">
                        <label class="fcom-mf-toggle">
                            <input
                                type="checkbox"
                                :checked="prefs.digest_mail === 'yes'"
                                @change="togglePref('digest_mail')"
                            />
                            <span class="fcom-mf-toggle__slider"></span>
                            <span class="fcom-mf-toggle__label">Weekly digest{{ digestEmailDay ? ` on ${digestEmailDay}` : '' }}</span>
                        </label>
                        <p class="fcom-mf-setting-item__description" :class="{ 'fcom-mf-setting-item__description--disabled': prefs.digest_mail !== 'yes' }">
                            {{ prefs.digest_mail === 'yes'
                                ? 'You will get a digest email with curated activities in the community.'
                                : 'No digest email will be sent.'
                            }}
                        </p>
                    </div>

                    <!-- Message frequency (if chat is enabled) -->
                    <div v-if="hasChat && defaultMessagingFrequency && defaultMessagingFrequency !== 'no'" class="fcom-mf-setting-item">
                        <p class="fcom-mf-setting-item__title">Email sending frequency for one-to-one messages</p>
                        <div class="fcom-mf-radio-group">
                            <label v-if="defaultMessagingFrequency !== 'disabled'" class="fcom-mf-radio">
                                <input type="radio" v-model="prefs.message_email_frequency" value="default" />
                                <span class="fcom-mf-radio__indicator"></span>
                                <span>Community Default</span>
                            </label>
                            <label class="fcom-mf-radio">
                                <input type="radio" v-model="prefs.message_email_frequency" value="hourly" />
                                <span class="fcom-mf-radio__indicator"></span>
                                <span>Hourly</span>
                            </label>
                            <label class="fcom-mf-radio">
                                <input type="radio" v-model="prefs.message_email_frequency" value="daily" />
                                <span class="fcom-mf-radio__indicator"></span>
                                <span>Daily</span>
                            </label>
                            <label class="fcom-mf-radio">
                                <input type="radio" v-model="prefs.message_email_frequency" value="weekly" />
                                <span class="fcom-mf-radio__indicator"></span>
                                <span>Weekly</span>
                            </label>
                            <label class="fcom-mf-radio">
                                <input type="radio" v-model="prefs.message_email_frequency" value="disabled" />
                                <span class="fcom-mf-radio__indicator"></span>
                                <span>Disable</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Space Notifications -->
            <div class="fcom-mf-settings-card">
                <div class="fcom-mf-settings-card__header">
                    <div class="fcom-mf-settings-card__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="fcom-mf-settings-card__title">
                        <h3>New Posts Notifications</h3>
                        <p>Subscribe to new posts notifications by space</p>
                    </div>
                </div>

                <div class="fcom-mf-settings-card__body">
                    <template v-if="spaceGroups.length > 0">
                        <div v-for="group in spaceGroups" :key="group.id" class="fcom-mf-space-group">
                            <h4 class="fcom-mf-space-group__title">{{ group.title }}</h4>
                            <div class="fcom-mf-space-list">
                                <div v-for="space in group.spaces" :key="space.id" class="fcom-mf-space-item">
                                    <div class="fcom-mf-space-item__info">
                                        <span v-if="space.icon" class="fcom-mf-space-item__icon" v-html="space.icon"></span>
                                        <span v-else-if="space.shape_svg" class="fcom-mf-space-item__icon" v-html="space.shape_svg"></span>
                                        <span v-else class="fcom-mf-space-item__icon fcom-mf-space-item__icon--placeholder">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            </svg>
                                        </span>
                                        <span class="fcom-mf-space-item__name">{{ space.title }}</span>
                                    </div>
                                    <select v-model="space.pref" class="fcom-mf-select">
                                        <option value="">Email Disabled</option>
                                        <option value="admin_only_posts">Notify only for Admin Posts</option>
                                        <option value="all_member_posts">Notify for all posts</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </template>
                    <div v-else class="fcom-mf-empty-spaces">
                        <p>No spaces found. Join some spaces to customize notifications.</p>
                    </div>
                </div>
            </div>

            <!-- Save Button -->
            <div class="fcom-mf-settings-actions">
                <button type="button" class="fcom-mf-btn fcom-mf-btn--outline" @click="goBack">
                    Cancel
                </button>
                <button
                    type="button"
                    class="fcom-mf-btn fcom-mf-btn--primary"
                    :disabled="saving"
                    @click="savePreferences"
                >
                    <span v-if="saving">Saving...</span>
                    <span v-else>Save Changes</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-notification-settings {
    width: 100%;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $spacing-md;
        padding: $spacing-md;
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;
    }

    &__breadcrumb {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
    }

    &__loading {
        text-align: center;
        padding: $spacing-xxxl;
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;

        p {
            margin-top: $spacing-md;
            color: $text-secondary;
        }
    }

    &__content {
        display: flex;
        flex-direction: column;
        gap: $spacing-lg;
    }
}

.fcom-mf-breadcrumb {
    &__link {
        color: $primary-color;
        background: none;
        border: none;
        padding: 0;
        font-size: inherit;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    &__separator {
        color: $text-tertiary;
    }

    &__current {
        color: $text-secondary;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-settings-card {
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
    overflow: hidden;

    &__header {
        display: flex;
        align-items: flex-start;
        gap: $spacing-md;
        padding: $spacing-lg;
        border-bottom: 1px solid $border-color;
    }

    &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: rgba($primary-color, 0.1);
        border-radius: $border-radius-md;
        color: $primary-color;
        flex-shrink: 0;
    }

    &__title {
        h3 {
            margin: 0 0 $spacing-xs;
            font-size: $font-size-lg;
            font-weight: $font-weight-semibold;
            color: $text-primary;
        }

        p {
            margin: 0;
            font-size: $font-size-sm;
            color: $text-tertiary;
        }
    }

    &__body {
        padding: $spacing-lg;
    }
}

.fcom-mf-setting-item {
    padding: $spacing-md 0;
    border-bottom: 1px solid $border-color;

    &:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }

    &:first-child {
        padding-top: 0;
    }

    &__title {
        font-size: $font-size-md;
        font-weight: $font-weight-medium;
        color: $text-primary;
        margin: 0 0 $spacing-sm;
    }

    &__description {
        margin: $spacing-xs 0 0 52px;
        font-size: $font-size-sm;
        color: $text-secondary;

        &--disabled {
            color: $text-tertiary;
            font-style: italic;
        }
    }
}

.fcom-mf-toggle {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    cursor: pointer;

    input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    &__slider {
        position: relative;
        width: 44px;
        height: 24px;
        background: $gray-300;
        border-radius: 12px;
        transition: background $transition-fast;
        flex-shrink: 0;

        &::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: $white;
            border-radius: 50%;
            transition: transform $transition-fast;
            box-shadow: $shadow-sm;
        }
    }

    input:checked + &__slider {
        background: $primary-color;

        &::before {
            transform: translateX(20px);
        }
    }

    &__label {
        font-size: $font-size-md;
        color: $text-primary;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-md;
    margin-top: $spacing-sm;
}

.fcom-mf-radio {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    cursor: pointer;
    font-size: $font-size-sm;
    color: $text-primary;

    input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    &__indicator {
        width: 18px;
        height: 18px;
        border: 2px solid $gray-300;
        border-radius: 50%;
        position: relative;
        transition: border-color $transition-fast;

        &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            width: 10px;
            height: 10px;
            background: $primary-color;
            border-radius: 50%;
            transition: transform $transition-fast;
        }
    }

    input:checked + &__indicator {
        border-color: $primary-color;

        &::before {
            transform: translate(-50%, -50%) scale(1);
        }
    }
}

.fcom-mf-space-group {
    margin-bottom: $spacing-lg;

    &:last-child {
        margin-bottom: 0;
    }

    &__title {
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-md;
        padding-bottom: $spacing-sm;
        border-bottom: 1px solid $border-color;
    }
}

.fcom-mf-space-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}

.fcom-mf-space-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-md;
    background: $gray-50;
    border-radius: $border-radius-md;
    gap: $spacing-md;

    &__info {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        min-width: 0;
    }

    &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        flex-shrink: 0;

        &--placeholder {
            color: $text-tertiary;
        }

        :deep(svg) {
            width: 20px;
            height: 20px;
        }
    }

    &__name {
        font-size: $font-size-sm;
        color: $text-primary;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

.fcom-mf-select {
    padding: $spacing-xs $spacing-md;
    border: 1px solid $border-color;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;
    color: $text-primary;
    background: $white;
    cursor: pointer;
    min-width: 180px;

    &:focus {
        outline: none;
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba($primary-color, 0.1);
    }
}

.fcom-mf-empty-spaces {
    text-align: center;
    padding: $spacing-xl;
    color: $text-tertiary;

    p {
        margin: 0;
    }
}

.fcom-mf-settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-md;
    padding: $spacing-lg;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
}

.fcom-mf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;
    text-decoration: none;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &--primary {
        background: $primary-color;
        color: $white;

        &:hover:not(:disabled) {
            background: $primary-hover;
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover:not(:disabled) {
            background: $gray-50;
        }
    }
}

.fcom-mf-alert {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;

    &--error {
        background: rgba($error-color, 0.1);
        color: darken($error-color, 10%);

        svg {
            color: $error-color;
        }
    }
}

.fcom-mf-error-state {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-lg;
    }

    h2 {
        font-size: $font-size-xl;
        color: $text-primary;
        margin: 0 0 $spacing-lg;
    }
}

.fcom-mf-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid $gray-200;
    border-top-color: $primary-color;
    border-radius: $border-radius-full;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@media (max-width: $breakpoint-sm) {
    .fcom-mf-space-item {
        flex-direction: column;
        align-items: stretch;

        &__info {
            margin-bottom: $spacing-sm;
        }
    }

    .fcom-mf-select {
        width: 100%;
    }

    .fcom-mf-radio-group {
        flex-direction: column;
    }
}
</style>
