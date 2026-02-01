<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

// Mock data for suggestions - in real app, this would come from API
const suggestedMembers = ref([
    { id: 1, name: 'John Doe', username: 'johndoe', avatar: 'https://i.pravatar.cc/150?u=1', role: 'Community Admin', isOnline: true, mutualFriends: 5 },
    { id: 2, name: 'Jane Smith', username: 'janesmith', avatar: 'https://i.pravatar.cc/150?u=2', role: 'Moderator', isOnline: true, mutualFriends: 3 },
    { id: 3, name: 'Mike Johnson', username: 'mikej', avatar: 'https://i.pravatar.cc/150?u=3', role: 'Member', isOnline: false, mutualFriends: 8 },
]);

const trendingTopics = ref([
    { slug: 'announcements', title: 'Announcements', posts: 24, isHot: true },
    { slug: 'tutorials', title: 'Tutorials', posts: 18, isHot: false },
    { slug: 'showcase', title: 'Showcase', posts: 15, isHot: true },
    { slug: 'questions', title: 'Questions', posts: 12, isHot: false },
]);

const upcomingEvents = ref([
    { title: 'Community Meetup', date: 'Feb 15, 2025', time: '3:00 PM', attendees: 45, color: '#6366f1' },
    { title: 'AMA Session', date: 'Feb 20, 2025', time: '2:00 PM', attendees: 28, color: '#22c55e' },
]);

const communityStats = ref({
    members: 12543,
    posts: 45231,
    online: 234,
});

const followingState = ref<Record<number, boolean>>({});

function toggleFollow(memberId: number): void {
    followingState.value[memberId] = !followingState.value[memberId];
}

function isFollowing(memberId: number): boolean {
    return followingState.value[memberId] || false;
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
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
                <a href="/portal/members">See All</a>
            </div>

            <div class="fcom-mf-members-list">
                <div
                    v-for="member in suggestedMembers"
                    :key="member.id"
                    class="fcom-mf-member-item"
                >
                    <a :href="`/portal/profile/${member.username}`" class="fcom-mf-member-item__avatar">
                        <img :src="member.avatar" :alt="member.name" />
                        <span v-if="member.isOnline" class="fcom-mf-member-item__online"></span>
                    </a>
                    <div class="fcom-mf-member-item__info">
                        <a :href="`/portal/profile/${member.username}`" class="fcom-mf-member-item__name">
                            {{ member.name }}
                        </a>
                        <span class="fcom-mf-member-item__meta">{{ member.mutualFriends }} mutual connections</span>
                    </div>
                    <button
                        class="fcom-mf-member-item__btn"
                        :class="{ 'fcom-mf-member-item__btn--following': isFollowing(member.id) }"
                        @click="toggleFollow(member.id)"
                    >
                        {{ isFollowing(member.id) ? 'Following' : 'Follow' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Trending Topics -->
        <div class="fcom-mf-sidebar-card">
            <div class="fcom-mf-sidebar-card__header">
                <h3>Trending Now</h3>
            </div>

            <div class="fcom-mf-topics-list">
                <a
                    v-for="(topic, index) in trendingTopics"
                    :key="topic.slug"
                    :href="`?topic=${topic.slug}`"
                    class="fcom-mf-topic-item"
                >
                    <div class="fcom-mf-topic-item__rank">{{ index + 1 }}</div>
                    <div class="fcom-mf-topic-item__content">
                        <span class="fcom-mf-topic-item__name">
                            #{{ topic.title }}
                            <span v-if="topic.isHot" class="fcom-mf-topic-item__hot">HOT</span>
                        </span>
                        <span class="fcom-mf-topic-item__count">{{ topic.posts }} posts today</span>
                    </div>
                    <svg class="fcom-mf-topic-item__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </a>
            </div>
        </div>

        <!-- Upcoming Events -->
        <div class="fcom-mf-sidebar-card">
            <div class="fcom-mf-sidebar-card__header">
                <h3>Upcoming Events</h3>
                <a href="/portal/events">See All</a>
            </div>

            <div class="fcom-mf-events-list">
                <div
                    v-for="(event, index) in upcomingEvents"
                    :key="index"
                    class="fcom-mf-event-item"
                >
                    <div class="fcom-mf-event-item__date" :style="{ background: event.color }">
                        <span class="fcom-mf-event-item__day">{{ event.date.split(' ')[1].replace(',', '') }}</span>
                        <span class="fcom-mf-event-item__month">{{ event.date.split(' ')[0] }}</span>
                    </div>
                    <div class="fcom-mf-event-item__info">
                        <span class="fcom-mf-event-item__title">{{ event.title }}</span>
                        <span class="fcom-mf-event-item__meta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {{ event.time }}
                            <span class="fcom-mf-event-item__sep">·</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                            {{ event.attendees }} attending
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="fcom-mf-quick-actions">
            <a href="/portal/create-space" class="fcom-mf-quick-action">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Create Space
            </a>
            <a href="/portal/invite" class="fcom-mf-quick-action">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Invite Friends
            </a>
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

        a {
            font-size: $font-size-sm;
            color: $primary-color;
            text-decoration: none;
            font-weight: $font-weight-medium;

            &:hover {
                text-decoration: underline;
            }
        }
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

// Topics List
.fcom-mf-topics-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.fcom-mf-topic-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm;
    border-radius: $border-radius-md;
    text-decoration: none;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-50;

        .fcom-mf-topic-item__arrow {
            opacity: 1;
            transform: translateX(2px);
        }
    }

    &__rank {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: $font-size-sm;
        font-weight: $font-weight-bold;
        color: $text-tertiary;
        background: $gray-100;
        border-radius: $border-radius-sm;
    }

    &__content {
        flex: 1;
        min-width: 0;
    }

    &__name {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__hot {
        padding: 1px 6px;
        background: $error-color;
        color: $white;
        font-size: 9px;
        font-weight: $font-weight-bold;
        border-radius: $border-radius-sm;
        text-transform: uppercase;
    }

    &__count {
        display: block;
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: 1px;
    }

    &__arrow {
        color: $text-tertiary;
        opacity: 0;
        transition: all $transition-fast;
    }
}

// Events List
.fcom-mf-events-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-event-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    &__date {
        width: 50px;
        height: 50px;
        border-radius: $border-radius-md;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: $white;
        flex-shrink: 0;
    }

    &__day {
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
        line-height: 1;
    }

    &__month {
        font-size: $font-size-xs;
        text-transform: uppercase;
        opacity: 0.9;
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__title {
        display: block;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        @include truncate;
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: 2px;

        svg {
            flex-shrink: 0;
        }
    }

    &__sep {
        margin: 0 2px;
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
</style>
