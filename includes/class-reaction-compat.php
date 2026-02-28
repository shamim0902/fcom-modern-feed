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
