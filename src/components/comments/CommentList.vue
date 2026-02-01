<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFeedStore, useAuthStore, useUiStore } from '@/stores';
import type { Comment } from '@/api/types';
import CommentItem from './CommentItem.vue';
import CommentForm from './CommentForm.vue';

const props = defineProps<{
    feedId: number;
    comments?: Comment[];
    stickyComment?: Comment;
    showAll?: boolean;
    commentsCount?: number;
}>();

const feedStore = useFeedStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

const isLoading = ref(false);
const isSubmitting = ref(false);
const showAllComments = ref(false);

// Number of comments to show initially
const INITIAL_COMMENTS_COUNT = 3;

// Get feed from store to have reactive comments
const feed = computed(() => feedStore.getFeedById(props.feedId));

// Fetch comments if showAll is true and we don't have them yet
async function fetchCommentsIfNeeded(): Promise<void> {
    if (props.showAll && (!feed.value?.comments || feed.value.comments.length === 0)) {
        isLoading.value = true;
        try {
            await feedStore.fetchComments(props.feedId);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            isLoading.value = false;
        }
    }
}

onMounted(() => {
    fetchCommentsIfNeeded();
});

// Watch for feedId changes
watch(() => props.feedId, () => {
    fetchCommentsIfNeeded();
});

const allComments = computed(() => {
    // Use comments from store (reactive) or props as fallback
    const commentsSource = feed.value?.comments || props.comments || [];
    const comments = [...commentsSource];
    // Add sticky comment at the top if exists and not already in list
    const sticky = feed.value?.sticky_comment || props.stickyComment;
    if (sticky && !comments.find(c => c.id === sticky.id)) {
        comments.unshift(sticky);
    }
    return comments;
});

const displayedComments = computed(() => {
    if (props.showAll || showAllComments.value) {
        return allComments.value;
    }
    return allComments.value.slice(0, INITIAL_COMMENTS_COUNT);
});

const hiddenCommentsCount = computed(() => {
    return Math.max(0, allComments.value.length - INITIAL_COMMENTS_COUNT);
});

const hasMoreComments = computed(() => {
    return !props.showAll && !showAllComments.value && hiddenCommentsCount.value > 0;
});

function showMore(): void {
    showAllComments.value = true;
}

async function handleSubmit(message: string): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (!message.trim() || isSubmitting.value) return;

    isSubmitting.value = true;
    try {
        await feedStore.createComment(props.feedId, { comment: message });
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    } finally {
        isSubmitting.value = false;
    }
}

async function handleReply(parentId: number, message: string): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (!message.trim()) return;

    try {
        await feedStore.createComment(props.feedId, { comment: message, parent_id: parentId });
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handleDelete(commentId: number): Promise<void> {
    try {
        await feedStore.deleteComment(props.feedId, commentId);
        uiStore.showSuccess('Comment deleted');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handleReaction(commentId: number): Promise<void> {
    if (!authStore.requireAuth()) return;

    try {
        await feedStore.toggleCommentReaction(props.feedId, commentId);
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}
</script>

<template>
    <div class="fcom-mf-comments">
        <!-- View More Comments Link (Facebook shows this at TOP) -->
        <button
            v-if="hasMoreComments && !isLoading"
            class="fcom-mf-comments__view-more"
            @click="showMore"
        >
            View {{ hiddenCommentsCount }} more {{ hiddenCommentsCount === 1 ? 'comment' : 'comments' }}
        </button>

        <!-- Loading State -->
        <div v-if="isLoading" class="fcom-mf-comments__loading">
            <span class="fcom-mf-spinner"></span>
        </div>

        <!-- Comments List -->
        <div v-if="!isLoading && displayedComments.length > 0" class="fcom-mf-comments__list">
            <CommentItem
                v-for="comment in displayedComments"
                :key="comment.id"
                :comment="comment"
                :feed-id="feedId"
                :is-sticky="stickyComment?.id === comment.id"
                @reply="handleReply"
                @delete="handleDelete"
                @react="handleReaction"
            />
        </div>

        <!-- Comment Form (Facebook puts this after comments) -->
        <CommentForm
            v-if="authStore.isLoggedIn"
            :is-submitting="isSubmitting"
            :placeholder="uiStore.t('writeComment')"
            @submit="handleSubmit"
        />

        <!-- Empty State -->
        <div v-if="!isLoading && allComments.length === 0 && !authStore.isLoggedIn" class="fcom-mf-comments__empty">
            No comments yet.
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-comments {
    padding: 0 $spacing-md $spacing-md;

    &__loading {
        display: flex;
        justify-content: center;
        padding: $spacing-md;
    }

    &__view-more {
        @include button-reset;
        display: block;
        padding: $spacing-xs 0;
        margin-bottom: $spacing-sm;
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        transition: color $transition-instant;

        &:hover {
            color: $text-primary;
            text-decoration: underline;
        }
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    &__empty {
        text-align: center;
        padding: $spacing-md;
        color: $text-tertiary;
        font-size: $font-size-sm;
    }
}
</style>
