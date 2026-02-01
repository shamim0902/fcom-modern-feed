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
            <!-- Menu button placeholder -->
            <button class="fcom-mf-feed-item__menu-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                </svg>
            </button>
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
        <div class="fcom-mf-divider"></div>

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
        padding: $spacing-sm $spacing-lg;
        background: rgba($primary-color, 0.1);
        color: $primary-color;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        border-bottom: 1px solid $border-color;
    }

    &__header {
        display: flex;
        align-items: flex-start;
        gap: $spacing-md;
        padding: $spacing-lg;
        padding-bottom: 0;
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        margin-top: $spacing-xs;
        font-size: $font-size-sm;
        color: $text-secondary;
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

    &__menu-btn {
        @include button-reset;
        @include hover-bg;
        margin-left: auto;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        color: $text-secondary;
        opacity: 0;
        transition: opacity $transition-fast;

        @media (max-width: $breakpoint-md) {
            opacity: 1; // Always show on mobile
        }
    }

    &__title {
        margin: 0;
        padding: $spacing-md $spacing-lg 0;
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
        padding: $spacing-md $spacing-lg;
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
        padding: 0 $spacing-lg;
        color: $text-secondary;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;

        &:hover {
            text-decoration: underline;
        }
    }

    &__embed {
        margin: $spacing-md $spacing-lg;

        :deep(iframe) {
            max-width: 100%;
            border-radius: $border-radius-sm;
        }
    }

    &__topics {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;
        padding: $spacing-sm $spacing-lg;
    }

    &__topic {
        color: $text-link;
        font-size: $font-size-sm;

        &:hover {
            text-decoration: underline;
        }
    }

    &__stats {
        display: flex;
        justify-content: space-between;
        padding: $spacing-sm $spacing-lg;
        font-size: $font-size-sm;
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
        width: 18px;
        height: 18px;
        font-size: 12px;
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
        font-size: $font-size-md;
    }

    .fcom-mf-divider {
        margin: 0 $spacing-lg;
    }
}
</style>
