<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class Admin
{
    private static $manifest = null;

    public static function init()
    {
        add_action('admin_menu', [__CLASS__, 'registerMenu']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueueAssets']);
        add_action('wp_ajax_fcom_mf_save_settings', [__CLASS__, 'ajaxSaveSettings']);
        add_action('wp_ajax_fcom_mf_reset_settings', [__CLASS__, 'ajaxResetSettings']);
    }

    /**
     * Predefined color packs (theme types) for the Modern Feed.
     *
     * @return array<string, array{label: string, primary_color: string}>
     */
    public static function getColorPacks()
    {
        return [
            'default' => [
                'label'        => __('Default (Blue)', 'fcom-modern-feed'),
                'primary_color' => '#1877f2',
            ],
            'green'   => [
                'label'        => __('Green', 'fcom-modern-feed'),
                'primary_color' => '#22c55e',
            ],
            'purple'  => [
                'label'        => __('Purple', 'fcom-modern-feed'),
                'primary_color' => '#8b5cf6',
            ],
            'coral'   => [
                'label'        => __('Coral', 'fcom-modern-feed'),
                'primary_color' => '#f43f5e',
            ],
            'teal'    => [
                'label'        => __('Teal', 'fcom-modern-feed'),
                'primary_color' => '#14b8a6',
            ],
            'amber'   => [
                'label'        => __('Amber', 'fcom-modern-feed'),
                'primary_color' => '#f59e0b',
            ],
            'custom'  => [
                'label'        => __('Custom', 'fcom-modern-feed'),
                'primary_color' => '', // user picks
            ],
        ];
    }

    public static function registerMenu()
    {
        add_submenu_page(
            'fluent-community',
            __('Modern Feed', 'fcom-modern-feed'),
            __('Modern Feed', 'fcom-modern-feed'),
            'manage_options',
            'fcom-mf-admin',
            [__CLASS__, 'renderPage'],
            20
        );
    }

    public static function renderPage()
    {
        $static_title = esc_html__('Fluent Community Modern Feed – Settings beta ', 'fcom-modern-feed');
        $static_subtitle = esc_html__('Customize theme, colors, and feed behavior for the Modern Feed.', 'fcom-modern-feed');
        echo '<div class="wrap fcom-mf-admin-wrap">';
        echo '<div id="fcom-mf-admin-app">';
        echo '<div class="fcom-mf-admin-static" id="fcom-mf-admin-static">';
        echo '<h1 class="fcom-mf-admin-static__title">' . $static_title . '</h1>';
        echo '<p class="fcom-mf-admin-static__p">' . $static_subtitle . '</p>';
        echo '<p class="fcom-mf-admin-static__p fcom-mf-admin-static__loading">' . esc_html__('Loading settings…', 'fcom-modern-feed') . '</p>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }

    public static function enqueueAssets($hook)
    {
        // Hook can be fluent-community_page_fcom-mf-admin; fallback for GET page (some environments)
        $is_our_page = ($hook === 'fluent-community_page_fcom-mf-admin')
            || (isset($_GET['page']) && $_GET['page'] === 'fcom-mf-admin');
        if (!$is_our_page) {
            return;
        }

        $manifest = self::getManifest();
        $entryKey = 'src/admin/main.ts';
        $entry = $manifest[$entryKey] ?? $manifest['admin'] ?? null;

        if (!$entry || empty($entry['file'])) {
            return;
        }

        $manifestPath = FCOM_MF_PLUGIN_DIR . 'assets/.vite/manifest.json';
        $version = FCOM_MF_VERSION;
        if (file_exists($manifestPath)) {
            $version .= '.' . filemtime($manifestPath);
        }

        if (!empty($entry['css'])) {
            foreach ($entry['css'] as $index => $cssFile) {
                wp_enqueue_style(
                    'fcom-mf-admin-' . $index,
                    FCOM_MF_PLUGIN_URL . 'assets/' . $cssFile,
                    [],
                    $version
                );
            }
        }

        wp_enqueue_script(
            'fcom-mf-admin',
            FCOM_MF_PLUGIN_URL . 'assets/' . $entry['file'],
            [],
            $version,
            true
        );

        add_filter('script_loader_tag', function ($tag, $handle) {
            if ($handle === 'fcom-mf-admin') {
                return str_replace('<script', '<script type="module"', $tag);
            }
            return $tag;
        }, 10, 2);

        // Inline config must run before the module (localize adds it before our script)
        wp_localize_script('fcom-mf-admin', 'fcomMfAdmin', [
            'ajaxUrl'    => admin_url('admin-ajax.php'),
            'nonce'      => wp_create_nonce('fcom_mf_admin'),
            'settings'   => self::getSettings(),
            'colorPacks' => self::getColorPacks(),
        ]);
    }

    private static function getManifest()
    {
        if (self::$manifest === null) {
            $path = FCOM_MF_PLUGIN_DIR . 'assets/.vite/manifest.json';
            if (file_exists($path)) {
                self::$manifest = json_decode(file_get_contents($path), true) ?: [];
            } else {
                self::$manifest = [];
            }
        }
        return self::$manifest;
    }

    /**
     * Get saved Modern Feed settings (theme, colors, etc.).
     *
     * @return array<string, string|int>
     */
    public static function getSettings()
    {
        $defaults = [
            'theme'          => 'default',
            'color_pack'     => 'default',
            'primary_color'  => '#1877f2',
            'border_radius'  => 'rounded',
            'posts_per_page' => 10,
        ];
        $saved = get_option('fcom_mf_settings', []);
        $merged = array_merge($defaults, is_array($saved) ? $saved : []);
        $merged['posts_per_page'] = max(5, min(50, (int) $merged['posts_per_page']));
        return $merged;
    }

    /**
     * Save settings (called via AJAX from admin app).
     */
    public static function ajaxSaveSettings()
    {
        check_ajax_referer('fcom_mf_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied.', 'fcom-modern-feed')]);
        }

        $raw = isset($_POST['settings']) && is_array($_POST['settings']) ? $_POST['settings'] : [];
        $theme = isset($raw['theme']) ? sanitize_text_field($raw['theme']) : 'default';
        $theme = in_array($theme, ['default', 'dark', 'auto'], true) ? $theme : 'default';

        $color_pack = isset($raw['color_pack']) ? sanitize_text_field($raw['color_pack']) : 'default';
        $packs = self::getColorPacks();
        if (!isset($packs[$color_pack])) {
            $color_pack = 'default';
        }

        $primary_color = isset($raw['primary_color']) ? sanitize_text_field($raw['primary_color']) : '#1877f2';
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $primary_color) !== 1) {
            $primary_color = '#1877f2';
        }
        // If a preset pack is selected, use that pack's color
        if ($color_pack !== 'custom' && !empty($packs[$color_pack]['primary_color'])) {
            $primary_color = $packs[$color_pack]['primary_color'];
        }

        $border_radius = isset($raw['border_radius']) ? sanitize_text_field($raw['border_radius']) : 'rounded';
        $border_radius = in_array($border_radius, ['sharp', 'rounded', 'pill'], true) ? $border_radius : 'rounded';

        $posts_per_page = isset($raw['posts_per_page']) ? absint($raw['posts_per_page']) : 10;
        $posts_per_page = max(5, min(50, $posts_per_page));

        $settings = [
            'theme'          => $theme,
            'color_pack'     => $color_pack,
            'primary_color'  => $primary_color,
            'border_radius'  => $border_radius,
            'posts_per_page' => $posts_per_page,
        ];
        update_option('fcom_mf_settings', $settings);
        wp_send_json_success(['message' => __('Settings saved.', 'fcom-modern-feed')]);
    }

    /**
     * Reset all settings to defaults (AJAX).
     */
    public static function ajaxResetSettings()
    {
        check_ajax_referer('fcom_mf_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied.', 'fcom-modern-feed')]);
        }
        delete_option('fcom_mf_settings');
        wp_send_json_success([
            'message' => __('Settings reset to default.', 'fcom-modern-feed'),
            'settings' => self::getSettings(),
        ]);
    }
}
