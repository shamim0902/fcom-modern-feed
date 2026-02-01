<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { useUiStore, useAuthStore, useFeedStore } from './stores';
import ToastContainer from './components/common/ToastContainer.vue';
import ImageLightbox from './components/common/ImageLightbox.vue';
import AppHeader from './components/layout/AppHeader.vue';
import LeftSidebar from './components/layout/LeftSidebar.vue';
import RightSidebar from './components/layout/RightSidebar.vue';

interface Config {
    containerId: string;
    space?: string;
    userId?: number | null;
    perPage?: number;
    layout?: 'card' | 'compact';
    showCreate?: boolean;
    showHeader?: boolean;
    fullpage?: boolean;
}

const props = defineProps<{
    config: Config;
}>();

const uiStore = useUiStore();
const authStore = useAuthStore();
const feedStore = useFeedStore();

// Provide config to child components
provide('config', props.config);

// Set layout from config
if (props.config.layout) {
    uiStore.setLayout(props.config.layout);
}

const contextKey = computed(() => {
    return feedStore.getContextKey(props.config.space, props.config.userId);
});

// Scroll to top button
const showScrollTop = ref(false);

function handleScroll(): void {
    showScrollTop.value = window.scrollY > 500;
}

function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
    // Initial feed fetch
    feedStore.fetchFeeds({
        space: props.config.space,
        userId: props.config.userId,
        perPage: props.config.perPage,
    });

    // Start ticker for real-time updates
    if (window.fcomModernFeed?.features?.realTimeUpdates) {
        startTicker();
    }

    // Listen for scroll
    window.addEventListener('scroll', handleScroll);
});

let tickerInterval: ReturnType<typeof setInterval> | null = null;

function startTicker(): void {
    const interval = window.fcomModernFeed?.settings?.tickerInterval || 45000;

    tickerInterval = setInterval(async () => {
        // Only poll if tab is visible
        if (document.hidden) return;

        try {
            const context = feedStore.contexts[contextKey.value];
            if (!context?.lastFetchedTimestamp) return;

            const response = await fetch(
                `${window.fcomModernFeed.rest.url}/feeds/ticker?since=${context.lastFetchedTimestamp}&context=${contextKey.value}`,
                {
                    headers: {
                        'X-WP-Nonce': window.fcomModernFeed.rest.nonce,
                    },
                    credentials: 'same-origin',
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.has_changes && data.feeds?.length > 0) {
                    const newFeeds = data.feeds.filter(
                        (f: { action: string; user_id: number }) =>
                            f.action === 'created' && f.user_id !== authStore.userId
                    );
                    if (newFeeds.length > 0) {
                        feedStore.incrementNewPostsCount(contextKey.value);
                    }
                }
            }
        } catch (error) {
            console.error('[FcomModernFeed] Ticker error:', error);
        }
    }, interval);
}

onUnmounted(() => {
    if (tickerInterval) {
        clearInterval(tickerInterval);
    }
    window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
    <div class="fcom-mf-app" :class="`fcom-mf-layout-${uiStore.layout}`">
        <!-- Header -->
        <AppHeader />

        <!-- Main Layout -->
        <div class="fcom-mf-layout">
            <!-- Left Sidebar -->
            <aside class="fcom-mf-sidebar fcom-mf-sidebar--left">
                <LeftSidebar />
            </aside>

            <!-- Main Content -->
            <main class="fcom-mf-main">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </main>

            <!-- Right Sidebar -->
            <aside class="fcom-mf-sidebar fcom-mf-sidebar--right">
                <RightSidebar />
            </aside>
        </div>

        <!-- Scroll to Top Button -->
        <Transition name="fade">
            <button
                v-if="showScrollTop"
                class="fcom-mf-scroll-top"
                @click="scrollToTop"
                aria-label="Scroll to top"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </button>
        </Transition>

        <!-- Toast Notifications -->
        <ToastContainer />

        <!-- Image Lightbox -->
        <ImageLightbox />
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-app {
    min-height: 100vh;
    background: $bg-secondary;
}

.fcom-mf-layout {
    display: grid;
    grid-template-columns: 280px 1fr 280px;
    gap: 0;
    max-width: 1400px;
    margin: 0 auto;
    padding-top: 60px; // Header height

    @media (max-width: 1200px) {
        grid-template-columns: 240px 1fr 240px;
    }

    @media (max-width: 992px) {
        grid-template-columns: 1fr;

        .fcom-mf-sidebar--left,
        .fcom-mf-sidebar--right {
            display: none;
        }
    }
}

.fcom-mf-sidebar {
    position: sticky;
    top: 76px; // Header height + gap
    height: calc(100vh - 76px);
    overflow-y: auto;
    padding: $spacing-lg;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 4px;
    }

    &:hover::-webkit-scrollbar-thumb {
        background: $gray-300;
    }

    &--left {
        padding-right: $spacing-sm;
    }

    &--right {
        padding-left: $spacing-sm;
    }
}

.fcom-mf-main {
    min-height: calc(100vh - 60px);
    padding: $spacing-lg;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;

    @media (max-width: $breakpoint-sm) {
        padding: $spacing-sm;
    }
}

.fcom-mf-scroll-top {
    position: fixed;
    bottom: $spacing-xl;
    right: $spacing-xl;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: $border-radius-full;
    background: $primary-color;
    color: $white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: $shadow-lg;
    z-index: $z-sticky;
    transition: all $transition-fast;

    &:hover {
        background: $primary-hover;
        transform: translateY(-2px);
    }

    @media (max-width: $breakpoint-sm) {
        bottom: $spacing-lg;
        right: $spacing-lg;
        width: 40px;
        height: 40px;
    }
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
