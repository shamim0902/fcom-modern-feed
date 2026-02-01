<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const isVisible = ref(true);
const lastScrollY = ref(0);

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
    { name: 'menu', route: '/menu', icon: 'menu', label: 'Menu' },
];

function isActive(itemRoute: string): boolean {
    if (itemRoute === '/') {
        return route.path === '/' || route.path === '/home';
    }
    return route.path.startsWith(itemRoute);
}

function navigate(itemRoute: string): void {
    router.push(itemRoute);
}

function handleScroll(): void {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 50) {
        // Always show when near top
        isVisible.value = true;
    } else if (currentScrollY > lastScrollY.value) {
        // Scrolling down
        isVisible.value = false;
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

            <!-- Menu Icon -->
            <svg v-else-if="item.icon === 'menu'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>

            <span class="fcom-mf-mobile-nav__label">{{ item.label }}</span>
        </button>
    </nav>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

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
</style>
