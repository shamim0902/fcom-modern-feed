<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();

const activeItem = ref('home');

interface MenuItem {
    id: string;
    icon: string;
    label: string;
    href: string;
    requireAuth?: boolean;
    badge?: number;
}

const menuItems = computed<MenuItem[]>(() => [
    { id: 'home', icon: 'home', label: 'Home', href: '/' },
    { id: 'profile', icon: 'user', label: 'My Profile', href: '/portal/profile', requireAuth: true },
    { id: 'members', icon: 'users', label: 'Members', href: '/portal/members' },
    { id: 'notifications', icon: 'bell', label: 'Notifications', href: '/portal/notifications', requireAuth: true, badge: 3 },
    { id: 'bookmarks', icon: 'bookmark', label: 'Saved Posts', href: '/portal/bookmarks', requireAuth: true },
    { id: 'settings', icon: 'settings', label: 'Settings', href: '/portal/settings', requireAuth: true },
]);

const spaces = ref([
    { title: 'General Discussion', slug: 'general', icon: '💬', members: 1234, unread: 5 },
    { title: 'Announcements', slug: 'announcements', icon: '📢', members: 890 },
    { title: 'Help & Support', slug: 'help', icon: '❓', members: 567 },
    { title: 'Feature Requests', slug: 'features', icon: '💡', members: 432 },
    { title: 'Off Topic', slug: 'off-topic', icon: '🎉', members: 789 },
]);

const shortcuts = ref([
    { title: 'Latest Updates', icon: '📰', href: '/portal/updates' },
    { title: 'Events', icon: '📅', href: '/portal/events' },
    { title: 'Leaderboard', icon: '🏆', href: '/portal/leaderboard' },
]);

function navigateTo(href: string): void {
    if (href === '/') {
        router.push('/');
    } else {
        window.location.href = href;
    }
}

function formatMembers(count: number): string {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
}

const icons: Record<string, string> = {
    home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
    bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
    settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
};
</script>

<template>
    <div class="fcom-mf-left-sidebar">
        <!-- User Card -->
        <div v-if="authStore.isLoggedIn" class="fcom-mf-sidebar-card fcom-mf-user-card">
            <a :href="`/portal/profile/${authStore.currentUser?.name}`" class="fcom-mf-user-card__link">
                <div class="fcom-mf-user-card__avatar-wrapper">
                    <img
                        :src="authStore.userAvatar"
                        :alt="authStore.userName || ''"
                        class="fcom-mf-user-card__avatar"
                    />
                    <span class="fcom-mf-user-card__status"></span>
                </div>
                <div class="fcom-mf-user-card__info">
                    <span class="fcom-mf-user-card__name">{{ authStore.userName }}</span>
                    <span class="fcom-mf-user-card__role">Community Member</span>
                </div>
            </a>
        </div>

        <!-- Main Navigation -->
        <nav class="fcom-mf-sidebar-nav">
            <template v-for="item in menuItems" :key="item.id">
                <button
                    v-if="!item.requireAuth || authStore.isLoggedIn"
                    class="fcom-mf-sidebar-nav__item"
                    :class="{ 'fcom-mf-sidebar-nav__item--active': activeItem === item.id }"
                    @click="navigateTo(item.href); activeItem = item.id"
                >
                    <div class="fcom-mf-sidebar-nav__icon">
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            v-html="icons[item.icon]"
                        ></svg>
                    </div>
                    <span class="fcom-mf-sidebar-nav__label">{{ item.label }}</span>
                    <span v-if="item.badge" class="fcom-mf-sidebar-nav__badge">{{ item.badge }}</span>
                </button>
            </template>
        </nav>

        <!-- Shortcuts Section -->
        <div class="fcom-mf-sidebar-section">
            <div class="fcom-mf-sidebar-section__header">
                <span class="fcom-mf-sidebar-section__title">Shortcuts</span>
            </div>
            <div class="fcom-mf-shortcuts">
                <a
                    v-for="shortcut in shortcuts"
                    :key="shortcut.href"
                    :href="shortcut.href"
                    class="fcom-mf-shortcut"
                >
                    <span class="fcom-mf-shortcut__icon">{{ shortcut.icon }}</span>
                    <span class="fcom-mf-shortcut__label">{{ shortcut.title }}</span>
                </a>
            </div>
        </div>

        <!-- Spaces Section -->
        <div class="fcom-mf-sidebar-section">
            <div class="fcom-mf-sidebar-section__header">
                <span class="fcom-mf-sidebar-section__title">Your Spaces</span>
                <a href="/portal/spaces" class="fcom-mf-sidebar-section__action">See all</a>
            </div>
            <div class="fcom-mf-spaces">
                <a
                    v-for="space in spaces"
                    :key="space.slug"
                    :href="`/portal/space/${space.slug}`"
                    class="fcom-mf-space"
                >
                    <div class="fcom-mf-space__icon-wrapper">
                        <span class="fcom-mf-space__icon">{{ space.icon }}</span>
                        <span v-if="space.unread" class="fcom-mf-space__unread"></span>
                    </div>
                    <div class="fcom-mf-space__info">
                        <span class="fcom-mf-space__name">{{ space.title }}</span>
                        <span class="fcom-mf-space__members">{{ formatMembers(space.members) }} members</span>
                    </div>
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div class="fcom-mf-sidebar-footer">
            <div class="fcom-mf-sidebar-footer__links">
                <a href="#">Privacy</a>
                <span>·</span>
                <a href="#">Terms</a>
                <span>·</span>
                <a href="#">Help</a>
            </div>
            <div class="fcom-mf-sidebar-footer__copyright">
                © 2025 Community
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-left-sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

// User Card
.fcom-mf-user-card {
    padding: $spacing-md;
    background: linear-gradient(135deg, $primary-color 0%, darken($primary-color, 10%) 100%);
    border-radius: $border-radius-lg;
    color: $white;

    &__link {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        text-decoration: none;
        color: inherit;
    }

    &__avatar-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        object-fit: cover;
        border: 2px solid rgba($white, 0.3);
    }

    &__status {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background: $success-color;
        border: 2px solid $primary-color;
        border-radius: $border-radius-full;
    }

    &__info {
        flex: 1;
        min-width: 0;
    }

    &__name {
        display: block;
        font-weight: $font-weight-semibold;
        font-size: $font-size-md;
        @include truncate;
    }

    &__role {
        display: block;
        font-size: $font-size-xs;
        opacity: 0.85;
        margin-top: 2px;
    }
}

// Navigation
.fcom-mf-sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &__item {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-sm $spacing-md;
        border: none;
        background: transparent;
        border-radius: $border-radius-lg;
        color: $text-primary;
        font-size: $font-size-md;
        font-weight: $font-weight-medium;
        cursor: pointer;
        transition: all $transition-fast;
        text-align: left;
        width: 100%;

        &:hover {
            background: $gray-100;
        }

        &--active {
            background: rgba($primary-color, 0.1);
            color: $primary-color;

            .fcom-mf-sidebar-nav__icon {
                background: $primary-color;
                color: $white;
            }
        }
    }

    &__icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: $gray-100;
        border-radius: $border-radius-md;
        transition: all $transition-fast;
        flex-shrink: 0;
    }

    &__label {
        flex: 1;
    }

    &__badge {
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        background: $error-color;
        color: $white;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        border-radius: $border-radius-full;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

// Sections
.fcom-mf-sidebar-section {
    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-sm $spacing-md;
        margin-bottom: $spacing-xs;
    }

    &__title {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-secondary;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    &__action {
        font-size: $font-size-sm;
        color: $primary-color;
        text-decoration: none;
        font-weight: $font-weight-medium;

        &:hover {
            text-decoration: underline;
        }
    }
}

// Shortcuts
.fcom-mf-shortcuts {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.fcom-mf-shortcut {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius-lg;
    color: $text-primary;
    text-decoration: none;
    font-size: $font-size-md;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-100;
    }

    &__icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: $gray-100;
        border-radius: $border-radius-md;
    }

    &__label {
        @include truncate;
    }
}

// Spaces
.fcom-mf-spaces {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.fcom-mf-space {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius-lg;
    color: $text-primary;
    text-decoration: none;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-100;
    }

    &__icon-wrapper {
        position: relative;
    }

    &__icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: $gray-100;
        border-radius: $border-radius-md;
    }

    &__unread {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background: $primary-color;
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
        font-weight: $font-weight-medium;
        @include truncate;
    }

    &__members {
        display: block;
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: 1px;
    }
}

// Footer
.fcom-mf-sidebar-footer {
    margin-top: auto;
    padding: $spacing-lg $spacing-md;
    font-size: $font-size-xs;
    color: $text-tertiary;

    &__links {
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

    &__copyright {
        margin-top: $spacing-sm;
    }
}
</style>
