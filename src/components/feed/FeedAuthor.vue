<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { XProfile } from '@/api/types';

defineProps<{
    author: XProfile;
    size?: 'sm' | 'md' | 'lg';
}>();

const router = useRouter();

function navigateToProfile(username: string): void {
    router.push(`/u/${username}`);
}
</script>

<template>
    <div class="fcom-mf-author" :class="`fcom-mf-author--${size || 'md'}`">
        <button class="fcom-mf-author__avatar-link" @click="navigateToProfile(author.username)">
            <img
                :src="author.avatar"
                :alt="author.display_name"
                class="fcom-mf-avatar"
                :class="`fcom-mf-avatar--${size || 'md'}`"
            />
        </button>
        <div class="fcom-mf-author__info">
            <button class="fcom-mf-author__name" @click="navigateToProfile(author.username)">
                {{ author.display_name }}
                <span v-if="author.is_verified" class="fcom-mf-author__verified" title="Verified">✓</span>
            </button>
            <slot></slot>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-author {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;

    &--sm {
        gap: $spacing-xs;
    }

    &__avatar-link {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
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
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;

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
        background: var(--fcom-mf-primary, #1877f2);
        color: $white;
        font-size: 9px;
        border-radius: $border-radius-full;
    }
}
</style>
