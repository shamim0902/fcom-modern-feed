<?php
/**
 * Full-page template for FluentCommunity Modern Feed
 *
 * This template bypasses the theme's header and footer
 * to provide a true full-page experience.
 */

defined('ABSPATH') || exit;

// Get the post content
global $post;
$content = $post ? apply_filters('the_content', $post->post_content) : '';

// Get site info
$site_name = get_bloginfo('name');
$site_description = get_bloginfo('description');
$page_title = get_the_title();

// Language direction
$text_direction = is_rtl() ? 'rtl' : 'ltr';
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> dir="<?php echo esc_attr($text_direction); ?>">
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php echo esc_attr($site_description); ?>">
    <title><?php echo esc_html($page_title ? $page_title . ' - ' . $site_name : $site_name); ?></title>

    <?php
    // Let WordPress output critical head items
    wp_head();
    ?>

    <style>
        /* Reset everything for full-page mode */
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            height: 100% !important;
            width: 100% !important;
            background: #f0f2f5 !important;
        }

        /* Hide WordPress admin bar in full-page mode */
        #wpadminbar {
            display: none !important;
        }

        html.admin-bar {
            margin-top: 0 !important;
        }

        body.admin-bar {
            padding-top: 0 !important;
            margin-top: 0 !important;
        }

        /* Full-page container */
        .fcom-mf-fullpage-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            background: #f0f2f5;
        }

        /* Ensure the container fills properly */
        .fcom-modern-feed-container {
            min-height: 100vh;
        }

        .fcom-modern-feed-container.fcom-mf-fullpage {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100vh !important;
        }
    </style>
</head>
<body <?php body_class('fcom-mf-fullpage-body'); ?>>
    <div class="fcom-mf-fullpage-wrapper">
        <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    </div>

    <?php
    // Let WordPress output footer scripts
    wp_footer();
    ?>
</body>
</html>
