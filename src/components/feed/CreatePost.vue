<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFeedStore, useAuthStore, useUiStore } from '@/stores';
import { api } from '@/api/client';
import type { MediaItem } from '@/api/types';

const props = defineProps<{
    space?: string;
}>();

const feedStore = useFeedStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

const isExpanded = ref(false);
const message = ref('');
const isSubmitting = ref(false);
const mediaItems = ref<MediaItem[]>([]);
const isUploading = ref(false);
const uploadProgress = ref(0);

const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const canSubmit = computed(() => {
    return message.value.trim().length > 0 || mediaItems.value.length > 0;
});

function expand(): void {
    isExpanded.value = true;
    setTimeout(() => {
        textareaRef.value?.focus();
    }, 50);
}

function collapse(): void {
    if (!message.value.trim() && mediaItems.value.length === 0) {
        isExpanded.value = false;
    }
}

async function handleSubmit(): Promise<void> {
    if (!canSubmit.value || isSubmitting.value) return;

    isSubmitting.value = true;
    try {
        await feedStore.createFeed({
            message: message.value,
            space_id: props.space ? undefined : undefined, // Would need space ID lookup
            media_items: mediaItems.value.length > 0 ? mediaItems.value : undefined,
        });

        // Reset form
        message.value = '';
        mediaItems.value = [];
        isExpanded.value = false;

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
    <div class="fcom-mf-create-post fcom-mf-card">
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
                    <span class="fcom-mf-create-post__visibility">🌐 Public</span>
                </div>
            </div>

            <textarea
                ref="textareaRef"
                v-model="message"
                :placeholder="uiStore.t('createPost')"
                class="fcom-mf-create-post__textarea"
                rows="3"
                @blur="collapse"
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
}
</style>
