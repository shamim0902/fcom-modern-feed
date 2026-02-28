<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useUiStore } from '@/stores';
import { api } from '@/api/client';
import type { Member, MembersResponse, Activity, FeaturedPost, ActivitiesResponse } from '@/api/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const suggestedMembers = ref<Member[]>([]);
const loadingMembers = ref(false);

const featuredPosts = ref<FeaturedPost[]>([]);
const recentActivities = ref<Activity[]>([]);
const loadingActivities = ref(false);

const communityStats = ref({
    members: 0,
    posts: 0,
    online: 0,
});

const followingState = ref<Record<number, boolean>>({});
const followLoading = ref<Record<number, boolean>>({});

const SUGGESTED_DISPLAY_COUNT = 3;

async function fetchSuggestedMembers(): Promise<void> {
    loadingMembers.value = true;
    try {
        const response = await api.get<MembersResponse>('members', {
            per_page: 20,
            sort_by: 'last_activity',
        });

        const raw = response.members?.data || [];
        const followMap = response.current_user_follows || {};
        const withFollow = raw.map((m) => {
            const level = followMap[String(m.user_id)] ?? followMap[m.user_id as unknown as string] ?? 0;
            return { ...m, is_following: Number(level) > 0 };
        });

        // Exclude: people I follow (full list from API), people who follow me, and self
        const myFollowingIds = new Set(
            (response.current_user_following_ids || []).map((id) => Number(id))
        );
        const myFollowerIds = new Set(
            (response.current_user_follower_ids || []).map((id) => Number(id))
        );
        const currentUserId = Number(authStore.userId ?? 0);

        const notFollowing = withFollow.filter(
            (m) => {
                const uid = Number(m.user_id);
                return (
                    !myFollowingIds.has(uid) &&
                    uid !== currentUserId &&
                    !myFollowerIds.has(uid)
                );
            }
        );
        suggestedMembers.value = notFollowing.slice(0, SUGGESTED_DISPLAY_COUNT);
        communityStats.value.members = response.members.total ?? raw.length;
    } catch (error) {
        console.error('Failed to fetch members:', error);
    } finally {
        loadingMembers.value = false;
    }
}

async function fetchActivities(): Promise<void> {
    loadingActivities.value = true;
    try {
        const response = await api.get<ActivitiesResponse>('activities', {
            page: 1,
            per_page: 5,
            with_pins: 1,
            is_trending: 1,
        });
        recentActivities.value = response.activities?.data || [];
        featuredPosts.value = response.pinned_posts || [];
    } catch (error) {
        console.error('Failed to fetch activities:', error);
    } finally {
        loadingActivities.value = false;
    }
}

function formatTimeAgo(dateString: string): string {
    return dayjs(dateString).fromNow();
}

function stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function truncateText(text: string, maxLength: number): string {
    const stripped = stripHtml(text);
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength).trim() + '...';
}

function navigateToActivity(activity: Activity): void {
    if (!activity.route) {
        console.log('No route in activity:', activity);
        return;
    }

    const { name, params, query } = activity.route;
    console.log('Activity route:', { name, params, query });

    const feedSlug = params?.['feed_slug'] as string | undefined;
    const spaceSlug = params?.['space'] as string | undefined;
    const username = params?.['username'] as string | undefined;

    // Map FluentCommunity route names to our route names
    if ((name === 'single_feed' || name === 'space_feed') && feedSlug) {
        router.push(`/post/s/${feedSlug}`);
    } else if (name === 'view_lesson') {
        // Course lessons - not supported yet
        console.log('Course lesson navigation not supported yet');
    } else if (name === 'user_profile' && username) {
        router.push(`/u/${username}`);
    } else if (name === 'space_view' && spaceSlug) {
        router.push(`/space/${spaceSlug}`);
    } else {
        // Fallback: navigate to feed
        console.log('Unhandled activity route:', name, params);
        router.push('/');
    }
}

function navigateToPost(postId: number): void {
    router.push({ name: 'single-post', params: { id: postId } });
}

async function toggleFollow(member: Member): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (followLoading.value[member.id]) return;

    followLoading.value[member.id] = true;
    try {
        const response = await api.post<{
            is_following?: boolean;
            status?: string;
            follow?: number | string;
            followers_count?: number;
        }>(`profile/${member.user_id}/toggle-follow`);

        const isNowFollowing = response.is_following !== undefined
            ? !!response.is_following
            : response.status
                ? response.status === 'following'
                : Number(response.follow ?? (member.is_following ? 0 : 1)) > 0;

        member.is_following = isNowFollowing;
        followingState.value[member.id] = isNowFollowing;
        if (typeof response.followers_count === 'number') {
            member.followers_count = response.followers_count;
        }
        uiStore.showSuccess(isNowFollowing ? 'Now following.' : 'Unfollowed.');
    } catch (error) {
        console.error('Failed to toggle follow:', error);
        uiStore.showError('Failed to update follow status. Please try again.');
    } finally {
        followLoading.value[member.id] = false;
    }
}

function isFollowing(member: Member): boolean {
    return followingState.value[member.id] ?? member.is_following ?? false;
}

function formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function navigateToProfile(username: string): void {
    router.push({ name: 'profile', params: { username } });
}

function navigateToMembers(): void {
    router.push({ name: 'members' });
}

function navigateToSpaces(): void {
    router.push({ name: 'spaces' });
}

function navigateToLeaderboard(): void {
    router.push({ name: 'leaderboard' });
}

onMounted(() => {
    fetchSuggestedMembers();
    fetchActivities();
});
</script>

<template>
    <div class="fcom-mf-right-sidebar">
        <!-- Community Stats -->
        <div class="fcom-mf-stats-card">
            <div class="fcom-mf-stats-card__header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Community</span>
            </div>
            <div class="fcom-mf-stats-card__grid">
                <div class="fcom-mf-stats-card__item">
                    <span class="fcom-mf-stats-card__value">{{ formatNumber(communityStats.members) }}</span>
                    <span class="fcom-mf-stats-card__label">Members</span>
                </div>
                <div class="fcom-mf-stats-card__item">
                    <span class="fcom-mf-stats-card__value">{{ formatNumber(communityStats.posts) }}</span>
                    <span class="fcom-mf-stats-card__label">Posts</span>
                </div>
                <div class="fcom-mf-stats-card__item fcom-mf-stats-card__item--online">
                    <span class="fcom-mf-stats-card__value">{{ communityStats.online }}</span>
                    <span class="fcom-mf-stats-card__label">Online</span>
                </div>
            </div>
        </div>

                <!-- Suggested Members (only when we have suggestions or are still loading) -->
        <div v-if="authStore.isLoggedIn && (loadingMembers || suggestedMembers.length > 0)" class="fcom-mf-sidebar-card">
            <div class="fcom-mf-sidebar-card__header">
                <h3>People You May Know</h3>
                <button @click="navigateToMembers" class="fcom-mf-sidebar-card__link">See All</button>
            </div>

            <div v-if="loadingMembers" class="fcom-mf-members-loading">
                <div v-for="i in 3" :key="i" class="fcom-mf-member-skeleton">
                    <div class="fcom-mf-member-skeleton__avatar"></div>
                    <div class="fcom-mf-member-skeleton__info">
                        <div class="fcom-mf-member-skeleton__name"></div>
                        <div class="fcom-mf-member-skeleton__meta"></div>
                    </div>
                </div>
            </div>

            <div v-else class="fcom-mf-members-list">
                <div
                    v-for="member in suggestedMembers"
                    :key="member.id"
                    class="fcom-mf-member-item"
                >
                    <button class="fcom-mf-member-item__avatar" @click="navigateToProfile(member.username)">
                        <img :src="member.avatar" :alt="member.display_name" />
                        <span v-if="member.is_online" class="fcom-mf-member-item__online"></span>
                    </button>
                    <div class="fcom-mf-member-item__info">
                        <button class="fcom-mf-member-item__name" @click="navigateToProfile(member.username)">
                            {{ member.display_name }}
                        </button>
                        <span class="fcom-mf-member-item__meta">
                            {{ member.followers_count != null && member.followers_count !== undefined ? `${member.followers_count} followers` : 'Member' }}
                        </span>
                    </div>
                    <button
                        v-if="authStore.isLoggedIn && member.user_id !== authStore.currentUser?.id"
                        class="fcom-mf-member-item__btn"
                        :class="{ 'fcom-mf-member-item__btn--following': isFollowing(member) }"
                        :disabled="followLoading[member.id]"
                        @click="toggleFollow(member)"
                    >
                        {{ isFollowing(member) ? 'Unfollow' : 'Follow' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Featured Posts -->
        <div v-if="featuredPosts.length" class="fcom-mf-sidebar-card">
            <div class="fcom-mf-sidebar-card__header">
                <h3>Featured Posts</h3>
            </div>
            <div class="fcom-mf-activity-list">
                <button
                    v-for="post in featuredPosts"
                    :key="post.id"
                    class="fcom-mf-activity-item"
                    @click="navigateToPost(post.id)"
                >
                    <div class="fcom-mf-activity-item__avatar">
                        <img :src="post.xprofile.avatar" :alt="post.xprofile.display_name" />
                    </div>
                    <div class="fcom-mf-activity-item__content">
                        <div class="fcom-mf-activity-item__message">{{ truncateText(post.message, 80) }}</div>
                        <div class="fcom-mf-activity-item__meta">{{ post.xprofile.display_name }}</div>
                    </div>
                </button>
            </div>
        </div>

        <!-- Recent Activities -->
        <div class="fcom-mf-sidebar-card">
            <div class="fcom-mf-sidebar-card__header">
                <h3>Recent Activities</h3>
            </div>
            <div v-if="loadingActivities" class="fcom-mf-activity-loading">
                <div v-for="i in 4" :key="i" class="fcom-mf-activity-skeleton">
                    <div class="fcom-mf-activity-skeleton__avatar"></div>
                    <div class="fcom-mf-activity-skeleton__content">
                        <div class="fcom-mf-activity-skeleton__line"></div>
                        <div class="fcom-mf-activity-skeleton__line fcom-mf-activity-skeleton__line--short"></div>
                    </div>
                </div>
            </div>
            <div v-else-if="recentActivities.length" class="fcom-mf-activity-list">
                <button
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    class="fcom-mf-activity-item"
                    @click="navigateToActivity(activity)"
                >
                    <div class="fcom-mf-activity-item__avatar">
                        <img :src="activity.xprofile.avatar" :alt="activity.xprofile.display_name" />
                    </div>
                    <div class="fcom-mf-activity-item__content">
                        <div class="fcom-mf-activity-item__message" v-html="activity.message"></div>
                        <div class="fcom-mf-activity-item__time">{{ formatTimeAgo(activity.updated_at) }}</div>
                    </div>
                </button>
            </div>
            <div v-else class="fcom-mf-activity-empty">
                No recent activities found
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="fcom-mf-quick-actions">
            <button class="fcom-mf-quick-action" @click="navigateToSpaces">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Explore Spaces
            </button>
            <button class="fcom-mf-quick-action" @click="navigateToLeaderboard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="7"/>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                </svg>
                Leaderboard
            </button>
        </div>

        <!-- Footer Links -->
        <div class="fcom-mf-sidebar-footer">
            <div class="fcom-mf-sidebar-footer__links">
                <!-- <a href="#">About</a>
                <a href="#">Help</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a> -->
            </div>
            <div class="fcom-mf-sidebar-footer__copyright">
                © 2026 Vibecoder BD · v1.0.0
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-right-sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

// Stats Card
.fcom-mf-stats-card {
    background: linear-gradient(135deg, var(--fcom-mf-primary, #1877f2) 0%, var(--fcom-mf-primary-hover, #166fe5) 100%);
    border-radius: var(--fcom-mf-radius-card, 12px);
    padding: $spacing-md;
    color: $white;

    &__header {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-weight: $font-weight-semibold;
        margin-bottom: $spacing-md;
        opacity: 0.9;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: $spacing-sm;
    }

    &__item {
        text-align: center;
        padding: $spacing-sm;
        background: rgba($white, 0.1);
        border-radius: var(--fcom-mf-radius-md, 8px);
    }

    &__value {
        display: block;
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
        color: $white;
    }

    &__label {
        display: block;
        font-size: $font-size-xs;
        opacity: 0.8;
        margin-top: 2px;
    }
}

// Sidebar Card
.fcom-mf-sidebar-card {
    background: $white;
    border-radius: var(--fcom-mf-radius-card, 12px);
    padding: $spacing-md;
    box-shadow: $shadow-sm;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $spacing-md;

        h3 {
            font-size: $font-size-sm;
            font-weight: $font-weight-semibold;
            color: $text-secondary;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    }

    &__link {
        font-size: $font-size-sm;
        color: var(--fcom-mf-primary, #1877f2);
        text-decoration: none;
        font-weight: $font-weight-medium;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;

        &:hover {
            text-decoration: underline;
        }
    }
}

// Activity List
.fcom-mf-activity-list {
    display: flex;
    flex-direction: column;
}

.fcom-mf-activity-item {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    padding: $spacing-sm;
    margin: 0 (-$spacing-sm);
    border-radius: var(--fcom-mf-radius-md, 8px);
    text-decoration: none;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    width: calc(100% + #{$spacing-sm * 2});
    transition: background $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &__avatar {
        flex-shrink: 0;

        img {
            width: 36px;
            height: 36px;
            border-radius: $border-radius-full;
            object-fit: cover;
        }
    }

    &__content {
        flex: 1;
        min-width: 0;
    }

    &__message {
        font-size: $font-size-sm;
        color: $text-primary;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;

        :deep(a) {
            color: var(--fcom-mf-primary, #1877f2);
            text-decoration: none;
            font-weight: $font-weight-semibold;
        }

        :deep(strong) {
            font-weight: $font-weight-semibold;
        }
    }

    &__meta {
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: 2px;
    }

    &__time {
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: 2px;
    }
}

.fcom-mf-activity-empty {
    text-align: center;
    padding: $spacing-md;
    color: $text-tertiary;
    font-size: $font-size-sm;
}

// Activity Loading
.fcom-mf-activity-loading {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}

.fcom-mf-activity-skeleton {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    padding: $spacing-sm 0;

    &__avatar {
        width: 36px;
        height: 36px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        flex-shrink: 0;
    }

    &__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    &__line {
        height: 12px;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;

        &--short {
            width: 60%;
            height: 10px;
        }
    }
}

// Members Loading
.fcom-mf-members-loading {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-member-skeleton {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    &__avatar {
        width: 44px;
        height: 44px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__info {
        flex: 1;
    }

    &__name {
        height: 14px;
        width: 70%;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-xs;
    }

    &__meta {
        height: 10px;
        width: 50%;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

// Members List
.fcom-mf-members-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-member-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    &__avatar {
        position: relative;
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;

        img {
            width: 44px;
            height: 44px;
            border-radius: $border-radius-full;
            object-fit: cover;
        }
    }

    &__online {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        background: $success-color;
        border: 2px solid $white;
        border-radius: $border-radius-full;
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__name {
        display: block;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        text-decoration: none;
        @include truncate;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        width: 100%;

        &:hover {
            color: var(--fcom-mf-primary, #1877f2);
        }
    }

    &__meta {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__btn {
        padding: $spacing-xs $spacing-md;
        border: none;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        cursor: pointer;
        transition: all $transition-fast;
        flex-shrink: 0;

        &:hover {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }

        &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        &--following {
            background: $gray-100;
            color: $text-secondary;

            &:hover {
                background: $gray-200;
            }
        }
    }
}

// Quick Actions
.fcom-mf-quick-actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}

.fcom-mf-quick-action {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    background: $white;
    border-radius: var(--fcom-mf-radius-card, 12px);
    color: $text-primary;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    text-decoration: none;
    box-shadow: $shadow-sm;
    transition: all $transition-fast;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;

    &:hover {
        background: $gray-50;
        transform: translateY(-1px);
        box-shadow: $shadow-md;
    }

    svg {
        color: var(--fcom-mf-primary, #1877f2);
    }
}

// Footer
.fcom-mf-sidebar-footer {
    padding: $spacing-md;
    font-size: $font-size-xs;
    color: $text-tertiary;

    &__links {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;

        a {
            color: $text-tertiary;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
                color: $text-secondary;
            }
        }
    }

    &__copyright {
        margin-top: $spacing-sm;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
