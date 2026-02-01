import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { Feed, Comment, FeedsResponse, CommentsResponse, CreateFeedData, CreateCommentData } from '@/api/types';

interface FeedContext {
    feeds: Feed[];
    stickyFeed: Feed | null;
    loading: boolean;
    hasMore: boolean;
    page: number;
    lastFetchedTimestamp: number | null;
    newPostsCount: number;
}

export const useFeedStore = defineStore('feed', () => {
    // State
    const contexts = ref<Record<string, FeedContext>>({});
    const feedsById = ref<Record<number, Feed>>({});
    const currentContext = ref<string>('global');

    // Getters
    const getCurrentContext = computed(() => {
        return contexts.value[currentContext.value] || createEmptyContext();
    });

    const getFeeds = computed(() => {
        return getCurrentContext.value.feeds;
    });

    const getStickyFeed = computed(() => {
        return getCurrentContext.value.stickyFeed;
    });

    const isLoading = computed(() => {
        return getCurrentContext.value.loading;
    });

    const hasMoreFeeds = computed(() => {
        return getCurrentContext.value.hasMore;
    });

    const newPostsCount = computed(() => {
        return getCurrentContext.value.newPostsCount;
    });

    // Helper functions
    function createEmptyContext(): FeedContext {
        return {
            feeds: [],
            stickyFeed: null,
            loading: false,
            hasMore: true,
            page: 0,
            lastFetchedTimestamp: null,
            newPostsCount: 0,
        };
    }

    function getContextKey(space?: string, userId?: number | null): string {
        if (userId) {
            return `user-${userId}`;
        }
        if (space) {
            return `space-${space}`;
        }
        return 'global';
    }

    function ensureContext(key: string): FeedContext {
        if (!contexts.value[key]) {
            contexts.value[key] = createEmptyContext();
        }
        return contexts.value[key];
    }

    // Actions
    async function fetchFeeds(
        params: {
            space?: string;
            userId?: number | null;
            perPage?: number;
            search?: string;
            topicSlug?: string;
        } = {},
        loadMore = false
    ): Promise<void> {
        const contextKey = getContextKey(params.space, params.userId);
        currentContext.value = contextKey;
        const context = ensureContext(contextKey);

        if (context.loading) return;

        const page = loadMore ? context.page + 1 : 1;
        context.loading = true;

        try {
            const response = await api.get<FeedsResponse>('feeds', {
                page,
                per_page: params.perPage || window.fcomModernFeed.settings.perPage,
                space: params.space,
                user_id: params.userId,
                search: params.search,
                topic_slug: params.topicSlug,
            });

            const feeds = response.feeds.data;

            // Update feedsById cache
            feeds.forEach((feed) => {
                feedsById.value[feed.id] = feed;
            });

            if (loadMore) {
                context.feeds = [...context.feeds, ...feeds];
            } else {
                context.feeds = feeds;
                context.stickyFeed = response.sticky || null;
            }

            context.hasMore = response.feeds.has_more;
            context.page = page;
            context.lastFetchedTimestamp = response.last_fetched_timestamp || null;
            context.newPostsCount = 0;
        } catch (error) {
            console.error('Failed to fetch feeds:', error);
            throw error;
        } finally {
            context.loading = false;
        }
    }

    async function createFeed(data: CreateFeedData): Promise<Feed> {
        const response = await api.post<{ feed: Feed }>('feeds', data);
        const feed = response.feed;

        // Add to cache
        feedsById.value[feed.id] = feed;

        // Add to current context at the top
        const context = contexts.value[currentContext.value];
        if (context) {
            context.feeds = [feed, ...context.feeds];
        }

        return feed;
    }

    async function updateFeed(feedId: number, data: Partial<CreateFeedData>): Promise<Feed> {
        const response = await api.post<{ feed: Feed }>(`feeds/${feedId}`, data);
        const feed = response.feed;

        // Update cache
        feedsById.value[feed.id] = feed;

        // Update in contexts
        Object.values(contexts.value).forEach((context) => {
            const index = context.feeds.findIndex((f) => f.id === feedId);
            if (index !== -1) {
                context.feeds[index] = feed;
            }
        });

        return feed;
    }

    async function deleteFeed(feedId: number): Promise<void> {
        await api.delete(`feeds/${feedId}`);

        // Remove from cache
        delete feedsById.value[feedId];

        // Remove from contexts
        Object.values(contexts.value).forEach((context) => {
            context.feeds = context.feeds.filter((f) => f.id !== feedId);
            if (context.stickyFeed?.id === feedId) {
                context.stickyFeed = null;
            }
        });
    }

    async function toggleReaction(feedId: number): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed) return;

        const wasReacted = feed.has_user_react;

        // Optimistic update
        feed.has_user_react = !wasReacted;
        feed.reactions_count += wasReacted ? -1 : 1;

        try {
            await api.post(`feeds/${feedId}/react`, {
                react_type: 'like',
            });
        } catch (error) {
            // Rollback on error
            feed.has_user_react = wasReacted;
            feed.reactions_count += wasReacted ? 1 : -1;
            throw error;
        }
    }

    async function fetchComments(feedId: number): Promise<Comment[]> {
        const response = await api.get<CommentsResponse>(`feeds/${feedId}/comments`);

        // Update feed with comments
        const feed = feedsById.value[feedId];
        if (feed) {
            feed.comments = response.comments;
            feed.sticky_comment = response.sticky_comment;
        }

        return response.comments;
    }

    async function createComment(feedId: number, data: CreateCommentData): Promise<Comment> {
        const response = await api.post<{ comment: Comment }>(`feeds/${feedId}/comments`, data);
        const comment = response.comment;

        // Update feed comments count
        const feed = feedsById.value[feedId];
        if (feed) {
            feed.comments_count += 1;
            if (feed.comments) {
                if (data.parent_id) {
                    // Find parent and add reply
                    const parent = feed.comments.find((c) => c.id === data.parent_id);
                    if (parent) {
                        parent.replies = parent.replies || [];
                        parent.replies.push(comment);
                        parent.replies_count = (parent.replies_count || 0) + 1;
                    }
                } else {
                    feed.comments.push(comment);
                }
            }
        }

        return comment;
    }

    async function deleteComment(feedId: number, commentId: number): Promise<void> {
        await api.delete(`feeds/${feedId}/comments/${commentId}`);

        const feed = feedsById.value[feedId];
        if (feed) {
            feed.comments_count -= 1;
            if (feed.comments) {
                // Remove from top-level comments
                feed.comments = feed.comments.filter((c) => c.id !== commentId);
                // Remove from replies
                feed.comments.forEach((c) => {
                    if (c.replies) {
                        c.replies = c.replies.filter((r) => r.id !== commentId);
                    }
                });
            }
        }
    }

    async function toggleCommentReaction(feedId: number, commentId: number): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed?.comments) return;

        const findComment = (comments: Comment[]): Comment | undefined => {
            for (const comment of comments) {
                if (comment.id === commentId) return comment;
                if (comment.replies) {
                    const found = findComment(comment.replies);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const comment = findComment(feed.comments);
        if (!comment) return;

        const wasReacted = comment.has_user_react;

        // Optimistic update
        comment.has_user_react = !wasReacted;
        comment.reactions_count += wasReacted ? -1 : 1;

        try {
            await api.post(`feeds/${feedId}/comments/${commentId}/reactions`);
        } catch (error) {
            // Rollback
            comment.has_user_react = wasReacted;
            comment.reactions_count += wasReacted ? 1 : -1;
            throw error;
        }
    }

    function incrementNewPostsCount(contextKey?: string): void {
        const key = contextKey || currentContext.value;
        const context = contexts.value[key];
        if (context) {
            context.newPostsCount += 1;
        }
    }

    function addNewFeed(feed: Feed, contextKey?: string): void {
        const key = contextKey || currentContext.value;
        const context = contexts.value[key];
        if (context) {
            feedsById.value[feed.id] = feed;
            context.feeds = [feed, ...context.feeds];
            context.newPostsCount = 0;
        }
    }

    function resetContext(contextKey?: string): void {
        const key = contextKey || currentContext.value;
        contexts.value[key] = createEmptyContext();
    }

    function getFeedById(feedId: number): Feed | undefined {
        return feedsById.value[feedId];
    }

    return {
        // State
        contexts,
        currentContext,

        // Getters
        getCurrentContext,
        getFeeds,
        getStickyFeed,
        isLoading,
        hasMoreFeeds,
        newPostsCount,

        // Actions
        fetchFeeds,
        createFeed,
        updateFeed,
        deleteFeed,
        toggleReaction,
        fetchComments,
        createComment,
        deleteComment,
        toggleCommentReaction,
        incrementNewPostsCount,
        addNewFeed,
        resetContext,
        getFeedById,
        getContextKey,
    };
});
