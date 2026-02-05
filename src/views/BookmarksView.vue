<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { Feed, FeedsResponse } from '@/api/types';
import { useAuthStore } from '@/stores';
import FeedItem from '@/components/feed/FeedItem.vue';

const router = useRouter();
const authStore = useAuthStore();

const bookmarks = ref<Feed[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);

async function fetchBookmarks(page = 1, append = false): Promise<void> {
    if (page === 1) {
        loading.value = true;
    } else {
        loadingMore.value = true;
    }

    try {
        const response = await api.get<FeedsResponse>('feeds/bookmarks', {
            page,
            per_page: 10,
        });

        if (append) {
            bookmarks.value = [...bookmarks.value, ...response.feeds.data];
        } else {
            bookmarks.value = response.feeds.data;
        }

        hasMore.value = response.feeds.has_more;
        currentPage.value = response.feeds.current_page;
    } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

function loadMore(): void {
    if (!loadingMore.value && hasMore.value) {
        fetchBookmarks(currentPage.value + 1, true);
    }
}

function goBack(): void {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push('/');
    }
}

onMounted(() => {
    if (!authStore.isLoggedIn) {
        router.push('/');
        return;
    }
    fetchBookmarks();
});
</script>

<template>
    <div class="fcom-mf-bookmarks-view">
        <!-- Header -->
        <div class="fcom-mf-page-header">
            <button @click="goBack" class="fcom-mf-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>

            <div class="fcom-mf-page-header__content">
                <h1>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    Saved Posts
                </h1>
                <p>Posts you've bookmarked for later</p>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-bookmarks-loading">
            <div v-for="i in 3" :key="i" class="fcom-mf-feed-skeleton">
                <div class="fcom-mf-feed-skeleton__header">
                    <div class="fcom-mf-feed-skeleton__avatar"></div>
                    <div class="fcom-mf-feed-skeleton__meta">
                        <div class="fcom-mf-feed-skeleton__name"></div>
                        <div class="fcom-mf-feed-skeleton__time"></div>
                    </div>
                </div>
                <div class="fcom-mf-feed-skeleton__content">
                    <div class="fcom-mf-feed-skeleton__line"></div>
                    <div class="fcom-mf-feed-skeleton__line" style="width: 80%"></div>
                    <div class="fcom-mf-feed-skeleton__line" style="width: 60%"></div>
                </div>
            </div>
        </div>

        <!-- Bookmarks List -->
        <div v-else class="fcom-mf-bookmarks-list">
            <FeedItem
                v-for="feed in bookmarks"
                :key="feed.id"
                :feed="feed"
            />
        </div>

        <!-- Load More -->
        <div v-if="!loading && hasMore" class="fcom-mf-load-more">
            <button
                class="fcom-mf-btn fcom-mf-btn--outline"
                :disabled="loadingMore"
                @click="loadMore"
            >
                <span v-if="loadingMore">Loading...</span>
                <span v-else>Load More</span>
            </button>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && bookmarks.length === 0" class="fcom-mf-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>No saved posts yet</h2>
            <p>When you bookmark posts, they'll show up here for easy access.</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="router.push('/')">
                Explore Feed
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-bookmarks-view {
    width: 100%;
}

.fcom-mf-page-header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    background: $white;
    padding: $spacing-lg;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-lg;

    &__content {
        flex: 1;

        h1 {
            display: flex;
            align-items: center;
            gap: $spacing-sm;
            font-size: $font-size-xl;
            font-weight: $font-weight-bold;
            color: $text-primary;
            margin: 0 0 $spacing-xs;

            svg {
                color: var(--fcom-mf-primary, #1877f2);
            }
        }

        p {
            font-size: $font-size-sm;
            color: $text-secondary;
            margin: 0;
        }
    }
}

.fcom-mf-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: $gray-100;
    border-radius: $border-radius-full;
    color: $text-primary;
    cursor: pointer;
    transition: background-color $transition-fast;
    flex-shrink: 0;

    &:hover {
        background: $gray-200;
    }
}

.fcom-mf-bookmarks-loading {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-feed-skeleton {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-lg;
    box-shadow: $shadow-sm;

    &__header {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        margin-bottom: $spacing-md;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__meta {
        flex: 1;
    }

    &__name {
        height: 16px;
        width: 40%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-xs;
    }

    &__time {
        height: 12px;
        width: 25%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__content {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
    }

    &__line {
        height: 14px;
        width: 100%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-bookmarks-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-load-more {
    text-align: center;
    margin-top: $spacing-lg;
}

.fcom-mf-btn {
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;

    &--primary {
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;

        &:hover {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover {
            background: $gray-50;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }
}

.fcom-mf-empty-state {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-lg;
    }

    h2 {
        font-size: $font-size-xl;
        color: $text-primary;
        margin: 0 0 $spacing-sm;
    }

    p {
        color: $text-secondary;
        margin: 0 0 $spacing-lg;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
