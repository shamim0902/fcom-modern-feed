<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { SpaceFull, SpacesResponse } from '@/api/types';
import { useAuthStore, useUiStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const spaces = ref<SpaceFull[]>([]);
const mySpaces = ref<SpaceFull[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const activeTab = ref<'discover' | 'my'>('discover');
const joining = ref<Record<number, boolean>>({});

function isSpaceMember(space: SpaceFull, memberIds: Set<number>, memberSlugs: Set<string>): boolean {
    const inferredMember = Boolean(
        // Some APIs return member flags under different keys
        (space as SpaceFull & { space_pivot?: unknown; user_status?: { status?: string } }).space_pivot ||
        (space as SpaceFull & { user_status?: { status?: string } }).user_status?.status === 'active'
    );
    return Boolean(space.is_member || inferredMember || memberIds.has(space.id) || memberSlugs.has(space.slug));
}

/** True when this space should show "View Space" (not "Join") – always true in "Your spaces" tab. */
function showAsMember(space: SpaceFull): boolean {
    return activeTab.value === 'my' || !!space.is_member;
}

async function fetchSpaces(): Promise<void> {
    loading.value = true;
    try {
        // GET spaces returns only the user's joined spaces (SpaceController@get)
        const myResponse = await api.get<{ spaces: SpaceFull[] } | { spaces: { data: SpaceFull[] } }>('spaces');
        const rawMy = myResponse.spaces;
        const myList = Array.isArray(rawMy) ? rawMy : (rawMy && 'data' in rawMy ? rawMy.data : []);
        const myArr = Array.isArray(myList) ? myList : [];
        mySpaces.value = myArr.map((s) => ({ ...s, is_member: true }));

        const memberIds = new Set(mySpaces.value.map((s) => s.id));
        const memberSlugs = new Set(mySpaces.value.map((s) => s.slug));

        // Discover tab: spaces from GET spaces/discover (paginated: { spaces: { data: [...] } })
        const discoverResponse = await api.get<SpacesResponse>('spaces/discover', {
            per_page: 50,
        });
        const rawDiscover = discoverResponse.spaces;
        const discoverList =
            rawDiscover && 'data' in rawDiscover && Array.isArray(rawDiscover.data)
                ? rawDiscover.data
                : Array.isArray(rawDiscover)
                  ? rawDiscover
                  : [];
        spaces.value = discoverList;
        if (spaces.value.length) {
            spaces.value = spaces.value.map((space) => ({
                ...space,
                is_member: isSpaceMember(space, memberIds, memberSlugs),
            }));
        }
    } catch (error) {
        console.error('Failed to fetch spaces:', error);
        spaces.value = [];
        mySpaces.value = [];
    } finally {
        loading.value = false;
    }
}

function navigateToSpace(slug: string): void {
    router.push({ name: 'space', params: { slug } });
}

async function joinSpace(space: SpaceFull): Promise<void> {
    if (!authStore.requireAuth()) return;
    if (space.privacy && space.privacy !== 'public') {
        navigateToSpace(space.slug);
        return;
    }
    if (joining.value[space.id]) return;

    joining.value[space.id] = true;
    try {
        await api.post(`spaces/${space.slug}/join`);
        space.is_member = true;
        space.members_count = (space.members_count || 0) + 1;
        if (!mySpaces.value.find(s => s.id === space.id)) {
            mySpaces.value.push(space);
        }
        uiStore.showSuccess('Successfully joined the space.');
    } catch (error) {
        const apiError = error as { message?: string; status?: number };
        if (apiError?.status === 422 && apiError?.message?.includes('already a member')) {
            space.is_member = true;
            if (!mySpaces.value.find(s => s.id === space.id)) {
                mySpaces.value.push(space);
            }
            uiStore.showInfo('You are already a member of this space.');
        } else {
            console.error('Failed to join space:', error);
            uiStore.showError('Failed to join the space. Please try again.');
        }
    } finally {
        joining.value[space.id] = false;
    }
}

onMounted(() => {
    fetchSpaces();
});

const displayedSpaces = computed(() => {
    const list = activeTab.value === 'my' ? mySpaces.value : spaces.value;
    if (!list || !Array.isArray(list)) return [];
    if (!searchQuery.value) return list;
    const query = searchQuery.value.toLowerCase();
    return list.filter(s =>
        s.title?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
});

function formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
</script>

<template>
    <div class="fcom-mf-spaces-view">
        <!-- Page header (matches Members / Leaderboard) -->
        <div class="fcom-mf-page-header">
            <div class="fcom-mf-page-header__content">
                <h1 class="fcom-mf-page-header__title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
                    </svg>
                    Spaces
                </h1>
                <p class="fcom-mf-page-header__subtitle">Discover communities</p>
            </div>
        </div>

        <!-- Search & Tabs (matches design system) -->
        <div class="fcom-mf-spaces-filters">
            <div class="fcom-mf-search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search spaces..."
                />
            </div>
        </div>

        <div class="fcom-mf-spaces-tabs">
            <button
                class="fcom-mf-spaces-tab"
                :class="{ 'fcom-mf-spaces-tab--active': activeTab === 'discover' }"
                @click="activeTab = 'discover'"
            >
                Discover
            </button>
            <button
                v-if="authStore.isLoggedIn"
                class="fcom-mf-spaces-tab"
                :class="{ 'fcom-mf-spaces-tab--active': activeTab === 'my' }"
                @click="activeTab = 'my'"
            >
                Your Spaces
                <span v-if="mySpaces.length" class="fcom-mf-spaces-tab__count">{{ mySpaces.length }}</span>
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="fcom-mf-spaces-grid">
            <div v-for="i in 8" :key="i" class="fcom-mf-space-card fcom-mf-space-card--skeleton">
                <div class="fcom-mf-space-card__cover"></div>
                <div class="fcom-mf-space-card__body">
                    <div class="fcom-mf-skeleton" style="height: 16px; width: 70%; margin-bottom: 8px;"></div>
                    <div class="fcom-mf-skeleton" style="height: 12px; width: 100%; margin-bottom: 6px;"></div>
                    <div class="fcom-mf-skeleton" style="height: 12px; width: 40%;"></div>
                </div>
            </div>
        </div>

        <!-- Spaces Grid -->
        <div v-else class="fcom-mf-spaces-grid">
            <div
                v-for="space in displayedSpaces"
                :key="space.id"
                class="fcom-mf-space-card"
                @click="navigateToSpace(space.slug)"
            >
                <div
                    class="fcom-mf-space-card__cover"
                    :style="space.cover ? { backgroundImage: `url(${space.cover})` } : {}"
                >
                    <div class="fcom-mf-space-card__logo">
                        <img v-if="space.logo" :src="space.logo" :alt="space.title" />
                        <span v-else class="fcom-mf-space-card__logo-text">{{ space.title?.charAt(0) || 'S' }}</span>
                    </div>
                    <span v-if="space.privacy === 'private'" class="fcom-mf-space-card__privacy">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                        </svg>
                    </span>
                </div>
                <div class="fcom-mf-space-card__body">
                    <h3 class="fcom-mf-space-card__title">{{ space.title }}</h3>
                    <p v-if="space.description" class="fcom-mf-space-card__desc">{{ space.description }}</p>
                    <div class="fcom-mf-space-card__meta">
                        <span class="fcom-mf-space-card__stat">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            {{ formatNumber(space.members_count ?? 0) }}
                        </span>
                        <span class="fcom-mf-space-card__stat">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                            </svg>
                            {{ formatNumber(space.posts_count ?? 0) }}
                        </span>
                    </div>
                    <button
                        v-if="authStore.isLoggedIn && !showAsMember(space)"
                        class="fcom-mf-space-card__btn"
                        :disabled="joining[space.id]"
                        @click.stop="joinSpace(space)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Join
                    </button>
                    <button
                        v-else-if="authStore.isLoggedIn && showAsMember(space)"
                        class="fcom-mf-space-card__view-btn"
                        @click.stop="navigateToSpace(space.slug)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 17l5-5-5-5v10z"/>
                        </svg>
                        View Space
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && displayedSpaces.length === 0" class="fcom-mf-empty-state">
            <div class="fcom-mf-empty-state__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
            </div>
            <h2>{{ activeTab === 'my' ? 'No spaces joined yet' : 'No spaces found' }}</h2>
            <p>{{ activeTab === 'my' ? 'Join spaces to connect with communities.' : 'Try a different search term.' }}</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-spaces-view {
    width: 100%;
}

// Page header – matches Members / Leaderboard, uses theme primary
.fcom-mf-page-header {
    background: linear-gradient(135deg, var(--fcom-mf-primary, #1877f2) 0%, var(--fcom-mf-primary-hover, #0d65d9) 100%);
    border-radius: var(--fcom-mf-radius-lg, #{$border-radius-lg});
    padding: $spacing-xl;
    margin-bottom: $spacing-lg;
    color: $white;

    &__content {
        text-align: center;
        color: $white;
    }

    &__title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        margin: 0 0 $spacing-sm;
        color: $white;

        svg {
            opacity: 0.9;
        }
    }

    &__subtitle {
        margin: 0;
        opacity: 0.9;
        font-size: $font-size-md;
    }
}

.fcom-mf-spaces-filters {
    margin-bottom: $spacing-md;
}

.fcom-mf-search-box {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    background: $white;
    border-radius: 20px;
    padding: $spacing-sm $spacing-lg;
    box-shadow: $shadow-sm;
    max-width: 400px;
    border: 1px solid $border-color;
    transition: border-color $transition-fast, box-shadow $transition-fast;

    &:focus-within {
        border-color: var(--fcom-mf-primary, #1877f2);
        box-shadow: 0 0 0 2px rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.1);
    }

    svg {
        color: $text-tertiary;
        flex-shrink: 0;
    }

    input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: $font-size-md;
        font-family: inherit;
        color: $text-primary;
        min-width: 0;
        width: 100%;
        padding: $spacing-xs 0;

        &::placeholder {
            color: $text-tertiary;
        }

        &:focus {
            outline: none;
        }
    }
}

.fcom-mf-spaces-tabs {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-lg;
    background: $white;
    padding: $spacing-sm;
    border-radius: var(--fcom-mf-radius-lg, #{$border-radius-lg});
    box-shadow: $shadow-sm;
}

.fcom-mf-spaces-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    padding: $spacing-sm $spacing-lg;
    border: none;
    background: transparent;
    border-radius: var(--fcom-mf-radius-md, #{$border-radius-md});
    color: $text-secondary;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    font-family: inherit;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &--active {
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
    }

    &__count {
        background: $gray-200;
        color: $text-secondary;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;

        .fcom-mf-spaces-tab--active & {
            background: rgba($white, 0.25);
            color: $white;
        }
    }
}

.fcom-mf-spaces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-md;
}

.fcom-mf-space-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $white;
    border-radius: $border-radius-md;
    box-shadow: $shadow-card;
    margin-bottom: $spacing-sm;

    &__left {
        display: flex;
        align-items: center;
        gap: $spacing-md;
    }

    &__icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, var(--fcom-mf-primary, #1877f2), var(--fcom-mf-primary-hover, #0d65d9));
        border-radius: $border-radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $white;
    }

    &__text {
        h1 {
            font-size: $font-size-xl;
            font-weight: $font-weight-bold;
            color: $text-primary;
            margin: 0;
            letter-spacing: $letter-spacing-tight;
            line-height: 1.2;
        }

        span {
            font-size: $font-size-sm;
            color: $text-tertiary;
        }
    }

    &__search {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        background: $gray-50;
        border-radius: 20px;
        padding: 8px 14px;
        min-width: 200px;
        transition: all $transition-fast;

        &:focus-within {
            background: $white;
            box-shadow: 0 0 0 2px rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.2);
        }

        svg {
            color: $text-tertiary;
            flex-shrink: 0;
        }

        input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: $font-size-md;
            color: $text-primary;
            font-family: inherit;

            &::placeholder {
                color: $text-tertiary;
            }

            &:focus {
                outline: none;
            }
        }
    }
}

.spaces-tabs {
    display: flex;
    gap: 4px;
    padding: $spacing-xs $spacing-sm;
    background: $white;
    border-radius: $border-radius-md;
    box-shadow: $shadow-card;
    margin-bottom: $spacing-md;
}

.spaces-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-radius: $border-radius-sm;
    color: $text-secondary;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    font-family: inherit;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &--active {
        background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.1);
        color: var(--fcom-mf-primary, #1877f2);
    }

    &__count {
        background: $gray-200;
        color: $text-secondary;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;

        .spaces-tab--active & {
            background: var(--fcom-mf-primary, #1877f2);
            color: $white;
        }
    }
}

.spaces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-md;
}

.space-card {
    background: $white;
    border-radius: $border-radius-md;
    overflow: hidden;
    box-shadow: $shadow-card;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        box-shadow: $shadow-card-hover;
        transform: translateY(-1px);
    }

    &--skeleton {
        pointer-events: none;
    }

    &__cover {
        height: 80px;
        background: linear-gradient(135deg, $gray-100 0%, $gray-200 100%);
        background-size: cover;
        background-position: center;
        position: relative;

        .fcom-mf-space-card--skeleton & {
            background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
    }

    &__logo {
        position: absolute;
        left: $spacing-md;
        bottom: -18px;
        width: 44px;
        height: 44px;
        border-radius: var(--fcom-mf-radius-md, #{$border-radius-md});
        border: 3px solid $white;
        background: $white;
        overflow: hidden;
        box-shadow: $shadow-sm;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__logo-text {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, var(--fcom-mf-primary, #1877f2), var(--fcom-mf-primary-hover, #0d65d9));
        color: $white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: $font-size-lg;
        font-weight: $font-weight-bold;
    }

    &__privacy {
        position: absolute;
        top: $spacing-sm;
        right: $spacing-sm;
        background: rgba($black, 0.5);
        backdrop-filter: blur(4px);
        padding: 4px 8px;
        border-radius: 12px;
        color: $white;
        display: flex;
        align-items: center;
    }

    &__body {
        padding: 24px $spacing-md $spacing-md;
    }

    &__title {
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 4px;
        line-height: $line-height-normal;
        letter-spacing: $letter-spacing-normal;

        &:hover {
            color: var(--fcom-mf-primary, #1877f2);
        }
    }

    &__desc {
        font-size: $font-size-sm;
        color: $text-secondary;
        margin: 0 0 $spacing-sm;
        line-height: $line-height-relaxed;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        margin-bottom: $spacing-sm;
    }

    &__stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: $font-size-xs;
        color: $text-tertiary;
        font-weight: $font-weight-medium;

        svg {
            opacity: 0.7;
        }
    }

    &__btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        border: none;
        border-radius: var(--fcom-mf-radius-sm, #{$border-radius-sm});
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        font-family: inherit;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
            background: var(--fcom-mf-primary-hover, #166fe5);
        }

        &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    }

    &__view-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        background: $gray-100;
        color: $text-secondary;
        border: none;
        border-radius: var(--fcom-mf-radius-sm, #{$border-radius-sm});
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        font-family: inherit;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
            background: $gray-200;
        }
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@media (max-width: $breakpoint-md) {
    .fcom-mf-spaces-grid {
        grid-template-columns: 1fr;
    }
}
</style>
