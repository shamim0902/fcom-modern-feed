<script setup lang="ts">
import type { XProfile } from '@/api/types';

defineProps<{
    author: XProfile;
    size?: 'sm' | 'md' | 'lg';
}>();
</script>

<template>
    <div class="fcom-mf-author" :class="`fcom-mf-author--${size || 'md'}`">
        <a :href="`/portal/profile/${author.username}`" class="fcom-mf-author__avatar-link">
            <img
                :src="author.avatar"
                :alt="author.display_name"
                class="fcom-mf-avatar"
                :class="`fcom-mf-avatar--${size || 'md'}`"
            />
        </a>
        <div class="fcom-mf-author__info">
            <a :href="`/portal/profile/${author.username}`" class="fcom-mf-author__name">
                {{ author.display_name }}
                <span v-if="author.is_verified" class="fcom-mf-author__verified" title="Verified">✓</span>
            </a>
            <slot></slot>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-author {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;

    &--sm {
        gap: $spacing-xs;
    }

    &__avatar-link {
        flex-shrink: 0;
    }

    &__info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 1px;
    }

    &__name {
        display: inline-flex;
        align-items: center;
        gap: $spacing-xs;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        line-height: 1.2;

        &:hover {
            text-decoration: underline;
        }
    }

    &__verified {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        background: $primary-color;
        color: $white;
        font-size: 9px;
        border-radius: $border-radius-full;
    }
}
</style>
