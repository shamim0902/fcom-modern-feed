<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

/**
 * Handles WordPress rewrite rules for SPA sub-routes.
 *
 * When the shortcode is placed on a page (e.g., /community/), this class
 * adds rewrite rules to catch all sub-routes (e.g., /community/post/123)
 * and renders the same page, allowing the Vue router to handle the route.
 */
class RewriteHandler
{
    private const OPTION_KEY = 'fcom_mf_spa_pages';
    private const QUERY_VAR = 'fcom_mf_route';

    public static function init()
    {
        // Register query var
        add_filter('query_vars', [__CLASS__, 'registerQueryVar']);

        // Add rewrite rules on init
        add_action('init', [__CLASS__, 'addRewriteRules'], 20);

        // Handle the route - render the base page
        add_action('template_redirect', [__CLASS__, 'handleRoute']);

        // Register the page when shortcode is rendered
        add_action('fcom_mf_shortcode_rendered', [__CLASS__, 'registerPage']);

        // Flush rewrite rules on plugin activation
        register_activation_hook(FCOM_MF_PLUGIN_FILE, [__CLASS__, 'flushRewriteRules']);
    }

    /**
     * Register custom query variable
     */
    public static function registerQueryVar($vars)
    {
        $vars[] = self::QUERY_VAR;
        $vars[] = 'fcom_mf_page_id';
        return $vars;
    }

    /**
     * Add rewrite rules for all registered SPA pages
     */
    public static function addRewriteRules()
    {
        $pages = get_option(self::OPTION_KEY, []);

        // Also scan for pages with the shortcode that haven't been registered yet
        self::scanAndRegisterPages();

        // Reload pages after potential scan
        $pages = get_option(self::OPTION_KEY, []);

        foreach ($pages as $pageId => $pageSlug) {
            // Skip if page no longer exists
            if (!get_post($pageId)) {
                continue;
            }

            // Get the full page path (handles hierarchical pages)
            $pagePath = self::getPagePath($pageId);
            if (!$pagePath) {
                continue;
            }

            // Escape special regex characters
            $escapedPath = preg_quote($pagePath, '/');

            // Add rule to catch all sub-routes
            // e.g., community/post/123 -> renders community page with route info
            add_rewrite_rule(
                '^' . $escapedPath . '/(.+?)/?$',
                'index.php?page_id=' . $pageId . '&' . self::QUERY_VAR . '=$matches[1]',
                'top'
            );
        }
    }

    /**
     * Scan for pages with the shortcode and register them
     */
    private static function scanAndRegisterPages()
    {
        static $scanned = false;

        // Only scan once per request
        if ($scanned) {
            return;
        }
        $scanned = true;

        // Find pages with our shortcode (fullpage mode)
        $pages = get_posts([
            'post_type' => 'page',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            's' => '[fcom_modern_feed',
            'fields' => 'ids',
        ]);

        $registered = get_option(self::OPTION_KEY, []);
        $updated = false;

        foreach ($pages as $pageId) {
            $content = get_post_field('post_content', $pageId);

            // Check if it has fullpage=true (default is true, so also check for shortcode without fullpage=false)
            if (
                has_shortcode($content, 'fcom_modern_feed') &&
                strpos($content, 'fullpage="false"') === false &&
                strpos($content, "fullpage='false'") === false
            ) {
                $pageSlug = get_post_field('post_name', $pageId);
                if ($pageSlug && (!isset($registered[$pageId]) || $registered[$pageId] !== $pageSlug)) {
                    $registered[$pageId] = $pageSlug;
                    $updated = true;
                }
            }
        }

        if ($updated) {
            update_option(self::OPTION_KEY, $registered);
            // Schedule a rewrite flush for after init completes
            add_action('wp_loaded', function () {
                flush_rewrite_rules(false);
            }, 999);
        }
    }

    /**
     * Handle the route - this runs on template_redirect
     */
    public static function handleRoute()
    {
        $route = get_query_var(self::QUERY_VAR);

        if (!$route) {
            return;
        }

        // The page will render normally with the shortcode
        // The Vue app will read the current URL and handle the route
        // We just need to make sure the page is loaded, which it will be
        // because we set page_id in the rewrite rule
    }

    /**
     * Register a page as an SPA page
     * Called when shortcode is rendered with fullpage=true
     */
    public static function registerPage($pageId)
    {
        if (!$pageId) {
            return;
        }

        $pages = get_option(self::OPTION_KEY, []);
        $pageSlug = get_post_field('post_name', $pageId);

        if (!$pageSlug) {
            return;
        }

        // Check if already registered
        if (isset($pages[$pageId]) && $pages[$pageId] === $pageSlug) {
            return;
        }

        // Register the page
        $pages[$pageId] = $pageSlug;
        update_option(self::OPTION_KEY, $pages);

        // Flush rewrite rules
        flush_rewrite_rules(false);
    }

    /**
     * Get the full path for a page (handles hierarchical pages)
     */
    private static function getPagePath($pageId)
    {
        $page = get_post($pageId);
        if (!$page) {
            return null;
        }

        $path = $page->post_name;
        $parent = $page->post_parent;

        // Build path for hierarchical pages (e.g., parent/child/grandchild)
        while ($parent) {
            $parentPage = get_post($parent);
            if (!$parentPage) {
                break;
            }
            $path = $parentPage->post_name . '/' . $path;
            $parent = $parentPage->post_parent;
        }

        return $path;
    }

    /**
     * Flush rewrite rules
     */
    public static function flushRewriteRules()
    {
        self::addRewriteRules();
        flush_rewrite_rules(true);
    }

    /**
     * Unregister a page (e.g., when shortcode is removed)
     */
    public static function unregisterPage($pageId)
    {
        $pages = get_option(self::OPTION_KEY, []);

        if (isset($pages[$pageId])) {
            unset($pages[$pageId]);
            update_option(self::OPTION_KEY, $pages);
            flush_rewrite_rules(false);
        }
    }

    /**
     * Clear all registered pages
     */
    public static function clearAllPages()
    {
        delete_option(self::OPTION_KEY);
        flush_rewrite_rules(false);
    }
}
