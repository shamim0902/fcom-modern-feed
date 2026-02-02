<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { Member, MembersResponse } from '@/api/types';
import { useAuthStore, useUiStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const members = ref<Member[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const searchQuery = ref('');
const totalMembers = ref(0);
const error = ref<string | null>(null);
const followLoading = ref<Record<number, boolean>>({});

async function fetchMembers(page = 1, append = false): Promise<void> {
    if (page === 1) {
        loading.value = true;
        error.value = null;
    } else {
        loadingMore.value = true;
    }

    try {
        const response = await api.get<MembersResponse>('members', {
            page,
            per_page: 20,
            sort_by: 'last_activity',
            search: searchQuery.value || undefined,
        });

        // Handle different response structures
        const membersList = response.members?.data || response.members || [];
        const followMap = response.current_user_follows || {};
        const withFollow = membersList.map((m: Member) => {
            const level = followMap[String(m.user_id)] ?? followMap[m.user_id as unknown as string] ?? 0;
            return { ...m, is_following: Number(level) > 0 };
        });

        if (append) {
            members.value = [...members.value, ...withFollow];
        } else {
            members.value = withFollow;
        }

        hasMore.value = response.members?.has_more ?? false;
        currentPage.value = response.members?.current_page ?? page;
        totalMembers.value = response.members?.total || members.value.length;
        error.value = null;
    } catch (err: unknown) {
        console.error('Failed to fetch members:', err);
        const apiError = err as { message?: string; status?: number };
        if (!append) {
            members.value = [];
            error.value = apiError.message || 'Failed to load members. Please try again.';
        }
        // Don't show error for "load more" failures, just stop pagination
        hasMore.value = false;
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

function loadMore(): void {
    if (!loadingMore.value && hasMore.value) {
        fetchMembers(currentPage.value + 1, true);
    }
}

function handleSearch(): void {
    currentPage.value = 1;
    fetchMembers(1, false);
}

function navigateToProfile(username: string): void {
    router.push({ name: 'profile', params: { username } });
}

async function toggleFollow(member: Member): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (followLoading.value[member.id]) return;

    followLoading.value[member.id] = true;
    try {
        // FluentCommunity uses separate follow/unfollow endpoints with username
        const endpoint = member.is_following
            ? `profile/${member.username}/unfollow`
            : `profile/${member.username}/follow`;
        await api.post<{ message?: string }>(endpoint);
        const isNowFollowing = !member.is_following;
        member.is_following = isNowFollowing;
        uiStore.showSuccess(isNowFollowing ? 'Now following.' : 'Unfollowed.');
    } catch (error) {
        console.error('Failed to toggle follow:', error);
        uiStore.showError('Failed to update follow status. Please try again.');
    } finally {
        followLoading.value[member.id] = false;
    }
}

onMounted(() => {
    fetchMembers();
});

const filteredMembers = computed(() => {
    return members.value || [];
});
</script>

<template>
    <div class="fcom-mf-members-view">
        <!-- Header -->
        <div class="fcom-mf-page-header">
            <div class="fcom-mf-page-header__content">
                <h1 class="fcom-mf-page-header__title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Community Members
                </h1>
                <p class="fcom-mf-page-header__subtitle">{{ totalMembers }} members in this community</p>
            </div>
        </div>

        <!-- Search & Filters -->
        <div class="fcom-mf-members-filters">
            <div class="fcom-mf-search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search members..."
                    @keyup.enter="handleSearch"
                />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-members-loading">
            <div v-for="i in 6" :key="i" class="fcom-mf-member-skeleton">
                <div class="fcom-mf-member-skeleton__avatar"></div>
                <div class="fcom-mf-member-skeleton__content">
                    <div class="fcom-mf-member-skeleton__name"></div>
                    <div class="fcom-mf-member-skeleton__meta"></div>
                </div>
            </div>
        </div>

        <!-- Members Grid -->
        <div v-else class="fcom-mf-members-grid">
            <div
                v-for="member in filteredMembers"
                :key="member.id"
                class="fcom-mf-member-card"
            >
                <div class="fcom-mf-member-card__header" @click="navigateToProfile(member.username)">
                    <div class="fcom-mf-member-card__avatar-wrapper">
                        <img
                            :src="member.avatar"
                            :alt="member.display_name"
                            class="fcom-mf-member-card__avatar"
                        />
                        <span v-if="member.is_online" class="fcom-mf-member-card__online"></span>
                    </div>
                    <div class="fcom-mf-member-card__info">
                        <span class="fcom-mf-member-card__name">
                            {{ member.display_name }}
                            <svg v-if="member.is_verified" class="fcom-mf-verified" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        </span>
                        <span class="fcom-mf-member-card__username">@{{ member.username }}</span>
                    </div>
                </div>

                <p v-if="member.short_description" class="fcom-mf-member-card__bio">
                    {{ member.short_description }}
                </p>

                <div class="fcom-mf-member-card__stats">
                    <div class="fcom-mf-member-card__stat">
                        <span class="fcom-mf-member-card__stat-value">{{ member.posts_count || 0 }}</span>
                        <span class="fcom-mf-member-card__stat-label">Posts</span>
                    </div>
                    <div class="fcom-mf-member-card__stat">
                        <span class="fcom-mf-member-card__stat-value">{{ member.followers_count || 0 }}</span>
                        <span class="fcom-mf-member-card__stat-label">Followers</span>
                    </div>
                    <div class="fcom-mf-member-card__stat">
                        <span class="fcom-mf-member-card__stat-value">{{ member.total_points || 0 }}</span>
                        <span class="fcom-mf-member-card__stat-label">Points</span>
                    </div>
                </div>

                <div class="fcom-mf-member-card__actions">
                    <button
                        class="fcom-mf-btn fcom-mf-btn--profile"
                        @click="navigateToProfile(member.username)"
                    >
                        View Profile
                    </button>
                    <template v-if="authStore.isLoggedIn && member.user_id !== authStore.currentUser?.id">
                        <button
                            v-if="!member.is_following"
                            class="fcom-mf-btn fcom-mf-btn--primary"
                            :disabled="followLoading[member.id]"
                            @click="toggleFollow(member)"
                        >
                            Follow
                        </button>
                        <span
                            v-else
                            class="fcom-mf-member-card__followed"
                        >
                            Followed
                        </span>
                    </template>
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
                <span v-else>Load More Members</span>
            </button>
        </div>

        <!-- Error State -->
        <div v-if="error" class="fcom-mf-error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>Something went wrong</h2>
            <p>{{ error }}</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="fetchMembers()">
                Try Again
            </button>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && !error && members.length === 0" class="fcom-mf-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h2>No members found</h2>
            <p>Try adjusting your search to find what you're looking for.</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-members-view {
    width: 100%;
}

.fcom-mf-page-header {
    background: linear-gradient(135deg, $primary-color 0%, darken($primary-color, 15%) 100%);
    border-radius: $border-radius-lg;
    padding: $spacing-xl;
    margin-bottom: $spacing-lg;
    color: $white;

    &__content {
        text-align: center;
        color: $white;
    }

    &__title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        margin: 0 0 $spacing-sm;
        color: $white;

        svg {
            opacity: 0.9;
        }
    }

    &__subtitle {
        margin: 0;
        opacity: 0.9;
        font-size: $font-size-md;
    }
}

.fcom-mf-members-filters {
    margin-bottom: $spacing-lg;
}

.fcom-mf-search-box {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    background: $white;
    border-radius: 20px;
    padding: $spacing-sm $spacing-lg;
    box-shadow: $shadow-sm;
    max-width: 400px;
    border: 1px solid $border-color;
    transition: border-color $transition-fast, box-shadow $transition-fast;

    &:focus-within {
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba($primary-color, 0.1);
    }

    svg {
        color: $text-tertiary;
        flex-shrink: 0;
    }

    input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: $font-size-md;
        font-family: inherit;
        color: $text-primary;
        min-width: 0;
        width: 100%;
        padding: $spacing-xs 0;

        &::placeholder {
            color: $text-tertiary;
        }

        &:focus {
            outline: none;
        }
    }
}

.fcom-mf-members-loading {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: $spacing-lg;
}

.fcom-mf-member-skeleton {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-lg;
    box-shadow: $shadow-sm;

    &__avatar {
        width: 64px;
        height: 64px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin: 0 auto $spacing-md;
    }

    &__content {
        text-align: center;
    }

    &__name {
        height: 18px;
        width: 60%;
        margin: 0 auto $spacing-sm;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__meta {
        height: 14px;
        width: 40%;
        margin: 0 auto;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: $spacing-lg;
}

.fcom-mf-member-card {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-lg;
    box-shadow: $shadow-sm;
    transition: all $transition-normal;

    &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md;
    }

    &__header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        cursor: pointer;
        margin-bottom: $spacing-md;
    }

    &__avatar-wrapper {
        position: relative;
        margin-bottom: $spacing-sm;
    }

    &__avatar {
        width: 72px;
        height: 72px;
        border-radius: $border-radius-full;
        object-fit: cover;
        border: 3px solid $gray-100;
    }

    &__online {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 14px;
        height: 14px;
        background: $success-color;
        border: 3px solid $white;
        border-radius: $border-radius-full;
    }

    &__name {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__username {
        font-size: $font-size-sm;
        color: $text-tertiary;
    }

    &__bio {
        font-size: $font-size-sm;
        color: $text-secondary;
        text-align: center;
        margin: 0 0 $spacing-md;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    &__stats {
        display: flex;
        justify-content: center;
        gap: $spacing-xl;
        padding: $spacing-md 0;
        border-top: 1px solid $border-color;
        border-bottom: 1px solid $border-color;
        margin-bottom: $spacing-md;
    }

    &__stat {
        text-align: center;

        &-value {
            display: block;
            font-size: $font-size-lg;
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
        display: flex;
        gap: $spacing-sm;
    }

    &__followed {
        display: inline-flex;
        align-items: center;
        padding: $spacing-sm $spacing-md;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-secondary;
        background: $bg-secondary;
        border-radius: $border-radius-md;
    }
}

.fcom-mf-verified {
    color: $primary-color;
}

.fcom-mf-btn {
    flex: 1;
    padding: $spacing-sm $spacing-md;
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

    &--profile {
        background: transparent;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover {
            background: $gray-50;
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;
        padding: $spacing-md $spacing-xl;

        &:hover {
            background: $gray-50;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }
}

.fcom-mf-load-more {
    text-align: center;
    margin-top: $spacing-xl;
}

.fcom-mf-error-state,
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

.fcom-mf-error-state {
    svg {
        color: $error-color;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
