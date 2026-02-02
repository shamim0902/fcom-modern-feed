<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useFeedStore, useAuthStore, useUiStore, useSpaceStore } from '@/stores';
import { api } from '@/api/client';
import type { MediaItem, SpaceFull, CreateFeedData } from '@/api/types';

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

// Poll/Survey state
const showPollForm = ref(false);
const pollData = ref<{
    type: 'single_choice' | 'multi_choice';
    options: { label: string; slug: string }[];
    end_date: string | null;
}>({
    type: 'single_choice',
    options: [
        { label: '', slug: '' },
        { label: '', slug: '' }
    ],
    end_date: null
});

// Scheduling state
const showScheduleModal = ref(false);
const scheduleDate = ref('');
const scheduleTime = ref('');
const scheduledAt = ref<string | null>(null);

// Emoji picker state
const showEmojiPicker = ref(false);

// Common emojis for quick access
const commonEmojis = [
    '😀', '😂', '😍', '🥰', '😊', '🤔', '😎', '🤩',
    '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏',
    '😢', '😡', '😱', '🤯', '😴', '🤮', '🤑', '😇',
    '👏', '🤝', '💪', '🎯', '🚀', '⭐', '💡', '📌'
];

const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const spaceSelectorRef = ref<HTMLElement | null>(null);
const createPostRef = ref<HTMLElement | null>(null);
const justExpanded = ref(false);
const emojiPickerRef = ref<HTMLElement | null>(null);

// Click outside handler for space dropdown, emoji picker and collapse
function handleClickOutside(event: MouseEvent): void {
    // Close space dropdown if clicking outside
    if (spaceSelectorRef.value && !spaceSelectorRef.value.contains(event.target as Node)) {
        showSpaceDropdown.value = false;
    }

    // Close emoji picker if clicking outside
    if (emojiPickerRef.value && !emojiPickerRef.value.contains(event.target as Node)) {
        showEmojiPicker.value = false;
    }

    // Skip collapse check if we just expanded (prevents immediate collapse)
    if (justExpanded.value) {
        justExpanded.value = false;
        return;
    }

    // Collapse if clicking outside the create post area (and form is empty)
    // Don't collapse if schedule modal is open
    if (isExpanded.value && !showScheduleModal.value && createPostRef.value && !createPostRef.value.contains(event.target as Node)) {
        collapse();
    }
}

// Fetch user's spaces on mount and default to first space when "Choose where to post"
onMounted(async () => {
    await spaceStore.fetchMySpaces();
    if (!props.spaceId && !selectedSpaceId.value && spaceStore.canPostSpaces.length > 0) {
        selectedSpaceId.value = spaceStore.canPostSpaces[0].id;
    }
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
    const hasText = message.value.trim().length > 0;
    const hasMedia = mediaItems.value.length > 0;
    const hasVideo = !!videoEmbed.value;
    const hasPoll = showPollForm.value && pollData.value.options.filter(o => o.label.trim()).length >= 2;
    const hasContent = hasText || hasMedia || hasVideo || hasPoll;
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

// Default to first space when spaces load and none selected (e.g. after post reset)
watch(
    () => [availableSpaces.value.length, spaceStore.loading] as const,
    ([count, loading]) => {
        if (props.spaceId || loading || count === 0 || selectedSpaceId.value != null) return;
        const first = availableSpaces.value[0];
        if (first) selectedSpaceId.value = first.id;
    },
    { immediate: true }
);

function selectSpace(space: SpaceFull | null): void {
    selectedSpaceId.value = space?.id || null;
    showSpaceDropdown.value = false;
}

function onSpaceDropdownToggle(): void {
    const willOpen = !showSpaceDropdown.value;
    showSpaceDropdown.value = willOpen;
    // When opening "Choose where to post", default to first space if none selected
    if (willOpen && !props.spaceId && !selectedSpaceId.value && availableSpaces.value.length > 0) {
        selectedSpaceId.value = availableSpaces.value[0].id;
    }
}

function expand(): void {
    justExpanded.value = true;
    isExpanded.value = true;
    setTimeout(() => {
        textareaRef.value?.focus();
    }, 50);
}

function expandAnd(fn: () => void): void {
    expand();
    nextTick(() => fn());
}

function collapse(): void {
    if (!message.value.trim() && mediaItems.value.length === 0 && !videoEmbed.value && !showPollForm.value && !scheduledAt.value) {
        isExpanded.value = false;
        showSpaceDropdown.value = false;
        resetAttachments();
    }
}

function resetAttachments(): void {
    showVideoEmbed.value = false;
    videoUrl.value = '';
    videoEmbed.value = null;
    showPollForm.value = false;
    pollData.value = {
        type: 'single_choice',
        options: [
            { label: '', slug: '' },
            { label: '', slug: '' }
        ],
        end_date: null
    };
    scheduledAt.value = null;
    scheduleDate.value = '';
    scheduleTime.value = '';
    showEmojiPicker.value = false;
}

async function handleSubmit(): Promise<void> {
    if (!canSubmit.value || isSubmitting.value) return;

    isSubmitting.value = true;
    try {
        const feedData: CreateFeedData = {
            message: message.value,
            space: selectedSpace.value?.slug || undefined,
        };

        // Add media images
        if (mediaItems.value.length > 0) {
            feedData.media_images = mediaItems.value;
        }

        // Add video embed
        if (videoEmbed.value) {
            feedData.media = videoEmbed.value;
        }

        // Add poll/survey
        if (showPollForm.value) {
            const validOptions = pollData.value.options.filter(o => o.label.trim());
            if (validOptions.length >= 2) {
                feedData.survey = {
                    type: pollData.value.type,
                    options: validOptions,
                    end_date: pollData.value.end_date || undefined
                };
            }
        }

        // Add scheduling
        if (scheduledAt.value) {
            feedData.scheduled_at = scheduledAt.value;
        }

        await feedStore.createFeed(feedData);

        // Reset form
        message.value = '';
        mediaItems.value = [];
        isExpanded.value = false;
        resetAttachments();
        // Keep selected space if posting to a specific space view
        if (!props.spaceId) {
            selectedSpaceId.value = null;
        }

        if (scheduledAt.value) {
            uiStore.showSuccess('Post scheduled successfully!');
        } else {
            uiStore.showSuccess('Post created successfully!');
        }
    } catch (error: unknown) {
        // Extract error message from API response
        let errorMessage = uiStore.t('errorOccurred');
        if (error && typeof error === 'object') {
            const apiError = error as { message?: string; errors?: Record<string, string[]> };
            if (apiError.message) {
                errorMessage = apiError.message;
            }
            // If there are field-specific errors, show the first one
            if (apiError.errors) {
                const firstError = Object.values(apiError.errors)[0];
                if (firstError && firstError[0]) {
                    errorMessage = firstError[0];
                }
            }
        }
        uiStore.showError(errorMessage);
        console.error('[CreatePost] Error:', error);
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

// Video Embed Functions
function toggleVideoEmbed(): void {
    if (showVideoEmbed.value) {
        showVideoEmbed.value = false;
        videoUrl.value = '';
    } else {
        showVideoEmbed.value = true;
        showPollForm.value = false;
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
                author_name: string;
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

// Poll Functions
function togglePollForm(): void {
    if (showPollForm.value) {
        showPollForm.value = false;
    } else {
        showPollForm.value = true;
        showVideoEmbed.value = false;
        videoEmbed.value = null;
        mediaItems.value = [];
    }
}

function addPollOption(): void {
    if (pollData.value.options.length < 10) {
        pollData.value.options.push({ label: '', slug: '' });
    }
}

function removePollOption(index: number): void {
    if (pollData.value.options.length > 2) {
        pollData.value.options.splice(index, 1);
    }
}

function cancelPoll(): void {
    showPollForm.value = false;
    pollData.value = {
        type: 'single_choice',
        options: [
            { label: '', slug: '' },
            { label: '', slug: '' }
        ],
        end_date: null
    };
}

// Scheduling Functions
function openScheduleModal(): void {
    showScheduleModal.value = true;
    if (scheduledAt.value) {
        const [datePart, timePart] = scheduledAt.value.split(' ');
        scheduleDate.value = datePart;
        scheduleTime.value = timePart?.substring(0, 5) || '';
    }
}

function confirmSchedule(): void {
    if (scheduleDate.value && scheduleTime.value) {
        scheduledAt.value = `${scheduleDate.value} ${scheduleTime.value}:00`;
    }
    showScheduleModal.value = false;
}

function cancelSchedule(): void {
    scheduledAt.value = null;
    scheduleDate.value = '';
    scheduleTime.value = '';
    showScheduleModal.value = false;
}

function formatScheduledTime(): string {
    if (!scheduledAt.value) return '';
    const date = new Date(scheduledAt.value);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getMinDate(): string {
    return new Date().toISOString().split('T')[0];
}

// Emoji Functions
function toggleEmojiPicker(): void {
    showEmojiPicker.value = !showEmojiPicker.value;
}

function insertEmoji(emoji: string): void {
    if (textareaRef.value) {
        const start = textareaRef.value.selectionStart;
        const end = textareaRef.value.selectionEnd;
        const text = message.value;
        message.value = text.substring(0, start) + emoji + text.substring(end);
        // Set cursor position after emoji
        setTimeout(() => {
            if (textareaRef.value) {
                textareaRef.value.selectionStart = textareaRef.value.selectionEnd = start + emoji.length;
                textareaRef.value.focus();
            }
        }, 0);
    } else {
        message.value += emoji;
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
            <div class="fcom-mf-create-post__collapsed-inner">
                <div class="fcom-mf-create-post__placeholder">
                    {{ uiStore.t('createPost') }}
                </div>
                <div class="fcom-mf-create-post__attach-buttons fcom-mf-create-post__attach-buttons--collapsed" @click.stop>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--photo"
                        title="Photo/Video"
                        @click="expandAnd(triggerFileUpload)"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-1.5 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm.5 10H6l4-5 2.5 3 3.5-4.5 3 6.5z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--video"
                        title="Embed Video (YouTube, Vimeo, etc.)"
                        @click="expandAnd(toggleVideoEmbed)"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--poll"
                        title="Create Poll"
                        @click="expandAnd(togglePollForm)"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--schedule"
                        title="Schedule Post"
                        @click="expandAnd(openScheduleModal)"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                        </svg>
                    </button>
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--emoji"
                        title="Add Emoji"
                        @click="expandAnd(toggleEmojiPicker)"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.83 0 1.5-.67 1.5-1.5S8.83 9 8 9s-1.5.67-1.5 1.5S7.17 12 8 12zm8 0c.83 0 1.5-.67 1.5-1.5S16.83 9 16 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-4 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                        </svg>
                    </button>
                </div>
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
                            @click.stop="onSpaceDropdownToggle"
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

            <!-- Scheduled indicator -->
            <div v-if="scheduledAt" class="fcom-mf-create-post__scheduled-badge" @click="openScheduleModal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Scheduled: {{ formatScheduledTime() }}</span>
                <button class="fcom-mf-create-post__scheduled-remove" @click.stop="cancelSchedule">✕</button>
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

            <!-- Video Embed Preview -->
            <div v-if="videoEmbed" class="fcom-mf-create-post__video-preview">
                <div class="fcom-mf-create-post__video-preview-header">
                    <span class="fcom-mf-create-post__video-provider">{{ videoEmbed.provider }}</span>
                    <span class="fcom-mf-create-post__video-title">{{ videoEmbed.title || 'Embedded Video' }}</span>
                    <button class="fcom-mf-create-post__media-remove" @click="removeVideoEmbed" title="Remove video">✕</button>
                </div>
                <div v-if="videoEmbed.html" class="fcom-mf-create-post__video-embed-html" v-html="videoEmbed.html"></div>
                <img v-else-if="videoEmbed.image" :src="videoEmbed.image" alt="Video thumbnail" class="fcom-mf-create-post__video-thumb" />
            </div>

            <!-- Video URL Input -->
            <div v-if="showVideoEmbed" class="fcom-mf-create-post__video-embed">
                <div class="fcom-mf-create-post__video-embed-header">
                    <span>Embed video from YouTube, Vimeo, etc.</span>
                    <button @click="showVideoEmbed = false" class="fcom-mf-create-post__close-btn">✕</button>
                </div>
                <div class="fcom-mf-create-post__video-embed-input">
                    <input
                        v-model="videoUrl"
                        type="url"
                        placeholder="Paste video URL here..."
                        @keydown.enter="embedVideo"
                    />
                    <button
                        :disabled="!videoUrl.trim() || isEmbedding"
                        @click="embedVideo"
                        class="fcom-mf-create-post__embed-btn"
                    >
                        <span v-if="isEmbedding" class="fcom-mf-spinner fcom-mf-spinner--sm"></span>
                        <span v-else>Embed</span>
                    </button>
                </div>
            </div>

            <!-- Poll Form -->
            <div v-if="showPollForm" class="fcom-mf-create-post__poll-form">
                <div class="fcom-mf-create-post__poll-header">
                    <span>Create a Poll</span>
                    <button @click="cancelPoll" class="fcom-mf-create-post__close-btn">✕</button>
                </div>
                <div class="fcom-mf-create-post__poll-options">
                    <div
                        v-for="(option, index) in pollData.options"
                        :key="index"
                        class="fcom-mf-create-post__poll-option"
                    >
                        <input
                            v-model="option.label"
                            type="text"
                            :placeholder="`Option ${index + 1}`"
                        />
                        <button
                            v-if="pollData.options.length > 2"
                            @click="removePollOption(index)"
                            class="fcom-mf-create-post__poll-remove"
                        >✕</button>
                    </div>
                    <button
                        v-if="pollData.options.length < 10"
                        @click="addPollOption"
                        class="fcom-mf-create-post__poll-add"
                    >
                        + Add option
                    </button>
                </div>
                <div class="fcom-mf-create-post__poll-settings">
                    <label class="fcom-mf-create-post__poll-multi">
                        <input
                            type="checkbox"
                            :checked="pollData.type === 'multi_choice'"
                            @change="pollData.type = ($event.target as HTMLInputElement).checked ? 'multi_choice' : 'single_choice'"
                        />
                        <span>Allow multiple selections</span>
                    </label>
                    <div class="fcom-mf-create-post__poll-end-date">
                        <label>End date (optional):</label>
                        <input
                            v-model="pollData.end_date"
                            type="datetime-local"
                            :min="new Date().toISOString().slice(0, 16)"
                        />
                    </div>
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
                    <!-- Photo Upload -->
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--photo"
                        :class="{ 'fcom-mf-create-post__attach-icon--active': mediaItems.length > 0 }"
                        :disabled="isUploading || showPollForm || !!videoEmbed"
                        title="Photo/Video"
                        @click="triggerFileUpload"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-1.5 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm.5 10H6l4-5 2.5 3 3.5-4.5 3 6.5z"/>
                        </svg>
                    </button>
                    <!-- Video Embed -->
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--video"
                        :class="{ 'fcom-mf-create-post__attach-icon--active': showVideoEmbed || !!videoEmbed }"
                        :disabled="isUploading || showPollForm || mediaItems.length > 0"
                        title="Embed Video (YouTube, Vimeo, etc.)"
                        @click="toggleVideoEmbed"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    </button>
                    <!-- Poll -->
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--poll"
                        :class="{ 'fcom-mf-create-post__attach-icon--active': showPollForm }"
                        :disabled="isUploading || mediaItems.length > 0 || !!videoEmbed"
                        title="Create Poll"
                        @click="togglePollForm"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                    </button>
                    <!-- Schedule -->
                    <button
                        class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--schedule"
                        :class="{ 'fcom-mf-create-post__attach-icon--active': !!scheduledAt }"
                        title="Schedule Post"
                        @click="openScheduleModal"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                        </svg>
                    </button>
                    <!-- Emoji Picker -->
                    <div ref="emojiPickerRef" class="fcom-mf-create-post__emoji-wrapper">
                        <button
                            class="fcom-mf-create-post__attach-icon fcom-mf-create-post__attach-icon--emoji"
                            :class="{ 'fcom-mf-create-post__attach-icon--active': showEmojiPicker }"
                            title="Add Emoji"
                            @click="toggleEmojiPicker"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.83 0 1.5-.67 1.5-1.5S8.83 9 8 9s-1.5.67-1.5 1.5S7.17 12 8 12zm8 0c.83 0 1.5-.67 1.5-1.5S16.83 9 16 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-4 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                            </svg>
                        </button>
                        <!-- Emoji Picker Dropdown -->
                        <div v-if="showEmojiPicker" class="fcom-mf-create-post__emoji-picker">
                            <div class="fcom-mf-create-post__emoji-grid">
                                <button
                                    v-for="emoji in commonEmojis"
                                    :key="emoji"
                                    @click="insertEmoji(emoji)"
                                    class="fcom-mf-create-post__emoji-btn"
                                >
                                    {{ emoji }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schedule Modal -->
            <Teleport to="body">
                <div v-if="showScheduleModal" class="fcom-mf-modal-overlay" @click.self="showScheduleModal = false">
                    <div class="fcom-mf-modal fcom-mf-schedule-modal">
                        <div class="fcom-mf-modal__header">
                            <h3>Schedule Post</h3>
                            <button @click="showScheduleModal = false" class="fcom-mf-modal__close">✕</button>
                        </div>
                        <div class="fcom-mf-modal__body">
                            <p class="fcom-mf-schedule-modal__desc">Choose when you want your post to be published.</p>
                            <div class="fcom-mf-schedule-modal__inputs">
                                <div class="fcom-mf-schedule-modal__field">
                                    <label>Date</label>
                                    <input
                                        v-model="scheduleDate"
                                        type="date"
                                        :min="getMinDate()"
                                    />
                                </div>
                                <div class="fcom-mf-schedule-modal__field">
                                    <label>Time</label>
                                    <input
                                        v-model="scheduleTime"
                                        type="time"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="fcom-mf-modal__footer">
                            <button @click="cancelSchedule" class="fcom-mf-btn fcom-mf-btn--secondary">
                                Remove Schedule
                            </button>
                            <button
                                @click="confirmSchedule"
                                :disabled="!scheduleDate || !scheduleTime"
                                class="fcom-mf-btn fcom-mf-btn--primary"
                            >
                                Set Schedule
                            </button>
                        </div>
                    </div>
                </div>
            </Teleport>

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
                    :class="{
                        'fcom-mf-create-post__post-btn--ready': canSubmit && !isSubmitting && !charExceeded,
                        'fcom-mf-create-post__post-btn--scheduled': !!scheduledAt
                    }"
                    :disabled="!canSubmit || isSubmitting || charExceeded"
                    @click="handleSubmit"
                >
                    <span v-if="isSubmitting" class="fcom-mf-spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
                    <span v-else-if="scheduledAt">Schedule</span>
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

    &__collapsed-inner {
        flex: 1;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        min-width: 0;
    }

    &__placeholder {
        flex: 1;
        min-width: 0;
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
        background: transparent;

        &:focus {
            outline: none;
            box-shadow: none;
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

    &__attach-buttons--collapsed {
        flex-shrink: 0;
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

    // Scheduled badge
    &__scheduled-badge {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        padding: $spacing-sm $spacing-md;
        background: rgba($primary-color, 0.1);
        border: 1px solid rgba($primary-color, 0.2);
        border-radius: $border-radius-md;
        margin-bottom: $spacing-md;
        color: $primary-color;
        font-size: $font-size-sm;
        cursor: pointer;
        transition: background $transition-fast;

        &:hover {
            background: rgba($primary-color, 0.15);
        }

        svg {
            flex-shrink: 0;
        }

        span {
            flex: 1;
        }
    }

    &__scheduled-remove {
        @include button-reset;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        font-size: 12px;
        color: $primary-color;

        &:hover {
            background: rgba($primary-color, 0.2);
        }
    }

    // Video embed preview
    &__video-preview {
        margin-bottom: $spacing-md;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        overflow: hidden;
    }

    &__video-preview-header {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-sm $spacing-md;
        background: $gray-50;
        flex-wrap: wrap;

        .fcom-mf-create-post__video-title {
            flex: 1;
            min-width: 0;
        }
    }

    &__video-embed-html {
        position: relative;
        width: 100%;
        padding-bottom: 56.25%; /* 16:9 */
        height: 0;
        overflow: hidden;
        background: $gray-900;

        iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
    }

    &__video-thumb {
        display: block;
        width: 100%;
        max-height: 360px;
        object-fit: contain;
        background: $gray-900;
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

    // Video embed input
    &__video-embed {
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        margin-bottom: $spacing-md;
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
                border-color: $primary-color;
            }
        }
    }

    &__embed-btn {
        padding: $spacing-sm $spacing-lg;
        background: $primary-color;
        color: $white;
        border: none;
        border-radius: $border-radius-sm;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        cursor: pointer;
        transition: background $transition-fast;

        &:hover:not(:disabled) {
            background: $primary-hover;
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

    // Poll form
    &__poll-form {
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        margin-bottom: $spacing-md;
        overflow: hidden;
    }

    &__poll-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-sm $spacing-md;
        background: $gray-50;
        border-bottom: 1px solid $border-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__poll-options {
        padding: $spacing-md;
    }

    &__poll-option {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        margin-bottom: $spacing-sm;

        input {
            flex: 1;
            padding: $spacing-sm $spacing-md;
            border: 1px solid $border-color;
            border-radius: $border-radius-sm;
            font-size: $font-size-sm;

            &:focus {
                outline: none;
                border-color: $primary-color;
            }
        }
    }

    &__poll-remove {
        @include button-reset;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        color: $text-tertiary;
        font-size: 14px;

        &:hover {
            background: $gray-100;
            color: $danger-color;
        }
    }

    &__poll-add {
        @include button-reset;
        padding: $spacing-sm $spacing-md;
        color: $primary-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;

        &:hover {
            text-decoration: underline;
        }
    }

    &__poll-settings {
        padding: $spacing-md;
        border-top: 1px solid $border-color;
        background: $gray-50;
    }

    &__poll-multi {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
        color: $text-secondary;
        cursor: pointer;
        margin-bottom: $spacing-md;

        input {
            width: 16px;
            height: 16px;
        }
    }

    &__poll-end-date {
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;

        label {
            font-size: $font-size-xs;
            color: $text-tertiary;
        }

        input {
            padding: $spacing-sm $spacing-md;
            border: 1px solid $border-color;
            border-radius: $border-radius-sm;
            font-size: $font-size-sm;
            max-width: 250px;

            &:focus {
                outline: none;
                border-color: $primary-color;
            }
        }
    }

    // Emoji wrapper
    &__emoji-wrapper {
        position: relative;
    }

    &__emoji-picker {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        width: 320px;
        background: $white;
        border-radius: $border-radius-md;
        box-shadow: $shadow-lg;
        z-index: $z-dropdown;
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
        font-size: 20px;
        cursor: pointer;
        transition: background $transition-fast;

        &:hover {
            background: $gray-100;
        }
    }

    // Attach icon active state
    &__attach-icon--active {
        background: rgba($primary-color, 0.1) !important;
        color: $primary-color !important;
    }

    &__attach-icon--poll {
        color: $success-color;
    }

    &__attach-icon--schedule {
        color: #8b5cf6; // Purple for schedule
    }

    // Post button scheduled state
    &__post-btn--scheduled {
        background-color: #8b5cf6 !important;

        &:hover {
            background-color: #7c3aed !important;
        }
    }

}

// Schedule modal styles
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

.fcom-mf-modal {
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-lg;
    max-width: 400px;
    width: 90%;
    max-height: 90vh;
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
        font-size: 18px;

        &:hover {
            background: $gray-100;
        }
    }

    &__body {
        padding: $spacing-lg;
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

.fcom-mf-schedule-modal {
    &__desc {
        margin: 0 0 $spacing-lg;
        color: $text-secondary;
        font-size: $font-size-sm;
    }

    &__inputs {
        display: flex;
        gap: $spacing-md;
    }

    &__field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;

        label {
            font-size: $font-size-sm;
            font-weight: $font-weight-medium;
            color: $text-primary;
        }

        input {
            padding: $spacing-sm $spacing-md;
            border: 1px solid $border-color;
            border-radius: $border-radius-sm;
            font-size: $font-size-sm;

            &:focus {
                outline: none;
                border-color: $primary-color;
            }
        }
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

    &--primary {
        background: $primary-color;
        color: $white;

        &:hover:not(:disabled) {
            background: $primary-hover;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &--secondary {
        background: transparent;
        color: $danger-color;
        border: 1px solid $border-color;

        &:hover {
            background: rgba($danger-color, 0.1);
        }
    }
}
</style>
