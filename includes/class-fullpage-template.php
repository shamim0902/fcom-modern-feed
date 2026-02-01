<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

/**
 * Handles full-page template loading to bypass theme header/footer
 */
class FullpageTemplate
{
    private static $fullpageEnabled = false;
    private static $shortcodeAtts = [];

    public static function init()
    {
        // High priority to run before other template filters
        add_filter('template_include', [__CLASS__, 'maybeLoadFullpageTemplate'], 999);

        // Store page IDs that have the shortcode
        add_action('fcom_mf_shortcode_rendered', [__CLASS__, 'markPageAsFullpage']);

        // Check early if this is a fullpage request
        add_action('template_redirect', [__CLASS__, 'detectFullpagePage'], 1);
    }

    /**
     * Detect if current page should be fullpage before template loads
     */
    public static function detectFullpagePage()
    {
        if (is_singular()) {
            global $post;
            if ($post && has_shortcode($post->post_content, 'fcom_modern_feed')) {
                // Check if fullpage is enabled in the shortcode
                if (self::shortcodeHasFullpage($post->post_content)) {
                    self::$fullpageEnabled = true;
                }
            }
        }
    }

    /**
     * Check if the shortcode in content has fullpage enabled
     */
    private static function shortcodeHasFullpage($content)
    {
        // Match the shortcode and check for fullpage attribute
        if (preg_match('/\[fcom_modern_feed([^\]]*)\]/', $content, $matches)) {
            $atts = shortcode_parse_atts($matches[1] ?? '');

            // Store atts for later use
            self::$shortcodeAtts = $atts;

            // fullpage defaults to true, so check if explicitly disabled
            if (isset($atts['fullpage']) && $atts['fullpage'] === 'false') {
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Load custom blank template for fullpage mode
     */
    public static function maybeLoadFullpageTemplate($template)
    {
        if (!self::$fullpageEnabled) {
            return $template;
        }

        // Return our custom template
        $customTemplate = FCOM_MF_PLUGIN_DIR . 'templates/fullpage.php';

        if (file_exists($customTemplate)) {
            return $customTemplate;
        }

        return $template;
    }

    /**
     * Store page ID when shortcode is rendered (for future reference/caching)
     */
    public static function markPageAsFullpage($postId)
    {
        // Could be used to store in post meta for faster detection
        // For now, we detect on-the-fly using has_shortcode
    }

    /**
     * Get the shortcode attributes for the current page
     */
    public static function getShortcodeAtts()
    {
        return self::$shortcodeAtts;
    }

    /**
     * Check if fullpage mode is enabled for current request
     */
    public static function isFullpageEnabled()
    {
        return self::$fullpageEnabled;
    }
}
