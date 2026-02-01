<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class Shortcode
{
    public static function init()
    {
        add_shortcode('fcom_modern_feed', [__CLASS__, 'render']);
    }

    public static function render($atts)
    {
        $atts = shortcode_atts([
            'space' => '',
            'user_id' => '',
            'per_page' => 10,
            'layout' => 'card', // card, compact
            'show_create' => 'true',
            'show_header' => 'true',
            'fullpage' => 'true', // Enable full-page mode by default
            'class' => '',
        ], $atts, 'fcom_modern_feed');

        $isFullpage = $atts['fullpage'] === 'true';

        // Generate unique container ID
        $containerId = 'fcom-mf-' . wp_generate_uuid4();

        // Get the base URL for the current page (for router)
        // This is the URL path where the shortcode is rendered
        $baseUrl = wp_parse_url(get_permalink(), PHP_URL_PATH) ?: '/';
        // Remove trailing slash and ensure it starts with /
        $baseUrl = '/' . trim($baseUrl, '/');
        if ($baseUrl !== '/') {
            $baseUrl .= '/';
        }

        // Prepare config for JavaScript
        $config = [
            'containerId' => $containerId,
            'space' => sanitize_text_field($atts['space']),
            'userId' => absint($atts['user_id']) ?: null,
            'perPage' => absint($atts['per_page']) ?: 10,
            'layout' => in_array($atts['layout'], ['card', 'compact']) ? $atts['layout'] : 'card',
            'showCreate' => $atts['show_create'] === 'true',
            'showHeader' => $atts['show_header'] === 'true',
            'fullpage' => $isFullpage,
            'baseUrl' => $baseUrl,
        ];

        $classes = 'fcom-modern-feed-container';
        if ($isFullpage) {
            $classes .= ' fcom-mf-fullpage';
        }
        if (!empty($atts['class'])) {
            $classes .= ' ' . esc_attr($atts['class']);
        }

        // Add loading placeholder for better UX
        $placeholder = self::getLoadingPlaceholder();

        // Build output
        $output = '';

        // Add full-page takeover styles if enabled
        if ($isFullpage) {
            $output .= self::getFullpageStyles();
        }

        $output .= sprintf(
            '<div id="%s" class="%s" data-fcom-mf-config=\'%s\'>%s</div>',
            esc_attr($containerId),
            $classes,
            esc_attr(wp_json_encode($config)),
            $placeholder
        );

        // Add script to add body class for full-page mode
        if ($isFullpage) {
            $output .= self::getFullpageScript();

            // Register this page for SPA rewriting (so sub-routes work on refresh)
            global $post;
            if ($post && $post->ID) {
                do_action('fcom_mf_shortcode_rendered', $post->ID);
            }
        }

        return $output;
    }

    private static function getFullpageStyles()
    {
        return '
        <style id="fcom-mf-fullpage-styles">
            /* Full-page mode: Hide everything except our container */
            html.fcom-mf-fullpage-active,
            html.fcom-mf-fullpage-active body {
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                height: 100% !important;
                width: 100% !important;
            }

            /* Hide WordPress admin bar */
            html.fcom-mf-fullpage-active #wpadminbar {
                display: none !important;
            }

            /* Reset admin bar spacing */
            html.fcom-mf-fullpage-active.admin-bar {
                margin-top: 0 !important;
            }

            html.fcom-mf-fullpage-active body.admin-bar {
                padding-top: 0 !important;
                margin-top: 0 !important;
            }

            /* Full-page container - use fixed positioning to overlay everything */
            .fcom-mf-fullpage {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 999999 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                background: #f0f2f5 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Ensure Vue app fills the container */
            .fcom-mf-fullpage .fcom-mf-app {
                min-height: 100vh !important;
            }

            /* Reset any theme constraints on the container */
            .fcom-mf-fullpage,
            .fcom-mf-fullpage * {
                box-sizing: border-box;
            }
        </style>';
    }

    private static function getFullpageScript()
    {
        return "
        <script>
            (function() {
                // Add class to html element immediately for fastest effect
                document.documentElement.classList.add('fcom-mf-fullpage-active');

                // Cleanup function for when app is destroyed
                window.fcomMfCleanupFullpage = function() {
                    document.documentElement.classList.remove('fcom-mf-fullpage-active');
                };
            })();
        </script>";
    }

    private static function getLoadingPlaceholder()
    {
        return '
        <div class="fcom-mf-loading-placeholder">
            <!-- Header skeleton -->
            <div class="fcom-mf-skeleton-header-bar">
                <div class="fcom-mf-skeleton-logo"></div>
                <div class="fcom-mf-skeleton-search"></div>
                <div class="fcom-mf-skeleton-nav">
                    <div class="fcom-mf-skeleton-nav-item"></div>
                    <div class="fcom-mf-skeleton-nav-item"></div>
                    <div class="fcom-mf-skeleton-nav-item"></div>
                </div>
                <div class="fcom-mf-skeleton-user"></div>
            </div>

            <!-- Main layout skeleton -->
            <div class="fcom-mf-skeleton-layout">
                <!-- Left sidebar skeleton -->
                <div class="fcom-mf-skeleton-sidebar fcom-mf-skeleton-sidebar--left">
                    <div class="fcom-mf-skeleton-sidebar-item" style="width: 80%"></div>
                    <div class="fcom-mf-skeleton-sidebar-item" style="width: 60%"></div>
                    <div class="fcom-mf-skeleton-sidebar-item" style="width: 70%"></div>
                    <div class="fcom-mf-skeleton-sidebar-item" style="width: 50%"></div>
                </div>

                <!-- Main content skeleton -->
                <div class="fcom-mf-skeleton-main">
                    <div class="fcom-mf-skeleton-card">
                        <div class="fcom-mf-skeleton-card-header">
                            <div class="fcom-mf-skeleton-avatar"></div>
                            <div class="fcom-mf-skeleton-lines">
                                <div class="fcom-mf-skeleton-line" style="width: 40%"></div>
                                <div class="fcom-mf-skeleton-line" style="width: 25%"></div>
                            </div>
                        </div>
                        <div class="fcom-mf-skeleton-content">
                            <div class="fcom-mf-skeleton-line"></div>
                            <div class="fcom-mf-skeleton-line" style="width: 80%"></div>
                            <div class="fcom-mf-skeleton-line" style="width: 60%"></div>
                        </div>
                    </div>
                    <div class="fcom-mf-skeleton-card">
                        <div class="fcom-mf-skeleton-card-header">
                            <div class="fcom-mf-skeleton-avatar"></div>
                            <div class="fcom-mf-skeleton-lines">
                                <div class="fcom-mf-skeleton-line" style="width: 35%"></div>
                                <div class="fcom-mf-skeleton-line" style="width: 20%"></div>
                            </div>
                        </div>
                        <div class="fcom-mf-skeleton-content">
                            <div class="fcom-mf-skeleton-line"></div>
                            <div class="fcom-mf-skeleton-line" style="width: 90%"></div>
                        </div>
                    </div>
                </div>

                <!-- Right sidebar skeleton -->
                <div class="fcom-mf-skeleton-sidebar fcom-mf-skeleton-sidebar--right">
                    <div class="fcom-mf-skeleton-sidebar-card">
                        <div class="fcom-mf-skeleton-line" style="width: 60%"></div>
                        <div class="fcom-mf-skeleton-line" style="width: 100%; height: 80px"></div>
                    </div>
                    <div class="fcom-mf-skeleton-sidebar-card">
                        <div class="fcom-mf-skeleton-line" style="width: 50%"></div>
                        <div class="fcom-mf-skeleton-sidebar-item" style="width: 90%"></div>
                        <div class="fcom-mf-skeleton-sidebar-item" style="width: 85%"></div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .fcom-mf-loading-placeholder {
                min-height: 100vh;
                background: #f0f2f5;
            }

            /* Header skeleton */
            .fcom-mf-skeleton-header-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: #fff;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                z-index: 100;
            }

            .fcom-mf-skeleton-logo {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            .fcom-mf-skeleton-search {
                width: 240px;
                height: 36px;
                border-radius: 20px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            .fcom-mf-skeleton-nav {
                display: flex;
                gap: 8px;
            }

            .fcom-mf-skeleton-nav-item {
                width: 50px;
                height: 50px;
                border-radius: 8px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            .fcom-mf-skeleton-user {
                width: 80px;
                height: 40px;
                border-radius: 20px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            /* Layout skeleton */
            .fcom-mf-skeleton-layout {
                display: grid;
                grid-template-columns: 280px 1fr 280px;
                max-width: 1400px;
                margin: 0 auto;
                padding-top: 76px;
                gap: 0;
            }

            .fcom-mf-skeleton-sidebar {
                padding: 16px;
            }

            .fcom-mf-skeleton-sidebar-item {
                height: 40px;
                border-radius: 8px;
                margin-bottom: 8px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            .fcom-mf-skeleton-sidebar-card {
                background: #fff;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }

            .fcom-mf-skeleton-main {
                max-width: 680px;
                margin: 0 auto;
                padding: 16px;
                width: 100%;
            }

            .fcom-mf-skeleton-card {
                background: #fff;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .fcom-mf-skeleton-card-header {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
            }

            .fcom-mf-skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
                flex-shrink: 0;
            }

            .fcom-mf-skeleton-lines {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: center;
            }

            .fcom-mf-skeleton-line {
                height: 12px;
                border-radius: 4px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: fcom-mf-shimmer 1.5s infinite;
            }

            .fcom-mf-skeleton-content {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            @keyframes fcom-mf-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Responsive */
            @media (max-width: 1200px) {
                .fcom-mf-skeleton-layout {
                    grid-template-columns: 240px 1fr 240px;
                }
            }

            @media (max-width: 992px) {
                .fcom-mf-skeleton-layout {
                    grid-template-columns: 1fr;
                }
                .fcom-mf-skeleton-sidebar {
                    display: none;
                }
                .fcom-mf-skeleton-search {
                    display: none;
                }
                .fcom-mf-skeleton-nav {
                    display: none;
                }
            }
        </style>';
    }
}
