<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class Assets
{
    private static $manifest = null;

    public static function init()
    {
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueueAssets']);
        add_action('wp_ajax_fcom_mf_renew_nonce', [__CLASS__, 'renewNonce']);
        add_action('wp_ajax_nopriv_fcom_mf_renew_nonce', [__CLASS__, 'renewNonce']);
    }

    public static function enqueueAssets()
    {
        if (!self::shouldLoadAssets()) {
            return;
        }

        $isDev = self::isDev();

        if ($isDev) {
            // Development mode - load from Vite dev server
            wp_enqueue_script(
                'fcom-mf-vite-client',
                'http://localhost:5173/@vite/client',
                [],
                null,
                true
            );
            add_filter('script_loader_tag', function ($tag, $handle) {
                if ($handle === 'fcom-mf-vite-client' || $handle === 'fcom-mf-app') {
                    return str_replace('<script', '<script type="module"', $tag);
                }
                return $tag;
            }, 10, 2);

            wp_enqueue_script(
                'fcom-mf-app',
                'http://localhost:5173/src/main.ts',
                ['fcom-mf-vite-client'],
                null,
                true
            );
        } else {
            // Production mode
            $manifest = self::getManifest();

            if (isset($manifest['src/main.ts'])) {
                $entry = $manifest['src/main.ts'];

                // Enqueue CSS
                if (!empty($entry['css'])) {
                    foreach ($entry['css'] as $index => $cssFile) {
                        wp_enqueue_style(
                            'fcom-mf-app-' . $index,
                            FCOM_MF_PLUGIN_URL . 'assets/' . $cssFile,
                            [],
                            FCOM_MF_VERSION
                        );
                    }
                }

                // Enqueue JS
                wp_enqueue_script(
                    'fcom-mf-app',
                    FCOM_MF_PLUGIN_URL . 'assets/' . $entry['file'],
                    [],
                    FCOM_MF_VERSION,
                    true
                );
                add_filter('script_loader_tag', function ($tag, $handle) {
                    if ($handle === 'fcom-mf-app') {
                        return str_replace('<script', '<script type="module"', $tag);
                    }
                    return $tag;
                }, 10, 2);
            }
        }

        // Inject configuration
        wp_localize_script('fcom-mf-app', 'fcomModernFeed', self::getConfig());
    }

    public static function getConfig()
    {
        $user = wp_get_current_user();

        return [
            'rest' => [
                'url' => rest_url('fluent-community/v2'),
                'nonce' => wp_create_nonce('wp_rest'),
            ],
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'ajaxNonce' => wp_create_nonce('fcom_mf_ajax'),
            'pluginUrl' => FCOM_MF_PLUGIN_URL,
            'user' => $user->ID ? self::getUserData($user) : null,
            'isLoggedIn' => is_user_logged_in(),
            'loginUrl' => wp_login_url(get_permalink()),
            'registerUrl' => wp_registration_url(),
            'i18n' => self::getTranslations(),
            'features' => [
                'reactions' => true,
                'comments' => true,
                'createPost' => is_user_logged_in(),
                'infiniteScroll' => true,
                'realTimeUpdates' => true,
                'mediaUpload' => is_user_logged_in(),
                'adminSettings' => self::canAccessAdminSettings(),
            ],
            'adminSettingsUrl' => self::getAdminSettingsUrl(),
            'portalBaseUrl' => self::getPortalBaseUrl(),
            'settings' => [
                'tickerInterval' => 45000, // 45 seconds
                'perPage' => 10,
            ],
        ];
    }

    public static function renewNonce()
    {
        check_ajax_referer('fcom_mf_ajax', 'security');

        wp_send_json_success([
            'nonce' => wp_create_nonce('wp_rest'),
        ]);
    }

    private static function getManifest()
    {
        if (self::$manifest === null) {
            $manifestPath = FCOM_MF_PLUGIN_DIR . 'assets/.vite/manifest.json';
            if (file_exists($manifestPath)) {
                self::$manifest = json_decode(file_get_contents($manifestPath), true);
            } else {
                self::$manifest = [];
            }
        }
        return self::$manifest;
    }

    private static function isDev()
    {
        // Only use dev mode if explicitly enabled
        if (!defined('FCOM_MF_DEV') || !FCOM_MF_DEV) {
            return false;
        }

        // Check if Vite dev server is actually running (quick check)
        $connection = @fsockopen('localhost', 5173, $errno, $errstr, 0.3);
        if ($connection) {
            fclose($connection);
            return true;
        }

        return false;
    }

    public static function shouldLoadAssets()
    {
        global $post;

        // Check shortcode or block
        if ($post && (
            has_shortcode($post->post_content, 'fcom_modern_feed') ||
            has_block('fcom-modern-feed/community-feed', $post)
        )) {
            return true;
        }

        return apply_filters('fcom_mf_load_assets', false);
    }

    private static function getUserData($user)
    {
        $userData = [
            'id' => $user->ID,
            'name' => $user->display_name,
            'username' => $user->user_login, // Default to WP username
            'avatar' => get_avatar_url($user->ID, ['size' => 96]),
            'email' => $user->user_email,
        ];

        // Try to get FluentCommunity username if available
        if (class_exists('\FluentCommunity\App\Models\XProfile')) {
            $xprofile = \FluentCommunity\App\Models\XProfile::where('user_id', $user->ID)->first();
            if ($xprofile && !empty($xprofile->username)) {
                $userData['username'] = $xprofile->username;
            }
        }

        return $userData;
    }

    private static function canAccessAdminSettings()
    {
        if (!is_user_logged_in()) {
            return false;
        }

        // Check if FluentCommunity Helper class exists
        if (class_exists('\FluentCommunity\App\Services\Helper')) {
            return \FluentCommunity\App\Services\Helper::isSiteAdmin();
        }

        return false;
    }

    private static function getAdminSettingsUrl()
    {
        if (class_exists('\FluentCommunity\App\Services\Helper')) {
            return \FluentCommunity\App\Services\Helper::baseUrl('/admin/settings');
        }

        return home_url('/portal/admin/settings');
    }

    private static function getPortalBaseUrl()
    {
        if (class_exists('\FluentCommunity\App\Services\Helper')) {
            return \FluentCommunity\App\Services\Helper::baseUrl('');
        }

        return home_url('/portal');
    }

    private static function getTranslations()
    {
        return [
            'like' => __('Like', 'fcom-modern-feed'),
            'liked' => __('Liked', 'fcom-modern-feed'),
            'comment' => __('Comment', 'fcom-modern-feed'),
            'share' => __('Share', 'fcom-modern-feed'),
            'reply' => __('Reply', 'fcom-modern-feed'),
            'writeComment' => __('Write a comment...', 'fcom-modern-feed'),
            'writeReply' => __('Write a reply...', 'fcom-modern-feed'),
            'loadMore' => __('Load more', 'fcom-modern-feed'),
            'loading' => __('Loading...', 'fcom-modern-feed'),
            'noMorePosts' => __('No more posts to show', 'fcom-modern-feed'),
            'noPosts' => __('No posts yet', 'fcom-modern-feed'),
            'createPost' => __("What's on your mind?", 'fcom-modern-feed'),
            'post' => __('Post', 'fcom-modern-feed'),
            'posting' => __('Posting...', 'fcom-modern-feed'),
            'cancel' => __('Cancel', 'fcom-modern-feed'),
            'delete' => __('Delete', 'fcom-modern-feed'),
            'edit' => __('Edit', 'fcom-modern-feed'),
            'save' => __('Save', 'fcom-modern-feed'),
            'viewReplies' => __('View %d replies', 'fcom-modern-feed'),
            'hideReplies' => __('Hide replies', 'fcom-modern-feed'),
            'justNow' => __('Just now', 'fcom-modern-feed'),
            'minutesAgo' => __('%d minutes ago', 'fcom-modern-feed'),
            'hoursAgo' => __('%d hours ago', 'fcom-modern-feed'),
            'daysAgo' => __('%d days ago', 'fcom-modern-feed'),
            'newPosts' => __('%d new posts', 'fcom-modern-feed'),
            'showNewPosts' => __('Show new posts', 'fcom-modern-feed'),
            'seeMore' => __('See more', 'fcom-modern-feed'),
            'seeLess' => __('See less', 'fcom-modern-feed'),
            'youAndOthers' => __('You and %d others', 'fcom-modern-feed'),
            'people' => __('%d people', 'fcom-modern-feed'),
            'comments' => __('%d comments', 'fcom-modern-feed'),
            'photo' => __('Photo', 'fcom-modern-feed'),
            'video' => __('Video', 'fcom-modern-feed'),
            'poll' => __('Poll', 'fcom-modern-feed'),
            'file' => __('File', 'fcom-modern-feed'),
            'loginRequired' => __('Please log in to continue', 'fcom-modern-feed'),
            'errorOccurred' => __('An error occurred. Please try again.', 'fcom-modern-feed'),
        ];
    }
}
