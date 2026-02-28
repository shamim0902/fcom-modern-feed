<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';
import type { ProfileDropdownItem } from '@/api/client';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const searchQuery = ref((route.query.search as string) || '');
const showUserMenu = ref(false);

// Dark mode: sync with localStorage override and theme-changed events
const isDarkMode = ref(false);
function refreshDarkMode(): void {
    isDarkMode.value = (window as unknown as { fcomModernFeed?: { isDarkMode?: () => boolean } }).fcomModernFeed?.isDarkMode?.() ?? false;
}
function toggleDarkMode(): void {
    const api = (window as unknown as { fcomModernFeed?: { setThemeOverride?: (v: 'dark' | 'light' | null) => void; isDarkMode?: () => boolean } }).fcomModernFeed;
    if (!api?.setThemeOverride) return;
    api.setThemeOverride(api.isDarkMode?.() ? 'light' : 'dark');
    refreshDarkMode();
}
onMounted(() => {
    refreshDarkMode();
    window.addEventListener('fcom-mf-theme-changed', refreshDarkMode);
});
onUnmounted(() => {
    window.removeEventListener('fcom-mf-theme-changed', refreshDarkMode);
});

// Keep search input in sync with route (e.g. when navigating to /?search=...)
watch(
    () => route.query.search,
    (q) => {
        searchQuery.value = (q as string) || '';
    }
);

const loginUrl = computed(() => window.fcomModernFeed?.loginUrl || '/wp-login.php');

/** Profile dropdown: merge settings items with Profile, Saved, Portal Settings (order preserved). */
const profileDropdownItems = computed(() => {
    const fromSettings = (window.fcomModernFeed?.profileDropdownItems ?? []) as ProfileDropdownItem[];
    const hasPortalSettings = fromSettings.some((i) => i.slug === 'portal_settings');
    const needsPortalSettings = authStore.canAccessAdminSettings && !hasPortalSettings;
    const profileNameLabel = authStore.userName || authStore.userUsername || 'My Profile';
    const profileNameItem: ProfileDropdownItem = {
        slug: 'my_profile_name',
        title: profileNameLabel,
        permalink: '',
        shape_svg: '',
        enabled: 'yes',
    };

    if (fromSettings.length === 0) {
        // Default order: Profile, Saved, Portal Settings (if admin), divider, Logout
        const defaultItems: ProfileDropdownItem[] = [
            profileNameItem,
            { slug: 'profile', title: 'Profile', permalink: '', shape_svg: '', enabled: 'yes' },
            { slug: 'bookmarks', title: 'Saved', permalink: '', shape_svg: '', enabled: 'yes' },
        ];
        if (needsPortalSettings) {
            defaultItems.push({
                slug: 'portal_settings',
                title: 'Portal Settings',
                permalink: authStore.adminSettingsUrl || '',
                shape_svg: '',
                enabled: 'yes',
            });
        }
        defaultItems.push({ slug: 'logout', title: 'Log out', permalink: '', shape_svg: '', enabled: 'yes' });
        return defaultItems;
    }

    const merged: ProfileDropdownItem[] = [profileNameItem];
    for (const item of fromSettings) {
        if (item.slug === 'logout' && needsPortalSettings) {
            merged.push({
                slug: 'portal_settings',
                title: 'Portal Settings',
                permalink: authStore.adminSettingsUrl || '',
                shape_svg: '',
                enabled: 'yes',
            });
        }
        merged.push(item);
    }
    if (needsPortalSettings && !merged.some((i) => i.slug === 'portal_settings')) {
        merged.push({
            slug: 'portal_settings',
            title: 'Portal Settings',
            permalink: authStore.adminSettingsUrl || '',
            shape_svg: '',
            enabled: 'yes',
        });
    }
    return merged;
});

function handleSearch(): void {
    const q = searchQuery.value.trim();
    router.push({
        path: '/',
        query: q ? { search: q } : {},
    });
}

function toggleUserMenu(): void {
    showUserMenu.value = !showUserMenu.value;
}

function closeUserMenu(): void {
    setTimeout(() => {
        showUserMenu.value = false;
    }, 150);
}

function navigateTo(path: string): void {
    showUserMenu.value = false;
    router.push(path);
}

function goToProfile(): void {
    const username = authStore.userUsername || authStore.currentUser?.username;
    if (username) {
        showUserMenu.value = false;
        router.push(`/u/${username}`);
    }
}

/** Full-page redirect so WordPress session is cleared and page reloads with fresh auth state. */
function doLogout(): void {
    const url = authStore.logoutUrl || window.fcomModernFeed?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = url;
}

function handleDropdownAction(item: ProfileDropdownItem): void {
    showUserMenu.value = false;
    if (item.slug === 'profile' || item.slug === 'my_profile_name') {
        goToProfile();
        return;
    }
    if (item.slug === 'bookmarks') {
        router.push('/bookmarks');
        return;
    }
    if (item.slug === 'logout') {
        doLogout();
        return;
    }
    if (item.slug === 'portal_settings' && item.permalink) {
        window.location.href = item.permalink;
        return;
    }
    if (item.permalink) {
        const base = (window.fcomModernFeed?.portalBaseUrl ?? '').replace(/\/$/, '');
        if (base && item.permalink.startsWith(base)) {
            const path = item.permalink === base ? '/' : item.permalink.slice(base.length).replace(/^\//, '');
            const routePath = path === 'bookmarks' ? '/bookmarks' : path === 'notifications' ? '/notifications' : path ? '/' + path : '/';
            router.push(routePath);
        } else {
            window.location.href = item.permalink;
        }
    }
}

function isInternalRoute(item: ProfileDropdownItem): boolean {
    if (!item.permalink) return false;
    const base = (window.fcomModernFeed?.portalBaseUrl ?? '').replace(/\/$/, '');
    return !!base && item.permalink.startsWith(base);
}

const defaultIcons: Record<string, string> = {
    my_profile_name: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    profile: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    bookmarks: '<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>',
    logout: '<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>',
    portal_settings:
        '<path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    my_spaces:
        '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
};
</script>

<template>
    <header class="header">
        <div class="header__inner">
            <!-- Logo -->
            <button class="header__logo" @click="navigateTo('/')">
                <svg width="28" height="28" viewBox="0 0 50 50" fill="currentColor">
                    <circle cx="25" cy="25" r="23" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M15 20h20M15 25h20M15 30h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </button>

            <!-- Search -->
            <div class="header__search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m21 21-4-4"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search..."
                    @keyup.enter="handleSearch"
                />
            </div>

            <!-- Nav -->
            <nav class="header__nav">
                <button
                    class="header__nav-btn header__nav-btn--active"
                    title="Home"
                    @click="navigateTo('/')"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                </button>
                <button class="header__nav-btn" title="Members" @click="navigateTo('/members')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                </button>
                <button class="header__nav-btn" title="Spaces" @click="navigateTo('/spaces')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
                    </svg>
                </button>
                <button class="header__nav-btn" title="Notifications" @click="navigateTo('/notifications')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                </button>
            </nav>

            <!-- User -->
            <div class="header__user">
                <template v-if="authStore.isLoggedIn">
                    <button
                        class="header__avatar-btn"
                        @click="toggleUserMenu"
                        @blur="closeUserMenu"
                    >
                        <img
                            :src="authStore.userAvatar"
                            :alt="authStore.userName || ''"
                        />
                    </button>

                    <Transition name="fade">
                        <div v-if="showUserMenu" class="header__menu">
                            <div class="header__menu-theme">
                                <span class="header__menu-theme-label">Dark mode</span>
                                <button
                                    type="button"
                                    class="header__menu-theme-toggle"
                                    :class="{ 'header__menu-theme-toggle--on': isDarkMode }"
                                    :aria-pressed="isDarkMode"
                                    @mousedown.prevent="toggleDarkMode"
                                >
                                    <span class="header__menu-theme-knob"></span>
                                </button>
                            </div>
                            <div class="header__menu-divider"></div>
                            <template v-for="(item, idx) in profileDropdownItems" :key="item.slug + String(idx)">
                                <div v-if="item.slug === 'logout'" class="header__menu-divider"></div>
                                <button
                                    v-if="item.slug === 'logout' || item.slug === 'profile' || item.slug === 'my_profile_name' || item.slug === 'bookmarks' || (item.permalink && isInternalRoute(item))"
                                    type="button"
                                    class="header__menu-item"
                                    @mousedown="handleDropdownAction(item)"
                                >
                                    <span v-if="item.shape_svg" class="header__menu-icon" v-html="item.shape_svg"></span>
                                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" v-html="defaultIcons[item.slug] || defaultIcons.profile"></svg>
                                    {{ item.title }}
                                </button>
                                <a
                                    v-else
                                    :href="item.permalink"
                                    class="header__menu-item"
                                >
                                    <span v-if="item.shape_svg" class="header__menu-icon" v-html="item.shape_svg"></span>
                                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" v-html="defaultIcons[item.slug] || defaultIcons.portal_settings"></svg>
                                    {{ item.title }}
                                </a>
                            </template>
                        </div>
                    </Transition>
                </template>
                <a v-else :href="loginUrl" class="header__login-btn">Log in</a>
            </div>
        </div>
    </header>
</template>

<style lang="scss" scoped>
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: $white;
    border-bottom: 1px solid $border-color;
    z-index: $z-sticky;

    &__inner {
        display: flex;
        align-items: center;
        height: 100%;
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 $spacing-md;
        gap: $spacing-md;
    }

    &__logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        color: var(--fcom-mf-primary, #1877f2);
        background: none;
        border: none;
        cursor: pointer;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        transition: opacity $transition-fast;
        flex-shrink: 0;

        &:hover {
            opacity: 0.8;
        }
    }

    &__search {
        display: flex;
        align-items: center;
        gap: 8px;
        background: $gray-50;
        border-radius: var(--fcom-mf-radius-lg, 12px);
        padding: 6px 12px;
        flex: 1;
        max-width: 220px;

        @media (max-width: $breakpoint-md) {
            display: none;
        }

        svg {
            color: $text-tertiary;
            flex-shrink: 0;
        }

        input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: $font-size-sm;
            font-family: inherit;
            color: $text-primary;
            min-width: 0;

            &::placeholder {
                color: $text-tertiary;
            }

            &:focus {
                outline: none;
            }
        }
    }

    &__nav {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;

        @media (max-width: $breakpoint-sm) {
            display: none;
        }
    }

    &__nav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        color: $text-tertiary;
        background: none;
        border: none;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
            background: $gray-50;
            color: $text-secondary;
        }

        &--active {
            color: var(--fcom-mf-primary, #1877f2);
        }
    }

    &__user {
        position: relative;
        margin-left: $spacing-sm;
    }

    &__avatar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 50%;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        &:hover {
            opacity: 0.9;
        }
    }

    &__menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 180px;
        background: $white;
        border-radius: var(--fcom-mf-radius-md, 8px);
        box-shadow: $shadow-lg;
        overflow: hidden;
        z-index: $z-dropdown;
        padding: 4px 0;
    }

    &__menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        color: $text-primary;
        text-decoration: none;
        font-size: $font-size-sm;
        font-family: inherit;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background $transition-fast;

        &:hover {
            background: $gray-50;
        }

        svg {
            color: $text-tertiary;
        }
    }

    &__menu-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }
    }

    &__menu-divider {
        height: 1px;
        background: $border-color;
        margin: 4px 0;
    }

    &__menu-theme {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        gap: 10px;
    }

    &__menu-theme-label {
        font-size: $font-size-sm;
        color: $text-primary;
    }

    &__menu-theme-toggle {
        position: relative;
        width: 40px;
        height: 22px;
        flex-shrink: 0;
        border-radius: 11px;
        border: none;
        cursor: pointer;
        background: $gray-200;
        transition: background $transition-fast;
        padding: 0;

        &:hover {
            background: $gray-300;
        }

        &--on {
            background: var(--fcom-mf-primary, #1877f2);

            &:hover {
                background: var(--fcom-mf-primary-hover, #166fe5);
            }
        }
    }

    &__menu-theme-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: $white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform $transition-fast;
    }

    &__menu-theme-toggle--on .header__menu-theme-knob {
        transform: translateX(18px);
    }

    &__login-btn {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        border-radius: var(--fcom-mf-radius-sm, 6px);
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        text-decoration: none;
        transition: background $transition-fast;

        &:hover {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
