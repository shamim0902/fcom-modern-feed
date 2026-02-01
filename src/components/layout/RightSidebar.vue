<script setup lang="ts">
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

// Mock data for suggestions - in real app, this would come from API
const suggestedMembers = [
    { id: 1, name: 'John Doe', username: 'johndoe', avatar: 'https://i.pravatar.cc/150?u=1', role: 'Community Admin' },
    { id: 2, name: 'Jane Smith', username: 'janesmith', avatar: 'https://i.pravatar.cc/150?u=2', role: 'Moderator' },
    { id: 3, name: 'Mike Johnson', username: 'mikej', avatar: 'https://i.pravatar.cc/150?u=3', role: 'Member' },
];

const trendingTopics = [
    { slug: 'announcements', title: 'Announcements', posts: 24 },
    { slug: 'tutorials', title: 'Tutorials', posts: 18 },
    { slug: 'showcase', title: 'Showcase', posts: 15 },
    { slug: 'questions', title: 'Questions', posts: 12 },
];

const upcomingEvents = [
    { title: 'Community Meetup', date: 'Feb 15, 2025', time: '3:00 PM' },
    { title: 'AMA Session', date: 'Feb 20, 2025', time: '2:00 PM' },
];
</script>

<template>
    <div class="fcom-mf-right-sidebar">
        <!-- Sponsored / Ad slot -->
        <div class="fcom-mf-right-sidebar__card fcom-mf-right-sidebar__sponsored">
            <span class="fcom-mf-right-sidebar__label">Sponsored</span>
            <div class="fcom-mf-right-sidebar__ad">
                <div class="fcom-mf-right-sidebar__ad-placeholder">
                    Ad Space
                </div>
            </div>
        </div>

        <!-- Suggested Members -->
        <div v-if="authStore.isLoggedIn" class="fcom-mf-right-sidebar__card">
            <div class="fcom-mf-right-sidebar__header">
                <h3>People You May Know</h3>
                <a href="/portal/members">See All</a>
            </div>

            <div class="fcom-mf-right-sidebar__list">
                <div
                    v-for="member in suggestedMembers"
                    :key="member.id"
                    class="fcom-mf-right-sidebar__member"
                >
                    <a :href="`/portal/profile/${member.username}`" class="fcom-mf-right-sidebar__member-avatar">
                        <img :src="member.avatar" :alt="member.name" />
                    </a>
                    <div class="fcom-mf-right-sidebar__member-info">
                        <a :href="`/portal/profile/${member.username}`" class="fcom-mf-right-sidebar__member-name">
                            {{ member.name }}
                        </a>
                        <span class="fcom-mf-right-sidebar__member-role">{{ member.role }}</span>
                    </div>
                    <button class="fcom-mf-right-sidebar__follow-btn">
                        Follow
                    </button>
                </div>
            </div>
        </div>

        <!-- Trending Topics -->
        <div class="fcom-mf-right-sidebar__card">
            <div class="fcom-mf-right-sidebar__header">
                <h3>Trending Topics</h3>
            </div>

            <div class="fcom-mf-right-sidebar__topics">
                <a
                    v-for="topic in trendingTopics"
                    :key="topic.slug"
                    :href="`?topic=${topic.slug}`"
                    class="fcom-mf-right-sidebar__topic"
                >
                    <span class="fcom-mf-right-sidebar__topic-name">#{{ topic.title }}</span>
                    <span class="fcom-mf-right-sidebar__topic-count">{{ topic.posts }} posts</span>
                </a>
            </div>
        </div>

        <!-- Upcoming Events -->
        <div class="fcom-mf-right-sidebar__card">
            <div class="fcom-mf-right-sidebar__header">
                <h3>Upcoming Events</h3>
                <a href="/portal/events">See All</a>
            </div>

            <div class="fcom-mf-right-sidebar__events">
                <div
                    v-for="(event, index) in upcomingEvents"
                    :key="index"
                    class="fcom-mf-right-sidebar__event"
                >
                    <div class="fcom-mf-right-sidebar__event-date">
                        <span class="fcom-mf-right-sidebar__event-day">{{ event.date.split(' ')[1].replace(',', '') }}</span>
                        <span class="fcom-mf-right-sidebar__event-month">{{ event.date.split(' ')[0] }}</span>
                    </div>
                    <div class="fcom-mf-right-sidebar__event-info">
                        <span class="fcom-mf-right-sidebar__event-title">{{ event.title }}</span>
                        <span class="fcom-mf-right-sidebar__event-time">{{ event.time }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Links -->
        <div class="fcom-mf-right-sidebar__footer">
            <a href="#">About</a>
            <a href="#">Help</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <span class="fcom-mf-right-sidebar__copyright">© 2025 Community</span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-right-sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;

    &__card {
        background: $white;
        border-radius: $border-radius-md;
        padding: $spacing-md;
        box-shadow: $shadow-sm;
    }

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $spacing-md;

        h3 {
            font-size: $font-size-md;
            font-weight: $font-weight-semibold;
            color: $text-secondary;
            margin: 0;
        }

        a {
            font-size: $font-size-sm;
            color: $primary-color;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__label {
        font-size: $font-size-xs;
        color: $text-tertiary;
        display: block;
        margin-bottom: $spacing-sm;
    }

    &__ad {
        border-radius: $border-radius-sm;
        overflow: hidden;
    }

    &__ad-placeholder {
        background: $gray-100;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $text-tertiary;
        font-size: $font-size-sm;
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
    }

    &__member {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
    }

    &__member-avatar {
        flex-shrink: 0;

        img {
            width: 40px;
            height: 40px;
            border-radius: $border-radius-full;
            object-fit: cover;
        }
    }

    &__member-info {
        flex: 1;
        min-width: 0;
    }

    &__member-name {
        display: block;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        text-decoration: none;
        @include truncate;

        &:hover {
            text-decoration: underline;
        }
    }

    &__member-role {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__follow-btn {
        padding: $spacing-xs $spacing-md;
        border: none;
        border-radius: $border-radius-sm;
        background: $primary-color;
        color: $white;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        cursor: pointer;
        transition: background-color $transition-fast;
        flex-shrink: 0;

        &:hover {
            background: $primary-hover;
        }
    }

    &__topics {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
    }

    &__topic {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-sm;
        border-radius: $border-radius-sm;
        text-decoration: none;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-50;
        }
    }

    &__topic-name {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__topic-count {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__events {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
    }

    &__event {
        display: flex;
        align-items: center;
        gap: $spacing-md;
    }

    &__event-date {
        width: 48px;
        height: 48px;
        background: $gray-50;
        border-radius: $border-radius-md;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    &__event-day {
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
        color: $primary-color;
        line-height: 1;
    }

    &__event-month {
        font-size: $font-size-xs;
        color: $text-tertiary;
        text-transform: uppercase;
    }

    &__event-info {
        flex: 1;
        min-width: 0;
    }

    &__event-title {
        display: block;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        @include truncate;
    }

    &__event-time {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__footer {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;
        font-size: $font-size-xs;
        color: $text-tertiary;

        a {
            color: $text-tertiary;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__copyright {
        width: 100%;
        margin-top: $spacing-xs;
    }
}
</style>
