<?php
/**
 * Plugin Name: FluentCommunity Modern Feed
 * Description: Modern Facebook-style frontend for FluentCommunity
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: FluentCommunity
 * Text Domain: fcom-modern-feed
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

define('FCOM_MF_VERSION', '1.0.0');
define('FCOM_MF_PLUGIN_FILE', __FILE__);
define('FCOM_MF_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FCOM_MF_PLUGIN_URL', plugin_dir_url(__FILE__));

define('FCOM_MF_DEV', false);

// Check if FluentCommunity is active
add_action('plugins_loaded', function () {
    if (!defined('FLUENT_COMMUNITY_PLUGIN_VERSION')) {
        add_action('admin_notices', function () {
            echo '<div class="error"><p>';
            echo esc_html__('FluentCommunity Modern Feed requires FluentCommunity to be installed and active.', 'fcom-modern-feed');
            echo '</p></div>';
        });
        return;
    }

    // Load plugin classes
    require_once FCOM_MF_PLUGIN_DIR . 'includes/class-plugin.php';
    \FcomModernFeed\Plugin::init();
});
