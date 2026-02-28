<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class ReactionCompat
{
    /**
     * Per-request cache of user reaction type by feed id.
     *
     * @var array<int, string|null>
     */
    private static $reactionTypeCache = [];
    /**
     * Per-request cache of total non-bookmark reaction count by feed id.
     *
     * @var array<int, int>
     */
    private static $reactionCountCache = [];

    public static function init()
    {
        add_filter('fluent_community/rendering_feed_model', [__CLASS__, 'injectUserReactionType'], 20, 2);
    }

    /**
     * Ensure feed model carries the current user's actual reaction type (not only "like").
     *
     * Fluent Community core sets has_user_react from "like" interaction only.
     * We normalize it so custom reaction types can be restored in Modern Feed UI.
     *
     * @param object $feed
     * @param array  $config
     * @return object
     */
    public static function injectUserReactionType($feed, $config = [])
    {
        if (!is_object($feed) || empty($feed->id)) {
            return $feed;
        }

        if (!class_exists(\FluentCommunity\App\Models\Reaction::class)) {
            return $feed;
        }

        $feedId = (int) $feed->id;

        // Ensure reactions_count reflects all reaction types (excluding bookmark), not only likes.
        if (array_key_exists($feedId, self::$reactionCountCache)) {
            $totalReactionCount = self::$reactionCountCache[$feedId];
        } else {
            $totalReactionCount = (int) \FluentCommunity\App\Models\Reaction::query()
                ->where('object_type', 'feed')
                ->where('object_id', $feedId)
                ->where('type', '!=', 'bookmark')
                ->count();
            self::$reactionCountCache[$feedId] = $totalReactionCount;
        }

        $feed->reactions_count = $totalReactionCount;

        if (!is_user_logged_in()) {
            return $feed;
        }

        $userId = get_current_user_id();

        if (array_key_exists($feedId, self::$reactionTypeCache)) {
            $reactionType = self::$reactionTypeCache[$feedId];
        } else {
            $reaction = \FluentCommunity\App\Models\Reaction::query()
                ->where('object_type', 'feed')
                ->where('object_id', $feedId)
                ->where('user_id', $userId)
                ->where('type', '!=', 'bookmark')
                ->orderBy('id', 'desc')
                ->first(['type']);

            $reactionType = $reaction ? (string) $reaction->type : null;
            self::$reactionTypeCache[$feedId] = $reactionType;
        }

        if (!$reactionType) {
            return $feed;
        }

        $feed->has_user_react = true;
        $feed->user_reaction_type = $reactionType;

        // Keep reacted state visible in UI even if reaction list/count was stale in the feed model.
        if ((int) $feed->reactions_count < 1) {
            $feed->reactions_count = 1;
        }

        return $feed;
    }
}

class FollowCompat
{
    public static function init()
    {
        add_action('rest_api_init', [__CLASS__, 'registerRoutes'], 1000);
    }

    public static function registerRoutes()
    {
        if (!self::isFollowersModuleEnabled()) {
            return;
        }

        // Avoid overriding core/provided route if it already exists.
        $routes = rest_get_server()->get_routes();
        foreach (array_keys($routes) as $routeKey) {
            if (preg_match('#^/fluent-community/v2/profile/\(\?P<user_id>.+\)/toggle-follow$#', $routeKey)) {
                return;
            }
        }

        register_rest_route(
            'fluent-community/v2',
            '/profile/(?P<user_id>\d+)/toggle-follow',
            [
                'methods'             => 'POST',
                'callback'            => [__CLASS__, 'toggleFollow'],
                'permission_callback' => [__CLASS__, 'canToggleFollow'],
                'args'                => [
                    'user_id' => [
                        'required'          => true,
                        'validate_callback' => function ($value) {
                            return is_numeric($value) && (int) $value > 0;
                        },
                    ],
                ],
            ]
        );
    }

    public static function canToggleFollow()
    {
        return is_user_logged_in();
    }

    public static function toggleFollow(\WP_REST_Request $request)
    {
        if (!class_exists(\FluentCommunity\App\Models\XProfile::class) || !class_exists(\FluentCommunityPro\App\Models\Follow::class)) {
            return new \WP_Error(
                'fcom_follow_not_available',
                __('Follow module is not available.', 'fcom-modern-feed'),
                ['status' => 404]
            );
        }

        $userId = (int) $request->get_param('user_id');
        $followerId = (int) get_current_user_id();

        if ($followerId < 1) {
            return new \WP_Error(
                'fcom_not_logged_in',
                __('Please log in to continue.', 'fcom-modern-feed'),
                ['status' => 401]
            );
        }

        if ($followerId === $userId) {
            return new \WP_Error(
                'fcom_follow_self',
                __('You cannot follow yourself.', 'fcom-modern-feed'),
                ['status' => 400]
            );
        }

        $xProfile = \FluentCommunity\App\Models\XProfile::query()
            ->where('user_id', $userId)
            ->first();

        if (!$xProfile) {
            return new \WP_Error(
                'fcom_profile_not_found',
                __('Profile not found', 'fcom-modern-feed'),
                ['status' => 404]
            );
        }

        $follow = \FluentCommunityPro\App\Models\Follow::query()
            ->where('follower_id', $followerId)
            ->where('followed_id', $userId)
            ->first();

        $wasFollowing = $follow && (int) $follow->level !== 0;

        if ($wasFollowing) {
            do_action('fluent_community/before_unfollowing_user', $follow, $xProfile);
            $follow->delete();
            $isNowFollowing = false;
        } else {
            if ($follow) {
                return new \WP_Error(
                    'fcom_follow_not_allowed',
                    __('You are already following or blocked this user.', 'fcom-modern-feed'),
                    ['status' => 400]
                );
            }

            $follow = \FluentCommunityPro\App\Models\Follow::create([
                'follower_id' => $followerId,
                'followed_id' => $userId,
            ]);
            do_action('fluent_community/followed_user', $follow, $xProfile);
            $isNowFollowing = true;
        }

        $followersCount = (int) $xProfile->followers_count;
        if ($isNowFollowing) {
            $followersCount++;
        } else {
            $followersCount = max(0, $followersCount - 1);
        }

        return rest_ensure_response([
            'is_following'    => $isNowFollowing,
            'status'          => $isNowFollowing ? 'following' : null,
            'followers_count' => $followersCount,
            'message'         => $isNowFollowing
                ? __('You followed this user successfully', 'fcom-modern-feed')
                : __('You unfollowed this user successfully', 'fcom-modern-feed'),
        ]);
    }

    private static function isFollowersModuleEnabled()
    {
        if (!class_exists(\FluentCommunity\App\Services\Helper::class)) {
            return false;
        }

        try {
            return (bool) \FluentCommunity\App\Services\Helper::isFeatureEnabled('followers_module');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
