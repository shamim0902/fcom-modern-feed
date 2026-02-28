=== FluentCommunity Modern Feed ===

Contributors: fluentcommunity
Tags: community, feed, fluent community, social, forum, facebook-style
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Modern Facebook-style frontend for FluentCommunity. Responsive feed with reactions, comments, spaces, and full SPA experience.

== Description ==

FluentCommunity Modern Feed adds a modern, Facebook-style interface to your FluentCommunity site. It provides a responsive, feature-rich community feed that works as a full single-page app (SPA) or as an embedded feed on any page.

= Features =

* **Facebook-style post cards** – Clean, modern design with media galleries and lightbox
* **Emoji reactions** – Like, Love, Haha, Wow, Sad, Angry with hover picker
* **Threaded comments** – Nested replies and comment reactions
* **Create & edit posts** – Rich text, media uploads, space selection
* **Real-time updates** – New posts ticker and notification badge
* **Infinite scroll** – Automatic loading as you scroll
* **Notifications** – Feed with unread count in sidebar and mobile nav
* **Members directory** – Browse and search members (respects privacy settings)
* **Leaderboard** – User rankings by points (respects privacy settings)
* **Spaces** – Browse spaces and filter feed by space
* **User profiles** – View profiles, posts, and spaces (privacy-aware)
* **Bookmarks** – Save posts for later
* **Mobile-responsive** – Bottom navigation and drawer menu on small screens
* **Privacy compliance** – Honors FluentCommunity Privacy Settings (members page, leaderboard, profile spaces, username/email, account deactivation)

= Requirements =

* WordPress 6.0 or higher
* PHP 7.4 or higher
* **FluentCommunity** – Must be installed and active (this plugin extends it)

= Shortcode =

Use the shortcode on any page or post:

`[fcom_modern_feed]`

**Attributes:**

* `space` – Filter by space slug (e.g. `space="announcements"`)
* `user_id` – Filter by user ID
* `per_page` – Posts per page (default: 10)
* `layout` – `card` or `compact`
* `show_create` – Show post creation form (`true`/`false`)
* `show_header` – Show feed header (`true`/`false`)
* `fullpage` – Full-page SPA mode (`true`/`false`)
* `class` – Additional CSS classes

**Examples:**

`[fcom_modern_feed]`
`[fcom_modern_feed space="announcements"]`
`[fcom_modern_feed layout="compact" per_page="15"]`
`[fcom_modern_feed fullpage="false" show_header="false"]`

= Gutenberg Block =

Add the **Community Feed** block from the block inserter and configure options in the block sidebar.

== Installation ==

1. Ensure **FluentCommunity** is installed and active.
2. Install FluentCommunity Modern Feed (upload or copy to `wp-content/plugins/fcom-modern-feed`).
3. From the plugin directory, run: `npm install` then `npm run build` to generate frontend assets.
4. Activate the plugin in **Plugins** in the WordPress admin.
5. Add the shortcode `[fcom_modern_feed]` to a page, or use the Community Feed block.

= Development =

For local development with hot reload:

1. Set `define('FCOM_MF_DEV', true);` in the main plugin file.
2. Run `npm run dev` (Vite dev server on port 5173).
3. The plugin will load assets from the dev server when it is running.

== Frequently Asked Questions ==

= The feed is blank or shows an error. =

* Confirm FluentCommunity is active.
* Ensure you have run `npm run build` so the `assets` folder contains built files.
* Check the browser console and that `/wp-json/fluent-community/v2/` is accessible.

= After updating the plugin, the feed breaks. =

* Re-run `npm run build` after updating and upload the new `assets` folder.
* Hard-refresh the page (Ctrl+Shift+R or Cmd+Shift+R) or clear cache so the browser loads the new scripts.

= How do I change colors or styling? =

Override CSS variables in your theme. The plugin uses variables such as `--fcom-primary-color`, `--fcom-bg-primary`, and `--fcom-text-primary` in the `.fcom-modern-feed-container` context.

== Changelog ==

= 1.0.1 =
* Fixed reaction stats population for all reaction types in feed items.
* Fixed multiple feed interaction issues around post actions and rendering.
* Improved single-post experience with better back navigation and layout behavior.
* Refined responsive UI and menu behavior, including dark mode polish.
* Improved compatibility handling for profiles, avatars, notifications, and spaces.

= 1.0.0 =
* Initial release.
* Facebook-style feed with reactions, comments, and media.
* Shortcode and Gutenberg block.
* Members, spaces, leaderboard, notifications, bookmarks, profiles.
* Privacy settings compliance (members/leaderboard visibility, profile spaces, username/email, deactivate account).
* Cache-busting and defensive config handling for reliable updates.

== Upgrade Notice ==

= 1.0.1 =
Recommended update with key feed interaction fixes, reaction accuracy improvements, and single-post UI/layout refinements.

= 1.0.0 =
Initial release. Requires FluentCommunity. Run `npm run build` after installation and upload the full `assets` folder when deploying.
