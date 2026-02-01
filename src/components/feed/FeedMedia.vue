<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores';
import type { MediaItem } from '@/api/types';

const props = defineProps<{
    items: MediaItem[];
}>();

const uiStore = useUiStore();

const displayItems = computed(() => {
    return props.items.slice(0, 4);
});

const moreCount = computed(() => {
    return props.items.length - 4;
});

const gridClass = computed(() => {
    const count = Math.min(props.items.length, 4);
    return `fcom-mf-media-grid--${count}`;
});

function isImage(item: MediaItem): boolean {
    return item.type === 'image' || item.type.startsWith('image/');
}

function isVideo(item: MediaItem): boolean {
    return item.type === 'video' || item.type.startsWith('video/') || item.url.match(/\.(mp4|webm|ogg)$/i) !== null;
}

const imageUrls = computed(() => {
    return props.items
        .filter(item => isImage(item))
        .map(item => item.url);
});

function openLightbox(index: number): void {
    uiStore.openLightbox(imageUrls.value, index);
}

function getVideoType(url: string): string {
    if (url.endsWith('.webm')) return 'video/webm';
    if (url.endsWith('.ogg') || url.endsWith('.ogv')) return 'video/ogg';
    return 'video/mp4';
}
</script>

<template>
    <div class="fcom-mf-media" :class="gridClass">
        <div
            v-for="(item, index) in displayItems"
            :key="index"
            class="fcom-mf-media__item"
            :class="{ 'fcom-mf-media__item--more': index === 3 && moreCount > 0 }"
        >
            <!-- Video -->
            <video
                v-if="isVideo(item)"
                :src="item.url"
                :poster="item.thumbnail"
                controls
                preload="metadata"
                class="fcom-mf-media__video"
            >
                <source :src="item.url" :type="getVideoType(item.url)" />
            </video>

            <!-- Image -->
            <button
                v-else
                class="fcom-mf-media__image-btn"
                @click="openLightbox(index)"
            >
                <img
                    :src="item.thumbnail || item.url"
                    :alt="`Image ${index + 1}`"
                    class="fcom-mf-media__image"
                    loading="lazy"
                />
                <span v-if="index === 3 && moreCount > 0" class="fcom-mf-media__more">
                    +{{ moreCount }}
                </span>
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-media {
    display: grid;
    gap: 2px;
    margin: 0 $spacing-lg $spacing-md;
    border-radius: $border-radius-md;
    overflow: hidden;

    &--1 {
        grid-template-columns: 1fr;
    }

    &--2 {
        grid-template-columns: 1fr 1fr;
    }

    &--3 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;

        .fcom-mf-media__item:first-child {
            grid-row: span 2;
        }
    }

    &--4 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
    }

    &__item {
        position: relative;
        background: $gray-100;
        aspect-ratio: 1;
        overflow: hidden;

        &--more {
            .fcom-mf-media__image {
                filter: brightness(0.5);
            }
        }
    }

    &__image-btn {
        @include button-reset;
        display: block;
        width: 100%;
        height: 100%;
        cursor: pointer;
    }

    &__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform $transition-slow;

        &:hover {
            transform: scale(1.02);
        }
    }

    &__video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: $black;
    }

    &__more {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $white;
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        pointer-events: none;
    }
}

// Single image should have auto height
.fcom-mf-media--1 .fcom-mf-media__item {
    aspect-ratio: auto;
    max-height: 500px;
}

.fcom-mf-media--1 .fcom-mf-media__image {
    height: auto;
    max-height: 500px;
    object-fit: contain;
    background: $gray-100;
}
</style>
