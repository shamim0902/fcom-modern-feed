<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useUiStore, useAuthStore } from '@/stores';
import type { Feed } from '@/api/types';
import ReactionPicker from './ReactionPicker.vue';

const props = defineProps<{
    feed: Feed;
    isLiking?: boolean;
}>();

const emit = defineEmits<{
    react: [type: string];
    comment: [];
    share: [];
}>();

const uiStore = useUiStore();
const authStore = useAuthStore();

const showReactionPicker = ref(false);
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const likeButtonRef = ref<HTMLElement | null>(null);

// Reaction display mapping (community-focused reactions)
const reactionMap: Record<string, { emoji: string; label: string; color: string }> = {
    like: { emoji: '👍', label: 'Like', color: '#1877f2' },
    love: { emoji: '❤️', label: 'Love', color: '#e7415f' },
    celebrate: { emoji: '🎉', label: 'Celebrate', color: '#8b5cf6' },
    insightful: { emoji: '💡', label: 'Insightful', color: '#f59e0b' },
    support: { emoji: '🙌', label: 'Support', color: '#10b981' },
    thanks: { emoji: '🙏', label: 'Thanks', color: '#ec4899' },
};

const currentReaction = computed(() => {
    if (!props.feed.has_user_react) return null;

    // Use the tracked user_reaction_type first (set on load and when replacing reaction)
    if (props.feed.user_reaction_type) {
        return props.feed.user_reaction_type;
    }

    // Fallback: check reactions array for current user's reaction (type-safe id comparison)
    const currentUserId = authStore.userId;
    if (currentUserId != null && props.feed.reactions?.length) {
        const uid = Number(currentUserId);
        const userReaction = props.feed.reactions.find((r) => Number(r.user_id) === uid);
        if (userReaction?.type) return userReaction.type;
    }

    return 'like';
});

const reactionDisplay = computed(() => {
    const type = currentReaction.value || 'like';
    return reactionMap[type] || reactionMap.like;
});

const commentsDisabled = computed(() => {
    return props.feed.meta?.comments_disabled === 'yes';
});

// Desktop: Show picker on hover with delay
function handleMouseEnter(): void {
    hoverTimer.value = setTimeout(() => {
        showReactionPicker.value = true;
    }, 500);
}

function handleMouseLeave(): void {
    if (hoverTimer.value) {
        clearTimeout(hoverTimer.value);
        hoverTimer.value = null;
    }
    // Small delay before hiding to allow moving to picker
    setTimeout(() => {
        if (!document.querySelector('.fcom-mf-reaction-picker:hover')) {
            showReactionPicker.value = false;
        }
    }, 100);
}

// Mobile: Show picker on long press
function handleTouchStart(): void {
    longPressTimer.value = setTimeout(() => {
        showReactionPicker.value = true;
    }, 500);
}

function handleTouchEnd(): void {
    if (longPressTimer.value) {
        clearTimeout(longPressTimer.value);
        longPressTimer.value = null;
    }
}

// Handle reaction selection
function handleReactionSelect(type: string): void {
    showReactionPicker.value = false;
    emit('react', type);
}

// Quick like/unlike on single click (if picker not shown)
// - If not reacted: add 'like'
// - If already reacted: toggle off current reaction
function handleLikeClick(): void {
    if (!showReactionPicker.value) {
        // Emit current reaction type to toggle it off, or 'like' to add
        const reactionType = props.feed.has_user_react
            ? (props.feed.user_reaction_type || 'like')
            : 'like';
        emit('react', reactionType);
    }
}

function closePicker(): void {
    showReactionPicker.value = false;
}

onUnmounted(() => {
    if (longPressTimer.value) clearTimeout(longPressTimer.value);
    if (hoverTimer.value) clearTimeout(hoverTimer.value);
});
</script>

<template>
    <div class="fcom-mf-feed-actions">
        <!-- Like Button with Reaction Picker -->
        <div
            class="fcom-mf-feed-actions__like-wrapper"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
        >
            <ReactionPicker
                :show="showReactionPicker"
                :current-reaction="currentReaction || undefined"
                @select="handleReactionSelect"
                @close="closePicker"
            />

            <button
                ref="likeButtonRef"
                class="fcom-mf-feed-actions__btn"
                :class="{
                    'fcom-mf-feed-actions__btn--active': feed.has_user_react,
                    [`fcom-mf-feed-actions__btn--${currentReaction}`]: currentReaction
                }"
                :style="feed.has_user_react ? { color: reactionDisplay.color } : {}"
                :disabled="isLiking"
                @click="handleLikeClick"
                @touchstart.passive="handleTouchStart"
                @touchend="handleTouchEnd"
                @touchcancel="handleTouchEnd"
            >
                <span v-if="feed.has_user_react" class="fcom-mf-feed-actions__emoji">
                    {{ reactionDisplay.emoji }}
                </span>
                <svg
                    v-else
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
                <span class="fcom-mf-feed-actions__label">
                    {{ feed.has_user_react ? reactionDisplay.label : uiStore.t('like') }}
                </span>
            </button>
        </div>

        <!-- Comment Button -->
        <button
            v-if="!commentsDisabled"
            class="fcom-mf-feed-actions__btn"
            @click="emit('comment')"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="fcom-mf-feed-actions__label">{{ uiStore.t('comment') }}</span>
        </button>

        <!-- Share Button -->
        <button
            class="fcom-mf-feed-actions__btn"
            @click="emit('share')"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span class="fcom-mf-feed-actions__label">{{ uiStore.t('share') }}</span>
        </button>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-feed-actions {
    display: flex;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-md $spacing-sm;
    border-top: none;
    margin-top: 0;
    background: transparent;

    &__like-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        min-width: 0;
    }

    &__btn {
        @include button-reset;
        @include focus-ring;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        min-height: 34px;
        padding: 6px $spacing-sm;
        border-radius: $border-radius-sm;
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        transition: background-color $transition-fast, color $transition-fast, box-shadow $transition-fast, transform $transition-fast;

        &:hover {
            background: rgba(0, 0, 0, 0.04);
            color: $text-primary;
        }

        &:active {
            transform: translateY(1px);
        }

        &--active {
            background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.11);
            font-weight: $font-weight-bold;

            &:hover {
                background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.16);
                filter: none;
            }
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        svg {
            flex-shrink: 0;
            width: 17px;
            height: 17px;
        }
    }

    &__emoji {
        font-size: 19px;
        line-height: 1;
    }

    &__label {
        white-space: nowrap;

        @media (max-width: $breakpoint-sm) {
            display: none;
        }
    }

    @media (max-width: $breakpoint-sm) {
        padding: 2px $spacing-sm $spacing-xs;

        &__btn {
            min-height: 32px;
            padding: 5px $spacing-xs;
            border-radius: $border-radius-xs;
        }
    }
}
</style>
