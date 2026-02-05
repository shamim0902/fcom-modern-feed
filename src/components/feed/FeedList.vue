<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFeedStore, useUiStore } from '@/stores';
import FeedItem from './FeedItem.vue';
import FeedSkeleton from './FeedSkeleton.vue';

const props = defineProps<{
    space?: string;
    userId?: number | null;
    perPage?: number;
}>();

const route = useRoute();
const feedStore = useFeedStore();
const uiStore = useUiStore();

const loadMoreRef = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);

const contextKey = computed(() => {
    return feedStore.getContextKey(props.space, props.userId);
});

const feeds = computed(() => {
    return feedStore.contexts[contextKey.value]?.feeds || [];
});

const stickyFeed = computed(() => {
    return feedStore.contexts[contextKey.value]?.stickyFeed;
});

const isLoading = computed(() => {
    return feedStore.contexts[contextKey.value]?.loading || false;
});

const hasMore = computed(() => {
    return feedStore.contexts[contextKey.value]?.hasMore ?? true;
});

const isEmpty = computed(() => {
    return !isLoading.value && feeds.value.length === 0 && !stickyFeed.value;
});

async function loadMore(): Promise<void> {
    if (isLoading.value || !hasMore.value) return;

    const search = typeof route.query.search === 'string' ? route.query.search.trim() : undefined;
    await feedStore.fetchFeeds(
        {
            space: props.space,
            userId: props.userId,
            perPage: props.perPage,
            search: search || undefined,
        },
        true
    );
}

function setupObserver(): void {
    if (!window.fcomModernFeed?.features?.infiniteScroll) return;

    observer.value = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
                loadMore();
            }
        },
        {
            root: null,
            rootMargin: '200px',
            threshold: 0,
        }
    );

    if (loadMoreRef.value) {
        observer.value.observe(loadMoreRef.value);
    }
}

watch(
    () => loadMoreRef.value,
    (el) => {
        if (el && observer.value) {
            observer.value.observe(el);
        }
    }
);

onMounted(() => {
    setupObserver();
});

onUnmounted(() => {
    if (observer.value) {
        observer.value.disconnect();
    }
});
</script>

<template>
    <div class="fcom-mf-feed-list">
        <!-- Sticky Post -->
        <div v-if="stickyFeed" class="fcom-mf-feed-list__sticky-wrap">
            <FeedItem
                :feed="stickyFeed"
                :is-sticky="true"
            />
        </div>

        <!-- Feed Items -->
        <FeedItem
            v-for="feed in feeds"
            :key="feed.id"
            :feed="feed"
        />

        <!-- Loading Skeletons -->
        <template v-if="isLoading && feeds.length === 0">
            <FeedSkeleton v-for="i in 3" :key="i" />
        </template>

        <!-- Load More Trigger -->
        <div ref="loadMoreRef" class="fcom-mf-feed-list__trigger">
            <div v-if="isLoading && feeds.length > 0" class="fcom-mf-feed-list__loading">
                <span class="fcom-mf-spinner"></span>
                <span>{{ uiStore.t('loading') }}</span>
            </div>

            <p v-else-if="!hasMore && feeds.length > 0" class="fcom-mf-feed-list__end">
                {{ uiStore.t('noMorePosts') }}
            </p>
        </div>

        <!-- Empty State -->
        <div v-if="isEmpty" class="fcom-mf-empty">
            <div class="fcom-mf-empty__icon">📭</div>
            <h3 class="fcom-mf-empty__title">{{ uiStore.t('noPosts') }}</h3>
            <p class="fcom-mf-empty__text">Be the first to share something!</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-feed-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm; // Facebook uses tighter gaps (~8px)

    @media (max-width: $breakpoint-sm) {
        gap: $spacing-xs; // Even tighter on mobile
    }

    &__sticky-wrap {
        margin: $spacing-sm 0;

        @media (max-width: $breakpoint-sm) {
            margin: $spacing-xs 0;
        }
    }

    &__trigger {
        min-height: 1px;
    }

    &__loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-sm;
        padding: $spacing-lg;
        color: $text-secondary;
        font-size: $font-size-sm;
    }

    &__end {
        text-align: center;
        padding: $spacing-lg;
        color: $text-tertiary;
        font-size: $font-size-sm;
    }
}
</style>
