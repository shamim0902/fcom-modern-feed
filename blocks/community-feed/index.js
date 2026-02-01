const { registerBlockType } = wp.blocks;
const { InspectorControls } = wp.blockEditor;
const { PanelBody, TextControl, SelectControl, ToggleControl, RangeControl } = wp.components;
const { Fragment, createElement: el } = wp.element;
const { __ } = wp.i18n;

registerBlockType('fcom-modern-feed/community-feed', {
    title: __('Community Feed', 'fcom-modern-feed'),
    description: __('Display FluentCommunity feeds with a modern Facebook-style UI', 'fcom-modern-feed'),
    category: 'widgets',
    icon: 'groups',
    keywords: [
        __('feed', 'fcom-modern-feed'),
        __('community', 'fcom-modern-feed'),
        __('social', 'fcom-modern-feed'),
        __('posts', 'fcom-modern-feed'),
    ],
    supports: {
        html: false,
        align: ['wide', 'full'],
    },
    attributes: {
        space: {
            type: 'string',
            default: '',
        },
        userId: {
            type: 'number',
            default: 0,
        },
        perPage: {
            type: 'number',
            default: 10,
        },
        layout: {
            type: 'string',
            default: 'card',
        },
        showCreate: {
            type: 'boolean',
            default: true,
        },
        showHeader: {
            type: 'boolean',
            default: true,
        },
    },

    edit: function (props) {
        const { attributes, setAttributes } = props;
        const { space, userId, perPage, layout, showCreate, showHeader } = attributes;

        const spaceOptions = [
            { value: '', label: __('All Spaces', 'fcom-modern-feed') },
            ...(window.fcomMfBlockData?.spaces || []),
        ];

        return el(
            Fragment,
            null,
            el(
                InspectorControls,
                null,
                el(
                    PanelBody,
                    { title: __('Feed Settings', 'fcom-modern-feed'), initialOpen: true },
                    el(SelectControl, {
                        label: __('Space', 'fcom-modern-feed'),
                        value: space,
                        options: spaceOptions,
                        onChange: (value) => setAttributes({ space: value }),
                        help: __('Filter feeds by specific space', 'fcom-modern-feed'),
                    }),
                    el(TextControl, {
                        label: __('User ID', 'fcom-modern-feed'),
                        value: userId || '',
                        type: 'number',
                        onChange: (value) => setAttributes({ userId: parseInt(value) || 0 }),
                        help: __('Filter feeds by specific user (optional)', 'fcom-modern-feed'),
                    }),
                    el(RangeControl, {
                        label: __('Posts per page', 'fcom-modern-feed'),
                        value: perPage,
                        onChange: (value) => setAttributes({ perPage: value }),
                        min: 5,
                        max: 50,
                        step: 5,
                    }),
                    el(SelectControl, {
                        label: __('Layout', 'fcom-modern-feed'),
                        value: layout,
                        options: [
                            { value: 'card', label: __('Card (Facebook-style)', 'fcom-modern-feed') },
                            { value: 'compact', label: __('Compact', 'fcom-modern-feed') },
                        ],
                        onChange: (value) => setAttributes({ layout: value }),
                    })
                ),
                el(
                    PanelBody,
                    { title: __('Display Options', 'fcom-modern-feed'), initialOpen: false },
                    el(ToggleControl, {
                        label: __('Show Create Post Box', 'fcom-modern-feed'),
                        checked: showCreate,
                        onChange: (value) => setAttributes({ showCreate: value }),
                        help: __('Display the post creation form at the top', 'fcom-modern-feed'),
                    }),
                    el(ToggleControl, {
                        label: __('Show Header', 'fcom-modern-feed'),
                        checked: showHeader,
                        onChange: (value) => setAttributes({ showHeader: value }),
                        help: __('Display the feed header with filters', 'fcom-modern-feed'),
                    })
                )
            ),
            el(
                'div',
                { className: 'fcom-mf-block-preview' },
                el(
                    'div',
                    { className: 'fcom-mf-block-preview-header' },
                    el('span', { className: 'dashicons dashicons-groups' }),
                    el('span', null, __('Community Feed', 'fcom-modern-feed'))
                ),
                el(
                    'div',
                    { className: 'fcom-mf-block-preview-content' },
                    el('p', null, space ? __('Showing feeds from: ', 'fcom-modern-feed') + space : __('Showing all feeds', 'fcom-modern-feed')),
                    el('p', { className: 'fcom-mf-block-preview-meta' },
                        __('Layout:', 'fcom-modern-feed') + ' ' + layout + ' | ' +
                        __('Per page:', 'fcom-modern-feed') + ' ' + perPage
                    )
                ),
                el(
                    'div',
                    { className: 'fcom-mf-block-preview-placeholder' },
                    el('div', { className: 'fcom-mf-block-preview-card' }),
                    el('div', { className: 'fcom-mf-block-preview-card' }),
                    el('div', { className: 'fcom-mf-block-preview-card' })
                )
            )
        );
    },

    save: function () {
        // Dynamic block - rendered on server
        return null;
    },
});
