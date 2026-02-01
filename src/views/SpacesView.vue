<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { SpaceFull, SpacesResponse } from '@/api/types';
import { useAuthStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();

const spaces = ref<SpaceFull[]>([]);
const mySpaces = ref<SpaceFull[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const activeTab = ref<'discover' | 'my'>('discover');

async function fetchSpaces(): Promise<void> {
    loading.value = true;
    try {
        const response = await api.get<SpacesResponse>('spaces', {
            per_page: 50,
        });

        if (response.spaces?.data) {
            spaces.value = response.spaces.data;
        } else if (Array.isArray(response.spaces)) {
            spaces.value = response.spaces;
        } else {
            spaces.value = [];
        }
        mySpaces.value = response.my_spaces || [];
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

async function joinSpace(space: SpaceFull, event: Event): Promise<void> {
    event.stopPropagation();
    if (!authStore.isLoggedIn) return;

    try {
        await api.post(`spaces/${space.slug}/join`);
        space.is_member = true;
        space.members_count++;
        mySpaces.value.push(space);
    } catch (error) {
        console.error('Failed to join space:', error);
    }
}

async function leaveSpace(space: SpaceFull, event: Event): Promise<void> {
    event.stopPropagation();
    if (!authStore.isLoggedIn) return;

    try {
        await api.post(`spaces/${space.slug}/leave`);
        space.is_member = false;
        space.members_count--;
        mySpaces.value = mySpaces.value.filter(s => s.id !== space.id);
    } catch (error) {
        console.error('Failed to leave space:', error);
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
    <div class="spaces-view">
        <!-- Compact Header -->
        <div class="spaces-header">
            <div class="spaces-header__left">
                <div class="spaces-header__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
                    </svg>
                </div>
                <div class="spaces-header__text">
                    <h1>Spaces</h1>
                    <span>Discover communities</span>
                </div>
            </div>
            <div class="spaces-header__search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search spaces..."
                />
            </div>
        </div>

        <!-- Tabs -->
        <div class="spaces-tabs">
            <button
                class="spaces-tab"
                :class="{ 'spaces-tab--active': activeTab === 'discover' }"
                @click="activeTab = 'discover'"
            >
                Discover
            </button>
            <button
                v-if="authStore.isLoggedIn"
                class="spaces-tab"
                :class="{ 'spaces-tab--active': activeTab === 'my' }"
                @click="activeTab = 'my'"
            >
                Your Spaces
                <span v-if="mySpaces.length" class="spaces-tab__count">{{ mySpaces.length }}</span>
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="spaces-grid">
            <div v-for="i in 8" :key="i" class="space-card space-card--skeleton">
                <div class="space-card__cover"></div>
                <div class="space-card__body">
                    <div class="skeleton-line skeleton-line--title"></div>
                    <div class="skeleton-line skeleton-line--text"></div>
                    <div class="skeleton-line skeleton-line--meta"></div>
                </div>
            </div>
        </div>

        <!-- Spaces Grid -->
        <div v-else class="spaces-grid">
            <div
                v-for="space in displayedSpaces"
                :key="space.id"
                class="space-card"
                @click="navigateToSpace(space.slug)"
            >
                <div
                    class="space-card__cover"
                    :style="space.cover ? { backgroundImage: `url(${space.cover})` } : {}"
                >
                    <div class="space-card__logo">
                        <img v-if="space.logo" :src="space.logo" :alt="space.title" />
                        <span v-else class="space-card__logo-text">{{ space.title?.charAt(0) || 'S' }}</span>
                    </div>
                    <span v-if="space.privacy === 'private'" class="space-card__privacy">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                        </svg>
                    </span>
                </div>
                <div class="space-card__body">
                    <h3 class="space-card__title">{{ space.title }}</h3>
                    <p v-if="space.description" class="space-card__desc">{{ space.description }}</p>
                    <div class="space-card__meta">
                        <span class="space-card__stat">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            {{ formatNumber(space.members_count) }}
                        </span>
                        <span v-if="space.posts_count" class="space-card__stat">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                            </svg>
                            {{ formatNumber(space.posts_count) }}
                        </span>
                    </div>
                    <button
                        v-if="authStore.isLoggedIn"
                        class="space-card__btn"
                        :class="{ 'space-card__btn--joined': space.is_member }"
                        @click="space.is_member ? leaveSpace(space, $event) : joinSpace(space, $event)"
                    >
                        <svg v-if="space.is_member" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        {{ space.is_member ? 'Joined' : 'Join' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && displayedSpaces.length === 0" class="spaces-empty">
            <div class="spaces-empty__icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
            </div>
            <h3>{{ activeTab === 'my' ? 'No spaces joined yet' : 'No spaces found' }}</h3>
            <p>{{ activeTab === 'my' ? 'Join spaces to connect with communities.' : 'Try a different search term.' }}</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.spaces-view {
    width: 100%;
    font-family: $font-family;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.spaces-header {
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
        background: linear-gradient(135deg, $primary-color, #0d65d9);
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
            box-shadow: 0 0 0 2px rgba($primary-color, 0.2);
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
        background: rgba($primary-color, 0.1);
        color: $primary-color;
    }

    &__count {
        background: $gray-200;
        color: $text-secondary;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;

        .spaces-tab--active & {
            background: $primary-color;
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

        .space-card--skeleton & {
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
        border-radius: 10px;
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
        background: linear-gradient(135deg, $primary-color, #0d65d9);
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
            color: $primary-color;
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
        background: $primary-color;
        color: $white;
        border: none;
        border-radius: $border-radius-sm;
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        font-family: inherit;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
            background: $primary-hover;
        }

        &--joined {
            background: $gray-100;
            color: $text-secondary;

            &:hover {
                background: $gray-200;
            }
        }
    }
}

.skeleton-line {
    background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;

    &--title {
        height: 16px;
        width: 70%;
        margin-bottom: 8px;
    }

    &--text {
        height: 12px;
        width: 100%;
        margin-bottom: 6px;
    }

    &--meta {
        height: 12px;
        width: 40%;
    }
}

.spaces-empty {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-md;
    box-shadow: $shadow-card;

    &__icon {
        width: 72px;
        height: 72px;
        background: $gray-50;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto $spacing-lg;

        svg {
            color: $text-tertiary;
        }
    }

    h3 {
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-xs;
    }

    p {
        font-size: $font-size-md;
        color: $text-secondary;
        margin: 0;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@media (max-width: $breakpoint-md) {
    .spaces-header {
        flex-direction: column;
        align-items: stretch;

        &__search {
            min-width: auto;
        }
    }

    .spaces-grid {
        grid-template-columns: 1fr;
    }
}
</style>
