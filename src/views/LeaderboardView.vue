<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { LeaderboardEntry, MembersResponse, Member } from '@/api/types';
import { useAuthStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();

const leaderboard = ref<LeaderboardEntry[]>([]);
const currentUserRank = ref<LeaderboardEntry | null>(null);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const period = ref<'all' | 'month' | 'week'>('all');

// Transform member to leaderboard entry
function memberToLeaderboardEntry(member: Member, rank: number): LeaderboardEntry {
    return {
        rank,
        user_id: member.user_id,
        username: member.username,
        display_name: member.display_name,
        avatar: member.avatar,
        total_points: member.total_points || 0,
        is_verified: member.is_verified,
        posts_count: member.posts_count,
        comments_count: 0, // Not available in members response
    };
}

async function fetchLeaderboard(page = 1, append = false): Promise<void> {
    if (page === 1) {
        loading.value = true;
    } else {
        loadingMore.value = true;
    }

    try {
        // Use members endpoint with total_points sorting
        // FluentCommunity sorts ASC by default for non-last_activity, so we get all and sort client-side
        const response = await api.get<MembersResponse>('members', {
            page,
            per_page: 50, // Get more to sort properly
            sort_by: 'total_points',
        });

        // Transform members to leaderboard entries
        let members = response.members.data;

        // Sort by total_points DESC (highest first) since the API sorts ASC
        members = members.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

        // Calculate rank offset based on page
        const rankOffset = append ? leaderboard.value.length : 0;

        const entries = members.map((member, index) =>
            memberToLeaderboardEntry(member, rankOffset + index + 1)
        );

        if (append) {
            leaderboard.value = [...leaderboard.value, ...entries];
        } else {
            leaderboard.value = entries;

            // Find current user's rank
            if (authStore.isLoggedIn && authStore.userId) {
                const userEntry = entries.find(e => e.user_id === authStore.userId);
                currentUserRank.value = userEntry || null;
            }
        }

        hasMore.value = response.members.has_more;
        currentPage.value = response.members.current_page;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

function loadMore(): void {
    if (!loadingMore.value && hasMore.value) {
        fetchLeaderboard(currentPage.value + 1, true);
    }
}

function changePeriod(newPeriod: 'all' | 'month' | 'week'): void {
    period.value = newPeriod;
    currentPage.value = 1;
    fetchLeaderboard(1, false);
}

function navigateToProfile(username: string): void {
    router.push({ name: 'profile', params: { username } });
}

function formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getRankColor(rank: number): string {
    if (rank === 1) return '#ffd700';
    if (rank === 2) return '#c0c0c0';
    if (rank === 3) return '#cd7f32';
    return '#8a8d91';
}

onMounted(() => {
    fetchLeaderboard();
});
</script>

<template>
    <div class="fcom-mf-leaderboard-view">
        <!-- Header -->
        <div class="fcom-mf-page-header">
            <div class="fcom-mf-page-header__content">
                <h1 class="fcom-mf-page-header__title">
                    <span class="fcom-mf-page-header__icon">🏆</span>
                    Leaderboard
                </h1>
                <p class="fcom-mf-page-header__subtitle">Top contributors in our community</p>
            </div>
        </div>

        <!-- Period Tabs -->
        <div class="fcom-mf-period-tabs">
            <button
                class="fcom-mf-period-tab"
                :class="{ 'fcom-mf-period-tab--active': period === 'all' }"
                @click="changePeriod('all')"
            >
                All Time
            </button>
            <button
                class="fcom-mf-period-tab"
                :class="{ 'fcom-mf-period-tab--active': period === 'month' }"
                @click="changePeriod('month')"
            >
                This Month
            </button>
            <button
                class="fcom-mf-period-tab"
                :class="{ 'fcom-mf-period-tab--active': period === 'week' }"
                @click="changePeriod('week')"
            >
                This Week
            </button>
        </div>

        <!-- Current User Rank -->
        <div v-if="authStore.isLoggedIn && currentUserRank" class="fcom-mf-your-rank">
            <div class="fcom-mf-your-rank__label">Your Rank</div>
            <div class="fcom-mf-your-rank__card" @click="navigateToProfile(currentUserRank.username)">
                <div class="fcom-mf-rank-badge" :style="{ backgroundColor: getRankColor(currentUserRank.rank) }">
                    #{{ currentUserRank.rank }}
                </div>
                <img
                    :src="currentUserRank.avatar"
                    :alt="currentUserRank.display_name"
                    class="fcom-mf-your-rank__avatar"
                />
                <div class="fcom-mf-your-rank__info">
                    <span class="fcom-mf-your-rank__name">{{ currentUserRank.display_name }}</span>
                    <span class="fcom-mf-your-rank__points">{{ formatNumber(currentUserRank.total_points) }} points</span>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-leaderboard-loading">
            <div v-for="i in 10" :key="i" class="fcom-mf-leader-skeleton">
                <div class="fcom-mf-leader-skeleton__rank"></div>
                <div class="fcom-mf-leader-skeleton__avatar"></div>
                <div class="fcom-mf-leader-skeleton__info">
                    <div class="fcom-mf-leader-skeleton__name"></div>
                    <div class="fcom-mf-leader-skeleton__points"></div>
                </div>
            </div>
        </div>

        <!-- Leaderboard List -->
        <div v-else class="fcom-mf-leaderboard-list">
            <!-- Top 3 Podium -->
            <div v-if="leaderboard.length >= 3" class="fcom-mf-podium">
                <!-- Second Place -->
                <div class="fcom-mf-podium__item fcom-mf-podium__item--second" @click="navigateToProfile(leaderboard[1].username)">
                    <div class="fcom-mf-podium__avatar-wrapper">
                        <img :src="leaderboard[1].avatar" :alt="leaderboard[1].display_name" />
                        <span class="fcom-mf-podium__medal">🥈</span>
                    </div>
                    <span class="fcom-mf-podium__name">{{ leaderboard[1].display_name }}</span>
                    <span class="fcom-mf-podium__points">{{ formatNumber(leaderboard[1].total_points) }}</span>
                    <div class="fcom-mf-podium__bar" style="height: 60px"></div>
                </div>

                <!-- First Place -->
                <div class="fcom-mf-podium__item fcom-mf-podium__item--first" @click="navigateToProfile(leaderboard[0].username)">
                    <div class="fcom-mf-podium__crown">👑</div>
                    <div class="fcom-mf-podium__avatar-wrapper fcom-mf-podium__avatar-wrapper--first">
                        <img :src="leaderboard[0].avatar" :alt="leaderboard[0].display_name" />
                        <span class="fcom-mf-podium__medal">🥇</span>
                    </div>
                    <span class="fcom-mf-podium__name">{{ leaderboard[0].display_name }}</span>
                    <span class="fcom-mf-podium__points">{{ formatNumber(leaderboard[0].total_points) }}</span>
                    <div class="fcom-mf-podium__bar fcom-mf-podium__bar--first" style="height: 80px"></div>
                </div>

                <!-- Third Place -->
                <div class="fcom-mf-podium__item fcom-mf-podium__item--third" @click="navigateToProfile(leaderboard[2].username)">
                    <div class="fcom-mf-podium__avatar-wrapper">
                        <img :src="leaderboard[2].avatar" :alt="leaderboard[2].display_name" />
                        <span class="fcom-mf-podium__medal">🥉</span>
                    </div>
                    <span class="fcom-mf-podium__name">{{ leaderboard[2].display_name }}</span>
                    <span class="fcom-mf-podium__points">{{ formatNumber(leaderboard[2].total_points) }}</span>
                    <div class="fcom-mf-podium__bar" style="height: 40px"></div>
                </div>
            </div>

            <!-- Rest of Leaderboard -->
            <div class="fcom-mf-leaders">
                <div
                    v-for="(entry, index) in leaderboard.slice(3)"
                    :key="entry.user_id"
                    class="fcom-mf-leader-item"
                    @click="navigateToProfile(entry.username)"
                >
                    <div class="fcom-mf-leader-item__rank">{{ index + 4 }}</div>
                    <img :src="entry.avatar" :alt="entry.display_name" class="fcom-mf-leader-item__avatar" />
                    <div class="fcom-mf-leader-item__info">
                        <span class="fcom-mf-leader-item__name">
                            {{ entry.display_name }}
                            <svg v-if="entry.is_verified" class="fcom-mf-verified" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        </span>
                        <span class="fcom-mf-leader-item__stats">
                            {{ entry.posts_count || 0 }} posts · {{ entry.comments_count || 0 }} comments
                        </span>
                    </div>
                    <div class="fcom-mf-leader-item__points">
                        <span class="fcom-mf-leader-item__points-value">{{ formatNumber(entry.total_points) }}</span>
                        <span class="fcom-mf-leader-item__points-label">points</span>
                    </div>
                </div>
            </div>
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
        <div v-if="!loading && leaderboard.length === 0" class="fcom-mf-empty-state">
            <span class="fcom-mf-empty-state__icon">🏆</span>
            <h2>No rankings yet</h2>
            <p>Start participating to earn points and climb the leaderboard!</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-leaderboard-view {
    width: 100%;
}

.fcom-mf-page-header {
    background: linear-gradient(135deg, #ffd700 0%, #ff9500 100%);
    border-radius: $border-radius-lg;
    padding: $spacing-xl;
    margin-bottom: $spacing-lg;
    color: $white;
    text-align: center;

    &__title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        margin: 0 0 $spacing-sm;
    }

    &__icon {
        font-size: 32px;
    }

    &__subtitle {
        margin: 0;
        opacity: 0.9;
        font-size: $font-size-md;
    }
}

.fcom-mf-period-tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    background: $white;
    padding: $spacing-sm;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
}

.fcom-mf-period-tab {
    flex: 1;
    padding: $spacing-sm $spacing-lg;
    border: none;
    background: transparent;
    border-radius: $border-radius-md;
    color: $text-secondary;
    font-size: $font-size-sm;
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

.fcom-mf-your-rank {
    margin-bottom: $spacing-lg;

    &__label {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-secondary;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: $spacing-sm;
    }

    &__card {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        background: linear-gradient(135deg, rgba($primary-color, 0.1) 0%, rgba($primary-color, 0.05) 100%);
        border: 2px solid $primary-color;
        border-radius: $border-radius-lg;
        padding: $spacing-md $spacing-lg;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
            transform: translateY(-2px);
            box-shadow: $shadow-md;
        }
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        object-fit: cover;
    }

    &__info {
        flex: 1;
    }

    &__name {
        display: block;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__points {
        font-size: $font-size-sm;
        color: $primary-color;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-rank-badge {
    width: 40px;
    height: 40px;
    border-radius: $border-radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $white;
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
}

.fcom-mf-leaderboard-loading {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: $border-color;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-leader-skeleton {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $white;

    &__rank {
        width: 32px;
        height: 32px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__info {
        flex: 1;
    }

    &__name {
        height: 16px;
        width: 50%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-xs;
    }

    &__points {
        height: 12px;
        width: 30%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-leaderboard-list {
    // Container for list
}

.fcom-mf-podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
    padding: $spacing-lg;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    &__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform $transition-fast;

        &:hover {
            transform: translateY(-4px);
        }

        &--first {
            order: 2;
        }

        &--second {
            order: 1;
        }

        &--third {
            order: 3;
        }
    }

    &__crown {
        font-size: 24px;
        margin-bottom: $spacing-xs;
        animation: bounce 2s infinite;
    }

    &__avatar-wrapper {
        position: relative;
        margin-bottom: $spacing-sm;

        img {
            width: 64px;
            height: 64px;
            border-radius: $border-radius-full;
            border: 3px solid $gray-200;
            object-fit: cover;
        }

        &--first img {
            width: 80px;
            height: 80px;
            border-color: #ffd700;
        }
    }

    &__medal {
        position: absolute;
        bottom: -4px;
        right: -4px;
        font-size: 20px;
    }

    &__name {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin-bottom: 2px;
        max-width: 100px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }

    &__points {
        font-size: $font-size-xs;
        color: $primary-color;
        font-weight: $font-weight-medium;
        margin-bottom: $spacing-sm;
    }

    &__bar {
        width: 80px;
        background: linear-gradient(180deg, $gray-200 0%, $gray-300 100%);
        border-radius: $border-radius-md $border-radius-md 0 0;

        &--first {
            background: linear-gradient(180deg, #ffd700 0%, #ff9500 100%);
            width: 100px;
        }
    }
}

.fcom-mf-leaders {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: $border-color;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-leader-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $white;
    cursor: pointer;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &__rank {
        width: 32px;
        height: 32px;
        border-radius: $border-radius-full;
        background: $gray-100;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: $font-size-sm;
        font-weight: $font-weight-bold;
        color: $text-tertiary;
        flex-shrink: 0;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        object-fit: cover;
        flex-shrink: 0;
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__name {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__stats {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__points {
        text-align: right;
        flex-shrink: 0;

        &-value {
            display: block;
            font-size: $font-size-lg;
            font-weight: $font-weight-bold;
            color: $primary-color;
        }

        &-label {
            font-size: $font-size-xs;
            color: $text-tertiary;
        }
    }
}

.fcom-mf-verified {
    color: $primary-color;
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

    &__icon {
        font-size: 64px;
        display: block;
        margin-bottom: $spacing-lg;
    }

    h2 {
        font-size: $font-size-xl;
        color: $text-primary;
        margin: 0 0 $spacing-sm;
    }

    p {
        color: $text-secondary;
        margin: 0;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
</style>
