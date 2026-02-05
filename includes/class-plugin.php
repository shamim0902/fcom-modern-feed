<?php

namespace FcomModernFeed;

defined('ABSPATH') || exit;

class Plugin
{
    private static $instance = null;

    public static function init()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->loadDependencies();
        $this->initHooks();
    }

    private function loadDependencies()
    {
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-assets.php';
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-shortcode.php';
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-gutenberg-block.php';
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-rewrite-handler.php';
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-fullpage-template.php';
        require_once FCOM_MF_PLUGIN_DIR . 'includes/class-admin.php';
    }

    private function initHooks()
    {
        Assets::init();
        Shortcode::init();
        Admin::init();
        GutenbergBlock::init();
        RewriteHandler::init();
        FullpageTemplate::init();

        // Load text domain
        add_action('init', [$this, 'loadTextDomain']);
    }

    public function loadTextDomain()
    {
        load_plugin_textdomain(
            'fcom-modern-feed',
            false,
            dirname(plugin_basename(FCOM_MF_PLUGIN_FILE)) . '/languages'
        );
    }
}
