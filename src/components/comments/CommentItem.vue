<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore, useUiStore } from '@/stores';
import type { Comment } from '@/api/types';
import TimeAgo from '../common/TimeAgo.vue';
import CommentForm from './CommentForm.vue';

const props = defineProps<{
    comment: Comment;
    feedId: number;
    isSticky?: boolean;
    isReply?: boolean;
}>();

const emit = defineEmits<{
    reply: [parentId: number, message: string];
    delete: [commentId: number];
    react: [commentId: number];
}>();

const authStore = useAuthStore();
const uiStore = useUiStore();

const showReplyForm = ref(false);
const showReplies = ref(false);
const isSubmittingReply = ref(false);

const isOwnComment = computed(() => {
    return authStore.userId === props.comment.user_id;
});

const hasReplies = computed(() => {
    return (props.comment.replies_count ?? 0) > 0 || (props.comment.replies?.length ?? 0) > 0;
});

const repliesCount = computed(() => {
    return props.comment.replies?.length ?? props.comment.replies_count ?? 0;
});

async function handleReply(message: string): Promise<void> {
    if (!message.trim() || isSubmittingReply.value) return;

    isSubmittingReply.value = true;
    try {
        emit('reply', props.comment.id, message);
        showReplyForm.value = false;
    } finally {
        isSubmittingReply.value = false;
    }
}

function handleDelete(): void {
    if (confirm('Are you sure you want to delete this comment?')) {
        emit('delete', props.comment.id);
    }
}

function toggleReplies(): void {
    showReplies.value = !showReplies.value;
}
</script>

<template>
    <div class="fcom-mf-comment" :class="{ 'fcom-mf-comment--reply': isReply }">
        <!-- Sticky Badge -->
        <div v-if="isSticky" class="fcom-mf-comment__sticky-badge">📌</div>

        <a :href="`/portal/profile/${comment.xprofile.username}`" class="fcom-mf-comment__avatar-link">
            <img
                :src="comment.xprofile.avatar"
                :alt="comment.xprofile.display_name"
                class="fcom-mf-avatar fcom-mf-avatar--sm"
            />
        </a>

        <div class="fcom-mf-comment__body">
            <div class="fcom-mf-comment__bubble">
                <a :href="`/portal/profile/${comment.xprofile.username}`" class="fcom-mf-comment__author">
                    {{ comment.xprofile.display_name }}
                </a>
                <div class="fcom-mf-comment__text" v-html="comment.message_rendered"></div>
            </div>

            <!-- Actions Row -->
            <div class="fcom-mf-comment__actions">
                <button
                    class="fcom-mf-comment__action"
                    :class="{ 'fcom-mf-comment__action--active': comment.has_user_react }"
                    @click="emit('react', comment.id)"
                >
                    {{ uiStore.t('like') }}
                </button>

                <span v-if="comment.reactions_count > 0" class="fcom-mf-comment__reactions">
                    👍 {{ comment.reactions_count }}
                </span>

                <button
                    v-if="!isReply"
                    class="fcom-mf-comment__action"
                    @click="showReplyForm = !showReplyForm"
                >
                    {{ uiStore.t('reply') }}
                </button>

                <TimeAgo :date="comment.created_at" />

                <button
                    v-if="isOwnComment"
                    class="fcom-mf-comment__action fcom-mf-comment__action--delete"
                    @click="handleDelete"
                >
                    {{ uiStore.t('delete') }}
                </button>
            </div>

            <!-- Reply Form -->
            <CommentForm
                v-if="showReplyForm"
                :is-submitting="isSubmittingReply"
                :placeholder="uiStore.t('writeReply')"
                size="sm"
                class="fcom-mf-comment__reply-form"
                @submit="handleReply"
                @cancel="showReplyForm = false"
            />

            <!-- View Replies Toggle -->
            <button
                v-if="hasReplies && !isReply"
                class="fcom-mf-comment__view-replies"
                @click="toggleReplies"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline :points="showReplies ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"></polyline>
                </svg>
                {{ showReplies ? uiStore.t('hideReplies') : uiStore.t('viewReplies', repliesCount) }}
            </button>

            <!-- Nested Replies -->
            <div v-if="showReplies && comment.replies?.length" class="fcom-mf-comment__replies">
                <CommentItem
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    :comment="reply"
                    :feed-id="feedId"
                    :is-reply="true"
                    @reply="(parentId, message) => emit('reply', parentId, message)"
                    @delete="(id) => emit('delete', id)"
                    @react="(id) => emit('react', id)"
                />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-comment {
    display: flex;
    gap: $spacing-sm;
    position: relative;

    &--reply {
        margin-left: $spacing-xl + $spacing-lg;
        padding-left: $spacing-md;

        // Thread line
        &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: $gray-200;
            border-radius: 1px;
        }
    }

    &__sticky-badge {
        position: absolute;
        top: -$spacing-sm;
        right: $spacing-sm;
        font-size: $font-size-sm;
        background: rgba($warning-color, 0.1);
        padding: 2px 6px;
        border-radius: $border-radius-sm;
    }

    &__avatar-link {
        flex-shrink: 0;
    }

    &__body {
        flex: 1;
        min-width: 0;
    }

    &__bubble {
        display: inline-block;
        background: $gray-50;
        border-radius: $border-radius-lg;
        padding: $spacing-sm $spacing-md;
        max-width: 100%;
        transition: background $transition-instant;

        &:hover {
            background: $gray-100;
        }
    }

    &__author {
        display: inline;
        font-weight: $font-weight-semibold;
        font-size: $font-size-sm;
        color: $text-primary;
        margin-right: $spacing-xs;

        &:hover {
            text-decoration: underline;
        }
    }

    &__text {
        font-size: $font-size-md;
        line-height: $line-height-normal;
        word-wrap: break-word;
        display: inline;

        :deep(a) {
            color: $text-link;
        }

        :deep(p) {
            margin: 0;
            display: inline;
        }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        margin-top: $spacing-xs;
        padding-left: $spacing-md;
        font-size: $font-size-xs;
    }

    &__action {
        @include button-reset;
        color: $text-secondary;
        font-weight: $font-weight-semibold;
        transition: color $transition-instant;

        &:hover {
            text-decoration: underline;
        }

        &--active {
            color: $primary-color;
        }

        &--delete {
            color: $text-tertiary;

            &:hover {
                color: $danger-color;
            }
        }
    }

    &__reactions {
        color: $text-secondary;
        font-size: $font-size-xs;
        display: flex;
        align-items: center;
        gap: 2px;
    }

    &__reply-form {
        margin-top: $spacing-sm;
    }

    &__view-replies {
        @include button-reset;
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        margin-top: $spacing-sm;
        padding-left: $spacing-md;
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        transition: color $transition-instant;

        &:hover {
            color: $text-primary;
            text-decoration: underline;
        }

        svg {
            transition: transform $transition-fast;
        }
    }

    &__replies {
        margin-top: $spacing-md;
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
        position: relative;

        // Vertical connecting line
        &::before {
            content: '';
            position: absolute;
            left: calc(-#{$spacing-md} - 1px);
            top: -$spacing-md;
            bottom: $spacing-lg;
            width: 2px;
            background: $gray-200;
            border-radius: 1px;
        }
    }
}
</style>
