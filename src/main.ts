import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, createWebHistory, type RouteRecordRaw } from 'vue-router';
import App from './App.vue';
import { useAuthStore } from './stores';
import './styles/main.scss';

// Lazy load views
const FeedView = () => import('./views/FeedView.vue');
const SinglePostView = () => import('./views/SinglePostView.vue');

interface FcomMfConfig {
    containerId: string;
    space?: string;
    userId?: number | null;
    perPage?: number;
    layout?: 'card' | 'compact';
    showCreate?: boolean;
    showHeader?: boolean;
    fullpage?: boolean;
}

// Store Vue app instances
const appInstances: Map<string, VueApp> = new Map();

function createAppRouter(useMemoryHistory = false) {
    const routes: RouteRecordRaw[] = [
        {
            path: '/',
            name: 'feed',
            component: FeedView,
        },
        {
            path: '/post/:id',
            name: 'single-post',
            component: SinglePostView,
            props: true,
        },
        // Catch-all - redirect to feed
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ];

    // Use memory history for embedded mode, web history for fullpage
    const history = useMemoryHistory
        ? createMemoryHistory()
        : createWebHistory(window.location.pathname);

    return createRouter({
        history,
        routes,
        scrollBehavior(_to, _from, savedPosition) {
            if (savedPosition) {
                return savedPosition;
            }
            return { top: 0 };
        },
    });
}

function initApp(container: HTMLElement): void {
    const configAttr = container.getAttribute('data-fcom-mf-config');
    if (!configAttr) {
        console.error('[FcomModernFeed] Missing config attribute');
        return;
    }

    let config: FcomMfConfig;
    try {
        config = JSON.parse(configAttr);
    } catch (e) {
        console.error('[FcomModernFeed] Invalid config JSON:', e);
        return;
    }

    // Check if app already exists for this container
    if (appInstances.has(config.containerId)) {
        return;
    }

    // Clear loading placeholder
    container.innerHTML = '';

    // Create Vue app
    const app = createApp(App, {
        config,
    });

    // Create and use Pinia
    const pinia = createPinia();
    app.use(pinia);

    // Create and use Router
    // Use memory history for embedded mode to avoid URL conflicts
    const router = createAppRouter(!config.fullpage);
    app.use(router);

    // Initialize auth store
    const authStore = useAuthStore(pinia);
    authStore.initialize();

    // Mount app
    app.mount(container);

    // Store instance for cleanup
    appInstances.set(config.containerId, app);
}

function initAllApps(): void {
    const containers = document.querySelectorAll<HTMLElement>('.fcom-modern-feed-container');
    containers.forEach((container) => {
        initApp(container);
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllApps);
} else {
    initAllApps();
}

// Watch for dynamically added containers (for AJAX-loaded content)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                if (node.classList.contains('fcom-modern-feed-container')) {
                    initApp(node);
                }
                // Check children
                const containers = node.querySelectorAll<HTMLElement>('.fcom-modern-feed-container');
                containers.forEach((container) => {
                    initApp(container);
                });
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    appInstances.forEach((app) => {
        app.unmount();
    });
    appInstances.clear();
    observer.disconnect();
});
