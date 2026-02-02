export interface XProfile {
    user_id: number;
    username: string;
    display_name: string;
    avatar: string;
    is_verified?: boolean;
    short_description?: string;
    total_points?: number;
    status?: string;
}

export interface Space {
    id: number;
    title: string;
    slug: string;
    type?: string;
    logo?: string;
}

export interface Term {
    id: number;
    title: string;
    slug: string;
    taxonomy_name?: string;
}

export interface MediaItem {
    url: string;
    type: string;
    width?: number;
    height?: number;
    thumbnail?: string;
    provider?: string; // 'uploader' for uploaded files, 'giphy' for giphy, etc.
}

export interface MediaPreview {
    type: string;
    url?: string;
    image?: string;
    html?: string;
    title?: string;
    description?: string;
    provider?: string;
    width?: number;
    height?: number;
    is_uploaded?: boolean;
    media_id?: number;
}

export interface FeedMeta {
    media_items?: MediaItem[];
    media_preview?: MediaPreview;
    survey_config?: SurveyConfig;
    document_lists?: DocumentItem[];
    mentioned_user_ids?: number[];
    comments_disabled?: string;
}

export interface SurveyOption {
    label: string;
    slug: string;
    vote_counts: number;
    voted: boolean;
}

export interface SurveyConfig {
    type: 'single_choice' | 'multi_choice';
    options: SurveyOption[];
    end_date?: string;
}

export interface DocumentItem {
    title: string;
    url: string;
    type: string;
    size?: number;
}

export interface Feed {
    id: number;
    slug: string;
    title?: string;
    message: string;
    message_rendered: string;
    type: string;
    content_type: string;
    space_id?: number;
    user_id: number;
    status: string;
    privacy: string;
    featured_image?: string;
    created_at: string;
    updated_at: string;
    comments_count: number;
    reactions_count: number;
    is_sticky: number;
    priority: number;
    scheduled_at?: string;
    has_user_react?: boolean;
    user_reaction_type?: string; // Track user's reaction type (like, love, haha, etc.)
    bookmarked?: boolean;
    xprofile: XProfile;
    space?: Space;
    comments?: Comment[];
    sticky_comment?: Comment;
    reactions?: Reaction[];
    terms?: Term[];
    meta?: FeedMeta;
    default_comment_sort_by?: string;
    permalink: string;
}

export interface Comment {
    id: number;
    post_id: number;
    parent_id?: number;
    user_id: number;
    message: string;
    message_rendered: string;
    created_at: string;
    updated_at: string;
    is_sticky: number;
    reactions_count: number;
    has_user_react?: boolean;
    xprofile: XProfile;
    meta?: Record<string, unknown>;
    replies?: Comment[];
    replies_count?: number;
}

export interface Reaction {
    user_id: number;
    object_id: number;
    type: string;
    object_type: string;
    xprofile: XProfile;
}

export interface Notification {
    id: number;
    feed_id?: number;
    type: string;
    status: string;
    title: string;
    created_at: string;
    updated_at: string;
    xprofile?: XProfile;
    subscriber?: {
        user_id: number;
        is_read: number;
    };
}

export interface FeedsResponse {
    feeds: {
        data: Feed[];
        current_page: number;
        per_page: number;
        from: number;
        to: number;
        has_more: boolean;
        total?: number;
    };
    sticky?: Feed;
    last_fetched_timestamp?: number;
    execution_time?: number;
}

export interface CommentsResponse {
    comments: Comment[];
    sticky_comment?: Comment;
}

export interface TickerResponse {
    timestamp: string;
    has_changes: boolean;
    feeds?: Array<{
        id: number;
        updated_at: string;
        action: 'created' | 'updated';
        context: string;
        user_id: number;
        feed_data?: Feed;
    }>;
    notifications?: {
        unread_count: number;
        new_count: number;
    };
}

export interface CreateFeedData {
    message: string;
    title?: string;
    space?: string; // space slug
    privacy?: string;
    media_images?: MediaItem[]; // FluentCommunity expects 'media_images' not 'media_items'
    media_preview?: MediaPreview;
    topic_ids?: number[];
}

export interface CreateCommentData {
    comment: string;
    parent_id?: number;
}

// Member types
export interface Member {
    id: number;
    user_id: number;
    username: string;
    display_name: string;
    avatar: string;
    short_description?: string;
    is_verified?: boolean;
    total_points?: number;
    status?: string;
    created_at?: string;
    role?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    is_following?: boolean;
    is_online?: boolean;
}

export interface MembersResponse {
    members: {
        data: Member[];
        current_page: number;
        per_page: number;
        has_more: boolean;
        total?: number;
    };
}

// Space types (extended)
export interface SpaceFull {
    id: number;
    title: string;
    slug: string;
    description?: string;
    type: string;
    privacy: string;
    logo?: string;
    cover?: string;
    members_count: number;
    posts_count?: number;
    created_at?: string;
    is_member?: boolean;
    is_admin?: boolean;
    settings?: Record<string, unknown>;
    space_group?: {
        id: number;
        title: string;
        slug: string;
    };
}

export interface SpacesResponse {
    spaces: {
        data: SpaceFull[];
        current_page: number;
        per_page: number;
        has_more: boolean;
        total?: number;
    };
    my_spaces?: SpaceFull[];
    groups?: Array<{
        id: number;
        title: string;
        slug: string;
        spaces: SpaceFull[];
    }>;
}

// Profile types
export interface Profile {
    user_id: number;
    username: string;
    display_name: string;
    avatar: string;
    cover_photo?: string;
    short_description?: string;
    is_verified?: boolean;
    total_points?: number;
    status?: string;
    created_at?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    is_following?: boolean;
    is_self?: boolean;
    spaces?: SpaceFull[];
    badges?: Array<{
        id: number;
        title: string;
        icon?: string;
    }>;
    social_links?: Record<string, string>;
}

export interface ProfileResponse {
    profile: Profile;
    feeds?: {
        data: Feed[];
        has_more: boolean;
    };
}

// Notifications response
export interface NotificationsResponse {
    notifications: {
        data: Notification[];
        current_page: number;
        per_page: number;
        has_more: boolean;
        total?: number;
    };
    unread_count?: number;
}

// Leaderboard types
export interface LeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    display_name: string;
    avatar: string;
    total_points: number;
    is_verified?: boolean;
    posts_count?: number;
    comments_count?: number;
    reactions_count?: number;
}

export interface LeaderboardResponse {
    leaderboard: {
        data: LeaderboardEntry[];
        current_page: number;
        per_page: number;
        has_more: boolean;
        total?: number;
    };
    current_user_rank?: LeaderboardEntry;
    period?: string;
}

// Note: Bookmarks API returns FeedsResponse format (uses 'feeds' key, not 'bookmarks')

// Activity types
export interface Activity {
    id: number;
    message: string;
    xprofile: XProfile;
    updated_at: string;
    route: {
        name: string;
        params?: Record<string, string | number>;
        query?: Record<string, string | number>;
    };
}

export interface FeaturedPost {
    id: number;
    message: string;
    permalink: string;
    xprofile: XProfile;
    created_at: string;
}

export interface ActivitiesResponse {
    activities: {
        data: Activity[];
        has_more: boolean;
        per_page: number;
        current_page: number;
    };
    pinned_posts?: FeaturedPost[];
    after_contents?: string;
    before_contents?: string;
    pending_count?: number;
}
