import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, createWebHistory, type RouteRecordRaw } from 'vue-router';
import App from './App.vue';
import { useAuthStore } from './stores';
import './styles/main.scss';

// Lazy load views
const FeedView = () => import('./views/FeedView.vue');
const SinglePostView = () => import('./views/SinglePostView.vue');
const MembersView = () => import('./views/MembersView.vue');
const SpacesView = () => import('./views/SpacesView.vue');
const SpaceView = () => import('./views/SpaceView.vue');
const ProfileView = () => import('./views/ProfileView.vue');
const EditProfileView = () => import('./views/EditProfileView.vue');
const NotificationSettingsView = () => import('./views/NotificationSettingsView.vue');
const NotificationsView = () => import('./views/NotificationsView.vue');
const BookmarksView = () => import('./views/BookmarksView.vue');
const LeaderboardView = () => import('./views/LeaderboardView.vue');

interface FcomMfConfig {
    containerId: string;
    space?: string;
    userId?: number | null;
    perPage?: number;
    layout?: 'card' | 'compact';
    showCreate?: boolean;
    showHeader?: boolean;
    fullpage?: boolean;
    baseUrl?: string;
}

// Store Vue app instances
const appInstances: Map<string, VueApp> = new Map();

// Theme override: user preference in localStorage (overrides admin theme)
const THEME_OVERRIDE_KEY = 'fcom_mf_theme_override';
const themeContainers: HTMLElement[] = [];
let themeAutoAbort: AbortController | null = null;

function createAppRouter(useMemoryHistory = false, baseUrl = '/') {
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
        {
            path: '/post/s/:slug',
            name: 'single-post-slug',
            component: SinglePostView,
            props: true,
        },
        {
            path: '/members',
            name: 'members',
            component: MembersView,
        },
        {
            path: '/spaces',
            name: 'spaces',
            component: SpacesView,
        },
        {
            path: '/space/:slug',
            name: 'space',
            component: SpaceView,
            props: true,
        },
        {
            path: '/u/:username',
            name: 'profile',
            component: ProfileView,
            props: true,
        },
        {
            path: '/u/:username/edit',
            name: 'edit-profile',
            component: EditProfileView,
            props: true,
        },
        {
            path: '/u/:username/notification-settings',
            name: 'notification-settings',
            component: NotificationSettingsView,
            props: true,
        },
        {
            path: '/notifications',
            name: 'notifications',
            component: NotificationsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/bookmarks',
            name: 'bookmarks',
            component: BookmarksView,
            meta: { requiresAuth: true },
        },
        {
            path: '/leaderboard',
            name: 'leaderboard',
            component: LeaderboardView,
        },
        // Catch-all - redirect to feed
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ];

    // Use memory history for embedded mode, web history for fullpage
    // For web history, use the baseUrl from config (the page where shortcode is rendered)
    const history = useMemoryHistory
        ? createMemoryHistory()
        : createWebHistory(baseUrl);

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

/** Parse hex #rrggbb to [r, g, b] (0–255). */
function hexToRgb(hex: string): [number, number, number] {
    const m = hex.replace(/^#/, '').match(/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if (!m) return [24, 119, 242];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Darken hex color by a factor 0–1 (e.g. 0.08 = 8% darker). */
function darkenHex(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const f = 1 - amount;
    return '#' + [r, g, b].map((c) => Math.round(c * f).toString(16).padStart(2, '0')).join('');
}

function applyTheme(container: HTMLElement): void {
    const cfg = (window as unknown as { fcomModernFeed?: { settings?: { theme?: string; primary_color?: string; border_radius?: string } } }).fcomModernFeed?.settings;
    const adminTheme = (cfg?.theme ?? 'default') as string;
    const primary = typeof cfg?.primary_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(cfg.primary_color) ? cfg.primary_color : '#1877f2';
    const radius = (cfg?.border_radius ?? 'rounded') as string;

    const [r, g, b] = hexToRgb(primary);
    const primaryHover = darkenHex(primary, 0.08);

    container.style.setProperty('--fcom-mf-primary', primary);
    container.style.setProperty('--fcom-mf-primary-hover', primaryHover);
    container.style.setProperty('--fcom-mf-primary-rgb', `${r}, ${g}, ${b}`);

    const radiusMap: Record<string, string> = { sharp: '2px', rounded: '8px', pill: '24px' };
    container.style.setProperty('--fcom-mf-radius-md', radiusMap[radius] ?? '8px');
    container.style.setProperty('--fcom-mf-radius-sm', radius === 'pill' ? '20px' : radius === 'sharp' ? '2px' : '6px');
    container.style.setProperty('--fcom-mf-radius-lg', radius === 'pill' ? '999px' : radius === 'sharp' ? '4px' : '12px');
    container.style.setProperty('--fcom-mf-radius-card', radius === 'pill' ? '16px' : radius === 'sharp' ? '4px' : '12px');

    const override = localStorage.getItem(THEME_OVERRIDE_KEY);
    let effective: 'dark' | 'light';

    container.classList.remove('fcom-mf-theme-default', 'fcom-mf-theme-dark', 'fcom-mf-theme-auto');

    if (override === 'dark' || override === 'light') {
        effective = override;
        container.classList.add(effective === 'dark' ? 'fcom-mf-theme-dark' : 'fcom-mf-theme-default');
    } else if (adminTheme === 'auto') {
        container.classList.add('fcom-mf-theme-auto');
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const update = () => {
            themeContainers.forEach((el) => {
                el.classList.toggle('fcom-mf-theme-dark', mq.matches);
                el.classList.toggle('fcom-mf-theme-default', !mq.matches);
            });
            const win = window as unknown as { fcomModernFeed?: { effectiveTheme?: 'dark' | 'light' } };
            if (win.fcomModernFeed) win.fcomModernFeed.effectiveTheme = mq.matches ? 'dark' : 'light';
            window.dispatchEvent(new CustomEvent('fcom-mf-theme-changed', { detail: { theme: mq.matches ? 'dark' : 'light' } }));
        };
        themeAutoAbort?.abort();
        themeAutoAbort = new AbortController();
        mq.addEventListener('change', update, { signal: themeAutoAbort.signal });
        update();
        effective = mq.matches ? 'dark' : 'light';
    } else {
        effective = adminTheme === 'dark' ? 'dark' : 'light';
        container.classList.add(effective === 'dark' ? 'fcom-mf-theme-dark' : 'fcom-mf-theme-default');
    }

    const win = window as unknown as { fcomModernFeed?: { effectiveTheme?: 'dark' | 'light'; setThemeOverride?: (v: 'dark' | 'light' | null) => void; getThemeOverride?: () => 'dark' | 'light' | null; isDarkMode?: () => boolean } };
    if (!win.fcomModernFeed) win.fcomModernFeed = {} as NonNullable<typeof win.fcomModernFeed>;
    win.fcomModernFeed.effectiveTheme = effective;
    window.dispatchEvent(new CustomEvent('fcom-mf-theme-changed', { detail: { theme: effective } }));
}

function applyThemeToAllContainers(): void {
    themeContainers.forEach((container) => applyTheme(container));
}

/** Set user theme override (saved in localStorage). Pass null to use admin/system theme again. */
function setThemeOverride(value: 'dark' | 'light' | null): void {
    if (value) {
        localStorage.setItem(THEME_OVERRIDE_KEY, value);
    } else {
        localStorage.removeItem(THEME_OVERRIDE_KEY);
    }
    themeAutoAbort?.abort();
    themeAutoAbort = null;
    applyThemeToAllContainers();
}

/** Get current user override from localStorage. */
function getThemeOverride(): 'dark' | 'light' | null {
    const v = localStorage.getItem(THEME_OVERRIDE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
}

/** Whether the UI is currently in dark mode (override or effective). */
function isDarkMode(): boolean {
    const win = window as unknown as { fcomModernFeed?: { effectiveTheme?: 'dark' | 'light' } };
    return win.fcomModernFeed?.effectiveTheme === 'dark';
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

    // Register container for theme updates (override + auto system preference)
    if (!themeContainers.includes(container)) {
        themeContainers.push(container);
    }

    // Apply theme from admin settings (CSS vars + theme class)
    applyTheme(container);

    // Expose theme API for header toggle and other consumers
    const win = window as unknown as {
        fcomModernFeed?: {
            setThemeOverride?: (v: 'dark' | 'light' | null) => void;
            getThemeOverride?: () => 'dark' | 'light' | null;
            isDarkMode?: () => boolean;
        };
    };
    if (win.fcomModernFeed) {
        win.fcomModernFeed.setThemeOverride = setThemeOverride;
        win.fcomModernFeed.getThemeOverride = getThemeOverride;
        win.fcomModernFeed.isDarkMode = isDarkMode;
    }

    // Create Vue app
    const app = createApp(App, {
        config,
    });

    // Create and use Pinia
    const pinia = createPinia();
    app.use(pinia);

    // Create and use Router
    // Use memory history for embedded mode to avoid URL conflicts
    // Pass baseUrl from config for proper route matching on page reload
    const router = createAppRouter(!config.fullpage, config.baseUrl || '/');
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
