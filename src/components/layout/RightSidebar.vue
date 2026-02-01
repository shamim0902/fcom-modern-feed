<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { api } from '@/api/client';
import type { Member, MembersResponse } from '@/api/types';

const router = useRouter();
const authStore = useAuthStore();

const suggestedMembers = ref<Member[]>([]);
const loadingMembers = ref(false);

const communityStats = ref({
    members: 0,
    posts: 0,
    online: 0,
});

const followingState = ref<Record<number, boolean>>({});

async function fetchSuggestedMembers(): Promise<void> {
    loadingMembers.value = true;
    try {
        const response = await api.get<MembersResponse>('members', {
            per_page: 3,
            sort_by: 'last_activity',
            suggested: true,
        });
        suggestedMembers.value = response.members?.data || [];
        communityStats.value.members = response.members.total || suggestedMembers.value.length;
    } catch (error) {
        console.error('Failed to fetch members:', error);
    } finally {
        loadingMembers.value = false;
    }
}

async function toggleFollow(member: Member): Promise<void> {
    if (!authStore.isLoggedIn) return;

    try {
        await api.post(`profile/${member.username}/follow`);
        member.is_following = !member.is_following;
        followingState.value[member.id] = member.is_following;
    } catch (error) {
        console.error('Failed to toggle follow:', error);
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

        <!-- Suggested Members -->
        <div v-if="authStore.isLoggedIn" class="fcom-mf-sidebar-card">
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
                        <span class="fcom-mf-member-item__meta">{{ member.followers_count || 0 }} followers</span>
                    </div>
                    <button
                        class="fcom-mf-member-item__btn"
                        :class="{ 'fcom-mf-member-item__btn--following': isFollowing(member) }"
                        @click="toggleFollow(member)"
                    >
                        {{ isFollowing(member) ? 'Following' : 'Follow' }}
                    </button>
                </div>
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
                <a href="#">About</a>
                <a href="#">Help</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
            </div>
            <div class="fcom-mf-sidebar-footer__copyright">
                © 2025 Community · v1.0.0
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-right-sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

// Stats Card
.fcom-mf-stats-card {
    background: linear-gradient(135deg, $primary-color 0%, darken($primary-color, 15%) 100%);
    border-radius: $border-radius-lg;
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
        border-radius: $border-radius-md;

        &--online .fcom-mf-stats-card__value {
            color: $success-color;
        }
    }

    &__value {
        display: block;
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
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
    border-radius: $border-radius-lg;
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
        color: $primary-color;
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
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-xs;
    }

    &__meta {
        height: 10px;
        width: 50%;
        border-radius: $border-radius-sm;
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
            color: $primary-color;
        }
    }

    &__meta {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__btn {
        padding: $spacing-xs $spacing-md;
        border: none;
        border-radius: $border-radius-full;
        background: $primary-color;
        color: $white;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        cursor: pointer;
        transition: all $transition-fast;
        flex-shrink: 0;

        &:hover {
            background: $primary-hover;
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
    border-radius: $border-radius-lg;
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
        color: $primary-color;
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
