<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores';

const props = defineProps<{
    placeholder?: string;
    isSubmitting?: boolean;
    size?: 'sm' | 'md';
}>();

const emit = defineEmits<{
    submit: [message: string];
    cancel: [];
}>();

const authStore = useAuthStore();

const message = ref('');
const inputRef = ref<HTMLTextAreaElement | null>(null);

function handleSubmit(): void {
    if (!message.value.trim() || props.isSubmitting) return;

    emit('submit', message.value.trim());
    message.value = '';
}

function handleKeydown(e: KeyboardEvent): void {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
}

function autoResize(): void {
    if (inputRef.value) {
        inputRef.value.style.height = 'auto';
        inputRef.value.style.height = inputRef.value.scrollHeight + 'px';
    }
}
</script>

<template>
    <div class="fcom-mf-comment-form" :class="`fcom-mf-comment-form--${size || 'md'}`">
        <img
            :src="authStore.userAvatar"
            :alt="authStore.userName || ''"
            class="fcom-mf-avatar"
            :class="size === 'sm' ? 'fcom-mf-avatar--sm' : ''"
        />

        <div class="fcom-mf-comment-form__input-wrap">
            <textarea
                ref="inputRef"
                v-model="message"
                :placeholder="placeholder"
                class="fcom-mf-comment-form__input"
                rows="1"
                :disabled="isSubmitting"
                @keydown="handleKeydown"
                @input="autoResize"
            ></textarea>

            <div v-if="message.trim()" class="fcom-mf-comment-form__actions">
                <button
                    type="button"
                    class="fcom-mf-comment-form__cancel"
                    @click="emit('cancel'); message = ''"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <button
                    type="button"
                    class="fcom-mf-comment-form__submit"
                    :disabled="isSubmitting || !message.trim()"
                    @click="handleSubmit"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-comment-form {
    display: flex;
    gap: $spacing-sm;
    align-items: flex-start;

    &--sm {
        .fcom-mf-comment-form__input {
            padding: $spacing-sm $spacing-md;
            font-size: $font-size-sm;
        }
    }

    &__input-wrap {
        flex: 1;
        position: relative;
    }

    &__input {
        width: 100%;
        padding: $spacing-sm $spacing-lg;
        padding-right: 70px;
        border: none;
        border-radius: $border-radius-lg;
        background: $gray-50;
        font-size: $font-size-md;
        font-family: inherit;
        line-height: $line-height-normal;
        resize: none;
        min-height: 36px;
        max-height: 200px;
        overflow-y: auto;

        &:focus {
            outline: none;
            background: $gray-100;
        }

        &::placeholder {
            color: $text-tertiary;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }

    &__actions {
        position: absolute;
        right: $spacing-sm;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: $spacing-xs;
    }

    &__cancel,
    &__submit {
        @include button-reset;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $border-radius-full;
        transition: all $transition-fast;
    }

    &__cancel {
        color: $text-tertiary;

        &:hover {
            background: $gray-200;
            color: $text-secondary;
        }
    }

    &__submit {
        color: $primary-color;

        &:hover:not(:disabled) {
            background: rgba($primary-color, 0.1);
        }

        &:disabled {
            color: $gray-300;
            cursor: not-allowed;
        }
    }
}
</style>
