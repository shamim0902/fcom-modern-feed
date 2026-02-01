<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';
import { api } from '@/api/client';
import type { SpaceFull } from '@/api/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const spaces = ref<SpaceFull[]>([]);
const loadingSpaces = ref(false);

interface MenuItem {
    id: string;
    icon: string;
    label: string;
    route: string;
    requireAuth?: boolean;
    badge?: number;
}

const menuItems = computed<MenuItem[]>(() => [
    { id: 'home', icon: 'home', label: 'Home', route: '/' },
    { id: 'members', icon: 'users', label: 'Members', route: '/members' },
    { id: 'spaces', icon: 'grid', label: 'Spaces', route: '/spaces' },
    { id: 'leaderboard', icon: 'award', label: 'Leaderboard', route: '/leaderboard' },
    { id: 'notifications', icon: 'bell', label: 'Notifications', route: '/notifications', requireAuth: true, badge: 3 },
    { id: 'bookmarks', icon: 'bookmark', label: 'Saved Posts', route: '/bookmarks', requireAuth: true },
]);

async function fetchUserSpaces(): Promise<void> {
    if (!authStore.isLoggedIn) return;

    loadingSpaces.value = true;
    try {
        const response = await api.get<{ my_spaces: SpaceFull[] }>('spaces', { my_spaces_only: true });
        spaces.value = response.my_spaces || [];
    } catch (error) {
        console.error('Failed to fetch spaces:', error);
    } finally {
        loadingSpaces.value = false;
    }
}

function isActive(itemRoute: string): boolean {
    if (itemRoute === '/') {
        return route.path === '/';
    }
    return route.path.startsWith(itemRoute);
}

function navigateTo(routePath: string): void {
    router.push(routePath);
}

function navigateToProfile(): void {
    if (authStore.currentUser) {
        router.push({ name: 'profile', params: { username: authStore.currentUser.name } });
    }
}

function navigateToSpace(slug: string): void {
    router.push({ name: 'space', params: { slug } });
}

function formatMembers(count: number): string {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
}

onMounted(() => {
    fetchUserSpaces();
});

const icons: Record<string, string> = {
    home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
    bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
    grid: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`,
    award: `<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>`,
    settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
};
</script>

<template>
    <div class="fcom-mf-left-sidebar">
        <!-- User Card -->
        <div v-if="authStore.isLoggedIn" class="fcom-mf-sidebar-card fcom-mf-user-card">
            <a class="fcom-mf-user-card__link" @click.prevent="navigateToProfile">
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
                    :class="{ 'fcom-mf-sidebar-nav__item--active': isActive(item.route) }"
                    @click="navigateTo(item.route)"
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

        <!-- Spaces Section -->
        <div v-if="authStore.isLoggedIn && spaces.length > 0" class="fcom-mf-sidebar-section">
            <div class="fcom-mf-sidebar-section__header">
                <span class="fcom-mf-sidebar-section__title">Your Spaces</span>
                <button class="fcom-mf-sidebar-section__action" @click="navigateTo('/spaces')">See all</button>
            </div>
            <div class="fcom-mf-spaces">
                <button
                    v-for="space in spaces.slice(0, 5)"
                    :key="space.slug"
                    class="fcom-mf-space"
                    @click="navigateToSpace(space.slug)"
                >
                    <div class="fcom-mf-space__icon-wrapper">
                        <img v-if="space.logo" :src="space.logo" :alt="space.title" class="fcom-mf-space__logo" />
                        <span v-else class="fcom-mf-space__icon">{{ space.title.charAt(0) }}</span>
                    </div>
                    <div class="fcom-mf-space__info">
                        <span class="fcom-mf-space__name">{{ space.title }}</span>
                        <span class="fcom-mf-space__members">{{ formatMembers(space.members_count) }} members</span>
                    </div>
                </button>
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
        cursor: pointer;
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
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;

        &:hover {
            text-decoration: underline;
        }
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
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    cursor: pointer;

    &:hover {
        background: $gray-100;
    }

    &__icon-wrapper {
        position: relative;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
    }

    &__logo {
        width: 36px;
        height: 36px;
        border-radius: $border-radius-md;
        object-fit: cover;
    }

    &__icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: $font-weight-bold;
        background: $primary-color;
        color: $white;
        border-radius: $border-radius-md;
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
