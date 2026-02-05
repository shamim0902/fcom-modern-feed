<script setup lang="ts">
import { computed, inject } from 'vue';
import { useFeedStore } from '@/stores';
import FeedList from '@/components/feed/FeedList.vue';
import CreatePost from '@/components/feed/CreatePost.vue';
import NewPostsBanner from '@/components/feed/NewPostsBanner.vue';

interface Config {
    containerId: string;
    space?: string;
    userId?: number | null;
    perPage?: number;
    layout?: 'card' | 'compact';
    showCreate?: boolean;
    showHeader?: boolean;
}

const config = inject<Config>('config')!;
const feedStore = useFeedStore();

const showCreatePost = computed(() => {
    return config.showCreate !== false;
});

const contextKey = computed(() => {
    return feedStore.getContextKey(config.space, config.userId);
});

const newPostsCount = computed(() => {
    return feedStore.contexts[contextKey.value]?.newPostsCount || 0;
});

function handleLoadNewPosts(): void {
    feedStore.fetchFeeds({
        space: config.space,
        userId: config.userId,
        perPage: config.perPage,
    });
}
</script>

<template>
    <div class="fcom-mf-feed-view">
        <!-- Create Post Box -->
        <CreatePost
            v-if="showCreatePost"
            :space="config.space"
        />

        <!-- New Posts Banner -->
        <NewPostsBanner
            v-if="newPostsCount > 0"
            :count="newPostsCount"
            @load="handleLoadNewPosts"
        />

        <!-- Feed List -->
        <FeedList
            :space="config.space"
            :user-id="config.userId"
            :per-page="config.perPage"
        />
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-feed-view {
    width: 100%;
    max-width: $card-max-width;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    @media (max-width: $breakpoint-sm) {
        gap: $spacing-sm;
    }
}
</style>
