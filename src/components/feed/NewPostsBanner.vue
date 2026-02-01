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
    width: 100%;
    padding: $spacing-md;
    background: $primary-color;
    color: $white;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    border-radius: $border-radius-md;
    margin-bottom: $spacing-lg;
    transition: background-color $transition-fast;
    cursor: pointer;

    &:hover {
        background: $primary-hover;
    }

    svg {
        flex-shrink: 0;
    }
}
</style>
