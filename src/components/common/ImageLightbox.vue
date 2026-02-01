<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useUiStore } from '@/stores';

const uiStore = useUiStore();

const isOpen = computed(() => uiStore.isLightboxOpen);
const images = computed(() => uiStore.currentLightboxImages);
const currentIndex = computed(() => uiStore.currentLightboxIndex);
const currentImage = computed(() => images.value[currentIndex.value]);
const hasMultiple = computed(() => images.value.length > 1);
const canPrev = computed(() => currentIndex.value > 0);
const canNext = computed(() => currentIndex.value < images.value.length - 1);

function close(): void {
    uiStore.closeLightbox();
}

function prev(): void {
    if (canPrev.value) {
        uiStore.prevLightboxImage();
    }
}

function next(): void {
    if (canNext.value) {
        uiStore.nextLightboxImage();
    }
}

function handleKeydown(e: KeyboardEvent): void {
    if (!isOpen.value) return;

    switch (e.key) {
        case 'Escape':
            close();
            break;
        case 'ArrowLeft':
            prev();
            break;
        case 'ArrowRight':
            next();
            break;
    }
}

function handleBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('fcom-mf-lightbox')) {
        close();
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <Teleport to="body">
        <Transition name="lightbox">
            <div
                v-if="isOpen"
                class="fcom-mf-lightbox"
                @click="handleBackdropClick"
            >
                <!-- Close button -->
                <button class="fcom-mf-lightbox__close" @click="close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- Navigation arrows -->
                <button
                    v-if="hasMultiple && canPrev"
                    class="fcom-mf-lightbox__nav fcom-mf-lightbox__nav--prev"
                    @click.stop="prev"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                <button
                    v-if="hasMultiple && canNext"
                    class="fcom-mf-lightbox__nav fcom-mf-lightbox__nav--next"
                    @click.stop="next"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>

                <!-- Image -->
                <div class="fcom-mf-lightbox__content">
                    <img
                        :src="currentImage"
                        :alt="`Image ${currentIndex + 1} of ${images.length}`"
                        class="fcom-mf-lightbox__image"
                    />
                </div>

                <!-- Counter -->
                <div v-if="hasMultiple" class="fcom-mf-lightbox__counter">
                    {{ currentIndex + 1 }} / {{ images.length }}
                </div>

                <!-- Thumbnail strip -->
                <div v-if="hasMultiple" class="fcom-mf-lightbox__thumbnails">
                    <button
                        v-for="(img, index) in images"
                        :key="index"
                        class="fcom-mf-lightbox__thumbnail"
                        :class="{ 'fcom-mf-lightbox__thumbnail--active': index === currentIndex }"
                        @click.stop="uiStore.setLightboxIndex(index)"
                    >
                        <img :src="img" :alt="`Thumbnail ${index + 1}`" />
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
.fcom-mf-lightbox {
    position: fixed;
    inset: 0;
    z-index: $z-modal;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-xxl;

    &__close {
        @include button-reset;
        position: absolute;
        top: $spacing-lg;
        right: $spacing-lg;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $white;
        background: rgba(255, 255, 255, 0.1);
        border-radius: $border-radius-full;
        transition: background-color $transition-fast;

        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    }

    &__nav {
        @include button-reset;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $white;
        background: rgba(255, 255, 255, 0.1);
        border-radius: $border-radius-full;
        transition: background-color $transition-fast;

        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        &--prev {
            left: $spacing-lg;
        }

        &--next {
            right: $spacing-lg;
        }
    }

    &__content {
        max-width: 90vw;
        max-height: 80vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__image {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: $border-radius-sm;
    }

    &__counter {
        position: absolute;
        top: $spacing-lg;
        left: 50%;
        transform: translateX(-50%);
        color: $white;
        font-size: $font-size-md;
        background: rgba(0, 0, 0, 0.5);
        padding: $spacing-xs $spacing-md;
        border-radius: $border-radius-lg;
    }

    &__thumbnails {
        position: absolute;
        bottom: $spacing-lg;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: $spacing-sm;
        max-width: 90vw;
        overflow-x: auto;
        padding: $spacing-sm;
        background: rgba(0, 0, 0, 0.5);
        border-radius: $border-radius-md;
    }

    &__thumbnail {
        @include button-reset;
        width: 48px;
        height: 48px;
        border-radius: $border-radius-sm;
        overflow: hidden;
        opacity: 0.5;
        transition: opacity $transition-fast;
        flex-shrink: 0;

        &:hover,
        &--active {
            opacity: 1;
        }

        &--active {
            outline: 2px solid $white;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }
}

// Transitions
.lightbox-enter-active,
.lightbox-leave-active {
    transition: opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
    opacity: 0;
}
</style>
