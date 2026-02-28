<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useFeedStore, useUiStore } from '@/stores';
import { api } from '@/api/client';
import type { Feed, MediaItem, CreateFeedData } from '@/api/types';
import { insertHtmlAtCursor, plainTextToHtml, sanitizePastedHtml } from '@/utils/pasteSanitizer';

const props = defineProps<{
    feed: Feed;
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'updated', feed: Feed): void;
}>();

const feedStore = useFeedStore();
const uiStore = useUiStore();

const title = ref('');
const message = ref('');
const mediaItems = ref<MediaItem[]>([]);
const isSubmitting = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const isInitializing = ref(false);
const editFeed = ref<Feed | null>(null);

const fileInputRef = ref<HTMLInputElement | null>(null);
const editorRef = ref<HTMLDivElement | null>(null);

// Post title feature flag from backend
const hasPostTitle = computed(() => window.fcomModernFeed?.features?.hasPostTitle || '');

// Video embed state
const showVideoEmbed = ref(false);
const videoUrl = ref('');
const videoEmbed = ref<{
    type: string;
    url: string;
    html: string;
    content_type: string;
    provider: string;
    title: string;
    image: string;
} | null>(null);
const isEmbedding = ref(false);

// Emoji picker state
const showEmojiPicker = ref(false);
const emojiPickerRef = ref<HTMLElement | null>(null);

const commonEmojis = [
    '😀', '😂', '😍', '🥰', '😊', '🤔', '😎', '🤩',
    '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏',
    '😢', '😡', '😱', '🤯', '😴', '🤮', '🤑', '😇',
    '👏', '🤝', '💪', '🎯', '🚀', '⭐', '💡', '📌'
];

const MAX_CHARS = 63206;

const canSubmit = computed(() => {
    if (isInitializing.value) return false;
    const hasText = message.value.trim().length > 0;
    const hasMedia = mediaItems.value.length > 0;
    const hasVideo = !!videoEmbed.value;
    if (hasPostTitle.value === 'required' && !title.value.trim()) return false;
    return hasText || hasMedia || hasVideo;
});

const editorTextLength = computed(() => {
    if (!message.value) return 0;
    const doc = new DOMParser().parseFromString(message.value, 'text/html');
    return doc.body.textContent?.length ?? 0;
});
const charCount = computed(() => editorTextLength.value);
const charWarning = computed(() => charCount.value > MAX_CHARS * 0.9);
const charExceeded = computed(() => charCount.value > MAX_CHARS);

// Initialize form with feed data when modal opens
watch(() => props.show, (show, oldShow) => {
    if (show && !oldShow) {
        void loadFeedForEdit();
    }
}, { immediate: true });

type EmbedLike = {
    type?: string;
    url?: string;
    html?: string;
    provider?: string;
    title?: string;
    image?: string;
    is_uploaded?: boolean;
};

async function loadFeedForEdit(): Promise<void> {
    if (!props.feed?.id) {
        return;
    }

    isInitializing.value = true;
    try {
        const fetched = await feedStore.fetchFeedForEdit(props.feed.id);
        editFeed.value = fetched || props.feed;
    } catch {
        editFeed.value = props.feed;
    } finally {
        initializeForm(editFeed.value || props.feed);
        isInitializing.value = false;
    }
}

function initializeForm(sourceFeed: Feed): void {
    title.value = sourceFeed.title || '';
    message.value = sourceFeed.message || sourceFeed.message_rendered || '';

    // Reset transient UI state
    showVideoEmbed.value = false;
    videoUrl.value = '';
    showEmojiPicker.value = false;

    // Prefer edit-context media_images (includes media_id), then fallback to regular feed payload.
    if (sourceFeed.media_images && sourceFeed.media_images.length > 0) {
        mediaItems.value = [...sourceFeed.media_images];
    } else if (sourceFeed.meta?.media_items && sourceFeed.meta.media_items.length > 0) {
        mediaItems.value = [...sourceFeed.meta.media_items];
    } else {
        const preview = sourceFeed.meta?.media_preview;
        if (preview && (preview.is_uploaded || preview.type === 'meta_data') && preview.image) {
            mediaItems.value = [{
                url: preview.image,
                type: 'image',
                width: preview.width || 0,
                height: preview.height || 0,
                media_id: preview.media_id,
                provider: preview.provider || 'uploader'
            }];
        } else {
            mediaItems.value = [];
        }
    }

    const directEmbed = sourceFeed.media as EmbedLike | undefined;
    const previewEmbed = sourceFeed.meta?.media_preview as EmbedLike | undefined;
    const embedSource =
        (directEmbed?.html ? directEmbed : undefined) ||
        (previewEmbed?.html && !previewEmbed.is_uploaded && previewEmbed.type !== 'meta_data' ? previewEmbed : undefined);

    if (embedSource?.html) {
        videoEmbed.value = {
            type: embedSource.type || 'oembed',
            url: embedSource.url || '',
            html: embedSource.html || '',
            content_type: 'video',
            provider: embedSource.provider || '',
            title: embedSource.title || '',
            image: embedSource.image || ''
        };
    } else {
        videoEmbed.value = null;
    }

    nextTick(() => {
        if (editorRef.value) {
            editorRef.value.innerHTML = message.value;
            editorRef.value.focus();
        }
    });
}

function handleClickOutside(event: MouseEvent): void {
    if (emojiPickerRef.value && !emojiPickerRef.value.contains(event.target as Node)) {
        showEmojiPicker.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

async function handleSubmit(): Promise<void> {
    if (!canSubmit.value || isSubmitting.value || isInitializing.value) return;

    isSubmitting.value = true;
    try {
        const targetFeedId = editFeed.value?.id || props.feed.id;
        const feedData: Partial<CreateFeedData> = {
            message: message.value,
            title: title.value.trim() || undefined,
        };

        // Add media images
        if (mediaItems.value.length > 0) {
            feedData.media_images = mediaItems.value;
        }

        // Add video embed
        if (videoEmbed.value) {
            feedData.media = videoEmbed.value;
        }

        const updatedFeed = await feedStore.updateFeed(targetFeedId, feedData);

        uiStore.showSuccess('Post updated successfully!');
        emit('updated', updatedFeed);
        emit('close');
    } catch (error) {
        uiStore.showError('Failed to update post');
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

function onEditorInput(): void {
    if (editorRef.value) {
        message.value = editorRef.value.innerHTML;
        if (editorRef.value.textContent?.trim() === '' && !editorRef.value.querySelector('img')) {
            message.value = '';
        }
    }
}

function onEditorPaste(e: ClipboardEvent): void {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for pasted images
    for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) handlePastedImage(file);
            return;
        }
    }

    // Handle HTML paste
    const html = clipboardData.getData('text/html');
    if (html) {
        e.preventDefault();
        const sanitized = sanitizePastedHtml(html);
        if (sanitized) {
            insertHtmlAtCursor(sanitized);
            onEditorInput();
            return;
        }
    }

    const plainText = clipboardData.getData('text/plain');
    if (plainText) {
        e.preventDefault();
        insertHtmlAtCursor(plainTextToHtml(plainText));
        onEditorInput();
        return;
    }

    // Fallback: let browser handle unknown clipboard formats, then sync state.
    setTimeout(() => onEditorInput(), 0);
}

async function handlePastedImage(file: File): Promise<void> {
    isUploading.value = true;
    uploadProgress.value = 0;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.uploadFile('feeds/media-upload', formData);
        if (response.media) {
            mediaItems.value.push({
                url: response.media.url,
                type: 'image',
                width: response.media.width || 0,
                height: response.media.height || 0,
                provider: 'uploader',
            });
        }
        uploadProgress.value = 100;
    } catch {
        uiStore.showError('Failed to upload pasted image');
    } finally {
        isUploading.value = false;
        uploadProgress.value = 0;
    }
}

// Video Embed Functions
function toggleVideoEmbed(): void {
    if (showVideoEmbed.value) {
        showVideoEmbed.value = false;
        videoUrl.value = '';
    } else {
        showVideoEmbed.value = true;
        mediaItems.value = [];
    }
}

async function embedVideo(): Promise<void> {
    if (!videoUrl.value.trim()) return;

    isEmbedding.value = true;
    try {
        const response = await api.get<{
            oembed: {
                html: string;
                provider: string;
                title: string;
                type: string;
                image: string;
            };
        }>('feeds/oembed', { url: videoUrl.value });

        videoEmbed.value = {
            type: response.oembed.type || 'oembed',
            url: videoUrl.value,
            html: response.oembed.html,
            content_type: 'video',
            provider: response.oembed.provider,
            title: response.oembed.title,
            image: response.oembed.image
        };
        showVideoEmbed.value = false;
        videoUrl.value = '';
    } catch (error) {
        uiStore.showError('Failed to embed video. Please check the URL.');
    } finally {
        isEmbedding.value = false;
    }
}

function removeVideoEmbed(): void {
    videoEmbed.value = null;
}

// Emoji Functions
function toggleEmojiPicker(): void {
    showEmojiPicker.value = !showEmojiPicker.value;
}

function insertEmoji(emoji: string): void {
    if (editorRef.value) {
        editorRef.value.focus();
        document.execCommand('insertText', false, emoji);
        onEditorInput();
    } else {
        message.value += emoji;
    }
}

function closeModal(): void {
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <div v-if="show" class="fcom-mf-modal-overlay" @click.self="closeModal">
            <div class="fcom-mf-edit-modal">
                <div class="fcom-mf-edit-modal__header">
                    <h3>Edit Post</h3>
                    <button @click="closeModal" class="fcom-mf-edit-modal__close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="fcom-mf-edit-modal__body">
                    <!-- Title Field -->
                    <input
                        v-if="hasPostTitle"
                        v-model="title"
                        type="text"
                        maxlength="120"
                        class="fcom-mf-edit-modal__title-input"
                        :placeholder="hasPostTitle === 'required' ? 'Short title of this post' : 'Title (optional)'"
                    />

                    <!-- Rich Text Editor -->
                    <div
                        ref="editorRef"
                        contenteditable="true"
                        class="fcom-mf-edit-modal__editor"
                        data-placeholder="What's on your mind?"
                        @input="onEditorInput"
                        @paste="onEditorPaste"
                    ></div>

                    <!-- Character Counter -->
                    <div
                        v-if="charCount > 0"
                        class="fcom-mf-edit-modal__char-count"
                        :class="{
                            'fcom-mf-edit-modal__char-count--warning': charWarning,
                            'fcom-mf-edit-modal__char-count--exceeded': charExceeded
                        }"
                    >
                        {{ charCount.toLocaleString() }} / {{ MAX_CHARS.toLocaleString() }}
                    </div>

                    <!-- Media Preview -->
                    <div v-if="mediaItems.length > 0" class="fcom-mf-edit-modal__media">
                        <div
                            v-for="(item, index) in mediaItems"
                            :key="index"
                            class="fcom-mf-edit-modal__media-item"
                        >
                            <img
                                v-if="item.type === 'image' || (item.type && item.type.startsWith('image/'))"
                                :src="item.url"
                                alt="Upload preview"
                            />
                            <video
                                v-else-if="item.type === 'video' || (item.type && item.type.startsWith('video/'))"
                                :src="item.url"
                                controls
                            ></video>
                            <button
                                class="fcom-mf-edit-modal__media-remove"
                                @click="removeMedia(index)"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <!-- Video Embed Preview -->
                    <div v-if="videoEmbed" class="fcom-mf-edit-modal__video-preview">
                        <div class="fcom-mf-edit-modal__video-info">
                            <img v-if="videoEmbed.image" :src="videoEmbed.image" alt="Video thumbnail" class="fcom-mf-edit-modal__video-thumb" />
                            <div class="fcom-mf-edit-modal__video-details">
                                <span class="fcom-mf-edit-modal__video-provider">{{ videoEmbed.provider }}</span>
                                <span class="fcom-mf-edit-modal__video-title">{{ videoEmbed.title || 'Embedded Video' }}</span>
                            </div>
                            <button class="fcom-mf-edit-modal__media-remove" @click="removeVideoEmbed">✕</button>
                        </div>
                    </div>

                    <!-- Video URL Input -->
                    <div v-if="showVideoEmbed" class="fcom-mf-edit-modal__video-embed">
                        <div class="fcom-mf-edit-modal__video-embed-header">
                            <span>Embed video from YouTube, Vimeo, etc.</span>
                            <button @click="showVideoEmbed = false" class="fcom-mf-edit-modal__close-btn">✕</button>
                        </div>
                        <div class="fcom-mf-edit-modal__video-embed-input">
                            <input
                                v-model="videoUrl"
                                type="url"
                                placeholder="Paste video URL here..."
                                @keydown.enter="embedVideo"
                            />
                            <button
                                :disabled="!videoUrl.trim() || isEmbedding"
                                @click="embedVideo"
                                class="fcom-mf-edit-modal__embed-btn"
                            >
                                <span v-if="isEmbedding" class="fcom-mf-spinner fcom-mf-spinner--sm"></span>
                                <span v-else>Embed</span>
                            </button>
                        </div>
                    </div>

                    <!-- Upload Progress -->
                    <div v-if="isUploading" class="fcom-mf-edit-modal__progress">
                        <div
                            class="fcom-mf-edit-modal__progress-bar"
                            :style="{ width: uploadProgress + '%' }"
                        ></div>
                    </div>

                    <!-- Attachment Buttons -->
                    <div class="fcom-mf-edit-modal__attach-row">
                        <span class="fcom-mf-edit-modal__attach-label">Add to your post</span>
                        <div class="fcom-mf-edit-modal__attach-buttons">
                            <!-- Photo Upload -->
                            <button
                                class="fcom-mf-edit-modal__attach-icon fcom-mf-edit-modal__attach-icon--photo"
                                :class="{ 'fcom-mf-edit-modal__attach-icon--active': mediaItems.length > 0 }"
                                :disabled="isUploading || !!videoEmbed"
                                title="Photo/Video"
                                @click="triggerFileUpload"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-1.5 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm.5 10H6l4-5 2.5 3 3.5-4.5 3 6.5z"/>
                                </svg>
                            </button>
                            <!-- Video Embed -->
                            <button
                                class="fcom-mf-edit-modal__attach-icon fcom-mf-edit-modal__attach-icon--video"
                                :class="{ 'fcom-mf-edit-modal__attach-icon--active': showVideoEmbed || !!videoEmbed }"
                                :disabled="isUploading || mediaItems.length > 0"
                                title="Embed Video"
                                @click="toggleVideoEmbed"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                                </svg>
                            </button>
                            <!-- Emoji Picker -->
                            <div ref="emojiPickerRef" class="fcom-mf-edit-modal__emoji-wrapper">
                                <button
                                    class="fcom-mf-edit-modal__attach-icon fcom-mf-edit-modal__attach-icon--emoji"
                                    :class="{ 'fcom-mf-edit-modal__attach-icon--active': showEmojiPicker }"
                                    title="Add Emoji"
                                    @click="toggleEmojiPicker"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.83 0 1.5-.67 1.5-1.5S8.83 9 8 9s-1.5.67-1.5 1.5S7.17 12 8 12zm8 0c.83 0 1.5-.67 1.5-1.5S16.83 9 16 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-4 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                                    </svg>
                                </button>
                                <!-- Emoji Picker Dropdown -->
                                <div v-if="showEmojiPicker" class="fcom-mf-edit-modal__emoji-picker">
                                    <div class="fcom-mf-edit-modal__emoji-grid">
                                        <button
                                            v-for="emoji in commonEmojis"
                                            :key="emoji"
                                            @click="insertEmoji(emoji)"
                                            class="fcom-mf-edit-modal__emoji-btn"
                                        >
                                            {{ emoji }}
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                </div>

                <div class="fcom-mf-edit-modal__footer">
                    <button @click="closeModal" class="fcom-mf-btn fcom-mf-btn--secondary">
                        Cancel
                    </button>
                    <button
                        @click="handleSubmit"
                        :disabled="!canSubmit || isSubmitting || isInitializing || charExceeded"
                        class="fcom-mf-btn fcom-mf-btn--primary"
                    >
                        <span v-if="isSubmitting || isInitializing" class="fcom-mf-spinner fcom-mf-spinner--sm"></span>
                        <span v-else>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style lang="scss" scoped>
.fcom-mf-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.fcom-mf-edit-modal {
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-lg;
    max-width: 550px;
    width: 95%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-lg;
        border-bottom: 1px solid $border-color;

        h3 {
            margin: 0;
            font-size: $font-size-lg;
            font-weight: $font-weight-semibold;
        }
    }

    &__close {
        @include button-reset;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        color: $text-secondary;

        &:hover {
            background: $gray-100;
        }
    }

    &__body {
        flex: 1;
        overflow-y: auto;
        padding: $spacing-lg;
    }

    &__title-input {
        width: 100%;
        border: none;
        border-bottom: 1px solid $border-color;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        font-family: inherit;
        line-height: $line-height-normal;
        padding: $spacing-sm 0;
        margin-bottom: $spacing-sm;
        background: transparent;

        &:focus {
            outline: none;
            border-bottom-color: var(--fcom-mf-primary, #1877f2);
        }

        &::placeholder {
            color: $text-tertiary;
            font-weight: $font-weight-normal;
        }
    }

    &__editor {
        width: 100%;
        border: none;
        font-size: $font-size-md;
        font-family: inherit;
        line-height: $line-height-normal;
        min-height: 100px;
        max-height: 300px;
        overflow-y: auto;
        word-wrap: break-word;
        overflow-wrap: break-word;

        &:focus {
            outline: none;
        }

        &:empty::before {
            content: attr(data-placeholder);
            color: $text-tertiary;
            pointer-events: none;
        }

        a {
            color: var(--fcom-mf-primary, #1877f2);
            text-decoration: underline;
        }

        blockquote {
            border-left: 3px solid $border-color;
            margin: $spacing-sm 0;
            padding-left: $spacing-md;
            color: $text-secondary;
        }

        pre, code {
            background: $gray-50;
            border-radius: $border-radius-sm;
            font-family: monospace;
            font-size: $font-size-sm;
        }

        pre {
            padding: $spacing-sm $spacing-md;
            overflow-x: auto;
        }

        code {
            padding: 2px 4px;
        }

        ul, ol {
            padding-left: $spacing-xl;
            margin: $spacing-sm 0;
        }

        img {
            max-width: 100%;
            height: auto;
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

    &__media {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;
        margin-top: $spacing-md;
    }

    &__media-item {
        position: relative;
        width: 120px;
        height: 120px;
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

    &__video-preview {
        margin-top: $spacing-md;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        overflow: hidden;
    }

    &__video-info {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-md;
        background: $gray-50;
    }

    &__video-thumb {
        width: 80px;
        height: 60px;
        object-fit: cover;
        border-radius: $border-radius-sm;
    }

    &__video-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    &__video-provider {
        font-size: $font-size-xs;
        color: $text-tertiary;
        text-transform: uppercase;
    }

    &__video-title {
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        color: $text-primary;
        @include truncate;
    }

    &__video-embed {
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        margin-top: $spacing-md;
        overflow: hidden;
    }

    &__video-embed-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-sm $spacing-md;
        background: $gray-50;
        border-bottom: 1px solid $border-color;
        font-size: $font-size-sm;
        color: $text-secondary;
    }

    &__video-embed-input {
        display: flex;
        padding: $spacing-md;
        gap: $spacing-sm;

        input {
            flex: 1;
            padding: $spacing-sm $spacing-md;
            border: 1px solid $border-color;
            border-radius: $border-radius-sm;
            font-size: $font-size-sm;

            &:focus {
                outline: none;
                border-color: var(--fcom-mf-primary, #1877f2);
            }
        }
    }

    &__embed-btn {
        padding: $spacing-sm $spacing-lg;
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        border: none;
        border-radius: $border-radius-sm;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        cursor: pointer;

        &:hover:not(:disabled) {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__close-btn {
        @include button-reset;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        color: $text-secondary;
        font-size: 14px;

        &:hover {
            background: $gray-200;
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
        background: var(--fcom-mf-primary, #1877f2);
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
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        color: $text-primary;
    }

    &__attach-buttons {
        display: flex;
        gap: $spacing-xs;
    }

    &__attach-icon {
        @include button-reset;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        transition: background $transition-fast;

        &:hover:not(:disabled) {
            background: $bg-hover;
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

        &--active {
background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.1) !important;
        color: var(--fcom-mf-primary, #1877f2) !important;
        }
    }

    &__emoji-wrapper {
        position: relative;
    }

    &__emoji-picker {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        width: 280px;
        background: $white;
        border-radius: $border-radius-md;
        box-shadow: $shadow-lg;
        z-index: 10;
        padding: $spacing-md;
    }

    &__emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: $spacing-xs;
    }

    &__emoji-btn {
        @include button-reset;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-sm;
        font-size: 18px;
        cursor: pointer;

        &:hover {
            background: $gray-100;
        }
    }

    &__footer {
        display: flex;
        justify-content: flex-end;
        gap: $spacing-sm;
        padding: $spacing-lg;
        border-top: 1px solid $border-color;
        background: $gray-50;
    }
}

.fcom-mf-btn {
    padding: $spacing-sm $spacing-lg;
    border: none;
    border-radius: $border-radius-sm;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;

    &--primary {
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;

        &:hover:not(:disabled) {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &--secondary {
        background: $white;
        color: $text-primary;
        border: 1px solid $border-color;

        &:hover {
            background: $gray-50;
        }
    }
}

.fcom-mf-spinner--sm {
    width: 16px;
    height: 16px;
    border-width: 2px;
}
</style>
