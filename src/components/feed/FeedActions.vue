<script setup lang="ts">
import { useUiStore } from '@/stores';
import type { Feed } from '@/api/types';

defineProps<{
    feed: Feed;
    isLiking?: boolean;
}>();

const emit = defineEmits<{
    like: [];
    comment: [];
    share: [];
}>();

const uiStore = useUiStore();
</script>

<template>
    <div class="fcom-mf-feed-actions">
        <!-- Like Button -->
        <button
            class="fcom-mf-feed-actions__btn"
            :class="{ 'fcom-mf-feed-actions__btn--active': feed.has_user_react }"
            :disabled="isLiking"
            @click="emit('like')"
        >
            <svg
                v-if="!feed.has_user_react"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <svg
                v-else
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span>{{ feed.has_user_react ? uiStore.t('liked') : uiStore.t('like') }}</span>
        </button>

        <!-- Comment Button -->
        <button
            class="fcom-mf-feed-actions__btn"
            @click="emit('comment')"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{{ uiStore.t('comment') }}</span>
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
            <span>{{ uiStore.t('share') }}</span>
        </button>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-feed-actions {
    display: flex;
    padding: $spacing-xs $spacing-lg $spacing-md;

    &__btn {
        @include button-reset;
        @include hover-bg;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        padding: $spacing-sm;
        border-radius: $border-radius-sm;
        color: $text-secondary;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        transition: all $transition-fast;

        &:hover {
            color: $text-primary;
        }

        &--active {
            color: $primary-color;

            &:hover {
                color: $primary-hover;
            }
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        svg {
            flex-shrink: 0;
        }

        @media (max-width: $breakpoint-sm) {
            span {
                display: none;
            }
        }
    }
}
</style>
