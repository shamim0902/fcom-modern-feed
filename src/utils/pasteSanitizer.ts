function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isSafeHref(href: string): boolean {
    if (!href) return false;
    if (href.startsWith('#') || href.startsWith('/')) return true;
    const lowered = href.toLowerCase();
    return (
        lowered.startsWith('http://') ||
        lowered.startsWith('https://') ||
        lowered.startsWith('mailto:') ||
        lowered.startsWith('tel:')
    );
}

function isSafeImageSrc(src: string): boolean {
    if (!src) return false;
    const lowered = src.toLowerCase();
    return (
        lowered.startsWith('http://') ||
        lowered.startsWith('https://') ||
        lowered.startsWith('data:image/')
    );
}

export function plainTextToHtml(text: string): string {
    if (!text) return '';
    return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
}

export function insertHtmlAtCursor(html: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        document.execCommand('insertHTML', false, html);
        return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const container = document.createElement('template');
    container.innerHTML = html;
    const fragment = container.content;
    const lastNode = fragment.lastChild;

    range.insertNode(fragment);

    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

export function sanitizePastedHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;

    body.querySelectorAll('script, style, meta, link, head, title').forEach((el) => el.remove());

    const allowedTags = new Set([
        'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
        'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'IMG'
    ]);

    const blockLikeTags = new Set([
        'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER',
        'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH'
    ]);

    function cleanNode(node: Node): void {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            const el = child as Element;

            if (!allowedTags.has(el.tagName)) {
                const parent = el.parentNode;
                if (!parent) continue;

                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }

                if (blockLikeTags.has(el.tagName)) {
                    parent.insertBefore(doc.createElement('br'), el);
                }

                parent.removeChild(el);
                continue;
            }

            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (el.tagName === 'A' && (name === 'href' || name === 'title')) {
                    continue;
                }
                if (el.tagName === 'IMG' && (name === 'src' || name === 'alt')) {
                    continue;
                }
                el.removeAttribute(attr.name);
            }

            if (el.tagName === 'A') {
                const href = el.getAttribute('href') || '';
                if (!isSafeHref(href)) {
                    const parent = el.parentNode;
                    if (parent) {
                        while (el.firstChild) {
                            parent.insertBefore(el.firstChild, el);
                        }
                        parent.removeChild(el);
                        continue;
                    }
                } else {
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer nofollow');
                }
            }

            if (el.tagName === 'IMG') {
                const src = el.getAttribute('src') || '';
                if (!isSafeImageSrc(src)) {
                    el.remove();
                    continue;
                }
            }

            cleanNode(el);
        }
    }

    cleanNode(body);
    return body.innerHTML.trim();
}
