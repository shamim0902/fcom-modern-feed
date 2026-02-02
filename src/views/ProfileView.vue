<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { Profile, ProfileResponse, Feed, FeedsResponse } from '@/api/types';
import { useAuthStore, useUiStore } from '@/stores';
import FeedItem from '@/components/feed/FeedItem.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const profile = ref<Profile | null>(null);
const feeds = ref<Feed[]>([]);
const loading = ref(true);
const loadingFeeds = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const activeTab = ref<'posts' | 'about' | 'spaces'>('posts');
const error = ref<string | null>(null);
const followLoading = ref(false);

const username = computed(() => route.params.username as string);

const isFollowersEnabled = computed(() => {
    return window.fcomModernFeed?.features?.followersModule ?? false;
});

const isOwnProfile = computed(() => {
    if (!profile.value || !authStore.isLoggedIn) return false;
    return profile.value.user_id === authStore.userId;
});

function navigateToEditProfile(): void {
    if (profile.value) {
        router.push(`/u/${profile.value.username}/edit`);
    }
}

function navigateToNotificationSettings(): void {
    if (!profile.value) return;
    router.push({ name: 'notification-settings', params: { username: profile.value.username } });
}

function navigateToMembers(): void {
    router.push({ name: 'members' });
}

async function fetchProfile(): Promise<void> {
    console.log('Fetching profile for username:', username.value);

    if (!username.value) {
        error.value = 'No username provided';
        loading.value = false;
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const encodedUsername = encodeURIComponent(username.value);
        console.log('API call to:', `profile/${encodedUsername}`);
        const response = await api.get<ProfileResponse>(`profile/${encodedUsername}`);
        const raw = response.profile as Profile & { follow?: number; is_following?: boolean };
        // Backend (Pro) returns is_following when logged in; else derive from follow (level: 0=blocked, 1/2=following)
        const isFollowing =
            raw.is_following === true ||
            (raw.follow !== undefined && raw.follow !== null && Number(raw.follow) > 0);
        profile.value = { ...raw, is_following: isFollowing };
        if (response.feeds?.data) {
            feeds.value = response.feeds.data;
            hasMore.value = response.feeds.has_more;
        } else {
            await fetchFeeds();
        }
    } catch (e: unknown) {
        console.error('Profile fetch error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to load profile';
        }
    } finally {
        loading.value = false;
    }
}

async function fetchFeeds(page = 1, append = false): Promise<void> {
    if (!profile.value) return;

    loadingFeeds.value = true;
    try {
        const response = await api.get<FeedsResponse>('feeds', {
            user_id: profile.value.user_id,
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

async function toggleFollow(): Promise<void> {
    if (!profile.value) return;
    if (!authStore.requireAuth()) return;
    if (followLoading.value) return;

    followLoading.value = true;
    try {
        // FluentCommunity uses separate follow/unfollow endpoints with username
        const endpoint = profile.value.is_following
            ? `profile/${profile.value.username}/unfollow`
            : `profile/${profile.value.username}/follow`;
        const response = await api.post<{ message?: string; followers_count?: number }>(endpoint);
        const isNowFollowing = !profile.value.is_following;
        profile.value.is_following = isNowFollowing;
        if (response.followers_count !== undefined) {
            profile.value.followers_count = response.followers_count;
        } else if (isNowFollowing) {
            profile.value.followers_count = (profile.value.followers_count || 0) + 1;
        } else {
            profile.value.followers_count = Math.max(0, (profile.value.followers_count || 0) - 1);
        }
        uiStore.showSuccess(isNowFollowing ? 'Now following.' : 'Unfollowed.');
    } catch (e) {
        console.error('Failed to toggle follow:', e);
        uiStore.showError('Failed to update follow status. Please try again.');
    } finally {
        followLoading.value = false;
    }
}

function goBack(): void {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push('/');
    }
}

function navigateToSpace(slug: string): void {
    router.push({ name: 'space', params: { slug } });
}

onMounted(() => {
    fetchProfile();
});

watch(() => route.params.username, () => {
    fetchProfile();
});

function formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
</script>

<template>
    <div class="fcom-mf-profile-view">
        <!-- Breadcrumb & Actions -->
        <div class="fcom-mf-profile-view__header">
            <div class="fcom-mf-profile-view__breadcrumb">
                <button @click="navigateToMembers" class="fcom-mf-breadcrumb__link">Members</button>
                <span class="fcom-mf-breadcrumb__separator">/</span>
                <span class="fcom-mf-breadcrumb__current">{{ isOwnProfile ? 'My Profile' : (profile?.display_name || 'Profile') }}</span>
            </div>
            <div v-if="isOwnProfile && profile" class="fcom-mf-profile-view__actions">
                <button @click="navigateToNotificationSettings" class="fcom-mf-btn fcom-mf-btn--outline fcom-mf-btn--sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    Notification Settings
                </button>
                <button @click="navigateToEditProfile" class="fcom-mf-btn fcom-mf-btn--primary fcom-mf-btn--sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Profile
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-profile-loading">
            <div class="fcom-mf-profile-skeleton__cover"></div>
            <div class="fcom-mf-profile-skeleton__content">
                <div class="fcom-mf-profile-skeleton__avatar"></div>
                <div class="fcom-mf-profile-skeleton__info">
                    <div class="fcom-mf-profile-skeleton__name"></div>
                    <div class="fcom-mf-profile-skeleton__bio"></div>
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
            <p>The profile you're looking for might not exist or is not available.</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back
            </button>
        </div>

        <!-- Profile Content -->
        <template v-else-if="profile">
            <!-- Cover & Header -->
            <div class="fcom-mf-profile-header">
                <div
                    class="fcom-mf-profile-header__cover"
                    :style="{ backgroundImage: profile.cover_photo ? `url(${profile.cover_photo})` : undefined }"
                ></div>

                <div class="fcom-mf-profile-header__content">
                    <div class="fcom-mf-profile-header__avatar-wrapper">
                        <img
                            :src="profile.avatar"
                            :alt="profile.display_name"
                            class="fcom-mf-profile-header__avatar"
                        />
                        <span v-if="profile.status === 'online'" class="fcom-mf-profile-header__status"></span>
                    </div>

                    <div class="fcom-mf-profile-header__info">
                        <h1 class="fcom-mf-profile-header__name">
                            {{ profile.display_name }}
                            <svg v-if="profile.is_verified" class="fcom-mf-verified" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        </h1>
                        <span class="fcom-mf-profile-header__username">@{{ profile.username }}</span>

                        <div class="fcom-mf-profile-header__stats">
                            <div class="fcom-mf-profile-header__stat">
                                <span class="fcom-mf-profile-header__stat-value">{{ formatNumber(profile.posts_count ?? 0) }}</span>
                                <span class="fcom-mf-profile-header__stat-label">Posts</span>
                            </div>
                            <div v-if="isFollowersEnabled" class="fcom-mf-profile-header__stat">
                                <span class="fcom-mf-profile-header__stat-value">{{ formatNumber(profile.followers_count ?? 0) }}</span>
                                <span class="fcom-mf-profile-header__stat-label">Followers</span>
                            </div>
                            <div v-if="isFollowersEnabled" class="fcom-mf-profile-header__stat">
                                <span class="fcom-mf-profile-header__stat-value">{{ formatNumber(profile.following_count ?? 0) }}</span>
                                <span class="fcom-mf-profile-header__stat-label">Following</span>
                            </div>
                            <div class="fcom-mf-profile-header__stat">
                                <span class="fcom-mf-profile-header__stat-value">{{ formatNumber(profile.total_points ?? 0) }}</span>
                                <span class="fcom-mf-profile-header__stat-label">Points</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="authStore.isLoggedIn && !profile.is_self" class="fcom-mf-profile-header__actions">
                        <button
                            class="fcom-mf-btn"
                            :class="profile.is_following ? 'fcom-mf-btn--secondary' : 'fcom-mf-btn--primary'"
                            :disabled="followLoading"
                            @click="toggleFollow"
                        >
                            {{ profile.is_following ? 'Unfollow' : 'Follow' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Bio -->
            <div v-if="profile.short_description" class="fcom-mf-profile-bio">
                <p>{{ profile.short_description }}</p>
            </div>

            <!-- Badges -->
            <div v-if="profile.badges && profile.badges.length > 0" class="fcom-mf-profile-badges">
                <div
                    v-for="badge in profile.badges"
                    :key="badge.id"
                    class="fcom-mf-badge"
                >
                    <span v-if="badge.icon" class="fcom-mf-badge__icon">{{ badge.icon }}</span>
                    <span class="fcom-mf-badge__title">{{ badge.title }}</span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="fcom-mf-profile-tabs">
                <button
                    class="fcom-mf-profile-tab"
                    :class="{ 'fcom-mf-profile-tab--active': activeTab === 'posts' }"
                    @click="activeTab = 'posts'"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Posts
                </button>
                <button
                    v-if="profile.spaces && profile.spaces.length > 0"
                    class="fcom-mf-profile-tab"
                    :class="{ 'fcom-mf-profile-tab--active': activeTab === 'spaces' }"
                    @click="activeTab = 'spaces'"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    Spaces
                </button>
            </div>

            <!-- Posts Tab -->
            <div v-if="activeTab === 'posts'" class="fcom-mf-profile-posts">
                <div v-if="feeds.length > 0" class="fcom-mf-profile-feed">
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
                    <p>{{ profile.is_self ? "You haven't posted anything yet." : "This user hasn't posted anything yet." }}</p>
                </div>
            </div>

            <!-- Spaces Tab -->
            <div v-if="activeTab === 'spaces'" class="fcom-mf-profile-spaces">
                <div v-if="profile.spaces && profile.spaces.length > 0" class="fcom-mf-spaces-list">
                    <div
                        v-for="space in profile.spaces"
                        :key="space.id"
                        class="fcom-mf-space-item"
                        @click="navigateToSpace(space.slug)"
                    >
                        <div class="fcom-mf-space-item__logo">
                            <img v-if="space.logo" :src="space.logo" :alt="space.title" />
                            <span v-else>{{ space.title.charAt(0) }}</span>
                        </div>
                        <div class="fcom-mf-space-item__info">
                            <span class="fcom-mf-space-item__title">{{ space.title }}</span>
                            <span class="fcom-mf-space-item__members">{{ formatNumber(space.members_count) }} members</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-profile-view {
    width: 100%;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: $spacing-md;
        margin-bottom: $spacing-md;
        padding: $spacing-md;
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;
    }

    &__breadcrumb {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
    }
}

.fcom-mf-breadcrumb {
    &__link {
        color: $primary-color;
        background: none;
        border: none;
        padding: 0;
        font-size: inherit;
        cursor: pointer;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    &__separator {
        color: $text-tertiary;
    }

    &__current {
        color: $text-secondary;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-profile-loading {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-profile-skeleton {
    &__cover {
        height: 180px;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: $spacing-lg;
        padding-top: 0;
    }

    &__avatar {
        width: 120px;
        height: 120px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-top: -60px;
        border: 4px solid $white;
    }

    &__info {
        width: 100%;
        text-align: center;
        margin-top: $spacing-md;
    }

    &__name {
        height: 24px;
        width: 40%;
        margin: 0 auto $spacing-sm;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__bio {
        height: 16px;
        width: 60%;
        margin: 0 auto;
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

.fcom-mf-profile-header {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-md;

    &__cover {
        height: 180px;
        background: linear-gradient(135deg, $primary-color 0%, darken($primary-color, 15%) 100%);
        background-size: cover;
        background-position: center;
    }

    &__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: $spacing-lg;
        padding-top: 0;
        text-align: center;
    }

    &__avatar-wrapper {
        position: relative;
        margin-top: -60px;
    }

    &__avatar {
        width: 120px;
        height: 120px;
        border-radius: $border-radius-full;
        border: 4px solid $white;
        object-fit: cover;
        background: $white;
    }

    &__status {
        position: absolute;
        bottom: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: $success-color;
        border: 4px solid $white;
        border-radius: $border-radius-full;
    }

    &__info {
        margin-top: $spacing-md;
    }

    &__name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-xs;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    &__username {
        font-size: $font-size-md;
        color: $text-tertiary;
    }

    &__stats {
        display: flex;
        justify-content: center;
        gap: $spacing-xl;
        margin-top: $spacing-lg;
    }

    &__stat {
        text-align: center;

        &-value {
            display: block;
            font-size: $font-size-xl;
            font-weight: $font-weight-bold;
            color: $text-primary;
        }

        &-label {
            font-size: $font-size-xs;
            color: $text-tertiary;
            text-transform: uppercase;
        }
    }

    &__actions {
        margin-top: $spacing-lg;
    }
}

.fcom-mf-verified {
    color: $primary-color;
}

.fcom-mf-profile-bio {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-lg;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-md;

    p {
        margin: 0;
        color: $text-secondary;
        line-height: $line-height-relaxed;
        text-align: center;
    }
}

.fcom-mf-profile-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
}

.fcom-mf-badge {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-md;
    background: $white;
    border-radius: $border-radius-full;
    box-shadow: $shadow-sm;
    font-size: $font-size-sm;

    &__icon {
        font-size: 16px;
    }

    &__title {
        color: $text-secondary;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-profile-tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    background: $white;
    padding: $spacing-sm;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
}

.fcom-mf-profile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
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

.fcom-mf-profile-posts {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-profile-feed {
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

.fcom-mf-profile-spaces {
    // Spaces tab content
}

.fcom-mf-spaces-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}

.fcom-mf-space-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        transform: translateX(4px);
        box-shadow: $shadow-md;
    }

    &__logo {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-md;
        background: $primary-color;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        span {
            color: $white;
            font-size: $font-size-xl;
            font-weight: $font-weight-bold;
        }
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__title {
        display: block;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__members {
        font-size: $font-size-sm;
        color: $text-tertiary;
    }

    svg {
        color: $text-tertiary;
    }
}

.fcom-mf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;
    text-decoration: none;

    &--sm {
        padding: $spacing-xs $spacing-md;
        font-size: $font-size-sm;
        border-radius: $border-radius-sm;
    }

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

    svg {
        flex-shrink: 0;
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
