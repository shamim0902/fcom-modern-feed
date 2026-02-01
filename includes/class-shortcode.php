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
            'class' => '',
        ], $atts, 'fcom_modern_feed');

        // Generate unique container ID
        $containerId = 'fcom-mf-' . wp_generate_uuid4();

        // Prepare config for JavaScript
        $config = [
            'containerId' => $containerId,
            'space' => sanitize_text_field($atts['space']),
            'userId' => absint($atts['user_id']) ?: null,
            'perPage' => absint($atts['per_page']) ?: 10,
            'layout' => in_array($atts['layout'], ['card', 'compact']) ? $atts['layout'] : 'card',
            'showCreate' => $atts['show_create'] === 'true',
            'showHeader' => $atts['show_header'] === 'true',
        ];

        $classes = 'fcom-modern-feed-container';
        if (!empty($atts['class'])) {
            $classes .= ' ' . esc_attr($atts['class']);
        }

        // Add loading placeholder for better UX
        $placeholder = self::getLoadingPlaceholder();

        return sprintf(
            '<div id="%s" class="%s" data-fcom-mf-config=\'%s\'>%s</div>',
            esc_attr($containerId),
            $classes,
            esc_attr(wp_json_encode($config)),
            $placeholder
        );
    }

    private static function getLoadingPlaceholder()
    {
        return '
        <div class="fcom-mf-loading-placeholder">
            <div class="fcom-mf-skeleton-card">
                <div class="fcom-mf-skeleton-header">
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
                <div class="fcom-mf-skeleton-header">
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
        <style>
            .fcom-mf-loading-placeholder {
                max-width: 680px;
                margin: 0 auto;
            }
            .fcom-mf-skeleton-card {
                background: #fff;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            .fcom-mf-skeleton-header {
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
        </style>';
    }
}
