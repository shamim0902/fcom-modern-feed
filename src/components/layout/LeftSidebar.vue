<script setup lang="ts">
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

const menuItems = [
    { icon: 'home', label: 'Home', href: '/portal', active: true },
    { icon: 'user', label: 'My Profile', href: '/portal/profile', requireAuth: true },
    { icon: 'users', label: 'Members', href: '/portal/members' },
    { icon: 'bell', label: 'Notifications', href: '/portal/notifications', requireAuth: true },
    { icon: 'bookmark', label: 'Saved Posts', href: '/portal/bookmarks', requireAuth: true },
    { icon: 'settings', label: 'Settings', href: '/portal/settings', requireAuth: true },
];

const spaces = [
    { title: 'General Discussion', slug: 'general', icon: '💬' },
    { title: 'Announcements', slug: 'announcements', icon: '📢' },
    { title: 'Help & Support', slug: 'help', icon: '❓' },
    { title: 'Feature Requests', slug: 'features', icon: '💡' },
];

function getIcon(name: string): string {
    const icons: Record<string, string> = {
        home: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
        user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    };
    return icons[name] || '';
}
</script>

<template>
    <div class="fcom-mf-left-sidebar">
        <!-- User Info -->
        <div v-if="authStore.isLoggedIn" class="fcom-mf-left-sidebar__user">
            <a :href="`/portal/profile/${authStore.currentUser?.name}`" class="fcom-mf-left-sidebar__user-link">
                <img
                    :src="authStore.userAvatar"
                    :alt="authStore.userName || ''"
                    class="fcom-mf-avatar"
                />
                <span class="fcom-mf-left-sidebar__user-name">{{ authStore.userName }}</span>
            </a>
        </div>

        <!-- Main Menu -->
        <nav class="fcom-mf-left-sidebar__nav">
            <template v-for="item in menuItems" :key="item.href">
                <a
                    v-if="!item.requireAuth || authStore.isLoggedIn"
                    :href="item.href"
                    class="fcom-mf-left-sidebar__nav-item"
                    :class="{ 'fcom-mf-left-sidebar__nav-item--active': item.active }"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        :fill="item.active ? 'currentColor' : 'none'"
                        :stroke="item.active ? 'none' : 'currentColor'"
                        stroke-width="2"
                        v-html="getIcon(item.icon)"
                    ></svg>
                    <span>{{ item.label }}</span>
                </a>
            </template>
        </nav>

        <div class="fcom-mf-left-sidebar__divider"></div>

        <!-- Spaces -->
        <div class="fcom-mf-left-sidebar__section">
            <div class="fcom-mf-left-sidebar__section-header">
                <span>Your Spaces</span>
                <a href="/portal/spaces" class="fcom-mf-left-sidebar__section-action">See all</a>
            </div>

            <div class="fcom-mf-left-sidebar__spaces">
                <a
                    v-for="space in spaces"
                    :key="space.slug"
                    :href="`/portal/space/${space.slug}`"
                    class="fcom-mf-left-sidebar__space"
                >
                    <span class="fcom-mf-left-sidebar__space-icon">{{ space.icon }}</span>
                    <span class="fcom-mf-left-sidebar__space-name">{{ space.title }}</span>
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div class="fcom-mf-left-sidebar__footer">
            <a href="#">Privacy</a>
            <span>·</span>
            <a href="#">Terms</a>
            <span>·</span>
            <a href="#">Help</a>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-left-sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &__user {
        margin-bottom: $spacing-sm;
    }

    &__user-link {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-sm;
        border-radius: $border-radius-md;
        color: $text-primary;
        text-decoration: none;
        font-weight: $font-weight-semibold;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-100;
        }
    }

    &__user-name {
        @include truncate;
    }

    &__nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__nav-item {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-sm $spacing-md;
        border-radius: $border-radius-md;
        color: $text-primary;
        text-decoration: none;
        font-size: $font-size-md;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-100;
        }

        &--active {
            color: $primary-color;
            font-weight: $font-weight-semibold;
        }

        svg {
            flex-shrink: 0;
        }
    }

    &__divider {
        height: 1px;
        background: $border-color;
        margin: $spacing-md 0;
    }

    &__section {
        &-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: $spacing-sm;
            font-size: $font-size-sm;
            font-weight: $font-weight-semibold;
            color: $text-secondary;
        }

        &-action {
            color: $primary-color;
            font-size: $font-size-sm;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__spaces {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__space {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-sm $spacing-md;
        border-radius: $border-radius-md;
        color: $text-primary;
        text-decoration: none;
        font-size: $font-size-md;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-100;
        }
    }

    &__space-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: $gray-100;
        border-radius: $border-radius-md;
        font-size: 18px;
    }

    &__space-name {
        @include truncate;
    }

    &__footer {
        margin-top: auto;
        padding: $spacing-lg $spacing-sm;
        font-size: $font-size-xs;
        color: $text-tertiary;
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-xs;

        a {
            color: $text-tertiary;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }
}
</style>
