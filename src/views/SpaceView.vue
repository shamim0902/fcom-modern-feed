<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import type {
    SpaceFull,
    Feed,
    FeedsResponse,
    SpaceMember,
    SpaceMembersResponse,
    SpaceSearchUser,
    SpaceUserSearchResponse,
} from '@/api/types';
import { useAuthStore, useUiStore } from '@/stores';
import FeedItem from '@/components/feed/FeedItem.vue';
import CreatePost from '@/components/feed/CreatePost.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const space = ref<SpaceFull | null>(null);
const feeds = ref<Feed[]>([]);
const stickyFeed = ref<Feed | null>(null);
const loading = ref(true);
const loadingFeeds = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const activeTab = ref<'posts' | 'about' | 'members'>('posts');
const error = ref<string | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);
const scrollObserver = ref<IntersectionObserver | null>(null);
const members = ref<SpaceMember[]>([]);
const loadingMembers = ref(false);
const membersError = ref<string | null>(null);
const membersHasMore = ref(false);
const membersPage = ref(1);
const membersSearch = ref('');
const pendingCount = ref(0);
const membersMode = ref<'active' | 'pending'>('active');
const membersLoadedOnce = ref(false);
const removingMemberIds = ref<Record<number, boolean>>({});
const approvingMemberIds = ref<Record<number, boolean>>({});
const userLookup = ref('');
const userLookupResults = ref<SpaceSearchUser[]>([]);
const userLookupLoading = ref(false);
const addingMemberIds = ref<Record<number, boolean>>({});
let membersSearchDebounce: ReturnType<typeof setTimeout> | null = null;
let userLookupDebounce: ReturnType<typeof setTimeout> | null = null;

const spaceSlug = computed(() => route.params.slug as string);
const spacePermissions = computed(() => space.value?.permissions || {});
const canViewMembers = computed(() => !!spacePermissions.value.can_view_members);
const canAddMembers = computed(() => !!spacePermissions.value.can_add_member);
const canRemoveMembers = computed(() => !!spacePermissions.value.can_remove_member);
const showMembersTab = computed(() => canViewMembers.value);
const isViewingPending = computed(() => membersMode.value === 'pending');

const portalBaseUrl = computed(() => {
    const raw = window.fcomModernFeed?.portalBaseUrl || '/portal';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
});

const spaceHomeUrl = computed(() => {
    if (!space.value) return '#';

    const rawPermalink = space.value.permalink;
    if (typeof rawPermalink === 'string' && rawPermalink.trim()) {
        return rawPermalink.trim();
    }

    return `${portalBaseUrl.value}/space/${encodeURIComponent(space.value.slug)}/home`;
});

const fullMembersPageUrl = computed(() => {
    if (!space.value) return '#';

    const homeUrl = spaceHomeUrl.value;
    if (homeUrl === '#') return '#';

    if (homeUrl.includes('/home')) {
        return homeUrl.replace('/home', '/members');
    }

    const sep = homeUrl.endsWith('/') ? '' : '/';
    return `${homeUrl}${sep}members`;
});

const fullSettingsPageUrl = computed(() => {
    if (!space.value) return '#';

    const homeUrl = spaceHomeUrl.value;
    if (homeUrl === '#') return '#';

    const sep = homeUrl.includes('?') ? '&' : '?';
    // Fluent Community opens the space customizer from this query flag.
    return `${homeUrl}${sep}customize_space=yes`;
});

/** True when the current user is already a member (so we show Leave Space, not Join Space). */
const isSpaceMember = computed(() => {
    const s = space.value;
    if (!s) return false;
    return !!(s.is_member ?? (s as SpaceFull & { membership?: unknown }).membership);
});

async function fetchSpace(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
        const response = await api.get<{ space: SpaceFull }>(`spaces/${spaceSlug.value}/by-slug`);
        const raw = response.space as unknown as Record<string, unknown>;
        // Normalize stats (API may use snake_case; ensure numbers for header stats)
        space.value = {
            ...raw,
            members_count: Number(raw.members_count ?? raw.membersCount ?? 0) || 0,
            posts_count: Number(raw.posts_count ?? raw.postsCount ?? 0) || 0,
        } as SpaceFull;
        if (activeTab.value === 'members' && !canViewMembers.value) {
            activeTab.value = 'posts';
        }
        await fetchFeeds();
        if (activeTab.value === 'members' && canViewMembers.value) {
            membersLoadedOnce.value = true;
            await fetchMembers();
        }
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to load space';
    } finally {
        loading.value = false;
    }
}

async function fetchFeeds(page = 1, append = false): Promise<void> {
    if (!space.value) return;

    loadingFeeds.value = true;
    try {
        const response = await api.get<FeedsResponse>('feeds', {
            space: space.value.slug,
            page,
            per_page: 10,
        });

        if (append) {
            feeds.value = [...feeds.value, ...response.feeds.data];
        } else {
            feeds.value = response.feeds.data;
            stickyFeed.value = response.sticky ?? null;
        }

        hasMore.value = response.feeds.has_more;
        currentPage.value = response.feeds.current_page;
    } catch (e) {
        console.error('Failed to fetch feeds:', e);
    } finally {
        loadingFeeds.value = false;
    }
}

function loadMoreFeeds(): void {
    if (!loadingFeeds.value && hasMore.value) {
        fetchFeeds(currentPage.value + 1, true);
    }
}

function getPaginatedData<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
        return payload as T[];
    }
    const paginated = payload as { data?: T[] } | undefined;
    return Array.isArray(paginated?.data) ? paginated.data : [];
}

function getCurrentPage(payload: unknown, fallback: number): number {
    const paginated = payload as { current_page?: number } | undefined;
    return Number(paginated?.current_page || fallback);
}

function getHasMore(payload: unknown): boolean {
    const paginated = payload as { has_more?: boolean; current_page?: number; last_page?: number } | undefined;
    if (typeof paginated?.has_more === 'boolean') {
        return paginated.has_more;
    }
    const currentPage = Number(paginated?.current_page || 1);
    const lastPage = Number(paginated?.last_page || 1);
    return currentPage < lastPage;
}

async function fetchMembers(page = 1, append = false): Promise<void> {
    if (!space.value || !canViewMembers.value) return;

    loadingMembers.value = true;
    if (!append) {
        membersError.value = null;
    }

    try {
        const params: Record<string, unknown> = {
            page,
            per_page: 20,
        };

        const search = membersSearch.value.trim();
        if (search) {
            params.search = search;
        }

        if (membersMode.value === 'pending') {
            params.status = 'pending';
        }

        const response = await api.get<SpaceMembersResponse>(`spaces/${space.value.slug}/members`, params);
        const nextMembers = getPaginatedData<SpaceMember>(response.members);

        if (append) {
            members.value = [...members.value, ...nextMembers];
        } else {
            members.value = nextMembers;
        }

        membersPage.value = getCurrentPage(response.members, page);
        membersHasMore.value = getHasMore(response.members);
        pendingCount.value = Number(response.pending_count || 0);
    } catch (e) {
        membersError.value = e instanceof Error ? e.message : 'Failed to load space members';
    } finally {
        loadingMembers.value = false;
    }
}

function loadMoreMembers(): void {
    if (!loadingMembers.value && membersHasMore.value) {
        fetchMembers(membersPage.value + 1, true);
    }
}

async function removeMember(member: SpaceMember): Promise<void> {
    if (!space.value || !canRemoveMembers.value) return;
    if (removingMemberIds.value[member.user_id]) return;

    if (authStore.userId && Number(authStore.userId) === Number(member.user_id)) {
        uiStore.showError('Remove yourself by using Leave Space.');
        return;
    }

    const memberName = member.xprofile?.display_name || 'this member';
    if (!window.confirm(`Remove ${memberName} from this space?`)) return;

    removingMemberIds.value = { ...removingMemberIds.value, [member.user_id]: true };
    try {
        await api.post(`spaces/${space.value.slug}/members/remove`, { user_id: member.user_id });
        members.value = members.value.filter((item) => Number(item.user_id) !== Number(member.user_id));

        if (membersMode.value === 'pending') {
            pendingCount.value = Math.max(0, pendingCount.value - 1);
        } else if (space.value) {
            space.value.members_count = Math.max(0, Number(space.value.members_count || 0) - 1);
        }

        uiStore.showSuccess('Member removed');
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to remove member';
        uiStore.showError(message);
    } finally {
        const next = { ...removingMemberIds.value };
        delete next[member.user_id];
        removingMemberIds.value = next;
    }
}

async function approvePending(member: SpaceMember): Promise<void> {
    if (!space.value || !canAddMembers.value) return;
    if (approvingMemberIds.value[member.user_id]) return;

    approvingMemberIds.value = { ...approvingMemberIds.value, [member.user_id]: true };
    try {
        await api.post(`spaces/${space.value.slug}/members`, {
            user_id: member.user_id,
            role: member.role || 'member',
        });

        pendingCount.value = Math.max(0, pendingCount.value - 1);
        if (space.value) {
            space.value.members_count = Number(space.value.members_count || 0) + 1;
        }

        if (membersMode.value === 'pending') {
            members.value = members.value.filter((item) => Number(item.user_id) !== Number(member.user_id));
        } else {
            await fetchMembers(1, false);
        }

        uiStore.showSuccess('Member approved');
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to approve member';
        uiStore.showError(message);
    } finally {
        const next = { ...approvingMemberIds.value };
        delete next[member.user_id];
        approvingMemberIds.value = next;
    }
}

async function searchUsersToAdd(): Promise<void> {
    const query = userLookup.value.trim();
    if (!space.value || !canAddMembers.value || query.length < 2) {
        userLookupResults.value = [];
        return;
    }

    userLookupLoading.value = true;
    try {
        const response = await api.get<SpaceUserSearchResponse>('spaces/users/search', {
            space_id: space.value.id,
            search: query,
        });
        userLookupResults.value = getPaginatedData<SpaceSearchUser>(response.users);
    } catch (e) {
        userLookupResults.value = [];
    } finally {
        userLookupLoading.value = false;
    }
}

async function addMember(user: SpaceSearchUser): Promise<void> {
    if (!space.value || !canAddMembers.value) return;
    if (addingMemberIds.value[user.ID]) return;

    addingMemberIds.value = { ...addingMemberIds.value, [user.ID]: true };
    try {
        await api.post(`spaces/${space.value.slug}/members`, {
            user_id: user.ID,
            role: 'member',
        });
        uiStore.showSuccess('Member added');
        userLookupResults.value = userLookupResults.value.filter((item) => Number(item.ID) !== Number(user.ID));
        if (space.value) {
            space.value.members_count = Number(space.value.members_count || 0) + 1;
        }
        if (activeTab.value === 'members' && membersMode.value === 'active') {
            fetchMembers(1, false);
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to add member';
        uiStore.showError(message);
    } finally {
        const next = { ...addingMemberIds.value };
        delete next[user.ID];
        addingMemberIds.value = next;
    }
}

function setupInfiniteScroll(): void {
    if (typeof window === 'undefined' || !window.fcomModernFeed?.features?.infiniteScroll) return;
    scrollObserver.value = new IntersectionObserver(
        (entries) => {
            if (!entries[0].isIntersecting || loadingFeeds.value || !hasMore.value) return;
            loadMoreFeeds();
        },
        { root: null, rootMargin: '200px', threshold: 0 }
    );
    if (loadMoreRef.value) {
        scrollObserver.value.observe(loadMoreRef.value);
    }
}

watch(loadMoreRef, (el) => {
    if (el && scrollObserver.value) {
        scrollObserver.value.observe(el);
    }
});

async function joinSpace(): Promise<void> {
    if (!authStore.isLoggedIn || !space.value) return;

    try {
        await api.post(`spaces/${space.value.slug}/join`);
        space.value.is_member = true;
        space.value.members_count = (space.value.members_count ?? 0) + 1;
    } catch (e) {
        console.error('Failed to join space:', e);
    }
}

async function leaveSpace(): Promise<void> {
    if (!authStore.isLoggedIn || !space.value) return;

    try {
        await api.post(`spaces/${space.value.slug}/leave`);
        space.value.is_member = false;
        space.value.members_count = Math.max(0, (space.value.members_count ?? 0) - 1);
    } catch (e) {
        console.error('Failed to leave space:', e);
    }
}

function handlePostCreated(feed: Feed): void {
    feeds.value.unshift(feed);
}

function goBack(): void {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push({ name: 'spaces' });
    }
}

onMounted(() => {
    fetchSpace();
    setupInfiniteScroll();
});

onUnmounted(() => {
    if (scrollObserver.value) {
        scrollObserver.value.disconnect();
        scrollObserver.value = null;
    }
    if (membersSearchDebounce) {
        clearTimeout(membersSearchDebounce);
        membersSearchDebounce = null;
    }
    if (userLookupDebounce) {
        clearTimeout(userLookupDebounce);
        userLookupDebounce = null;
    }
});

watch(() => route.params.slug, () => {
    membersLoadedOnce.value = false;
    members.value = [];
    membersSearch.value = '';
    membersMode.value = 'active';
    pendingCount.value = 0;
    userLookup.value = '';
    userLookupResults.value = [];
    fetchSpace();
});

watch(activeTab, (tab) => {
    if (tab !== 'members') {
        return;
    }
    if (!canViewMembers.value) {
        return;
    }
    if (!membersLoadedOnce.value) {
        membersLoadedOnce.value = true;
        fetchMembers();
    }
});

watch(membersMode, () => {
    if (activeTab.value !== 'members' || !canViewMembers.value) {
        return;
    }
    fetchMembers(1, false);
});

watch(membersSearch, () => {
    if (membersSearchDebounce) {
        clearTimeout(membersSearchDebounce);
    }
    membersSearchDebounce = setTimeout(() => {
        if (activeTab.value === 'members' && canViewMembers.value) {
            fetchMembers(1, false);
        }
    }, 250);
});

watch(userLookup, () => {
    if (userLookupDebounce) {
        clearTimeout(userLookupDebounce);
    }
    userLookupDebounce = setTimeout(() => {
        searchUsersToAdd();
    }, 250);
});

function formatNumber(num: number | undefined | null): string {
    const n = num == null || Number.isNaN(Number(num)) ? 0 : Number(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function formatMemberRole(role: string | undefined): string {
    if (!role) return 'Member';
    if (role === 'admin') return 'Admin';
    if (role === 'moderator') return 'Moderator';
    if (role === 'student') return 'Student';
    return 'Member';
}
</script>

<template>
    <div class="fcom-mf-space-view">
        <!-- Back Button -->
        <div class="fcom-mf-space-view__back">
            <button @click="goBack" class="fcom-mf-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span>Back to Spaces</span>
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-space-loading">
            <div class="fcom-mf-space-skeleton__header"></div>
            <div class="fcom-mf-space-skeleton__content">
                <div class="fcom-mf-space-skeleton__logo"></div>
                <div class="fcom-mf-space-skeleton__info">
                    <div class="fcom-mf-space-skeleton__title"></div>
                    <div class="fcom-mf-space-skeleton__desc"></div>
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="fcom-mf-error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>{{ error }}</h2>
            <p>The space you're looking for might have been removed or is not available.</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back
            </button>
        </div>

        <!-- Space Content -->
        <template v-else-if="space">
            <!-- Cover & Header -->
            <div class="fcom-mf-space-header">
                <div
                    class="fcom-mf-space-header__cover"
                    :style="{ backgroundImage: space.cover ? `url(${space.cover})` : undefined }"
                ></div>

                <div class="fcom-mf-space-header__content">
                    <div class="fcom-mf-space-header__logo-wrapper">
                        <img
                            v-if="space.logo"
                            :src="space.logo"
                            :alt="space.title"
                            class="fcom-mf-space-header__logo"
                        />
                        <div v-else class="fcom-mf-space-header__logo-placeholder">
                            {{ space.title.charAt(0) }}
                        </div>
                    </div>

                    <div class="fcom-mf-space-header__info">
                        <h1 class="fcom-mf-space-header__title">
                            {{ space.title }}
                            <span v-if="space.privacy === 'private'" class="fcom-mf-space-header__privacy">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </span>
                        </h1>

                        <div class="fcom-mf-space-header__stats">
                            <span class="fcom-mf-space-header__stat">
                                {{ formatNumber(space.members_count ?? 0) }} members
                            </span>
                            <span class="fcom-mf-space-header__stat-sep" aria-hidden="true">·</span>
                            <span class="fcom-mf-space-header__stat">
                                {{ formatNumber(space.posts_count ?? 0) }} posts
                            </span>
                        </div>
                    </div>

                    <div v-if="authStore.isLoggedIn" class="fcom-mf-space-header__actions">
                        <a
                            v-if="canAddMembers"
                            :href="fullSettingsPageUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="fcom-mf-btn fcom-mf-btn--outline"
                        >
                            Space Settings
                        </a>
                        <button
                            v-if="isSpaceMember"
                            class="fcom-mf-btn fcom-mf-btn--secondary"
                            @click="leaveSpace()"
                        >
                            Leave Space
                        </button>
                        <button
                            v-else
                            class="fcom-mf-btn fcom-mf-btn--primary"
                            @click="joinSpace()"
                        >
                            Join Space
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="fcom-mf-space-tabs">
                <button
                    class="fcom-mf-space-tab"
                    :class="{ 'fcom-mf-space-tab--active': activeTab === 'posts' }"
                    @click="activeTab = 'posts'"
                >
                    Posts
                </button>
                <button
                    class="fcom-mf-space-tab"
                    :class="{ 'fcom-mf-space-tab--active': activeTab === 'about' }"
                    @click="activeTab = 'about'"
                >
                    About
                </button>
                <button
                    v-if="showMembersTab"
                    class="fcom-mf-space-tab"
                    :class="{ 'fcom-mf-space-tab--active': activeTab === 'members' }"
                    @click="activeTab = 'members'"
                >
                    Members
                    <span v-if="pendingCount > 0" class="fcom-mf-space-tab__badge">{{ pendingCount }}</span>
                </button>
            </div>

            <!-- Posts Tab -->
            <div v-if="activeTab === 'posts'" class="fcom-mf-space-posts">
                <!-- Create Post -->
                <CreatePost
                    v-if="!authStore.isLoggedIn || isSpaceMember"
                    :space-id="space.id"
                    @post-created="handlePostCreated"
                />

                <!-- Pinned Post -->
                <div v-if="stickyFeed" class="fcom-mf-space-posts__sticky-wrap">
                    <FeedItem
                        :feed="stickyFeed"
                        :is-sticky="true"
                    />
                </div>

                <!-- Feed Items -->
                <div v-if="feeds.length > 0" class="fcom-mf-space-feed">
                    <FeedItem
                        v-for="feed in feeds"
                        :key="feed.id"
                        :feed="feed"
                    />
                </div>

                <!-- Infinite scroll sentinel -->
                <div ref="loadMoreRef" class="fcom-mf-space-feed__trigger" aria-hidden="true"></div>

                <!-- Loading More -->
                <div v-if="loadingFeeds" class="fcom-mf-loading-more">
                    <div class="fcom-mf-spinner"></div>
                </div>

                <!-- Load More Button -->
                <div v-if="!loadingFeeds && hasMore" class="fcom-mf-load-more">
                    <button class="fcom-mf-btn fcom-mf-btn--outline" @click="loadMoreFeeds">
                        Load More Posts
                    </button>
                </div>

                <!-- Empty State -->
                <div v-if="!loadingFeeds && feeds.length === 0 && !stickyFeed" class="fcom-mf-empty-posts">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something with this community!</p>
                </div>
            </div>

            <!-- About Tab -->
            <div v-if="activeTab === 'about'" class="fcom-mf-space-about">
                <div class="fcom-mf-about-card">
                    <h3>About this space</h3>
                    <p v-if="space.description">{{ space.description }}</p>
                    <p v-else class="fcom-mf-about-card__empty">No description provided.</p>

                    <div class="fcom-mf-about-card__meta">
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                            <span>{{ formatNumber(space.members_count) }} members</span>
                        </div>
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Created {{ space.created_at }}</span>
                        </div>
                        <div class="fcom-mf-about-card__item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M2 12h20"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                            <span>{{ space.privacy === 'private' ? 'Private space' : 'Public space' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Members Tab -->
            <div v-if="activeTab === 'members' && showMembersTab" class="fcom-mf-space-members">
                <div class="fcom-mf-space-members__toolbar fcom-mf-card">
                    <div class="fcom-mf-space-members__search-wrap">
                        <input
                            v-model="membersSearch"
                            type="text"
                            class="fcom-mf-input fcom-mf-space-members__search"
                            placeholder="Search members"
                        />
                    </div>

                    <div class="fcom-mf-space-members__filters">
                        <button
                            class="fcom-mf-space-members__filter-btn"
                            :class="{ 'fcom-mf-space-members__filter-btn--active': membersMode === 'active' }"
                            @click="membersMode = 'active'"
                        >
                            Active
                        </button>
                        <button
                            v-if="canAddMembers && pendingCount > 0"
                            class="fcom-mf-space-members__filter-btn"
                            :class="{ 'fcom-mf-space-members__filter-btn--active': membersMode === 'pending' }"
                            @click="membersMode = 'pending'"
                        >
                            Pending ({{ pendingCount }})
                        </button>
                    </div>

                    <a
                        :href="fullMembersPageUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fcom-mf-btn fcom-mf-btn--outline"
                    >
                        Open Full Members Page
                    </a>
                </div>

                <div v-if="canAddMembers" class="fcom-mf-space-members__add-panel fcom-mf-card">
                    <h3 class="fcom-mf-space-members__section-title">Add Members</h3>
                    <input
                        v-model="userLookup"
                        type="text"
                        class="fcom-mf-input"
                        placeholder="Search users to add (min 2 characters)"
                    />
                    <div v-if="userLookupLoading" class="fcom-mf-space-members__loading-inline">Searching users...</div>
                    <div
                        v-else-if="userLookup.trim().length >= 2 && userLookupResults.length === 0"
                        class="fcom-mf-space-members__empty-inline"
                    >
                        No users found.
                    </div>
                    <div v-else-if="userLookupResults.length > 0" class="fcom-mf-space-members__lookup-list">
                        <div
                            v-for="user in userLookupResults"
                            :key="user.ID"
                            class="fcom-mf-space-members__lookup-item"
                        >
                            <span class="fcom-mf-space-members__lookup-name">{{ user.display_name }}</span>
                            <button
                                class="fcom-mf-btn fcom-mf-btn--primary"
                                :disabled="!!addingMemberIds[user.ID]"
                                @click="addMember(user)"
                            >
                                {{ addingMemberIds[user.ID] ? 'Adding...' : 'Add' }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="loadingMembers" class="fcom-mf-space-members__loading">
                    <div class="fcom-mf-spinner"></div>
                </div>

                <div v-else-if="membersError" class="fcom-mf-space-members__error fcom-mf-card">
                    <h3>Could not load members</h3>
                    <p>{{ membersError }}</p>
                    <button class="fcom-mf-btn fcom-mf-btn--outline" @click="fetchMembers(1, false)">
                        Try Again
                    </button>
                </div>

                <div v-else-if="members.length === 0" class="fcom-mf-space-members__empty fcom-mf-card">
                    <h3>{{ isViewingPending ? 'No pending requests' : 'No members found' }}</h3>
                    <p>
                        {{
                            isViewingPending
                                ? 'There are no pending join requests right now.'
                                : 'Try a different search term.'
                        }}
                    </p>
                </div>

                <div v-else class="fcom-mf-space-members__list fcom-mf-card">
                    <div
                        v-for="member in members"
                        :key="member.id"
                        class="fcom-mf-space-members__item"
                    >
                        <div class="fcom-mf-space-members__member-main">
                            <img
                                :src="member.xprofile.avatar"
                                :alt="member.xprofile.display_name"
                                class="fcom-mf-avatar fcom-mf-avatar--sm"
                            />
                            <div class="fcom-mf-space-members__member-meta">
                                <router-link
                                    :to="{ name: 'profile', params: { username: member.xprofile.username } }"
                                    class="fcom-mf-space-members__member-name"
                                >
                                    {{ member.xprofile.display_name }}
                                </router-link>
                                <div class="fcom-mf-space-members__member-sub">
                                    <span class="fcom-mf-space-members__role">{{ formatMemberRole(member.role) }}</span>
                                    <span v-if="member.created_at">Joined {{ member.created_at }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="canAddMembers || canRemoveMembers" class="fcom-mf-space-members__member-actions">
                            <button
                                v-if="isViewingPending && canAddMembers"
                                class="fcom-mf-btn fcom-mf-btn--primary"
                                :disabled="!!approvingMemberIds[member.user_id]"
                                @click="approvePending(member)"
                            >
                                {{ approvingMemberIds[member.user_id] ? 'Approving...' : 'Approve' }}
                            </button>

                            <button
                                v-if="canRemoveMembers"
                                class="fcom-mf-btn fcom-mf-btn--outline"
                                :disabled="!!removingMemberIds[member.user_id]"
                                @click="removeMember(member)"
                            >
                                {{ removingMemberIds[member.user_id] ? 'Removing...' : (isViewingPending ? 'Reject' : 'Remove') }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="!loadingMembers && membersHasMore" class="fcom-mf-load-more">
                    <button class="fcom-mf-btn fcom-mf-btn--outline" @click="loadMoreMembers">
                        Load More Members
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-space-view {
    width: 100%;

    &__back {
        margin-bottom: $spacing-md;
    }
}

.fcom-mf-back-btn {
    display: inline-flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border: none;
    background: $white;
    border-radius: $border-radius-md;
    color: $text-primary;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    cursor: pointer;
    box-shadow: $shadow-sm;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-50;
    }
}

.fcom-mf-space-loading {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-space-skeleton {
    &__header {
        height: 150px;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__content {
        display: flex;
        gap: $spacing-lg;
        padding: $spacing-lg;
        padding-top: 50px;
        position: relative;
    }

    &__logo {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        position: absolute;
        top: -40px;
        left: $spacing-lg;
        border: 4px solid $white;
    }

    &__info {
        flex: 1;
        padding-left: 100px;
    }

    &__title {
        height: 24px;
        width: 50%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-sm;
    }

    &__desc {
        height: 16px;
        width: 30%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-error-state {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-lg;
    }

    h2 {
        font-size: $font-size-xl;
        color: $text-primary;
        margin: 0 0 $spacing-sm;
    }

    p {
        color: $text-secondary;
        margin: 0 0 $spacing-lg;
    }
}

.fcom-mf-space-header {
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-lg;

    &__cover {
        height: 150px;
        background: linear-gradient(135deg, var(--fcom-mf-primary, #1877f2) 0%, var(--fcom-mf-primary-hover, #166fe5) 100%);
        background-size: cover;
        background-position: center;
    }

    &__content {
        display: flex;
        align-items: flex-end;
        gap: $spacing-lg;
        padding: $spacing-lg;
        padding-top: 0;
        position: relative;
    }

    &__logo-wrapper {
        margin-top: -40px;
    }

    &__logo {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        border: 4px solid $white;
        object-fit: cover;
        background: $white;
    }

    &__logo-placeholder {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-md;
        border: 4px solid $white;
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: $font-weight-bold;
    }

    &__info {
        flex: 1;
    }

    &__title {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    &__privacy {
        color: $text-tertiary;
    }

    &__stats {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: $spacing-xs $spacing-md;
        font-size: $font-size-sm;
        color: $text-secondary;
        line-height: 1.4;
    }

    &__stat {
        display: inline-flex;
        align-items: center;
    }

    &__stat-sep {
        color: $text-tertiary;
        user-select: none;
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        flex-wrap: wrap;
        flex-shrink: 0;
    }
}

.fcom-mf-space-tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    background: $white;
    padding: $spacing-sm;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
}

.fcom-mf-space-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    flex: 1;
    padding: $spacing-sm $spacing-lg;
    border: none;
    background: transparent;
    border-radius: $border-radius-md;
    color: $text-secondary;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &--active {
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
    }

    &__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 6px;
        font-size: 11px;
        border-radius: 999px;
        background: $badge-bg;
        color: $white;
        line-height: 1;
    }
}

.fcom-mf-space-posts {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    &__sticky-wrap {
        margin: $spacing-md 0;
    }
}

.fcom-mf-space-feed {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-space-feed__trigger {
    min-height: 1px;
    pointer-events: none;
}

.fcom-mf-loading-more {
    text-align: center;
    padding: $spacing-lg;
}

.fcom-mf-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid $gray-200;
    border-top-color: var(--fcom-mf-primary, #1877f2);
    border-radius: $border-radius-full;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

.fcom-mf-load-more {
    text-align: center;
    padding: $spacing-lg 0;
}

.fcom-mf-empty-posts {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-md;
    }

    h3 {
        font-size: $font-size-lg;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    p {
        color: $text-secondary;
        margin: 0;
    }
}

.fcom-mf-space-about {
    // About tab content
}

.fcom-mf-space-members {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    &__toolbar {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-md;
        flex-wrap: wrap;
    }

    &__search-wrap {
        flex: 1;
        min-width: 220px;
    }

    &__search {
        width: 100%;
    }

    &__filters {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
    }

    &__filter-btn {
        @include button-reset;
        padding: $spacing-xs $spacing-md;
        border-radius: $border-radius-md;
        background: $gray-100;
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        transition: background-color $transition-fast, color $transition-fast;

        &:hover {
            background: $gray-200;
        }

        &--active {
            background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.12);
            color: var(--fcom-mf-primary, #1877f2);
        }
    }

    &__add-panel,
    &__list,
    &__error,
    &__empty {
        padding: $spacing-md;
    }

    &__section-title {
        margin: 0 0 $spacing-sm;
        color: $text-primary;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
    }

    &__loading-inline,
    &__empty-inline {
        margin-top: $spacing-sm;
        color: $text-secondary;
        font-size: $font-size-sm;
    }

    &__lookup-list {
        margin-top: $spacing-sm;
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    &__lookup-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $spacing-sm;
        padding: $spacing-sm;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
    }

    &__lookup-name {
        color: $text-primary;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
    }

    &__loading {
        text-align: center;
        padding: $spacing-lg;
    }

    &__error,
    &__empty {
        text-align: center;

        h3 {
            margin: 0 0 $spacing-xs;
            font-size: $font-size-lg;
            color: $text-primary;
        }

        p {
            margin: 0 0 $spacing-md;
            color: $text-secondary;
        }
    }

    &__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $spacing-md;
        padding: $spacing-md 0;
        border-bottom: 1px solid $border-color;

        &:first-child {
            padding-top: 0;
        }

        &:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
    }

    &__member-main {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        min-width: 0;
        flex: 1;
    }

    &__member-meta {
        min-width: 0;
    }

    &__member-name {
        display: inline-block;
        color: $text-primary;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        line-height: 1.3;

        &:hover {
            text-decoration: underline;
        }
    }

    &__member-sub {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: $spacing-xs $spacing-sm;
        margin-top: 2px;
        color: $text-secondary;
        font-size: $font-size-xs;
    }

    &__role {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: $font-weight-semibold;
        background: $gray-100;
        color: $text-secondary;
    }

    &__member-actions {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        flex-shrink: 0;
    }
}

.fcom-mf-about-card {
    background: $white;
    border-radius: $border-radius-lg;
    padding: $spacing-xl;
    box-shadow: $shadow-sm;

    h3 {
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-md;
    }

    p {
        color: $text-secondary;
        line-height: $line-height-relaxed;
        margin: 0 0 $spacing-lg;
    }

    &__empty {
        color: $text-tertiary;
        font-style: italic;
    }

    &__meta {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
        padding-top: $spacing-lg;
        border-top: 1px solid $border-color;
    }

    &__item {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
        color: $text-secondary;

        svg {
            color: $text-tertiary;
        }
    }
}

.fcom-mf-btn {
    padding: $spacing-sm $spacing-lg;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;

    &--primary {
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;

        &:hover {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }
    }

    &--secondary {
        background: $gray-100;
        color: $text-secondary;

        &:hover {
            background: $gray-200;
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover {
            background: $gray-50;
        }
    }
}

@media (max-width: $breakpoint-md) {
    .fcom-mf-space-header__content {
        align-items: flex-start;
        flex-direction: column;
        gap: $spacing-md;
    }

    .fcom-mf-space-header__actions {
        width: 100%;
    }

    .fcom-mf-space-members__toolbar {
        align-items: stretch;
    }

    .fcom-mf-space-members__filters {
        width: 100%;
    }

    .fcom-mf-space-members__filter-btn {
        flex: 1;
        text-align: center;
    }

    .fcom-mf-space-members__item {
        align-items: flex-start;
        flex-direction: column;
    }

    .fcom-mf-space-members__member-actions {
        width: 100%;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
