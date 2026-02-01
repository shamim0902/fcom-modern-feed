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

const MAX_CHARS = 63206; // Facebook-like character limit

const canSubmit = computed(() => {
    const hasContent = message.value.trim().length > 0 || mediaItems.value.length > 0;
    // Space is required - either from props or selected by user
    const hasSpace = !!props.spaceId || !!selectedSpaceId.value;
    return hasContent && hasSpace;
});

const charCount = computed(() => message.value.length);
const charWarning = computed(() => charCount.value > MAX_CHARS * 0.9);
const charExceeded = computed(() => charCount.value > MAX_CHARS);

const availableSpaces = computed(() => spaceStore.canPostSpaces);

const selectedSpace = computed(() => {
    if (!selectedSpaceId.value) return null;
    return spaceStore.getSpaceById(selectedSpaceId.value) || null;
});

const showSpaceSelector = computed(() => {
    // Show selector if no fixed space is provided
    return !props.spaceId;
});

const isLoadingSpaces = computed(() => spaceStore.loading);
const hasNoSpaces = computed(() => !spaceStore.loading && availableSpaces.value.length === 0);

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
        const feedData = {
            message: message.value,
            space: selectedSpace.value?.slug || undefined,
            media_images: mediaItems.value.length > 0 ? mediaItems.value : undefined,
        };

        // Debug: Log the data being sent
        console.log('[CreatePost] Submitting feed with data:', JSON.stringify(feedData, null, 2));

        await feedStore.createFeed(feedData);

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
                // Debug: Log upload response
                console.log('[CreatePost] Upload response:', JSON.stringify(response.media, null, 2));

                // Normalize type to simple string ('image' or 'video') as expected by FluentCommunity API
                let mediaType = 'image';
                if (response.media.type) {
                    if (response.media.type.startsWith('video/') || response.media.type === 'video') {
                        mediaType = 'video';
                    }
                }

                const mediaItem = {
                    url: response.media.url,
                    type: mediaType,
                    width: response.media.width || 0,
                    height: response.media.height || 0,
                    provider: 'uploader',
                };

                // Debug: Log the media item being added
                console.log('[CreatePost] Adding media item:', JSON.stringify(mediaItem, null, 2));

                mediaItems.value.push(mediaItem);
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
                            :class="{ 'fcom-mf-create-post__space-btn--required': !selectedSpaceId }"
                            @click.stop="showSpaceDropdown = !showSpaceDropdown"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                            <span>{{ selectedSpace?.title || 'Choose a space *' }}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <!-- Dropdown -->
                        <div v-if="showSpaceDropdown" class="fcom-mf-create-post__space-dropdown" @click.stop>
                            <div class="fcom-mf-create-post__space-header">
                                Choose where to post
                            </div>
                            <!-- Loading state -->
                            <div v-if="isLoadingSpaces" class="fcom-mf-create-post__space-loading">
                                <span class="fcom-mf-spinner fcom-mf-spinner--sm"></span>
                                <span>Loading spaces...</span>
                            </div>
                            <!-- No spaces available -->
                            <div v-else-if="hasNoSpaces" class="fcom-mf-create-post__space-empty">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>You need to join a space first</span>
                            </div>
                            <!-- Space list -->
                            <template v-else>
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
                            </template>
                        </div>
                    </div>
                    <!-- Fixed space indicator -->
                    <span v-else-if="selectedSpace" class="fcom-mf-create-post__visibility">
                        📍 {{ selectedSpace.title }}
                    </span>
                    <span v-else class="fcom-mf-create-post__visibility fcom-mf-create-post__visibility--required">
                        ⚠️ Choose a space to post
                    </span>
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

            <!-- Character Counter - Show immediately when typing -->
            <div
                v-if="message.length > 0"
                class="fcom-mf-create-post__char-count"
                :class="{
                    'fcom-mf-create-post__char-count--warning': charWarning,
                    'fcom-mf-create-post__char-count--exceeded': charExceeded
                }"
            >
                {{ charCount.toLocaleString() }} / {{ MAX_CHARS.toLocaleString() }}
            </div>

            <!-- Media Preview -->
            <div v-if="mediaItems.length > 0" class="fcom-mf-create-post__media">
                <div
                    v-for="(item, index) in mediaItems"
                    :key="index"
                    class="fcom-mf-create-post__media-item"
                >
                    <img
                        v-if="item.type === 'image' || item.type.startsWith('image/')"
                        :src="item.url"
                        alt="Upload preview"
                    />
                    <video
                        v-else-if="item.type === 'video' || item.type.startsWith('video/')"
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

            <!-- Attachment Buttons Row (Facebook-style) -->
            <div class="fcom-mf-create-post__attach-row">
                <span class="fcom-mf-create-post__attach-label">Add to your post</span>
                <div class="fcom-mf-create-post__attach-buttons">
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--photo"
                        :disabled="isUploading"
                        title="Photo"
                        @click="triggerFileUpload"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-1.5 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm.5 10H6l4-5 2.5 3 3.5-4.5 3 6.5z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--video"
                        :disabled="isUploading"
                        title="Video"
                        @click="triggerFileUpload"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--emoji"
                        title="Feeling/Activity"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <input
                ref="fileInputRef"
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                @change="handleFileSelect"
            />

            <!-- Post Button -->
            <div class="fcom-mf-create-post__submit">
                <button
                    class="fcom-mf-create-post__post-btn"
                    :class="{ 'fcom-mf-create-post__post-btn--ready': canSubmit && !isSubmitting && !charExceeded }"
                    :disabled="!canSubmit || isSubmitting || charExceeded"
                    @click="handleSubmit"
                >
                    <span v-if="isSubmitting" class="fcom-mf-spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
                    <span v-else>{{ uiStore.t('post') }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-create-post {
    // Note: margin-bottom removed - gaps handled by parent flex container

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

        &--required {
            color: $warning-color;
        }
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
        width: 150px;
        height: 150px;
        border-radius: $border-radius-md;
        overflow: hidden;
        border: 1px solid $border-color;

        img,
        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__char-count {
        text-align: right;
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: $spacing-xs;

        &--warning {
            color: $warning-color;
        }

        &--exceeded {
            color: $danger-color;
            font-weight: $font-weight-semibold;
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

    &__attach-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-md;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        margin-top: $spacing-md;
    }

    &__attach-label {
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__attach-buttons {
        display: flex;
        gap: $spacing-xs;
    }

    &__attach-icon {
        @include button-reset;
        @include focus-ring;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        transition: background $transition-fast, opacity $transition-fast;

        &:hover {
            background: $bg-hover;
        }

        &:active {
            opacity: 0.9;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        &--photo {
            color: $secondary-color;
        }

        &--video {
            color: $danger-color;
        }

        &--emoji {
            color: $warning-color;
        }
    }

    &__submit {
        margin-top: $spacing-md;
    }

    &__post-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        padding: $spacing-md $spacing-xl;
        border: none;
        border-radius: $border-radius-sm;
        font-size: $font-size-md;
        font-weight: $font-weight-bold;
        min-height: 40px;
        cursor: pointer;
        transition: background-color $transition-fast, transform $transition-instant, opacity $transition-fast;

        // Default disabled state
        background-color: $gray-100;
        color: $gray-300;
        cursor: not-allowed;

        &--ready {
            background-color: $primary-color;
            color: $white;
            cursor: pointer;

            &:hover {
                background-color: $primary-hover;
            }

            &:active {
                opacity: 0.9;
                background-color: darken($primary-color, 8%);
            }
        }

        &:disabled {
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
        transition: all $transition-fast;

        &:hover {
            background: $gray-100;
        }

        svg:first-child {
            color: $primary-color;
        }

        &--required {
            background: rgba($warning-color, 0.1);
            border: 1px solid rgba($warning-color, 0.3);
            color: darken($warning-color, 15%);

            svg:first-child {
                color: $warning-color;
            }

            &:hover {
                background: rgba($warning-color, 0.15);
            }
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

    &__space-header {
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        color: $text-tertiary;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    &__space-loading,
    &__space-empty {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-md;
        font-size: $font-size-sm;
        color: $text-secondary;
    }

    &__space-empty {
        flex-direction: column;
        text-align: center;
        padding: $spacing-lg $spacing-md;

        svg {
            color: $text-tertiary;
            margin-bottom: $spacing-xs;
        }
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

}
</style>
