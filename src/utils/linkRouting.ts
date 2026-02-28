function normalizePath(pathname: string): string {
    if (!pathname) return '/';
    const stripped = pathname.replace(/\/+$/, '');
    return stripped || '/';
}

const URL_TEXT_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const URL_TRAILING_PUNCTUATION = new Set(['.', ',', '!', '?', ';', ':']);

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
    // Keep post-route matching strict so normal same-site pages like /post/some-page
    // are not hijacked by the SPA router.
    if (/^\/post\/\d+$/.test(pathname)) return true;
    if (/^\/post\/s\/[^/]+$/.test(pathname)) return true;
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
    linkifyPlainTextUrls(doc);

    doc.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (!href) {
            return;
        }

        const internalPath = resolveInternalAppPath(href);
        if (internalPath) {
            anchor.setAttribute('data-mf-route', internalPath);
            anchor.removeAttribute('target');
            return;
        }

        try {
            const resolved = new URL(href, window.location.origin);
            const isHttpLink = resolved.protocol === 'http:' || resolved.protocol === 'https:';
            const isSameSiteDomain = resolved.hostname === window.location.hostname;
            if (isHttpLink && !isSameSiteDomain) {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer nofollow');
                return;
            }

            // Keep same-site links in the same tab.
            anchor.removeAttribute('target');
        } catch {
            // Keep original href when URL parsing fails.
        }
    });

    return doc.body.innerHTML;
}

function linkifyPlainTextUrls(doc: Document): void {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const text = node.nodeValue || '';
        if (!text || !URL_TEXT_PATTERN.test(text)) {
            URL_TEXT_PATTERN.lastIndex = 0;
            continue;
        }
        URL_TEXT_PATTERN.lastIndex = 0;
        if (isLinkifyExcludedNode(node)) {
            continue;
        }
        textNodes.push(node);
    }

    textNodes.forEach((textNode) => {
        const source = textNode.nodeValue || '';
        const fragment = doc.createDocumentFragment();
        let cursor = 0;
        URL_TEXT_PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = URL_TEXT_PATTERN.exec(source)) !== null) {
            const fullMatch = match[0];
            const matchIndex = match.index;
            const [urlToken, trailingText] = stripTrailingPunctuation(fullMatch);

            if (!urlToken) {
                continue;
            }

            if (matchIndex > cursor) {
                fragment.appendChild(doc.createTextNode(source.slice(cursor, matchIndex)));
            }

            const anchor = doc.createElement('a');
            anchor.textContent = urlToken;
            anchor.setAttribute('href', toAbsoluteHref(urlToken));
            fragment.appendChild(anchor);

            if (trailingText) {
                fragment.appendChild(doc.createTextNode(trailingText));
            }

            cursor = matchIndex + fullMatch.length;
        }

        if (cursor < source.length) {
            fragment.appendChild(doc.createTextNode(source.slice(cursor)));
        }

        if (fragment.childNodes.length > 0) {
            textNode.parentNode?.replaceChild(fragment, textNode);
        }
    });
}

function isLinkifyExcludedNode(node: Node): boolean {
    let element = node.parentElement;
    while (element) {
        const tag = element.tagName;
        if (
            tag === 'A' ||
            tag === 'PRE' ||
            tag === 'CODE' ||
            tag === 'SCRIPT' ||
            tag === 'STYLE' ||
            tag === 'TEXTAREA' ||
            tag === 'BUTTON'
        ) {
            return true;
        }
        element = element.parentElement;
    }
    return false;
}

function stripTrailingPunctuation(token: string): [string, string] {
    let core = token;
    let trailing = '';

    while (core.length > 0 && URL_TRAILING_PUNCTUATION.has(core[core.length - 1])) {
        trailing = core[core.length - 1] + trailing;
        core = core.slice(0, -1);
    }

    while (core.endsWith(')') && hasUnmatchedClosingParenthesis(core)) {
        trailing = ')' + trailing;
        core = core.slice(0, -1);
    }

    return [core, trailing];
}

function hasUnmatchedClosingParenthesis(value: string): boolean {
    let open = 0;
    let close = 0;
    for (const ch of value) {
        if (ch === '(') open += 1;
        if (ch === ')') close += 1;
    }
    return close > open;
}

function toAbsoluteHref(urlToken: string): string {
    if (urlToken.startsWith('www.')) {
        return `https://${urlToken}`;
    }
    return urlToken;
}
