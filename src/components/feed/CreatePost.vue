<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useFeedStore, useAuthStore, useUiStore, useSpaceStore } from '@/stores';
import { api } from '@/api/client';
import type { MediaItem, SpaceFull } from '@/api/types';

const props = defineProps<{
    spaceSlug?: string;
    spaceId?: number;
}>();

const feedStore = useFeedStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const spaceStore = useSpaceStore();

const isExpanded = ref(false);
const message = ref('');
const isSubmitting = ref(false);
const mediaItems = ref<MediaItem[]>([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const selectedSpaceId = ref<number | null>(props.spaceId || null);
const showSpaceDropdown = ref(false);

const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const spaceSelectorRef = ref<HTMLElement | null>(null);
const createPostRef = ref<HTMLElement | null>(null);
const justExpanded = ref(false);

// Click outside handler for space dropdown and collapse
function handleClickOutside(event: MouseEvent): void {
    // Close space dropdown if clicking outside
    if (spaceSelectorRef.value && !spaceSelectorRef.value.contains(event.target as Node)) {
        showSpaceDropdown.value = false;
    }

    // Skip collapse check if we just expanded (prevents immediate collapse)
    if (justExpanded.value) {
        justExpanded.value = false;
        return;
    }

    // Collapse if clicking outside the create post area (and form is empty)
    if (isExpanded.value && createPostRef.value && !createPostRef.value.contains(event.target as Node)) {
        collapse();
    }
}

// Fetch user's spaces on mount
onMounted(() => {
    spaceStore.fetchMySpaces();
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

// If spaceId is provided, lock to that space
watch(() => props.spaceId, (newId) => {
    if (newId) {
        selectedSpaceId.value = newId;
    }
});

const canSubmit = computed(() => {
    return message.value.trim().length > 0 || mediaItems.value.length > 0;
});

const availableSpaces = computed(() => spaceStore.canPostSpaces);

const selectedSpace = computed(() => {
    if (!selectedSpaceId.value) return null;
    return spaceStore.getSpaceById(selectedSpaceId.value) || null;
});

const showSpaceSelector = computed(() => {
    // Show selector if no fixed space and user has multiple spaces
    return !props.spaceId && availableSpaces.value.length > 0;
});

function selectSpace(space: SpaceFull | null): void {
    selectedSpaceId.value = space?.id || null;
    showSpaceDropdown.value = false;
}

function expand(): void {
    justExpanded.value = true;
    isExpanded.value = true;
    setTimeout(() => {
        textareaRef.value?.focus();
    }, 50);
}

function collapse(): void {
    if (!message.value.trim() && mediaItems.value.length === 0) {
        isExpanded.value = false;
        showSpaceDropdown.value = false;
    }
}

async function handleSubmit(): Promise<void> {
    if (!canSubmit.value || isSubmitting.value) return;

    isSubmitting.value = true;
    try {
        await feedStore.createFeed({
            message: message.value,
            space: selectedSpace.value?.slug || undefined,
            media_items: mediaItems.value.length > 0 ? mediaItems.value : undefined,
        });

        // Reset form
        message.value = '';
        mediaItems.value = [];
        isExpanded.value = false;
        // Keep selected space if posting to a specific space view
        if (!props.spaceId) {
            selectedSpaceId.value = null;
        }

        uiStore.showSuccess('Post created successfully!');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    } finally {
        isSubmitting.value = false;
    }
}

function triggerFileUpload(): void {
    fileInputRef.value?.click();
}

async function handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    isUploading.value = true;
    uploadProgress.value = 0;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.uploadFile('feeds/media-upload', formData);

            if (response.media) {
                mediaItems.value.push({
                    url: response.media.url,
                    type: response.media.type,
                    width: response.media.width,
                    height: response.media.height,
                });
            }

            uploadProgress.value = ((i + 1) / files.length) * 100;
        }
    } catch (error) {
        uiStore.showError('Failed to upload file');
    } finally {
        isUploading.value = false;
        uploadProgress.value = 0;
        input.value = '';
    }
}

function removeMedia(index: number): void {
    mediaItems.value.splice(index, 1);
}

function autoResize(): void {
    if (textareaRef.value) {
        textareaRef.value.style.height = 'auto';
        textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px';
    }
}
</script>

<template>
    <div ref="createPostRef" class="fcom-mf-create-post fcom-mf-card">
        <!-- Collapsed State -->
        <div v-if="!isExpanded" class="fcom-mf-create-post__collapsed" @click="expand">
            <img
                :src="authStore.userAvatar"
                :alt="authStore.userName || ''"
                class="fcom-mf-avatar"
            />
            <div class="fcom-mf-create-post__placeholder">
                {{ uiStore.t('createPost') }}
            </div>
        </div>

        <!-- Expanded State -->
        <div v-else class="fcom-mf-create-post__expanded">
            <div class="fcom-mf-create-post__header">
                <img
                    :src="authStore.userAvatar"
                    :alt="authStore.userName || ''"
                    class="fcom-mf-avatar"
                />
                <div class="fcom-mf-create-post__author">
                    <span class="fcom-mf-create-post__name">{{ authStore.userName }}</span>
                    <!-- Space Selector -->
                    <div v-if="showSpaceSelector" ref="spaceSelectorRef" class="fcom-mf-create-post__space-selector">
                        <button
                            class="fcom-mf-create-post__space-btn"
                            @click.stop="showSpaceDropdown = !showSpaceDropdown"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                            <span>{{ selectedSpace?.title || 'Select a space' }}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <!-- Dropdown -->
                        <div v-if="showSpaceDropdown" class="fcom-mf-create-post__space-dropdown">
                            <button
                                class="fcom-mf-create-post__space-option"
                                :class="{ 'fcom-mf-create-post__space-option--selected': !selectedSpaceId }"
                                @click="selectSpace(null)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                                </svg>
                                <span>Public Feed</span>
                            </button>
                            <div class="fcom-mf-create-post__space-divider"></div>
                            <button
                                v-for="space in availableSpaces"
                                :key="space.id"
                                class="fcom-mf-create-post__space-option"
                                :class="{ 'fcom-mf-create-post__space-option--selected': selectedSpaceId === space.id }"
                                @click="selectSpace(space)"
                            >
                                <img
                                    v-if="space.logo"
                                    :src="space.logo"
                                    :alt="space.title"
                                    class="fcom-mf-create-post__space-logo"
                                />
                                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                                </svg>
                                <span>{{ space.title }}</span>
                            </button>
                        </div>
                    </div>
                    <!-- Fixed space indicator -->
                    <span v-else-if="selectedSpace" class="fcom-mf-create-post__visibility">
                        📍 {{ selectedSpace.title }}
                    </span>
                    <span v-else class="fcom-mf-create-post__visibility">🌐 Public</span>
                </div>
            </div>

            <textarea
                ref="textareaRef"
                v-model="message"
                :placeholder="uiStore.t('createPost')"
                class="fcom-mf-create-post__textarea"
                rows="3"
                @input="autoResize"
            ></textarea>

            <!-- Media Preview -->
            <div v-if="mediaItems.length > 0" class="fcom-mf-create-post__media">
                <div
                    v-for="(item, index) in mediaItems"
                    :key="index"
                    class="fcom-mf-create-post__media-item"
                >
                    <img
                        v-if="item.type === 'image'"
                        :src="item.url"
                        alt="Upload preview"
                    />
                    <video
                        v-else
                        :src="item.url"
                        controls
                    ></video>
                    <button
                        class="fcom-mf-create-post__media-remove"
                        @click="removeMedia(index)"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="isUploading" class="fcom-mf-create-post__progress">
                <div
                    class="fcom-mf-create-post__progress-bar"
                    :style="{ width: uploadProgress + '%' }"
                ></div>
            </div>

            <div class="fcom-mf-divider"></div>

            <!-- Actions -->
            <div class="fcom-mf-create-post__actions">
                <div class="fcom-mf-create-post__attach">
                    <button
                        class="fcom-mf-create-post__attach-btn"
                        :disabled="isUploading"
                        @click="triggerFileUpload"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>{{ uiStore.t('photo') }}</span>
                    </button>

                    <input
                        ref="fileInputRef"
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        hidden
                        @change="handleFileSelect"
                    />
                </div>

                <button
                    class="fcom-mf-btn fcom-mf-btn--primary"
                    :disabled="!canSubmit || isSubmitting"
                    @click="handleSubmit"
                >
                    <span v-if="isSubmitting" class="fcom-mf-spinner" style="width: 16px; height: 16px;"></span>
                    <span v-else>{{ uiStore.t('post') }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-create-post {
    margin-bottom: $spacing-lg;

    &__collapsed {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-lg;
        cursor: pointer;
    }

    &__placeholder {
        flex: 1;
        padding: $spacing-sm $spacing-lg;
        background: $gray-50;
        border-radius: $border-radius-lg;
        color: $text-tertiary;
        font-size: $font-size-md;

        &:hover {
            background: $gray-100;
        }
    }

    &__expanded {
        padding: $spacing-lg;
    }

    &__header {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        margin-bottom: $spacing-md;
    }

    &__author {
        display: flex;
        flex-direction: column;
    }

    &__name {
        font-weight: $font-weight-semibold;
        font-size: $font-size-md;
    }

    &__visibility {
        font-size: $font-size-sm;
        color: $text-secondary;
    }

    &__textarea {
        width: 100%;
        border: none;
        font-size: $font-size-lg;
        font-family: inherit;
        line-height: $line-height-normal;
        resize: none;
        min-height: 80px;

        &:focus {
            outline: none;
        }

        &::placeholder {
            color: $text-tertiary;
        }
    }

    &__media {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;
        margin-top: $spacing-md;
    }

    &__media-item {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: $border-radius-sm;
        overflow: hidden;

        img,
        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__media-remove {
        @include button-reset;
        position: absolute;
        top: $spacing-xs;
        right: $spacing-xs;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        color: $white;
        border-radius: $border-radius-full;
        font-size: 12px;

        &:hover {
            background: rgba(0, 0, 0, 0.8);
        }
    }

    &__progress {
        height: 4px;
        background: $gray-100;
        border-radius: 2px;
        margin-top: $spacing-md;
        overflow: hidden;
    }

    &__progress-bar {
        height: 100%;
        background: $primary-color;
        transition: width 0.3s ease;
    }

    &__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: $spacing-md;
    }

    &__attach {
        display: flex;
        gap: $spacing-sm;
    }

    &__attach-btn {
        @include button-reset;
        @include hover-bg;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-sm $spacing-md;
        border-radius: $border-radius-sm;
        color: $text-secondary;
        font-size: $font-size-md;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    // Space selector
    &__space-selector {
        position: relative;
    }

    &__space-btn {
        @include button-reset;
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        padding: $spacing-xs $spacing-sm;
        border-radius: $border-radius-sm;
        font-size: $font-size-sm;
        color: $text-secondary;
        background: $gray-50;
        transition: background $transition-fast;

        &:hover {
            background: $gray-100;
        }

        svg:first-child {
            color: $primary-color;
        }
    }

    &__space-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        min-width: 200px;
        max-width: 280px;
        background: $white;
        border-radius: $border-radius-md;
        box-shadow: $shadow-lg;
        z-index: $z-dropdown;
        padding: $spacing-xs 0;
        max-height: 300px;
        overflow-y: auto;
    }

    &__space-option {
        @include button-reset;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        width: 100%;
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-sm;
        color: $text-primary;
        text-align: left;
        transition: background $transition-fast;

        &:hover {
            background: $gray-50;
        }

        &--selected {
            background: rgba($primary-color, 0.1);
            color: $primary-color;
        }

        svg {
            flex-shrink: 0;
            color: $text-tertiary;
        }

        span {
            @include truncate;
        }
    }

    &__space-logo {
        width: 20px;
        height: 20px;
        border-radius: $border-radius-sm;
        object-fit: cover;
        flex-shrink: 0;
    }

    &__space-divider {
        height: 1px;
        background: $border-color;
        margin: $spacing-xs 0;
    }
}
</style>
