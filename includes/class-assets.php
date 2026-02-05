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
            // Development mode - load from Vite dev server (port must match vite.config.js server.port)
            $vitePort = defined('FCOM_MF_VITE_PORT') ? (int) FCOM_MF_VITE_PORT : 8120;
            $viteOrigin = 'http://localhost:' . $vitePort;
            wp_enqueue_script(
                'fcom-mf-vite-client',
                $viteOrigin . '/@vite/client',
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
                $viteOrigin . '/src/main.ts',
                ['fcom-mf-vite-client'],
                null,
                true
            );
        } else {
            // Production mode
            $manifest = self::getManifest();
            $entry = $manifest['src/main.ts'] ?? $manifest['main'] ?? null;

            if ($entry && !empty($entry['file'])) {
                // Cache-bust: use manifest or entry file mtime so each new deploy loads fresh assets
                $manifestPath = FCOM_MF_PLUGIN_DIR . 'assets/.vite/manifest.json';
                $entryPath = FCOM_MF_PLUGIN_DIR . 'assets/' . $entry['file'];
                $version = FCOM_MF_VERSION;
                if (file_exists($manifestPath)) {
                    $version .= '.' . filemtime($manifestPath);
                } elseif (file_exists($entryPath)) {
                    $version .= '.' . filemtime($entryPath);
                }

                // Enqueue CSS
                if (!empty($entry['css'])) {
                    foreach ($entry['css'] as $index => $cssFile) {
                        wp_enqueue_style(
                            'fcom-mf-app-' . $index,
                            FCOM_MF_PLUGIN_URL . 'assets/' . $cssFile,
                            [],
                            $version
                        );
                    }
                }

                // Enqueue JS
                wp_enqueue_script(
                    'fcom-mf-app',
                    FCOM_MF_PLUGIN_URL . 'assets/' . $entry['file'],
                    [],
                    $version,
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
            'logoutUrl' => wp_logout_url(get_permalink()),
            'i18n' => self::getTranslations(),
            'features' => [
                'reactions' => true,
                'comments' => true,
                'createPost' => is_user_logged_in(),
                'infiniteScroll' => true,
                'realTimeUpdates' => true,
                'mediaUpload' => is_user_logged_in(),
                'adminSettings' => self::canAccessAdminSettings(),
                'followersModule' => self::isFollowersModuleEnabled(),
            ],
            'adminSettingsUrl' => self::getAdminSettingsUrl(),
            'portalBaseUrl' => self::getPortalBaseUrl(),
            'socialLinkProviders' => self::getSocialLinkProviders(),
            'primaryMenuItems' => self::getPrimaryMenuItems(),
            'profileDropdownItems' => self::getProfileDropdownItems(),
            'sidebarBottomLinkGroups' => self::getSidebarBottomLinkGroups(),
            'privacy' => self::getPrivacyFlags(),
            'settings' => array_merge(
                [
                    'tickerInterval' => 45000, // 45 seconds
                    'perPage' => 10,
                ],
                self::getThemeSettingsForFrontend()
            ),
        ];
    }

    /**
     * Privacy flags from Fluent Community Privacy Settings (who can view members/leaderboard, can deactivate).
     *
     * @return array{canViewMembersPage: bool, canViewLeaderboardMembers: bool, canDeactivateAccount: bool}
     */
    private static function getPrivacyFlags()
    {
        $defaults = [
            'canViewMembersPage'      => true,
            'canViewLeaderboardMembers' => true,
            'canDeactivateAccount'    => false,
        ];
        if (!class_exists(\FluentCommunity\App\Functions\Utility::class)) {
            return $defaults;
        }
        $utility = \FluentCommunity\App\Functions\Utility::class;
        $helper = class_exists(\FluentCommunity\App\Services\Helper::class) ? \FluentCommunity\App\Services\Helper::class : null;
        return [
            'canViewMembersPage'       => $utility::canViewMembersPage(),
            'canViewLeaderboardMembers' => $utility::canViewLeaderboardMembers(),
            'canDeactivateAccount'     => $utility::getPrivacySetting('can_deactive_account') === 'yes' || ($helper && $helper::isSiteAdmin()),
        ];
    }

    /**
     * Get enabled social link providers from Fluent Community "Social Media Links Settings".
     *
     * @return array<string, array{title: string, placeholder: string, domain: string}>
     */
    private static function getSocialLinkProviders()
    {
        if (!class_exists(\FluentCommunity\App\Services\ProfileHelper::class)) {
            return [];
        }
        $providers = \FluentCommunity\App\Services\ProfileHelper::socialLinkProviders(true);
        $out = [];
        foreach ($providers as $key => $provider) {
            $out[$key] = [
                'title' => isset($provider['title']) ? (string) $provider['title'] : $key,
                'placeholder' => isset($provider['placeholder']) ? (string) $provider['placeholder'] : '',
                'domain' => isset($provider['domain']) ? (string) $provider['domain'] : '',
            ];
        }
        return $out;
    }

    /**
     * Get Primary Menu Items from Fluent Community "Primary Menu Items" settings (order preserved).
     *
     * @return list<array{slug: string, title: string, permalink: string, shape_svg: string, privacy: string, enabled: string}>
     */
    private static function getPrimaryMenuItems()
    {
        if (!class_exists(\FluentCommunity\App\Functions\Utility::class)) {
            return [];
        }
        $data = \FluentCommunity\App\Functions\Utility::getPortalSidebarData('sidebar');
        $primaryItems = isset($data['primaryItems']) && is_array($data['primaryItems']) ? $data['primaryItems'] : [];
        $list = [];
        foreach ($primaryItems as $slug => $item) {
            if (empty($item['slug'])) {
                continue;
            }
            $list[] = [
                'slug'       => $slug,
                'title'      => isset($item['title']) ? (string) $item['title'] : '',
                'permalink'  => isset($item['permalink']) ? (string) $item['permalink'] : '',
                'shape_svg'  => isset($item['shape_svg']) ? (string) $item['shape_svg'] : '',
                'privacy'    => isset($item['privacy']) ? (string) $item['privacy'] : 'public',
                'enabled'    => isset($item['enabled']) ? (string) $item['enabled'] : 'yes',
            ];
        }
        return $list;
    }

    /**
     * Get Profile Dropdown Items from Fluent Community "Profile Dropdown Items" settings (order preserved).
     * Permalinks are resolved for the current user (profile URL, logout URL, etc.).
     * Only returned when user is logged in.
     *
     * @return list<array{slug: string, title: string, permalink: string, shape_svg: string, enabled: string}>
     */
    private static function getProfileDropdownItems()
    {
        if (!is_user_logged_in() || !class_exists(\FluentCommunity\App\Services\Helper::class)) {
            return [];
        }
        $helper = \FluentCommunity\App\Services\Helper::class;
        $menuGroups = $helper::getMenuItemsGroup('view');
        $raw = isset($menuGroups['profileDropdownItems']) && is_array($menuGroups['profileDropdownItems']) ? $menuGroups['profileDropdownItems'] : [];
        $username = '';
        if (class_exists(\FluentCommunity\App\Models\XProfile::class)) {
            $xprofile = $helper::getCurrentProfile();
            if ($xprofile && !empty($xprofile->username)) {
                $username = $xprofile->username;
            }
        }
        if (!$username) {
            $user = wp_get_current_user();
            $username = $user->user_login;
        }
        $baseUrl = $helper::baseUrl('');
        $userUrl = $helper::baseUrl('u/' . $username);
        $logoutUrl = wp_logout_url($baseUrl);
        $replaces = [
            '#{{user_url}}'   => $userUrl,
            '#user_url'        => $userUrl,
            '#{{logout_url}}' => $logoutUrl,
            '#logout_url'     => $logoutUrl,
        ];
        $list = [];
        foreach ($raw as $slug => $item) {
            if (empty($item['slug'])) {
                continue;
            }
            $enabled = isset($item['enabled']) ? (string) $item['enabled'] : 'yes';
            if ($enabled !== 'yes') {
                continue;
            }
            $permalink = isset($item['permalink']) ? (string) $item['permalink'] : '';
            if ($slug === 'my_spaces') {
                $permalink = $helper::baseUrl('u/' . $username . '/spaces');
            } elseif ($slug === 'logout') {
                $permalink = $logoutUrl;
            } elseif ($slug === 'profile') {
                $permalink = $userUrl;
            } else {
                $permalink = str_replace(array_keys($replaces), array_values($replaces), $permalink);
            }
            $list[] = [
                'slug'      => $slug,
                'title'     => isset($item['title']) ? (string) $item['title'] : '',
                'permalink' => $permalink,
                'shape_svg' => isset($item['shape_svg']) ? (string) $item['shape_svg'] : '',
                'enabled'   => $enabled,
            ];
        }
        return $list;
    }

    /**
     * Get Sidebar Bottom Link Groups from Fluent Community "Sidebar Bottom Link Groups" (Menu Settings).
     * Each group has title and items; each item has title and permalink.
     *
     * @return list<array{title?: string, items: list<array{title: string, permalink: string}>}>
     */
    private static function getSidebarBottomLinkGroups()
    {
        if (!class_exists(\FluentCommunity\App\Functions\Utility::class)) {
            return [];
        }
        $data = \FluentCommunity\App\Functions\Utility::getPortalSidebarData('sidebar');
        $groups = isset($data['bottomLinkGroups']) && is_array($data['bottomLinkGroups']) ? $data['bottomLinkGroups'] : [];
        $out = [];
        foreach ($groups as $group) {
            if (empty($group['items']) || !is_array($group['items'])) {
                continue;
            }
            $items = [];
            foreach ($group['items'] as $item) {
                if (empty($item['title']) && empty($item['permalink'])) {
                    continue;
                }
                $enabled = isset($item['enabled']) ? (string) $item['enabled'] : 'yes';
                if ($enabled !== 'yes') {
                    continue;
                }
                $items[] = [
                    'title'     => isset($item['title']) ? (string) $item['title'] : '',
                    'permalink' => isset($item['permalink']) ? (string) $item['permalink'] : '',
                ];
            }
            if (!empty($items)) {
                $out[] = [
                    'title' => isset($group['title']) ? (string) $group['title'] : '',
                    'items' => $items,
                ];
            }
        }
        return $out;
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

        // Check if Vite dev server is actually running (port must match vite.config.js server.port)
        $vitePort = defined('FCOM_MF_VITE_PORT') ? (int) FCOM_MF_VITE_PORT : 8120;
        $connection = @fsockopen('localhost', $vitePort, $errno, $errstr, 0.3);
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
        $avatar   = get_avatar_url($user->ID, ['size' => 96]);
        $username = $user->user_login;
        $name     = $user->display_name;

        // Ensure FluentCommunity XProfile exists and use saved profile data (avatar, username, display name)
        if (class_exists('\FluentCommunity\App\Models\User') && class_exists('\FluentCommunity\App\Models\XProfile')) {
            $fcUser = \FluentCommunity\App\Models\User::find($user->ID);
            if ($fcUser && method_exists($fcUser, 'syncXProfile')) {
                $fcUser->syncXProfile();
            }
            $xprofile = \FluentCommunity\App\Models\XProfile::where('user_id', $user->ID)->first();
            if ($xprofile) {
                $avatar = $xprofile->avatar;
                if (!empty($xprofile->username)) {
                    $username = $xprofile->username;
                }
                if (!empty($xprofile->display_name)) {
                    $name = $xprofile->display_name;
                }
            }
        }

        return [
            'id'       => $user->ID,
            'name'     => $name,
            'username' => $username,
            'avatar'   => $avatar,
            'email'    => $user->user_email,
        ];
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

    private static function isFollowersModuleEnabled()
    {
        // Check if FluentCommunity Helper class exists
        if (class_exists('\FluentCommunity\App\Services\Helper')) {
            return \FluentCommunity\App\Services\Helper::isFeatureEnabled('followers_module');
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

    /**
     * Theme settings for the frontend (from Modern Feed admin settings).
     *
     * @return array{theme: string, primary_color: string, border_radius: string, perPage: int}
     */
    private static function getThemeSettingsForFrontend()
    {
        $settings = Admin::getSettings();
        return [
            'theme'         => (string) ($settings['theme'] ?? 'default'),
            'primary_color' => (string) ($settings['primary_color'] ?? '#1877f2'),
            'border_radius' => (string) ($settings['border_radius'] ?? 'rounded'),
            'perPage'       => (int) ($settings['posts_per_page'] ?? 10),
        ];
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
