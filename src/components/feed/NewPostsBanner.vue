<script setup lang="ts">
import { useUiStore } from '@/stores';

defineProps<{
    count: number;
}>();

const emit = defineEmits<{
    load: [];
}>();

const uiStore = useUiStore();

function handleClick(): void {
    emit('load');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
    <button class="fcom-mf-new-posts-banner" @click="handleClick">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        <span>{{ uiStore.t('newPosts', count) }}</span>
    </button>
</template>

<style lang="scss" scoped>
.fcom-mf-new-posts-banner {
    @include button-reset;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    padding: 10px $spacing-xl;
    background: linear-gradient(
        140deg,
        var(--fcom-mf-primary, #1877f2) 0%,
        var(--fcom-mf-primary-hover, #166fe5) 100%
    );
    color: $white;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 1px 4px rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.18);
    transition: transform $transition-fast, filter $transition-fast, box-shadow $transition-fast;
    cursor: pointer;

    &:hover {
        filter: brightness(1.03);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.2);
    }

    &:active {
        transform: translateY(0);
    }

    span {
        white-space: nowrap;
    }

    svg {
        flex-shrink: 0;
    }

    @media (max-width: $breakpoint-sm) {
        width: 100%;
        border-radius: $border-radius-md;
        justify-content: center;
    }
}
</style>
