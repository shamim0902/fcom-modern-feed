<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isVisible = ref(true);
const lastScrollY = ref(0);
const showMenu = ref(false);

interface NavItem {
    name: string;
    route: string;
    icon: string;
    label: string;
    badge?: number;
}

defineProps<{
    notificationCount?: number;
}>();

const navItems: NavItem[] = [
    { name: 'home', route: '/', icon: 'home', label: 'Home' },
    { name: 'members', route: '/members', icon: 'users', label: 'Members' },
    { name: 'notifications', route: '/notifications', icon: 'bell', label: 'Alerts' },
];

// Menu items shown in the drawer
const menuItems = [
    { name: 'spaces', route: '/spaces', icon: 'grid', label: 'Spaces' },
    { name: 'bookmarks', route: '/bookmarks', icon: 'bookmark', label: 'Saved' },
    { name: 'leaderboard', route: '/leaderboard', icon: 'trophy', label: 'Leaderboard' },
];

function isActive(itemRoute: string): boolean {
    if (itemRoute === '/') {
        return route.path === '/' || route.path === '/home';
    }
    return route.path.startsWith(itemRoute);
}

function navigate(itemRoute: string): void {
    showMenu.value = false;
    router.push(itemRoute);
}

function toggleMenu(): void {
    showMenu.value = !showMenu.value;
}

function closeMenu(): void {
    showMenu.value = false;
}

function goToProfile(): void {
    const username = authStore.currentUser?.username;
    if (username) {
        navigate(`/u/${username}`);
    }
}

/** Full-page redirect so WordPress session is cleared and page reloads with fresh auth state. */
function doLogout(): void {
    const url = authStore.logoutUrl || window.fcomModernFeed?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = url;
}

function handleScroll(): void {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 50) {
        // Always show when near top
        isVisible.value = true;
    } else if (currentScrollY > lastScrollY.value) {
        // Scrolling down - hide nav and close menu
        isVisible.value = false;
        showMenu.value = false;
    } else {
        // Scrolling up
        isVisible.value = true;
    }

    lastScrollY.value = currentScrollY;
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
    <div class="fcom-mf-mobile-nav-wrapper">
        <!-- Menu Drawer Overlay -->
        <Transition name="fcom-mf-fade">
            <div v-if="showMenu" class="fcom-mf-menu-overlay" @click="closeMenu"></div>
        </Transition>

        <!-- Menu Drawer -->
        <Transition name="fcom-mf-slide">
            <div v-if="showMenu" class="fcom-mf-menu-drawer">
                <div class="fcom-mf-menu-drawer__header">
                    <span class="fcom-mf-menu-drawer__title">Menu</span>
                    <button class="fcom-mf-menu-drawer__close" @click="closeMenu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- User section (if logged in) -->
                <div v-if="authStore.isLoggedIn" class="fcom-mf-menu-drawer__user" @click="goToProfile">
                    <img :src="authStore.userAvatar" :alt="authStore.userName || ''" class="fcom-mf-menu-drawer__avatar" />
                    <div class="fcom-mf-menu-drawer__user-info">
                        <span class="fcom-mf-menu-drawer__user-name">{{ authStore.userName }}</span>
                        <span class="fcom-mf-menu-drawer__user-label">View profile</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>

                <div class="fcom-mf-menu-drawer__divider"></div>

                <!-- Menu items -->
                <div class="fcom-mf-menu-drawer__items">
                    <button
                        v-for="item in menuItems"
                        :key="item.name"
                        class="fcom-mf-menu-drawer__item"
                        :class="{ 'fcom-mf-menu-drawer__item--active': isActive(item.route) }"
                        @click="navigate(item.route)"
                    >
                        <!-- Grid/Spaces Icon -->
                        <svg v-if="item.icon === 'grid'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                        </svg>

                        <!-- Bookmark Icon -->
                        <svg v-else-if="item.icon === 'bookmark'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                        </svg>

                        <!-- Trophy Icon -->
                        <svg v-else-if="item.icon === 'trophy'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                        </svg>

                        <span>{{ item.label }}</span>
                    </button>
                </div>

                <!-- Login/Logout -->
                <div class="fcom-mf-menu-drawer__footer">
                    <template v-if="authStore.isLoggedIn">
                        <button type="button" class="fcom-mf-menu-drawer__item fcom-mf-menu-drawer__item--logout" @click="doLogout">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                            </svg>
                            <span>Log out</span>
                        </button>
                    </template>
                    <template v-else>
                        <a :href="authStore.loginUrl || '/wp-login.php'" class="fcom-mf-menu-drawer__item fcom-mf-menu-drawer__item--login">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                            </svg>
                            <span>Log in</span>
                        </a>
                    </template>
                </div>
            </div>
        </Transition>

        <!-- Bottom Navigation Bar -->
        <nav class="fcom-mf-mobile-nav" :class="{ 'fcom-mf-mobile-nav--hidden': !isVisible }">
            <button
                v-for="item in navItems"
                :key="item.name"
                class="fcom-mf-mobile-nav__item"
                :class="{ 'fcom-mf-mobile-nav__item--active': isActive(item.route) }"
                @click="navigate(item.route)"
            >
                <!-- Home Icon -->
                <svg v-if="item.icon === 'home'" width="24" height="24" viewBox="0 0 24 24" :fill="isActive(item.route) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>

                <!-- Users Icon -->
                <svg v-else-if="item.icon === 'users'" width="24" height="24" viewBox="0 0 24 24" :fill="isActive(item.route) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>

                <!-- Bell Icon with Badge -->
                <div v-else-if="item.icon === 'bell'" class="fcom-mf-mobile-nav__icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" :fill="isActive(item.route) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span v-if="notificationCount && notificationCount > 0" class="fcom-mf-mobile-nav__badge">
                        {{ notificationCount > 99 ? '99+' : notificationCount }}
                    </span>
                </div>

                <span class="fcom-mf-mobile-nav__label">{{ item.label }}</span>
            </button>

            <!-- Menu Button (toggles drawer) -->
            <button
                class="fcom-mf-mobile-nav__item"
                :class="{ 'fcom-mf-mobile-nav__item--active': showMenu }"
                @click="toggleMenu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <span class="fcom-mf-mobile-nav__label">Menu</span>
            </button>
        </nav>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-mobile-nav-wrapper {
    // Container for nav and menu drawer
}

// Menu overlay
.fcom-mf-menu-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: $z-modal - 1;

    @media (max-width: $breakpoint-md) {
        display: block;
    }
}

// Menu drawer
.fcom-mf-menu-drawer {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 80vh;
    background: $white;
    border-radius: $border-radius-lg $border-radius-lg 0 0;
    z-index: $z-modal;
    overflow-y: auto;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);

    @media (max-width: $breakpoint-md) {
        display: block;
    }

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-md $spacing-lg;
        border-bottom: 1px solid $border-color;
        position: sticky;
        top: 0;
        background: $white;
    }

    &__title {
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
        color: $text-primary;
    }

    &__close {
        @include button-reset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: $border-radius-full;
        color: $text-secondary;
        transition: background $transition-fast;

        &:hover {
            background: $gray-100;
        }

        &:active {
            background: $gray-200;
        }
    }

    &__user {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-lg;
        cursor: pointer;
        transition: background $transition-fast;

        &:hover {
            background: $gray-50;
        }

        &:active {
            background: $gray-100;
        }

        svg {
            color: $text-tertiary;
            margin-left: auto;
        }
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        object-fit: cover;
    }

    &__user-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__user-name {
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__user-label {
        font-size: $font-size-sm;
        color: $text-secondary;
    }

    &__divider {
        height: 1px;
        background: $border-color;
        margin: 0;
    }

    &__items {
        padding: $spacing-sm 0;
    }

    &__item {
        @include button-reset;
        display: flex;
        align-items: center;
        gap: $spacing-md;
        width: 100%;
        padding: $spacing-md $spacing-lg;
        font-size: $font-size-md;
        color: $text-primary;
        text-decoration: none;
        transition: background $transition-fast;

        &:hover {
            background: $gray-50;
        }

        &:active {
            background: $gray-100;
        }

        svg {
            color: $text-secondary;
        }

        &--active {
            color: $primary-color;
            background: rgba($primary-color, 0.08);

            svg {
                color: $primary-color;
            }
        }

        &--logout {
            color: $danger-color;

            svg {
                color: $danger-color;
            }
        }

        &--login {
            color: $primary-color;

            svg {
                color: $primary-color;
            }
        }
    }

    &__footer {
        border-top: 1px solid $border-color;
        padding: $spacing-sm 0;
        padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
    }
}

// Bottom navigation bar
.fcom-mf-mobile-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: $white;
    border-top: 1px solid $border-color;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    z-index: $z-sticky;
    transition: transform $transition-normal;
    padding-bottom: env(safe-area-inset-bottom);

    @media (max-width: $breakpoint-md) {
        display: flex;
        align-items: center;
        justify-content: space-around;
    }

    &--hidden {
        transform: translateY(100%);
    }

    &__item {
        @include button-reset;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        flex: 1;
        height: 100%;
        padding: $spacing-xs;
        color: $text-secondary;
        transition: color $transition-instant;

        &--active {
            color: $primary-color;
        }

        &:active {
            background: $bg-hover;
        }
    }

    &__icon-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__badge {
        @include badge;
        position: absolute;
        top: -6px;
        right: -10px;
        min-width: 16px;
        height: 16px;
        font-size: 10px;
        padding: 0 4px;
    }

    &__label {
        font-size: 10px;
        font-weight: $font-weight-medium;
        line-height: 1;
    }
}

// Transitions
.fcom-mf-fade-enter-active,
.fcom-mf-fade-leave-active {
    transition: opacity 0.2s ease;
}

.fcom-mf-fade-enter-from,
.fcom-mf-fade-leave-to {
    opacity: 0;
}

.fcom-mf-slide-enter-active,
.fcom-mf-slide-leave-active {
    transition: transform 0.25s ease;
}

.fcom-mf-slide-enter-from,
.fcom-mf-slide-leave-to {
    transform: translateY(100%);
}
</style>
