function normalizePath(pathname: string): string {
    if (!pathname) return '/';
    const stripped = pathname.replace(/\/+$/, '');
    return stripped || '/';
}

function getPortalBasePath(): string | null {
    const baseUrl = window.fcomModernFeed?.portalBaseUrl;
    if (!baseUrl) {
        return null;
    }

    try {
        const parsed = new URL(baseUrl, window.location.origin);
        return normalizePath(parsed.pathname);
    } catch {
        return null;
    }
}

function isSupportedAppPath(pathname: string): boolean {
    if (pathname === '/') return true;
    if (pathname === '/members') return true;
    if (pathname === '/spaces') return true;
    if (pathname === '/notifications') return true;
    if (pathname === '/bookmarks') return true;
    if (pathname === '/leaderboard') return true;
    if (pathname.startsWith('/u/')) return true;
    if (pathname.startsWith('/space/')) return true;
    if (pathname.startsWith('/post/')) return true;
    return false;
}

function mapKnownPortalPatterns(pathname: string): string {
    const spaceHome = pathname.match(/^\/space\/([^/]+)\/home$/);
    if (spaceHome) {
        return `/space/${spaceHome[1]}`;
    }

    const spacePost = pathname.match(/^\/space\/[^/]+\/post\/([^/]+)$/);
    if (spacePost) {
        return `/post/s/${spacePost[1]}`;
    }

    const feedById = pathname.match(/^\/p\/(\d+)$/);
    if (feedById) {
        return `/post/${feedById[1]}`;
    }

    return pathname;
}

export function resolveInternalAppPath(rawHref: string): string | null {
    if (!rawHref) {
        return null;
    }

    try {
        const resolved = new URL(rawHref, window.location.origin);
        if (resolved.origin !== window.location.origin) {
            return null;
        }

        const currentPagePath = normalizePath(window.location.pathname);
        let pathname = normalizePath(resolved.pathname);

        const portalBasePath = getPortalBasePath();
        if (portalBasePath) {
            if (pathname === portalBasePath) {
                pathname = '/';
            } else if (pathname.startsWith(`${portalBasePath}/`)) {
                pathname = pathname.slice(portalBasePath.length);
                pathname = normalizePath(pathname.startsWith('/') ? pathname : `/${pathname}`);
            }
        }

        if (normalizePath(resolved.pathname) === currentPagePath) {
            pathname = '/';
        }

        pathname = mapKnownPortalPatterns(pathname);

        if (!isSupportedAppPath(pathname)) {
            return null;
        }

        return `${pathname}${resolved.search}${resolved.hash}`;
    } catch {
        return null;
    }
}

export function normalizeRenderedHtmlLinks(html: string): string {
    if (!html) {
        return '';
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (!href) {
            return;
        }

        const internalPath = resolveInternalAppPath(href);
        if (internalPath) {
            anchor.setAttribute('data-mf-route', internalPath);
            return;
        }

        try {
            const resolved = new URL(href, window.location.origin);
            const isExternal = resolved.origin !== window.location.origin;
            if (isExternal) {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer nofollow');
            }
        } catch {
            // Keep original href when URL parsing fails.
        }
    });

    return doc.body.innerHTML;
}
