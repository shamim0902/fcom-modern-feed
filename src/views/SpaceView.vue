<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { SpaceFull, Feed, FeedsResponse } from '@/api/types';
import { useAuthStore } from '@/stores';
import FeedItem from '@/components/feed/FeedItem.vue';
import CreatePost from '@/components/feed/CreatePost.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const space = ref<SpaceFull | null>(null);
const feeds = ref<Feed[]>([]);
const loading = ref(true);
const loadingFeeds = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const activeTab = ref<'posts' | 'about' | 'members'>('posts');
const error = ref<string | null>(null);

const spaceSlug = computed(() => route.params.slug as string);

async function fetchSpace(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
        const response = await api.get<{ space: SpaceFull }>(`spaces/${spaceSlug.value}/by-slug`);
        space.value = response.space;
        await fetchFeeds();
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to load space';
    } finally {
        loading.value = false;
    }
}

async function fetchFeeds(page = 1, append = false): Promise<void> {
    if (!space.value) return;

    loadingFeeds.value = true;
    try {
        const response = await api.get<FeedsResponse>('feeds', {
            space: space.value.slug,
            page,
            per_page: 10,
        });

        if (append) {
            feeds.value = [...feeds.value, ...response.feeds.data];
        } else {
            feeds.value = response.feeds.data;
        }

        hasMore.value = response.feeds.has_more;
        currentPage.value = response.feeds.current_page;
    } catch (e) {
        console.error('Failed to fetch feeds:', e);
    } finally {
        loadingFeeds.value = false;
    }
}

function loadMoreFeeds(): void {
    if (!loadingFeeds.value && hasMore.value) {
        fetchFeeds(currentPage.value + 1, true);
    }
}

async function joinSpace(): Promise<void> {
    if (!authStore.isLoggedIn || !space.value) return;

    try {
        await api.post(`spaces/${space.value.slug}/join`);
        space.value.is_member = true;
        space.value.members_count++;
    } catch (e) {
        console.error('Failed to join space:', e);
    }
}

async function leaveSpace(): Promise<void> {
    if (!authStore.isLoggedIn || !space.value) return;

    try {
        await api.post(`spaces/${space.value.slug}/leave`);
        space.value.is_member = false;
        space.value.members_count--;
    } catch (e) {
        console.error('Failed to leave space:', e);
    }
}

function handlePostCreated(feed: Feed): void {
    feeds.value.unshift(feed);
}

function goBack(): void {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push({ name: 'spaces' });
    }
}

onMounted(() => {
    fetchSpace();
});

watch(() => route.params.slug, () => {
    fetchSpace();
});

function formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
</script>

<template>
    <div class="fcom-mf-space-view">
        <!-- Back Button -->
        <div class="fcom-mf-space-view__back">
            <button @click="goBack" class="fcom-mf-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span>Back to Spaces</span>
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-space-loading">
            <div class="fcom-mf-space-skeleton__header"></div>
            <div class="fcom-mf-space-skeleton__content">
                <div class="fcom-mf-space-skeleton__logo"></div>
                <div class="fcom-mf-space-skeleton__info">
                    <div class="fcom-mf-space-skeleton__title"></div>
                    <div class="fcom-mf-space-skeleton__desc"></div>
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="fcom-mf-error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>{{ error }}</h2>
            <p>The space you're looking for might have been removed or is not available.</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back
            </button>
        </div>

        <!-- Space Content -->
        <template v-else-if="space">
            <!-- Cover & Header -->
            <div class="fcom-mf-space-header">
                <div
                    class="fcom-mf-space-header__cover"
                    :style="{ backgroundImage: space.cover ? `url(${space.cover})` : undefined }"
                ></div>

                <div class="fcom-mf-space-header__content">
                    <div class="fcom-mf-space-header__logo-wrapper">
                        <img
                            v-if="space.logo"
                            :src="space.logo"
                            :alt="space.title"
                            class="fcom-mf-space-header__logo"
                        />
                        <div v-else class="fcom-mf-space-header__logo-placeholder">
                            {{ space.title.charAt(0) }}
                        </div>
                    </div>

                    <div class="fcom-mf-space-header__info">
                        <h1 class="fcom-mf-space-header__title">
                            {{ space.title }}
                            <span v-if="space.privacy === 'private'" class="fcom-mf-space-header__privacy">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </span>
                        </h1>

                        <div class="fcom-mf-space-header__stats">
                            <span>{{ formatNumber(space.members_count) }} members</span>
                            <span v-if="space.posts_count">{{ formatNumber(space.posts_count) }} posts</span>
                        </div>
                    </div>

                    <div v-if="authStore.isLoggedIn" class="fcom-mf-space-header__actions">
                        <button
                            class="fcom-mf-btn"
                            :class="space.is_member ? 'fcom-mf-btn--secondary' : 'fcom-mf-btn--primary'"
                            @click="space.is_member ? leaveSpace() : joinSpace()"
                        >
                            {{ space.is_member ? 'Leave Space' : 'Join Space' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="fcom-mf-space-tabs">
                <button
                    class="fcom-mf-space-tab"
                    :class="{ 'fcom-mf-space-tab--active': activeTab === 'posts' }"
                    @click="activeTab = 'posts'"
                >
                    Posts
                </button>
                <button
                    class="fcom-mf-space-tab"
                    :class="{ 'fcom-mf-space-tab--active': activeTab === 'about' }"
                    @click="activeTab = 'about'"
                >
                    About
                </button>
            </div>

            <!-- Posts Tab -->
            <div v-if="activeTab === 'posts'" class="fcom-mf-space-posts">
                <!-- Create Post -->
                <CreatePost
                    v-if="authStore.isLoggedIn && space.is_member"
                    :space-id="space.id"
                    @post-created="handlePostCreated"
                />

                <!-- Feed Items -->
                <div v-if="feeds.length > 0" class="fcom-mf-space-feed">
                    <FeedItem
                        v-for="feed in feeds"
                        :key="feed.id"
                        :feed="feed"
                    />
                </div>

                <!-- Loading More -->
                <div v-if="loadingFeeds" class="fcom-mf-loading-more">
                    <div class="fcom-mf-spinner"></div>
                </div>

                <!-- Load More Button -->
                <div v-if="!loadingFeeds && hasMore" class="fcom-mf-load-more">
                    <button class="fcom-mf-btn fcom-mf-btn--outline" @click="loadMoreFeeds">
                        Load More Posts
                    </button>
                </div>

                <!-- Empty State -->
                <div v-if="!loadingFeeds && feeds.length === 0" class="fcom-mf-empty-posts">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something with this community!</p>
                </div>
            </div>

            <!-- About Tab -->
            <div v-if="activeTab === 'about'" class="fcom-mf-space-about">
                <div class="fcom-mf-about-card">
                    <h3>About this space</h3>
                    <p v-if="space.description">{{ space.description }}</p>
                    <p v-else class="fcom-mf-about-card__empty">No description provided.</p>

                    <div class="fcom-mf-about-card__meta">
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                            <span>{{ formatNumber(space.members_count) }} members</span>
                        </div>
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Created {{ space.created_at }}</span>
                        </div>
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M2 12h20"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                            <span>{{ space.privacy === 'private' ? 'Private space' : 'Public space' }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-space-view {
    width: 100%;

    &__back {
        margin-bottom: $spacing-md;
    }
}

.fcom-mf-back-btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border: none;
    background: $white;
    border-radius: $border-radius-md;
    color: $text-primary;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    cursor: pointer;
    box-shadow: $shadow-sm;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-50;
    }
}

.fcom-mf-space-loading {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-space-skeleton {
    &__header {
        height: 150px;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__content {
        display: flex;
        gap: $spacing-lg;
        padding: $spacing-lg;
        padding-top: 50px;
        position: relative;
    }

    &__logo {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        position: absolute;
        top: -40px;
        left: $spacing-lg;
        border: 4px solid $white;
    }

    &__info {
        flex: 1;
        padding-left: 100px;
    }

    &__title {
        height: 24px;
        width: 50%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-sm;
    }

    &__desc {
        height: 16px;
        width: 30%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-error-state {
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

.fcom-mf-space-header {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-lg;

    &__cover {
        height: 150px;
        background: linear-gradient(135deg, $primary-color 0%, darken($primary-color, 15%) 100%);
        background-size: cover;
        background-position: center;
    }

    &__content {
        display: flex;
        align-items: flex-end;
        gap: $spacing-lg;
        padding: $spacing-lg;
        padding-top: 0;
        position: relative;
    }

    &__logo-wrapper {
        margin-top: -40px;
    }

    &__logo {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        border: 4px solid $white;
        object-fit: cover;
        background: $white;
    }

    &__logo-placeholder {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        border: 4px solid $white;
        background: $primary-color;
        color: $white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: $font-weight-bold;
    }

    &__info {
        flex: 1;
    }

    &__title {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    &__privacy {
        color: $text-tertiary;
    }

    &__stats {
        display: flex;
        gap: $spacing-md;
        font-size: $font-size-sm;
        color: $text-secondary;

        span {
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }

    &__actions {
        flex-shrink: 0;
    }
}

.fcom-mf-space-tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    background: $white;
    padding: $spacing-sm;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
}

.fcom-mf-space-tab {
    flex: 1;
    padding: $spacing-sm $spacing-lg;
    border: none;
    background: transparent;
    border-radius: $border-radius-md;
    color: $text-secondary;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &--active {
        background: $primary-color;
        color: $white;
    }
}

.fcom-mf-space-posts {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-space-feed {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-loading-more {
    text-align: center;
    padding: $spacing-lg;
}

.fcom-mf-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid $gray-200;
    border-top-color: $primary-color;
    border-radius: $border-radius-full;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

.fcom-mf-load-more {
    text-align: center;
    padding: $spacing-lg 0;
}

.fcom-mf-empty-posts {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-md;
    }

    h3 {
        font-size: $font-size-lg;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    p {
        color: $text-secondary;
        margin: 0;
    }
}

.fcom-mf-space-about {
    // About tab content
}

.fcom-mf-about-card {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-xl;
    box-shadow: $shadow-sm;

    h3 {
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-md;
    }

    p {
        color: $text-secondary;
        line-height: $line-height-relaxed;
        margin: 0 0 $spacing-lg;
    }

    &__empty {
        color: $text-tertiary;
        font-style: italic;
    }

    &__meta {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
        padding-top: $spacing-lg;
        border-top: 1px solid $border-color;
    }

    &__item {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
        color: $text-secondary;

        svg {
            color: $text-tertiary;
        }
    }
}

.fcom-mf-btn {
    padding: $spacing-sm $spacing-lg;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;

    &--primary {
        background: $primary-color;
        color: $white;

        &:hover {
            background: $primary-hover;
        }
    }

    &--secondary {
        background: $gray-100;
        color: $text-secondary;

        &:hover {
            background: $gray-200;
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover {
            background: $gray-50;
        }
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
