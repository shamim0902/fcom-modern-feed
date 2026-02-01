# FluentCommunity Modern Feed

A Facebook-style feed interface for the FluentCommunity WordPress plugin. This plugin provides a modern, responsive, and feature-rich community feed experience that mirrors the look and feel of popular social platforms.

## Features

### Core Feed Features
- **Facebook-style post cards** with clean, modern design
- **Emoji reactions** (Like, Love, Haha, Wow, Sad, Angry) with hover picker
- **Threaded comments** with nested replies
- **Real-time updates** via ticker polling (new posts notification)
- **Infinite scroll** with automatic loading
- **Media galleries** with lightbox viewer
- **OEmbed support** for external content (YouTube, Twitter, etc.)

### User Features
- **Create posts** with rich text, media uploads, and space selection
- **Edit and delete** own posts
- **Bookmark/save** posts for later
- **Comment and reply** with reactions
- **Share posts** via native share or clipboard

### Advanced Features
- **Notifications feed** with real-time unread count
- **Member directory** with search and filters
- **Leaderboard** with user rankings by points
- **Space filtering** for community groups
- **User profiles** with activity feed
- **Mobile-responsive** with bottom navigation

## Requirements

- **WordPress**: 6.0 or higher
- **PHP**: 7.4 or higher
- **FluentCommunity**: Required (must be installed and active)
- **Node.js**: For building frontend assets

## Installation

### From Source

1. **Clone or download** the plugin to your WordPress plugins directory:
   ```bash
   cd wp-content/plugins/
   git clone <repository-url> fcom-modern-feed
   ```

2. **Install dependencies**:
   ```bash
   cd fcom-modern-feed
   npm install
   ```

3. **Build the frontend**:
   ```bash
   npm run build
   ```

4. **Activate the plugin** in WordPress Admin → Plugins

### Production Build

For production deployment, run:
```bash
npm run build
```

This generates optimized assets in the `/assets` directory.

## Usage

### Shortcode

Add the feed to any page or post using the shortcode:

```
[fcom_modern_feed]
```

#### Shortcode Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `space` | string | `''` | Filter by space slug |
| `user_id` | number | `0` | Filter by user ID |
| `per_page` | number | `10` | Posts per page |
| `layout` | string | `'card'` | Layout style: `'card'` or `'compact'` |
| `show_create` | string | `'true'` | Show post creation form |
| `show_header` | string | `'true'` | Show feed header |
| `fullpage` | string | `'true'` | Full-page mode (SPA routing) |
| `class` | string | `''` | Additional CSS classes |

#### Examples

```
// Basic feed
[fcom_modern_feed]

// Feed for a specific space
[fcom_modern_feed space="announcements"]

// User's posts only
[fcom_modern_feed user_id="5"]

// Compact layout with 15 posts per page
[fcom_modern_feed layout="compact" per_page="15"]

// Embedded mode (no full-page routing)
[fcom_modern_feed fullpage="false" show_header="false"]
```

### Gutenberg Block

1. Open the block editor
2. Search for "**Community Feed**" in the block inserter
3. Add the block to your page
4. Configure settings in the block sidebar panel

## Development

### Prerequisites

- Node.js 16+ (for npm)
- SASS (for CSS preprocessing)

### Development Mode

Start the Vite development server with hot reload:

```bash
npm run dev
```

This runs a dev server at `http://localhost:5173`. The plugin automatically detects the dev server and loads assets from there.

**Note**: Set `FCOM_MF_DEV` to `true` in the main plugin file to enable development mode:
```php
define('FCOM_MF_DEV', true);
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run preview` | Preview production build |

### Build Output

After running `npm run build`, assets are generated in:
```
/assets/
├── .vite/
│   └── manifest.json    # Build manifest
├── main.js              # Main bundle
├── vue-*.js             # Vue chunk
├── vendor-*.js          # Vendor dependencies
└── style.css            # Compiled styles
```

## Configuration

The plugin exposes configuration via `window.fcomModernFeed`:

```javascript
{
    rest: {
        url: '/wp-json/fluent-community/v2',
        nonce: 'wp_rest_nonce'
    },
    user: {
        id: 1,
        name: 'John Doe',
        avatar: 'https://...',
        email: 'john@example.com'
    },
    isLoggedIn: true,
    features: {
        reactions: true,
        comments: true,
        createPost: true,
        infiniteScroll: true,
        realTimeUpdates: true,
        mediaUpload: true
    },
    settings: {
        tickerInterval: 45000,  // 45 seconds
        perPage: 10
    }
}
```

## File Structure

```
fcom-modern-feed/
├── fcom-modern-feed.php          # Main plugin file
├── package.json                   # Node dependencies
├── vite.config.js                 # Vite configuration
├── tsconfig.json                  # TypeScript config
│
├── includes/                      # PHP classes
│   ├── class-plugin.php          # Plugin bootstrap
│   ├── class-shortcode.php       # Shortcode handler
│   ├── class-assets.php          # Asset enqueuing
│   ├── class-gutenberg-block.php # Block registration
│   └── class-rewrite-handler.php # URL rewriting
│
├── src/                           # Vue.js frontend
│   ├── main.ts                   # Entry point
│   ├── App.vue                   # Root component
│   │
│   ├── api/
│   │   ├── client.ts             # REST API client
│   │   └── types.ts              # TypeScript types
│   │
│   ├── stores/                   # Pinia state stores
│   │   ├── auth.ts               # Authentication
│   │   ├── feed.ts               # Feed data
│   │   ├── ui.ts                 # UI state
│   │   ├── space.ts              # Spaces
│   │   └── index.ts              # Store exports
│   │
│   ├── components/
│   │   ├── feed/                 # Feed components
│   │   │   ├── FeedList.vue
│   │   │   ├── FeedItem.vue
│   │   │   ├── FeedActions.vue
│   │   │   ├── CreatePost.vue
│   │   │   └── ReactionPicker.vue
│   │   │
│   │   ├── comments/             # Comment components
│   │   │   ├── CommentList.vue
│   │   │   ├── CommentItem.vue
│   │   │   └── CommentForm.vue
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── AppHeader.vue
│   │   │   ├── LeftSidebar.vue
│   │   │   └── MobileNav.vue
│   │   │
│   │   └── common/               # Shared components
│   │       ├── ToastContainer.vue
│   │       ├── ImageLightbox.vue
│   │       └── TimeAgo.vue
│   │
│   ├── views/                    # Page views
│   │   ├── FeedView.vue
│   │   ├── SinglePostView.vue
│   │   ├── ProfileView.vue
│   │   ├── SpaceView.vue
│   │   ├── MembersView.vue
│   │   ├── NotificationsView.vue
│   │   ├── BookmarksView.vue
│   │   └── LeaderboardView.vue
│   │
│   └── styles/                   # SCSS styles
│       ├── variables.scss        # Design tokens
│       └── main.scss             # Global styles
│
├── blocks/                        # Gutenberg block
│   └── community-feed/
│       ├── index.js
│       └── editor.css
│
└── assets/                        # Build output
    └── .vite/
        └── manifest.json
```

## API Endpoints

The plugin consumes FluentCommunity's REST API:

| Feature | Endpoint | Method |
|---------|----------|--------|
| Feed list | `GET /feeds` | GET |
| Create post | `POST /feeds` | POST |
| Update post | `PATCH /feeds/{id}` | PATCH |
| Delete post | `DELETE /feeds/{id}` | DELETE |
| Comments | `GET/POST /feeds/{id}/comments` | GET/POST |
| Reactions | `POST /feeds/{id}/react` | POST |
| Bookmarks | `GET /feeds/bookmarks` | GET |
| Members | `GET /members` | GET |
| Profile | `GET /profile/{username}` | GET |
| Notifications | `GET /notifications` | GET |
| Spaces | `GET /spaces` | GET |
| Ticker | `GET /feeds/ticker` | GET |
| Media upload | `POST /feeds/media-upload` | POST |

## Customization

### Styling

The plugin uses CSS variables for theming. Override in your theme:

```css
.fcom-modern-feed-container {
    --fcom-primary-color: #1877f2;
    --fcom-bg-primary: #ffffff;
    --fcom-text-primary: #050505;
    /* ... */
}
```

### Hooks & Filters

The plugin provides hooks for customization:

```php
// Modify asset loading
add_filter('fcom_mf_load_assets', function($should_load) {
    // Custom logic
    return $should_load;
});
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### Feed not loading
1. Ensure FluentCommunity plugin is active
2. Check browser console for errors
3. Verify REST API is accessible at `/wp-json/fluent-community/v2/`

### Development server not detected
1. Ensure Vite is running (`npm run dev`)
2. Verify `FCOM_MF_DEV` is set to `true`
3. Check that port 5173 is not blocked

### Build errors
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Run type check: `npm run typecheck`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## License

GPL v2 or later

## Credits

- Built with [Vue.js 3](https://vuejs.org/)
- State management with [Pinia](https://pinia.vuejs.org/)
- Build tool: [Vite](https://vitejs.dev/)
- Styling: SCSS with Facebook-inspired design system
- Requires [FluentCommunity](https://fluentcommunity.co/) by WPManageNinja
