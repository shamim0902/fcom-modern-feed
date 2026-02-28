<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useUiStore } from '@/stores';
import type { Comment } from '@/api/types';
import TimeAgo from '../common/TimeAgo.vue';
import CommentForm from './CommentForm.vue';
import { normalizeRenderedHtmlLinks, resolveInternalAppPath } from '@/utils/linkRouting';

const props = defineProps<{
    comment: Comment;
    feedId: number;
    isSticky?: boolean;
    isReply?: boolean;
    commentsDisabled?: boolean;
}>();

const emit = defineEmits<{
    reply: [parentId: number, message: string];
    edit: [commentId: number, message: string];
    delete: [commentId: number];
    react: [commentId: number];
}>();

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const showReplyForm = ref(false);
const showEditForm = ref(false);
const showReplies = ref(false);
const isSubmittingReply = ref(false);
const isSubmittingEdit = ref(false);

const canEditComment = computed(() => {
    return authStore.canEditComment(props.comment);
});

const canDeleteComment = computed(() => {
    return authStore.canDeleteComment(props.comment);
});

const hasReplies = computed(() => {
    return (props.comment.replies_count ?? 0) > 0 || (props.comment.replies?.length ?? 0) > 0;
});

const repliesCount = computed(() => {
    return props.comment.replies?.length ?? props.comment.replies_count ?? 0;
});

const profilePath = computed(() => {
    return `/u/${props.comment.xprofile.username}`;
});

const renderedMessage = computed(() => {
    return normalizeRenderedHtmlLinks(props.comment.message_rendered || '');
});

async function handleReply(message: string): Promise<void> {
    if (props.commentsDisabled) return;
    if (!message.trim() || isSubmittingReply.value) return;

    isSubmittingReply.value = true;
    try {
        emit('reply', props.comment.id, message);
        showReplyForm.value = false;
    } finally {
        isSubmittingReply.value = false;
    }
}

async function handleEdit(message: string): Promise<void> {
    if (!message.trim() || isSubmittingEdit.value) return;

    isSubmittingEdit.value = true;
    try {
        emit('edit', props.comment.id, message);
        showEditForm.value = false;
    } finally {
        isSubmittingEdit.value = false;
    }
}

function startEdit(): void {
    showEditForm.value = true;
    showReplyForm.value = false;
}

function handleDelete(): void {
    if (confirm('Are you sure you want to delete this comment?')) {
        emit('delete', props.comment.id);
    }
}

function toggleReplies(): void {
    showReplies.value = !showReplies.value;
}

function goToProfile(): void {
    router.push(profilePath.value);
}

function handleTextClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
        return;
    }

    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) {
        return;
    }

    const dataRoute = anchor.getAttribute('data-mf-route');
    if (dataRoute) {
        event.preventDefault();
        router.push(dataRoute);
        return;
    }

    const href = anchor.getAttribute('href');
    if (!href) {
        return;
    }

    const internalPath = resolveInternalAppPath(href);
    if (internalPath) {
        event.preventDefault();
        router.push(internalPath);
    }
}
</script>

<template>
    <div class="fcom-mf-comment" :class="{ 'fcom-mf-comment--reply': isReply, 'fcom-mf-comment--has-replies': showReplies && hasReplies }">
        <!-- Sticky Badge -->
        <div v-if="isSticky" class="fcom-mf-comment__sticky-badge">📌</div>

        <button class="fcom-mf-comment__avatar-link" @click="goToProfile">
            <img
                :src="comment.xprofile.avatar"
                :alt="comment.xprofile.display_name"
                class="fcom-mf-avatar fcom-mf-avatar--sm"
            />
        </button>

        <div class="fcom-mf-comment__body">
            <div class="fcom-mf-comment__bubble-wrapper">
                <div class="fcom-mf-comment__bubble">
                    <button class="fcom-mf-comment__author" @click="goToProfile">
                        {{ comment.xprofile.display_name }}
                    </button>
                    <template v-if="!showEditForm">
                        <div class="fcom-mf-comment__text" @click="handleTextClick" v-html="renderedMessage"></div>
                    </template>
                    <CommentForm
                        v-else
                        :is-submitting="isSubmittingEdit"
                        :initial-value="comment.message"
                        :placeholder="uiStore.t('writeComment')"
                        size="sm"
                        class="fcom-mf-comment__edit-form"
                        @submit="handleEdit"
                        @cancel="showEditForm = false"
                    />
                </div>
                <!-- Reaction Badge (Facebook style - on right of bubble) -->
                <span v-if="comment.reactions_count > 0" class="fcom-mf-comment__reaction-badge">
                    👍
                    <span v-if="comment.reactions_count > 1">{{ comment.reactions_count }}</span>
                </span>
            </div>

            <!-- Actions Row (Facebook: time · Like · Reply) -->
            <div class="fcom-mf-comment__actions">
                <TimeAgo :date="comment.created_at" class="fcom-mf-comment__time" />

                <span class="fcom-mf-comment__action-sep">·</span>

                <button
                    class="fcom-mf-comment__action"
                    :class="{ 'fcom-mf-comment__action--active': comment.has_user_react }"
                    @click="emit('react', comment.id)"
                >
                    {{ uiStore.t('like') }}
                </button>

                <template v-if="!isReply && !commentsDisabled">
                    <span class="fcom-mf-comment__action-sep">·</span>
                    <button
                        class="fcom-mf-comment__action"
                        @click="showReplyForm = !showReplyForm"
                    >
                        {{ uiStore.t('reply') }}
                    </button>
                </template>

                <template v-if="canEditComment || canDeleteComment">
                    <span class="fcom-mf-comment__action-sep">·</span>
                    <button
                        v-if="canEditComment"
                        class="fcom-mf-comment__action"
                        @click="startEdit"
                    >
                        {{ uiStore.t('edit') }}
                    </button>

                    <span v-if="canDeleteComment && canEditComment" class="fcom-mf-comment__action-sep">·</span>
                    <button
                        v-if="canDeleteComment"
                        class="fcom-mf-comment__action fcom-mf-comment__action--delete"
                        @click="handleDelete"
                    >
                        {{ uiStore.t('delete') }}
                    </button>
                </template>
            </div>

            <!-- Reply Form -->
            <CommentForm
                v-if="showReplyForm && !commentsDisabled"
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
                    <path d="M17 8l-5 5-5-5" :transform="showReplies ? 'rotate(180 12 12)' : ''"/>
                </svg>
                {{ showReplies ? 'Hide replies' : `View ${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}` }}
            </button>

            <!-- Nested Replies -->
            <div v-if="showReplies && comment.replies?.length" class="fcom-mf-comment__replies">
                <CommentItem
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    :comment="reply"
                    :feed-id="feedId"
                    :is-reply="true"
                    :comments-disabled="commentsDisabled"
                    @reply="(parentId, message) => emit('reply', parentId, message)"
                    @edit="(id, message) => emit('edit', id, message)"
                    @delete="(id) => emit('delete', id)"
                    @react="(id) => emit('react', id)"
                />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-comment {
    display: flex;
    gap: $spacing-sm;
    position: relative;

    // Reply comments are indented
    &--reply {
        // Smaller avatar for replies
        .fcom-mf-avatar--sm {
            width: 24px;
            height: 24px;
        }

        .fcom-mf-comment__bubble {
            padding: $spacing-xs $spacing-sm;
        }

        .fcom-mf-comment__author {
            font-size: $font-size-xs;
        }

        .fcom-mf-comment__text {
            font-size: $font-size-sm;
        }
    }

    &__sticky-badge {
        position: absolute;
        top: -$spacing-xs;
        right: $spacing-sm;
        font-size: $font-size-xs;
    }

    &__avatar-link {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }

    &__body {
        flex: 1;
        min-width: 0;
    }

    &__bubble-wrapper {
        display: inline-flex;
        align-items: flex-end;
        gap: $spacing-xs;
        max-width: 100%;
    }

    &__bubble {
        display: inline-block;
        background: $gray-100;
        border-radius: $border-radius-lg;
        padding: $spacing-sm $spacing-md;
        max-width: 100%;
    }

    &__author {
        display: block;
        font-weight: $font-weight-semibold;
        font-size: $font-size-sm;
        color: $text-primary;
        line-height: 1.2;
        margin-bottom: 2px;
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    &__text {
        font-size: $font-size-md;
        line-height: $line-height-normal;
        word-wrap: break-word;
        color: $text-primary;

        :deep(a) {
            color: $text-link;
        }

        :deep(p) {
            margin: 0;
        }
    }

    &__reaction-badge {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        background: $white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        margin-bottom: $spacing-xs;
        flex-shrink: 0;

        span {
            font-size: $font-size-xs;
            color: $text-secondary;
        }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        margin-top: 2px;
        padding-left: $spacing-md;
        font-size: $font-size-xs;
        color: $text-secondary;
    }

    &__edit-form {
        margin-top: $spacing-xs;
    }

    &__time {
        color: $text-tertiary;
    }

    &__action-sep {
        color: $text-tertiary;
    }

    &__action {
        @include button-reset;
        color: $text-secondary;
        font-weight: $font-weight-semibold;
        font-size: $font-size-xs;
        transition: color $transition-instant;

        &:hover {
            text-decoration: underline;
        }

        &--active {
            color: var(--fcom-mf-primary, #1877f2);
        }

        &--delete {
            color: $text-tertiary;

            &:hover {
                color: $danger-color;
                text-decoration: underline;
            }
        }
    }

    &__reply-form {
        margin-top: $spacing-sm;
    }

    &__view-replies {
        @include button-reset;
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        margin-top: $spacing-sm;
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

    // Replies container - indented under parent
    &__replies {
        margin-top: $spacing-sm;
        margin-left: $spacing-xl + $spacing-sm; // Indent past parent avatar
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
        position: relative;
        padding-left: $spacing-md;
        border-left: 2px solid $gray-200;
    }
}
</style>
