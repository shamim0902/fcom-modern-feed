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
    space_id?: number;
    privacy?: string;
    media_items?: MediaItem[];
    media_preview?: MediaPreview;
    topic_ids?: number[];
}

export interface CreateCommentData {
    message: string;
    parent_id?: number;
}
