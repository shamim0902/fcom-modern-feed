<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFeedStore, useAuthStore, useUiStore } from '@/stores';
import type { Feed } from '@/api/types';
import FeedAuthor from './FeedAuthor.vue';
import FeedMedia from './FeedMedia.vue';
import FeedActions from './FeedActions.vue';
import CommentList from '../comments/CommentList.vue';
import TimeAgo from '../common/TimeAgo.vue';

const props = defineProps<{
    feed: Feed;
    isSticky?: boolean;
    showFullContent?: boolean;
    showCommentsInline?: boolean;
}>();

const router = useRouter();

const feedStore = useFeedStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

const showComments = ref(false);
const expanded = ref(false);
const isLiking = ref(false);
const showMenu = ref(false);
const isDeleting = ref(false);

const contentIsLong = computed(() => {
    return props.feed.message_rendered.length > 500;
});

const displayContent = computed(() => {
    // Show full content in single post view
    if (props.showFullContent || expanded.value || !contentIsLong.value) {
        return props.feed.message_rendered;
    }
    // Find a good break point
    const text = props.feed.message_rendered;
    let breakPoint = text.lastIndexOf(' ', 500);
    if (breakPoint === -1) breakPoint = 500;
    return text.substring(0, breakPoint) + '...';
});

// Navigation to single post
function navigateToPost(): void {
    router.push({ name: 'single-post', params: { id: props.feed.id } });
}

const hasMedia = computed(() => {
    return (props.feed.meta?.media_items?.length ?? 0) > 0;
});

const hasEmbed = computed(() => {
    return !!props.feed.meta?.media_preview?.html;
});

// Reaction display for stats bar
const reactionEmojis = ['👍', '❤️', '😂'];

const reactionText = computed(() => {
    const count = props.feed.reactions_count;
    if (count === 0) return '';

    if (props.feed.has_user_react) {
        if (count === 1) return 'You';
        return uiStore.t('youAndOthers', count - 1);
    }

    return count.toString();
});

const commentsText = computed(() => {
    const count = props.feed.comments_count;
    if (count === 0) return '';
    return uiStore.t('comments', count);
});

async function handleReact(type: string = 'like'): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (isLiking.value) return;

    isLiking.value = true;
    try {
        await feedStore.toggleReaction(props.feed.id, type);
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    } finally {
        isLiking.value = false;
    }
}

function toggleComments(): void {
    showComments.value = !showComments.value;

    // Fetch comments if not already loaded
    if (showComments.value && !props.feed.comments) {
        feedStore.fetchComments(props.feed.id);
    }
}

function handleShare(): void {
    if (navigator.share) {
        navigator.share({
            title: props.feed.title || 'Check this out',
            url: props.feed.permalink,
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(props.feed.permalink);
        uiStore.showSuccess('Link copied to clipboard');
    }
}

// Menu actions
const isOwnPost = computed(() => {
    // Convert both to numbers for comparison to avoid type mismatch
    const currentUserId = Number(authStore.userId);
    const postUserId = Number(props.feed.user_id);
    return authStore.isLoggedIn && currentUserId > 0 && currentUserId === postUserId;
});

const isBookmarked = computed(() => {
    return props.feed.bookmarked ?? false;
});

const isPinned = computed(() => {
    return props.feed.is_sticky === 1;
});

const isPinnedToSidebar = computed(() => {
    return (props.feed.priority || 0) > 0;
});

const hasPreview = computed(() => {
    return !!props.feed.meta?.media_preview;
});

const commentsDisabled = computed(() => {
    return props.feed.meta?.comments_disabled === 'yes';
});

const hasSpaceContext = computed(() => {
    return !!props.feed.space_id;
});

function toggleMenu(): void {
    showMenu.value = !showMenu.value;
}

function closeMenu(): void {
    showMenu.value = false;
}

async function handleRefresh(): Promise<void> {
    try {
        await feedStore.fetchSinglePost(props.feed.id);
        uiStore.showSuccess('Post refreshed');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
    closeMenu();
}

function copyLink(): void {
    navigator.clipboard.writeText(props.feed.permalink);
    uiStore.showSuccess('Link copied to clipboard');
    closeMenu();
}

async function toggleBookmark(): Promise<void> {
    if (!authStore.requireAuth()) return;
    closeMenu();

    const wasBookmarked = isBookmarked.value;
    try {
        await feedStore.toggleBookmark(props.feed.id);
        uiStore.showSuccess(wasBookmarked ? 'Removed from saved' : 'Saved');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handlePinToTop(): Promise<void> {
    if (!hasSpaceContext.value) {
        uiStore.showError('Pin to top is only available for space posts');
        closeMenu();
        return;
    }
    closeMenu();

    const wasPinned = isPinned.value;
    try {
        await feedStore.togglePinToTop(props.feed.id);
        uiStore.showSuccess(wasPinned ? 'Unpinned from top' : 'Pinned to top');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handlePinToSidebar(): Promise<void> {
    if (!hasSpaceContext.value) {
        uiStore.showError('Pin to sidebar is only available for space posts');
        closeMenu();
        return;
    }
    closeMenu();

    const wasPinnedToSidebar = isPinnedToSidebar.value;
    try {
        await feedStore.togglePinToSidebar(props.feed.id);
        uiStore.showSuccess(wasPinnedToSidebar ? 'Unpinned from sidebar' : 'Pinned to sidebar');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handleRemovePreview(): Promise<void> {
    if (!confirm('Are you sure you want to remove the preview?')) {
        closeMenu();
        return;
    }
    closeMenu();

    try {
        await feedStore.removePreview(props.feed.id);
        uiStore.showSuccess('Preview removed');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handleToggleComments(): Promise<void> {
    closeMenu();

    const wasDisabled = commentsDisabled.value;
    try {
        await feedStore.toggleFeedComments(props.feed.id);
        uiStore.showSuccess(wasDisabled ? 'Comments enabled' : 'Comments disabled');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    }
}

async function handleDelete(): Promise<void> {
    if (!confirm('Are you sure you want to delete this post?')) {
        closeMenu();
        return;
    }

    isDeleting.value = true;
    try {
        await feedStore.deleteFeed(props.feed.id);
        uiStore.showSuccess('Post deleted');
    } catch (error) {
        uiStore.showError(uiStore.t('errorOccurred'));
    } finally {
        isDeleting.value = false;
    }
    closeMenu();
}

function handleEdit(): void {
    // Navigate to edit or open edit modal
    router.push({ name: 'single-post', params: { id: props.feed.id }, query: { edit: '1' } });
    closeMenu();
}
</script>

<template>
    <article class="fcom-mf-feed-item fcom-mf-card" :class="{ 'fcom-mf-feed-item--sticky': isSticky }">
        <!-- Sticky Badge -->
        <div v-if="isSticky" class="fcom-mf-feed-item__sticky-badge">
            📌 Pinned Post
        </div>

        <!-- Header -->
        <header class="fcom-mf-feed-item__header">
            <FeedAuthor :author="feed.xprofile" />
            <div class="fcom-mf-feed-item__meta">
                <TimeAgo :date="feed.created_at" />
                <template v-if="feed.space">
                    <span class="fcom-mf-feed-item__separator">·</span>
                    <a :href="`/portal/space/${feed.space.slug}`" class="fcom-mf-feed-item__space">
                        {{ feed.space.title }}
                    </a>
                </template>
            </div>
            <!-- Menu button with dropdown -->
            <div class="fcom-mf-feed-item__menu-wrapper">
                <button class="fcom-mf-feed-item__menu-btn" @click="toggleMenu">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <circle cx="12" cy="19" r="2"></circle>
                    </svg>
                </button>

                <!-- Dropdown Menu -->
                <Transition name="fcom-mf-dropdown">
                    <div v-if="showMenu" class="fcom-mf-feed-item__menu-dropdown" @click.stop>
                        <!-- Backdrop to close menu -->
                        <div class="fcom-mf-feed-item__menu-backdrop" @click="closeMenu"></div>

                        <div class="fcom-mf-feed-item__menu-content">
                            <!-- Refresh -->
                            <button class="fcom-mf-feed-item__menu-item" @click="handleRefresh">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                <span>Refresh</span>
                            </button>

                            <!-- Copy Link -->
                            <button class="fcom-mf-feed-item__menu-item" @click="copyLink">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                <span>Copy Link</span>
                            </button>

                            <!-- Edit (own posts only) -->
                            <button v-if="isOwnPost" class="fcom-mf-feed-item__menu-item" @click="handleEdit">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <span>Edit</span>
                            </button>

                            <!-- Pin to top (own posts in spaces only) -->
                            <button v-if="isOwnPost && hasSpaceContext" class="fcom-mf-feed-item__menu-item" @click="handlePinToTop">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 17V3"></path>
                                    <path d="m6 11 6 6 6-6"></path>
                                    <path d="M19 21H5"></path>
                                </svg>
                                <span>{{ isPinned ? 'Unpin from top' : 'Pin to top' }}</span>
                            </button>

                            <!-- Pin to sidebar (own posts in spaces only) -->
                            <button v-if="isOwnPost && hasSpaceContext" class="fcom-mf-feed-item__menu-item" @click="handlePinToSidebar">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                </svg>
                                <span>{{ isPinnedToSidebar ? 'Unpin from sidebar' : 'Pin to sidebar' }}</span>
                            </button>

                            <!-- Remove Preview (if has preview) -->
                            <button v-if="isOwnPost && hasPreview" class="fcom-mf-feed-item__menu-item" @click="handleRemovePreview">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                </svg>
                                <span>Remove Preview</span>
                            </button>

                            <!-- Disable/Enable comments (own posts only) -->
                            <button v-if="isOwnPost" class="fcom-mf-feed-item__menu-item" @click="handleToggleComments">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    <line v-if="!commentsDisabled" x1="9" y1="10" x2="15" y2="10"></line>
                                </svg>
                                <span>{{ commentsDisabled ? 'Enable comments' : 'Disable comments' }}</span>
                            </button>

                            <!-- Save/Bookmark -->
                            <button class="fcom-mf-feed-item__menu-item" @click="toggleBookmark">
                                <svg width="20" height="20" viewBox="0 0 24 24" :fill="isBookmarked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <span>{{ isBookmarked ? 'Unsave' : 'Save' }}</span>
                            </button>

                            <!-- Divider before danger zone -->
                            <div v-if="isOwnPost" class="fcom-mf-feed-item__menu-divider"></div>

                            <!-- Delete (own posts only) -->
                            <button v-if="isOwnPost" class="fcom-mf-feed-item__menu-item fcom-mf-feed-item__menu-item--danger" @click="handleDelete">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </header>

        <!-- Title -->
        <h2 v-if="feed.title" class="fcom-mf-feed-item__title">
            <a @click.prevent="navigateToPost" :href="`/post/${feed.id}`">{{ feed.title }}</a>
        </h2>

        <!-- Content -->
        <div
            class="fcom-mf-feed-item__content"
            :class="{ 'fcom-mf-feed-item__content--clickable': !showFullContent }"
            @click="!showFullContent && navigateToPost()"
            v-html="displayContent"
        ></div>

        <!-- See More/Less -->
        <button
            v-if="contentIsLong && !showFullContent"
            class="fcom-mf-feed-item__toggle"
            @click="expanded = !expanded"
        >
            {{ expanded ? uiStore.t('seeLess') : uiStore.t('seeMore') }}
        </button>

        <!-- Media Gallery -->
        <FeedMedia
            v-if="hasMedia"
            :items="feed.meta!.media_items!"
        />

        <!-- OEmbed Preview -->
        <div
            v-if="hasEmbed"
            class="fcom-mf-feed-item__embed"
            v-html="feed.meta!.media_preview!.html"
        ></div>

        <!-- Topics/Tags -->
        <div v-if="feed.terms?.length" class="fcom-mf-feed-item__topics">
            <a
                v-for="term in feed.terms"
                :key="term.slug"
                :href="`?topic=${term.slug}`"
                class="fcom-mf-feed-item__topic"
            >
                #{{ term.title }}
            </a>
        </div>

        <!-- Stats Bar -->
        <div v-if="reactionText || commentsText" class="fcom-mf-feed-item__stats">
            <span v-if="reactionText" class="fcom-mf-feed-item__stat">
                <span class="fcom-mf-feed-item__stat-emojis">
                    <span v-for="(emoji, idx) in reactionEmojis.slice(0, Math.min(3, feed.reactions_count))" :key="idx" class="fcom-mf-feed-item__stat-emoji">{{ emoji }}</span>
                </span>
                {{ reactionText }}
            </span>
            <button
                v-if="commentsText"
                class="fcom-mf-feed-item__stat fcom-mf-feed-item__stat--clickable"
                @click="toggleComments"
            >
                {{ commentsText }}
            </button>
        </div>

        <!-- Divider -->
        <!-- <div class="fcom-mf-divider"></div> -->

        <!-- Actions -->
        <FeedActions
            :feed="feed"
            :is-liking="isLiking"
            @react="handleReact"
            @comment="toggleComments"
            @share="handleShare"
        />

        <!-- Comments Section -->
        <CommentList
            v-if="showComments || showCommentsInline"
            :feed-id="feed.id"
            :comments="feed.comments || []"
            :sticky-comment="feed.sticky_comment"
            :show-all="showCommentsInline"
        />
    </article>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-feed-item {
    padding: 0;
    transition: box-shadow $transition-normal;

    &:hover {
        box-shadow: $shadow-card-hover;

        .fcom-mf-feed-item__menu-btn {
            opacity: 1;
        }
    }

    &--sticky {
        border: 2px solid $primary-color;
    }

    &__sticky-badge {
        padding: $spacing-xs $spacing-md;
        background: rgba($primary-color, 0.1);
        color: $primary-color;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        border-bottom: 1px solid $border-color;
    }

    &__header {
        display: flex;
        align-items: flex-start;
        gap: $spacing-sm;
        padding: $spacing-md;
        padding-bottom: 0;
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-xs;
        color: $text-secondary;
        line-height: 1.3;
    }

    &__separator {
        color: $text-tertiary;
    }

    &__space {
        color: $text-secondary;

        &:hover {
            text-decoration: underline;
        }
    }

    &__menu-wrapper {
        position: relative;
        margin-left: auto;
        flex-shrink: 0;
    }

    &__menu-btn {
        @include button-reset;
        @include hover-bg;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        color: $text-tertiary;
        opacity: 0;
        transition: opacity $transition-fast;

        @media (max-width: $breakpoint-md) {
            opacity: 1; // Always show on mobile
        }
    }

    &__menu-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: $z-dropdown;
        padding-top: $spacing-xs;
    }

    &__menu-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
    }

    &__menu-content {
        min-width: 200px;
        background: $white;
        border-radius: $border-radius-md;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        padding: $spacing-xs 0;
        overflow: hidden;
    }

    &__menu-item {
        @include button-reset;
        width: 100%;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-sm;
        color: $text-primary;
        text-align: left;
        transition: background-color $transition-instant;

        &:hover {
            background: $bg-hover;
        }

        svg {
            flex-shrink: 0;
            color: $text-secondary;
        }

        &--danger {
            color: $danger-color;

            svg {
                color: $danger-color;
            }

            &:hover {
                background: rgba($danger-color, 0.1);
            }
        }
    }

    &__menu-divider {
        height: 1px;
        background: $border-color;
        margin: $spacing-xs 0;
    }

    &__title {
        margin: 0;
        padding: $spacing-sm $spacing-md 0;
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        line-height: $line-height-tight;

        a {
            color: inherit;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__content {
        padding: $spacing-xs $spacing-md $spacing-sm;
        font-size: $font-size-md;
        line-height: $line-height-relaxed;
        word-wrap: break-word;

        &--clickable {
            cursor: pointer;
        }

        :deep(a) {
            color: $text-link;
        }

        :deep(p) {
            margin: 0 0 $spacing-sm;

            &:last-child {
                margin-bottom: 0;
            }
        }

        :deep(img) {
            max-width: 100%;
            border-radius: $border-radius-sm;
        }

        :deep(blockquote) {
            margin: $spacing-md 0;
            padding-left: $spacing-lg;
            border-left: 3px solid $border-color;
            color: $text-secondary;
        }

        :deep(pre) {
            background: $gray-50;
            padding: $spacing-md;
            border-radius: $border-radius-sm;
            overflow-x: auto;
        }

        :deep(code) {
            background: $gray-100;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        :deep(pre code) {
            background: none;
            padding: 0;
        }
    }

    &__toggle {
        @include button-reset;
        padding: 0 $spacing-md;
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;

        &:hover {
            text-decoration: underline;
        }
    }

    &__embed {
        margin: $spacing-sm $spacing-md;

        :deep(iframe) {
            max-width: 100%;
            border-radius: $border-radius-sm;
        }
    }

    &__topics {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-xs;
        padding: $spacing-xs $spacing-md;
    }

    &__topic {
        color: $text-link;
        font-size: $font-size-xs;

        &:hover {
            text-decoration: underline;
        }
    }

    &__stats {
        display: flex;
        justify-content: space-between;
        padding: $spacing-xs $spacing-md;
        font-size: $font-size-xs;
        color: $text-secondary;
    }

    &__stat {
        display: flex;
        align-items: center;
        gap: $spacing-xs;

        &--clickable {
            @include button-reset;
            cursor: pointer;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__stat-emojis {
        display: flex;
        align-items: center;
    }

    &__stat-emoji {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        font-size: 11px;
        background: $white;
        border: 2px solid $white;
        border-radius: $border-radius-full;
        margin-right: -4px;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);

        &:last-child {
            margin-right: $spacing-xs;
        }
    }

    &__stat-icon {
        font-size: $font-size-sm;
    }

    .fcom-mf-divider {
        margin: 0 $spacing-md;
    }
}

// Dropdown transition
.fcom-mf-dropdown-enter-active {
    animation: dropdown-in 0.15s ease-out;
}

.fcom-mf-dropdown-leave-active {
    animation: dropdown-out 0.1s ease-in;
}

@keyframes dropdown-in {
    0% {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
    }
    100% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes dropdown-out {
    0% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    100% {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
    }
}
</style>
