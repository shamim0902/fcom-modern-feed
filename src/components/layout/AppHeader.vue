<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

const searchQuery = ref('');
const showUserMenu = ref(false);
const showMobileMenu = ref(false);

const loginUrl = computed(() => window.fcomModernFeed?.loginUrl || '/wp-login.php');
const logoutUrl = computed(() => loginUrl.value + '?action=logout');

function handleSearch(): void {
    if (searchQuery.value.trim()) {
        // Emit search event or handle search
        console.log('Search:', searchQuery.value);
    }
}

function toggleUserMenu(): void {
    showUserMenu.value = !showUserMenu.value;
}

function closeUserMenu(): void {
    showUserMenu.value = false;
}
</script>

<template>
    <header class="fcom-mf-header">
        <div class="fcom-mf-header__container">
            <!-- Logo / Brand -->
            <div class="fcom-mf-header__brand">
                <a href="/portal" class="fcom-mf-header__logo">
                    <svg width="40" height="40" viewBox="0 0 50 50" fill="currentColor">
                        <circle cx="25" cy="25" r="23" stroke="currentColor" stroke-width="2" fill="none"/>
                        <path d="M15 20h20M15 25h20M15 30h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </a>

                <!-- Search Bar -->
                <div class="fcom-mf-header__search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search posts..."
                        class="fcom-mf-header__search-input"
                        @keyup.enter="handleSearch"
                    />
                </div>
            </div>

            <!-- Navigation -->
            <nav class="fcom-mf-header__nav">
                <a href="/portal" class="fcom-mf-header__nav-item fcom-mf-header__nav-item--active" title="Home">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                </a>
                <a href="/portal/members" class="fcom-mf-header__nav-item" title="Members">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </a>
                <a href="/portal/spaces" class="fcom-mf-header__nav-item" title="Spaces">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </a>
                <a href="/portal/notifications" class="fcom-mf-header__nav-item" title="Notifications">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </a>
            </nav>

            <!-- User Actions -->
            <div class="fcom-mf-header__actions">
                <template v-if="authStore.isLoggedIn">
                    <button
                        class="fcom-mf-header__user-btn"
                        @click="toggleUserMenu"
                        @blur="closeUserMenu"
                    >
                        <img
                            :src="authStore.userAvatar"
                            :alt="authStore.userName || ''"
                            class="fcom-mf-header__user-avatar"
                        />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z"/>
                        </svg>
                    </button>

                    <!-- User Dropdown -->
                    <Transition name="dropdown">
                        <div v-if="showUserMenu" class="fcom-mf-header__dropdown">
                            <a :href="`/portal/profile/${authStore.currentUser?.name}`" class="fcom-mf-header__dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                My Profile
                            </a>
                            <a href="/portal/settings" class="fcom-mf-header__dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                Settings
                            </a>
                            <div class="fcom-mf-header__dropdown-divider"></div>
                            <a :href="logoutUrl" class="fcom-mf-header__dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Log Out
                            </a>
                        </div>
                    </Transition>
                </template>

                <template v-else>
                    <a :href="loginUrl" class="fcom-mf-btn fcom-mf-btn--primary">
                        Log In
                    </a>
                </template>

                <!-- Mobile Menu Toggle -->
                <button class="fcom-mf-header__mobile-toggle" @click="showMobileMenu = !showMobileMenu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    </header>
</template>

<style lang="scss" scoped>
.fcom-mf-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: $white;
    border-bottom: 1px solid $border-color;
    z-index: $z-sticky;

    &__container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 $spacing-lg;
    }

    &__brand {
        display: flex;
        align-items: center;
        gap: $spacing-md;
    }

    &__logo {
        display: flex;
        align-items: center;
        color: $primary-color;
        text-decoration: none;

        &:hover {
            opacity: 0.9;
        }
    }

    &__search {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        background: $gray-50;
        border-radius: $border-radius-lg;
        padding: $spacing-sm $spacing-md;
        width: 240px;

        @media (max-width: $breakpoint-md) {
            display: none;
        }

        svg {
            color: $text-tertiary;
            flex-shrink: 0;
        }
    }

    &__search-input {
        border: none;
        background: transparent;
        font-size: $font-size-md;
        width: 100%;
        outline: none;

        &::placeholder {
            color: $text-tertiary;
        }
    }

    &__nav {
        display: flex;
        align-items: center;
        gap: $spacing-xs;

        @media (max-width: $breakpoint-md) {
            display: none;
        }
    }

    &__nav-item {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        border-radius: $border-radius-md;
        color: $text-secondary;
        text-decoration: none;
        transition: all $transition-fast;

        &:hover {
            background: $gray-50;
            color: $primary-color;
        }

        &--active {
            color: $primary-color;
            position: relative;

            &::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 70%;
                height: 3px;
                background: $primary-color;
                border-radius: 3px 3px 0 0;
            }
        }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        position: relative;
    }

    &__user-btn {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        padding: $spacing-xs;
        border: none;
        background: $gray-50;
        border-radius: $border-radius-lg;
        cursor: pointer;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-100;
        }

        svg {
            color: $text-secondary;
        }
    }

    &__user-avatar {
        width: 36px;
        height: 36px;
        border-radius: $border-radius-full;
        object-fit: cover;
    }

    &__dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: $spacing-sm;
        width: 240px;
        background: $white;
        border-radius: $border-radius-md;
        box-shadow: $shadow-lg;
        overflow: hidden;
        z-index: $z-dropdown;
    }

    &__dropdown-item {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        padding: $spacing-md $spacing-lg;
        color: $text-primary;
        text-decoration: none;
        font-size: $font-size-md;
        transition: background-color $transition-fast;

        &:hover {
            background: $gray-50;
        }

        svg {
            color: $text-secondary;
        }
    }

    &__dropdown-divider {
        height: 1px;
        background: $border-color;
        margin: $spacing-xs 0;
    }

    &__mobile-toggle {
        display: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        background: none;
        color: $text-secondary;
        cursor: pointer;
        border-radius: $border-radius-full;

        &:hover {
            background: $gray-50;
        }

        @media (max-width: $breakpoint-md) {
            display: flex;
        }
    }
}

// Dropdown transition
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>
