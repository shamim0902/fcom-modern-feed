<script setup lang="ts">
import { useUiStore } from '@/stores';

const uiStore = useUiStore();

function getIcon(type: string): string {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '✕';
        case 'warning':
            return '⚠';
        case 'info':
        default:
            return 'ℹ';
    }
}
</script>

<template>
    <Teleport to="body">
        <div class="fcom-mf-toast-container">
            <TransitionGroup name="toast">
                <div
                    v-for="toast in uiStore.activeToasts"
                    :key="toast.id"
                    class="fcom-mf-toast"
                    :class="`fcom-mf-toast--${toast.type}`"
                >
                    <span class="fcom-mf-toast__icon">{{ getIcon(toast.type) }}</span>
                    <span class="fcom-mf-toast__message">{{ toast.message }}</span>
                    <button
                        class="fcom-mf-toast__close"
                        @click="uiStore.removeToast(toast.id)"
                    >
                        ✕
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style lang="scss" scoped>
.fcom-mf-toast-container {
    position: fixed;
    bottom: $spacing-xl;
    right: $spacing-xl;
    z-index: $z-toast;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    max-width: 400px;

    @media (max-width: $breakpoint-sm) {
        left: $spacing-md;
        right: $spacing-md;
        bottom: $spacing-md;
        max-width: none;
    }
}

.fcom-mf-toast {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $gray-800;
    color: $white;
    border-radius: $border-radius-md;
    box-shadow: $shadow-lg;
    font-size: $font-size-md;

    &--success {
        background: $secondary-color;
    }

    &--error {
        background: $danger-color;
    }

    &--warning {
        background: $warning-color;
        color: $gray-900; // Dark text for better contrast on yellow
    }

    &--info {
        background: $primary-color;
    }

    &__icon {
        font-size: $font-size-lg;
        flex-shrink: 0;
    }

    &__message {
        flex: 1;
    }

    &__close {
        @include button-reset;
        padding: $spacing-xs;
        opacity: 0.7;
        transition: opacity $transition-fast;

        &:hover {
            opacity: 1;
        }
    }
}

// Transitions
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(100%);
}
</style>
