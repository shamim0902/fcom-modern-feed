<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class GutenbergBlock
{
    public static function init()
    {
        add_action('init', [__CLASS__, 'registerBlock']);
        add_action('enqueue_block_editor_assets', [__CLASS__, 'enqueueEditorAssets']);
    }

    public static function registerBlock()
    {
        register_block_type('fcom-modern-feed/community-feed', [
            'render_callback' => [__CLASS__, 'renderBlock'],
            'attributes' => [
                'space' => [
                    'type' => 'string',
                    'default' => '',
                ],
                'userId' => [
                    'type' => 'number',
                    'default' => 0,
                ],
                'perPage' => [
                    'type' => 'number',
                    'default' => 10,
                ],
                'layout' => [
                    'type' => 'string',
                    'default' => 'card',
                ],
                'showCreate' => [
                    'type' => 'boolean',
                    'default' => true,
                ],
                'showHeader' => [
                    'type' => 'boolean',
                    'default' => true,
                ],
            ],
        ]);
    }

    public static function renderBlock($attributes)
    {
        $containerId = 'fcom-mf-block-' . wp_generate_uuid4();

        $config = [
            'containerId' => $containerId,
            'space' => sanitize_text_field($attributes['space'] ?? ''),
            'userId' => absint($attributes['userId'] ?? 0) ?: null,
            'perPage' => absint($attributes['perPage'] ?? 10) ?: 10,
            'layout' => in_array($attributes['layout'] ?? 'card', ['card', 'compact']) ? $attributes['layout'] : 'card',
            'showCreate' => (bool) ($attributes['showCreate'] ?? true),
            'showHeader' => (bool) ($attributes['showHeader'] ?? true),
        ];

        $placeholder = Shortcode::render([]);
        // Extract just the loading placeholder
        preg_match('/<div class="fcom-mf-loading-placeholder">.*?<\/style>/s', $placeholder, $matches);
        $loadingHtml = $matches[0] ?? '';

        return sprintf(
            '<div id="%s" class="fcom-modern-feed-container" data-fcom-mf-config=\'%s\'>%s</div>',
            esc_attr($containerId),
            esc_attr(wp_json_encode($config)),
            $loadingHtml
        );
    }

    public static function enqueueEditorAssets()
    {
        wp_enqueue_script(
            'fcom-mf-block-editor',
            FCOM_MF_PLUGIN_URL . 'blocks/community-feed/index.js',
            ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'],
            FCOM_MF_VERSION,
            true
        );

        wp_enqueue_style(
            'fcom-mf-block-editor',
            FCOM_MF_PLUGIN_URL . 'blocks/community-feed/editor.css',
            ['wp-edit-blocks'],
            FCOM_MF_VERSION
        );

        wp_localize_script('fcom-mf-block-editor', 'fcomMfBlockData', [
            'spaces' => self::getSpacesList(),
        ]);
    }

    private static function getSpacesList()
    {
        if (!class_exists('\FluentCommunity\App\Models\Space')) {
            return [];
        }

        try {
            $spaces = \FluentCommunity\App\Models\Space::select(['id', 'title', 'slug'])
                ->where('status', 'active')
                ->orderBy('title', 'asc')
                ->get();

            return $spaces->map(function ($space) {
                return [
                    'value' => $space->slug,
                    'label' => $space->title,
                ];
            })->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }
}
