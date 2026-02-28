import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { Feed, Comment, FeedsResponse, CommentsResponse, CreateFeedData, CreateCommentData } from '@/api/types';
import { useAuthStore } from './auth';

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

    // Extract user's reaction type from the reactions array (so UI shows correct emoji/label)
    function populateUserReactionType(feed: Feed): void {
        if (!feed.has_user_react || feed.user_reaction_type) return;

        const authStore = useAuthStore();
        const currentUserId = authStore.userId;
        if (currentUserId == null) return;

        const uid = Number(currentUserId);
        const userReaction = feed.reactions?.find((r) => Number(r.user_id) === uid);
        if (userReaction?.type) {
            feed.user_reaction_type = userReaction.type;
        }
    }

    function toBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;
        if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes';
        }
        return false;
    }

    function normalizeComment(comment: Comment): Comment {
        const input = comment as Comment & {
            liked?: number | boolean;
            comments?: Comment[];
        };

        const normalized: Comment = {
            ...input,
            is_sticky: Number(input.is_sticky || 0),
            reactions_count: Number(input.reactions_count || 0),
            has_user_react:
                typeof input.has_user_react === 'boolean'
                    ? input.has_user_react
                    : toBoolean(input.liked),
            liked: toBoolean(input.has_user_react ?? input.liked) ? 1 : 0,
        };

        const rawReplies = (input.replies || input.comments || []) as Comment[];
        normalized.replies = rawReplies.map((reply) => normalizeComment(reply));
        normalized.replies_count = normalized.replies.length || Number(input.replies_count || 0);

        return normalized;
    }

    function formatFeedComments(
        rawComments: Comment[] = [],
        rawStickyComment: Comment | null = null
    ): { comments: Comment[]; stickyComment: Comment | null } {
        const stickyComment = rawStickyComment ? normalizeComment(rawStickyComment) : null;
        const normalizedComments = rawComments.map((comment) => normalizeComment(comment));

        // API may return a flat list (parent_id based) or nested list; normalize both to comment.replies.
        const hasFlatReplies = normalizedComments.some((comment) => !!comment.parent_id);
        if (!hasFlatReplies) {
            return {
                comments: normalizedComments,
                stickyComment,
            };
        }

        normalizedComments.forEach((comment) => {
            comment.replies = [];
            comment.replies_count = 0;
        });

        const commentMap = new Map<number, Comment>();
        normalizedComments.forEach((comment) => {
            commentMap.set(comment.id, comment);
        });

        const topLevel: Comment[] = [];
        const stickyReplies: Comment[] = [];

        normalizedComments.forEach((comment) => {
            const parentId = Number(comment.parent_id || 0);
            if (!parentId) {
                topLevel.push(comment);
                return;
            }

            const parent = commentMap.get(parentId);
            if (parent) {
                parent.replies = parent.replies || [];
                parent.replies.push(comment);
                parent.replies_count = parent.replies.length;
                return;
            }

            if (stickyComment && stickyComment.id === parentId) {
                stickyReplies.push(comment);
                return;
            }

            // Fallback: orphaned reply shows as top-level instead of disappearing.
            topLevel.push(comment);
        });

        if (stickyComment && stickyReplies.length) {
            stickyComment.replies = [...(stickyComment.replies || []), ...stickyReplies];
            stickyComment.replies_count = stickyComment.replies.length;
        }

        return {
            comments: topLevel,
            stickyComment,
        };
    }

    function normalizeFeed(feed: Feed): Feed {
        const normalized = {
            ...feed,
            comments_count: Number(feed.comments_count || 0),
            reactions_count: Number(feed.reactions_count || 0),
            is_sticky: Number(feed.is_sticky || 0),
            priority: Number(feed.priority || 0),
        } as Feed & { is_bookmarked?: number | boolean };

        if (typeof normalized.bookmarked !== 'boolean') {
            normalized.bookmarked = toBoolean(normalized.is_bookmarked);
        }

        const formattedComments = formatFeedComments(
            normalized.comments || [],
            normalized.sticky_comment || null
        );
        normalized.comments = formattedComments.comments;
        normalized.sticky_comment = formattedComments.stickyComment || undefined;

        populateUserReactionType(normalized);

        return normalized;
    }

    function findCommentById(comments: Comment[] = [], commentId: number): Comment | undefined {
        for (const comment of comments) {
            if (comment.id === commentId) {
                return comment;
            }
            if (comment.replies?.length) {
                const found = findCommentById(comment.replies, commentId);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    function findCommentInFeed(feed: Feed, commentId: number): Comment | undefined {
        if (feed.sticky_comment) {
            if (feed.sticky_comment.id === commentId) {
                return feed.sticky_comment;
            }
            const stickyReply = findCommentById(feed.sticky_comment.replies || [], commentId);
            if (stickyReply) {
                return stickyReply;
            }
        }
        return findCommentById(feed.comments || [], commentId);
    }

    function findCommentLocation(
        comments: Comment[] = [],
        commentId: number,
        parent?: Comment
    ): { list: Comment[]; index: number; parent?: Comment } | null {
        for (let index = 0; index < comments.length; index++) {
            const comment = comments[index];
            if (comment.id === commentId) {
                return { list: comments, index, parent };
            }
            if (comment.replies?.length) {
                const location = findCommentLocation(comment.replies, commentId, comment);
                if (location) {
                    return location;
                }
            }
        }
        return null;
    }

    function getCommentThreadSize(comment: Comment): number {
        return 1 + (comment.replies || []).reduce((sum, reply) => sum + getCommentThreadSize(reply), 0);
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
                per_page: params.perPage ?? window.fcomModernFeed?.settings?.perPage ?? 10,
                space: params.space,
                user_id: params.userId,
                search: params.search,
                topic_slug: params.topicSlug,
            });

            const feeds = response.feeds.data.map((feed) => normalizeFeed(feed));
            const stickyFeed = response.sticky ? normalizeFeed(response.sticky) : null;

            // Update feedsById cache and populate user reaction types
            feeds.forEach((feed) => {
                feedsById.value[feed.id] = feed;
            });

            if (loadMore) {
                context.feeds = [...context.feeds, ...feeds];
            } else {
                context.feeds = feeds;
                context.stickyFeed = stickyFeed;
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
        // Debug: Log data being sent to API
        console.log('[FeedStore] createFeed sending:', JSON.stringify(data, null, 2));

        const response = await api.post<{ feed: Feed }>('feeds', data);

        // Debug: Log API response
        console.log('[FeedStore] createFeed response:', JSON.stringify(response, null, 2));

        const feed = normalizeFeed(response.feed);

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
        const feed = normalizeFeed(response.feed);

        // Update cache
        feedsById.value[feed.id] = feed;

        // Update in contexts
        Object.values(contexts.value).forEach((context) => {
            const index = context.feeds.findIndex((f) => f.id === feedId);
            if (index !== -1) {
                context.feeds[index] = feed;
            }
            if (context.stickyFeed?.id === feedId) {
                context.stickyFeed = feed;
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

    async function toggleBookmark(feedId: number): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed) return;

        const wasBookmarked = feed.bookmarked;

        // Optimistic update
        feed.bookmarked = !wasBookmarked;

        try {
            // Use the react endpoint with bookmark type
            // When removing: include remove param
            // When adding: don't include remove param (or it may be misinterpreted)
            const payload: { react_type: string; remove?: number } = {
                react_type: 'bookmark',
            };
            if (wasBookmarked) {
                payload.remove = 1;
            }
            await api.post(`feeds/${feedId}/react`, payload);
        } catch (error) {
            // Rollback on error
            feed.bookmarked = wasBookmarked;
            throw error;
        }
    }

    async function togglePinToTop(feedId: number): Promise<{ feed: Feed }> {
        const feed = feedsById.value[feedId];
        if (!feed) throw new Error('Feed not found');

        const wasSticky = feed.is_sticky;
        const nowSticky = wasSticky === 1 ? 0 : 1;

        // Optimistic update
        feed.is_sticky = nowSticky;

        try {
            // Use PATCH endpoint with is_sticky parameter
            const response = await api.patch<{ feed: Feed }>(`feeds/${feedId}`, {
                is_sticky: nowSticky,
            });
            // Update with server response
            feed.is_sticky = response.feed.is_sticky;

            // Update context's stickyFeed and feeds list
            // Find the context that contains this feed (by space_id)
            const spaceSlug = feed.space?.slug;
            if (spaceSlug) {
                const contextKey = `space-${spaceSlug}`;
                const context = contexts.value[contextKey];
                if (context) {
                    if (response.feed.is_sticky === 1) {
                        // Pinning: Move previous sticky back to feeds, set this as sticky
                        if (context.stickyFeed && context.stickyFeed.id !== feedId) {
                            context.feeds = [context.stickyFeed, ...context.feeds];
                        }
                        context.stickyFeed = feed;
                        context.feeds = context.feeds.filter(f => f.id !== feedId);
                    } else {
                        // Unpinning: Clear sticky and add back to feeds
                        if (context.stickyFeed?.id === feedId) {
                            context.stickyFeed = null;
                            // Add back to top of feeds
                            context.feeds = [feed, ...context.feeds.filter(f => f.id !== feedId)];
                        }
                    }
                }
            }

            return response;
        } catch (error) {
            // Rollback on error
            feed.is_sticky = wasSticky;
            throw error;
        }
    }

    async function togglePinToSidebar(feedId: number): Promise<{ feed: Feed }> {
        const feed = feedsById.value[feedId];
        if (!feed) throw new Error('Feed not found');

        const wasPriority = feed.priority || 0;

        // Optimistic update
        feed.priority = wasPriority ? 0 : 1;

        try {
            // Use PATCH endpoint with priority parameter
            const response = await api.patch<{ feed: Feed }>(`feeds/${feedId}`, {
                priority: feed.priority,
            });
            // Update with server response
            feed.priority = response.feed.priority;
            return response;
        } catch (error) {
            // Rollback on error
            feed.priority = wasPriority;
            throw error;
        }
    }

    async function removePreview(feedId: number): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed) return;

        const previousMeta = feed.meta;

        // Optimistic update
        if (feed.meta) {
            feed.meta = { ...feed.meta, media_preview: undefined };
        }

        try {
            // Use DELETE endpoint for media preview
            await api.delete(`feeds/${feedId}/media-preview`);
        } catch (error) {
            // Rollback on error
            feed.meta = previousMeta;
            throw error;
        }
    }

    async function toggleFeedComments(feedId: number): Promise<{ feed: Feed }> {
        const feed = feedsById.value[feedId];
        if (!feed) throw new Error('Feed not found');

        const wasDisabled = feed.meta?.comments_disabled === 'yes';

        // Optimistic update
        if (!feed.meta) {
            feed.meta = {};
        }
        feed.meta.comments_disabled = wasDisabled ? 'no' : 'yes';

        try {
            // Use PATCH endpoint with comments_disabled parameter
            const response = await api.patch<{ feed: Feed }>(`feeds/${feedId}`, {
                comments_disabled: wasDisabled ? 0 : 1,
            });
            // Update with server response
            if (feed.meta) {
                feed.meta.comments_disabled = response.feed.meta?.comments_disabled;
            }
            return response;
        } catch (error) {
            // Rollback on error
            if (feed.meta) {
                feed.meta.comments_disabled = wasDisabled ? 'yes' : 'no';
            }
            throw error;
        }
    }

    async function toggleReaction(feedId: number, reactionType: string = 'like'): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed) return;

        const wasReacted = feed.has_user_react;
        const previousReactionType = feed.user_reaction_type;

        // If already reacted with same type, toggle off (DELETE)
        // If already reacted with different type, just change the type (POST, no count change)
        // If not reacted, add reaction (POST)
        const isSameReaction = wasReacted && previousReactionType === reactionType;

        // Optimistic update
        if (isSameReaction) {
            // Toggle off – clear user reaction so button shows inactive
            feed.has_user_react = false;
            feed.user_reaction_type = undefined;
            feed.reactions_count = Math.max(0, feed.reactions_count - 1);
            // Remove current user from reactions array so UI stays in sync
            const authStore = useAuthStore();
            const uid = Number(authStore.userId);
            if (feed.reactions?.length && uid) {
                feed.reactions = feed.reactions.filter((r) => Number(r.user_id) !== uid);
            }
            syncFeedReactionState(feedId, {
                has_user_react: false,
                user_reaction_type: undefined,
                reactions_count: feed.reactions_count,
                reactions: feed.reactions,
            });
        } else if (wasReacted) {
            // Replace with new reaction type (no count change)
            feed.user_reaction_type = reactionType;
            // Keep reactions array in sync so current user's reaction shows correct type
            const authStore = useAuthStore();
            const uid = Number(authStore.userId);
            if (feed.reactions && uid) {
                const userReaction = feed.reactions.find((r) => Number(r.user_id) === uid);
                if (userReaction) userReaction.type = reactionType;
            }
        } else {
            // Add new reaction
            feed.has_user_react = true;
            feed.user_reaction_type = reactionType;
            feed.reactions_count += 1;
        }

        try {
            if (isSameReaction) {
                await api.delete(`feeds/${feedId}/react`);
            } else {
                await api.post(`feeds/${feedId}/react`, {
                    react_type: reactionType,
                });
            }
            // Sync reaction state to same feed in other contexts so UI updates everywhere
            syncFeedReactionState(feedId, {
                has_user_react: !!feed.has_user_react,
                user_reaction_type: feed.user_reaction_type,
                reactions_count: feed.reactions_count,
                reactions: feed.reactions,
            });
        } catch (error) {
            // Rollback on error
            feed.has_user_react = wasReacted;
            feed.user_reaction_type = previousReactionType;
            feed.reactions_count += isSameReaction ? 1 : (wasReacted ? 0 : -1);
            throw error;
        }
    }

    /** Update reaction state on every copy of this feed in all contexts so the button stays in sync. */
    function syncFeedReactionState(
        feedId: number,
        state: { has_user_react: boolean; user_reaction_type?: string; reactions_count: number; reactions?: Feed['reactions'] }
    ): void {
        for (const key of Object.keys(contexts.value)) {
            const ctx = contexts.value[key];
            if (!ctx?.feeds) continue;
            for (const f of ctx.feeds) {
                if (f.id === feedId) {
                    f.has_user_react = state.has_user_react;
                    f.user_reaction_type = state.user_reaction_type;
                    f.reactions_count = state.reactions_count;
                    if (state.reactions !== undefined) f.reactions = state.reactions;
                    break;
                }
            }
        }
        if (contexts.value[currentContext.value]?.stickyFeed?.id === feedId) {
            const sticky = contexts.value[currentContext.value].stickyFeed!;
            sticky.has_user_react = state.has_user_react;
            sticky.user_reaction_type = state.user_reaction_type;
            sticky.reactions_count = state.reactions_count;
            if (state.reactions !== undefined) sticky.reactions = state.reactions;
        }
    }

    async function fetchComments(feedId: number): Promise<Comment[]> {
        const response = await api.get<CommentsResponse>(`feeds/${feedId}/comments`);
        const formatted = formatFeedComments(response.comments || [], response.sticky_comment || null);

        // Update feed with comments
        const feed = feedsById.value[feedId];
        if (feed) {
            feed.comments = formatted.comments;
            feed.sticky_comment = formatted.stickyComment || undefined;
        }

        return formatted.comments;
    }

    async function createComment(feedId: number, data: CreateCommentData): Promise<Comment> {
        const response = await api.post<{ comment: Comment }>(`feeds/${feedId}/comments`, data);
        const comment = normalizeComment(response.comment);

        // Update feed comments count
        const feed = feedsById.value[feedId];
        if (feed) {
            feed.comments_count = Number(feed.comments_count || 0) + 1;
            if (feed.comments) {
                if (data.parent_id) {
                    // Find parent in top-level, nested replies, or sticky comment.
                    const parent = findCommentInFeed(feed, data.parent_id);
                    if (parent) {
                        parent.replies = parent.replies || [];
                        parent.replies.push(comment);
                        parent.replies_count = parent.replies.length;
                    } else {
                        feed.comments.push(comment);
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
            let removedCount = 1;
            let removed = false;

            if (feed.sticky_comment?.id === commentId) {
                removedCount = getCommentThreadSize(feed.sticky_comment);
                feed.sticky_comment = undefined;
                removed = true;
            } else if (feed.sticky_comment?.replies?.length) {
                const stickyLocation = findCommentLocation(feed.sticky_comment.replies, commentId, feed.sticky_comment);
                if (stickyLocation) {
                    const [removedComment] = stickyLocation.list.splice(stickyLocation.index, 1);
                    removedCount = removedComment ? getCommentThreadSize(removedComment) : 1;
                    if (stickyLocation.parent) {
                        stickyLocation.parent.replies_count = stickyLocation.parent.replies?.length || 0;
                    }
                    removed = true;
                }
            }

            if (!removed) {
                const location = findCommentLocation(feed.comments || [], commentId);
                if (location) {
                    const [removedComment] = location.list.splice(location.index, 1);
                    removedCount = removedComment ? getCommentThreadSize(removedComment) : 1;
                    if (location.parent) {
                        location.parent.replies_count = location.parent.replies?.length || 0;
                    }
                }
            }

            feed.comments_count = Math.max(0, Number(feed.comments_count || 0) - removedCount);
        }
    }

    async function toggleCommentReaction(feedId: number, commentId: number): Promise<void> {
        const feed = feedsById.value[feedId];
        if (!feed) return;

        const comment = findCommentInFeed(feed, commentId);
        if (!comment) return;

        const wasReacted = toBoolean(comment.has_user_react ?? comment.liked);
        const nextState = !wasReacted;
        const previousCount = Number(comment.reactions_count || 0);

        // Optimistic update
        comment.has_user_react = nextState;
        comment.liked = nextState ? 1 : 0;
        comment.reactions_count = Math.max(0, previousCount + (nextState ? 1 : -1));

        try {
            // Backend expects explicit state (1 = like, 0 = unlike).
            const response = await api.post<{ liked?: number | boolean; reactions_count?: number }>(
                `feeds/${feedId}/comments/${commentId}/reactions`,
                { state: nextState ? 1 : 0 }
            );

            if (response && typeof response.reactions_count !== 'undefined') {
                comment.reactions_count = Number(response.reactions_count);
            }
            if (response && typeof response.liked !== 'undefined') {
                const liked = toBoolean(response.liked);
                comment.has_user_react = liked;
                comment.liked = liked ? 1 : 0;
            }
        } catch (error) {
            // Rollback
            comment.has_user_react = wasReacted;
            comment.liked = wasReacted ? 1 : 0;
            comment.reactions_count = previousCount;
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

    async function fetchSinglePost(feedId: number): Promise<Feed | null> {
        // First check if we already have it cached
        if (feedsById.value[feedId]) {
            return feedsById.value[feedId];
        }

        try {
            const response = await api.get<{ feed: Feed }>(`feeds/${feedId}/by-id`);
            const feed = normalizeFeed(response.feed);
            feedsById.value[feed.id] = feed;

            return feed;
        } catch (error) {
            console.error('Failed to fetch single post:', error);
            return null;
        }
    }

    async function fetchSinglePostBySlug(slug: string): Promise<Feed | null> {
        try {
            const response = await api.get<{ feed: Feed }>(`feeds/${slug}/by-slug`);
            const feed = normalizeFeed(response.feed);
            feedsById.value[feed.id] = feed;

            return feed;
        } catch (error) {
            console.error('Failed to fetch single post by slug:', error);
            return null;
        }
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
        toggleBookmark,
        togglePinToTop,
        togglePinToSidebar,
        removePreview,
        toggleFeedComments,
        toggleReaction,
        fetchComments,
        createComment,
        deleteComment,
        toggleCommentReaction,
        incrementNewPostsCount,
        addNewFeed,
        resetContext,
        getFeedById,
        fetchSinglePost,
        fetchSinglePostBySlug,
        getContextKey,
    };
});

// Re-export Feed type for use in components
export type { Feed } from '@/api/types';
