<script setup lang="ts">
import { ref, computed } from 'vue';

export interface Reaction {
    type: string;
    emoji: string;
    label: string;
    color: string;
}

const props = defineProps<{
    currentReaction?: string;
    show: boolean;
}>();

const emit = defineEmits<{
    select: [type: string];
    close: [];
}>();

const reactions: Reaction[] = [
    { type: 'like', emoji: '👍', label: 'Like', color: '#1877f2' },
    { type: 'love', emoji: '❤️', label: 'Love', color: '#e7415f' },
    { type: 'haha', emoji: '😂', label: 'Haha', color: '#f7b928' },
    { type: 'wow', emoji: '😮', label: 'Wow', color: '#f7b928' },
    { type: 'sad', emoji: '😢', label: 'Sad', color: '#f7b928' },
    { type: 'angry', emoji: '😡', label: 'Angry', color: '#e9710f' },
];

const hoveredReaction = ref<string | null>(null);

function selectReaction(type: string): void {
    emit('select', type);
}

function getReactionByType(type: string): Reaction | undefined {
    return reactions.find(r => r.type === type);
}

// Expose for parent components
defineExpose({ reactions, getReactionByType });
</script>

<template>
    <Transition name="fcom-mf-reaction-picker">
        <div v-if="show" class="fcom-mf-reaction-picker" @mouseleave="emit('close')">
            <button
                v-for="reaction in reactions"
                :key="reaction.type"
                class="fcom-mf-reaction-picker__item"
                :class="{
                    'fcom-mf-reaction-picker__item--active': currentReaction === reaction.type,
                    'fcom-mf-reaction-picker__item--hovered': hoveredReaction === reaction.type
                }"
                :title="reaction.label"
                @mouseenter="hoveredReaction = reaction.type"
                @mouseleave="hoveredReaction = null"
                @click="selectReaction(reaction.type)"
            >
                <span class="fcom-mf-reaction-picker__emoji">{{ reaction.emoji }}</span>
                <span
                    v-if="hoveredReaction === reaction.type"
                    class="fcom-mf-reaction-picker__label"
                >
                    {{ reaction.label }}
                </span>
            </button>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-reaction-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: $spacing-sm $spacing-md;
    background: $white;
    border-radius: 28px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    z-index: $z-dropdown;
    margin-bottom: $spacing-sm;

    &__item {
        @include button-reset;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: $spacing-xs;
        border-radius: $border-radius-full;
        transition: transform $transition-fast;

        &:hover {
            transform: scale(1.3) translateY(-4px);
        }

        &--hovered {
            transform: scale(1.3) translateY(-4px);
        }

        &--active {
            background: rgba($primary-color, 0.1);
        }
    }

    &__emoji {
        font-size: 32px;
        line-height: 1;
        transition: transform $transition-fast;
    }

    &__label {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.8);
        color: $white;
        font-size: $font-size-xs;
        font-weight: $font-weight-medium;
        border-radius: $border-radius-sm;
        white-space: nowrap;
        pointer-events: none;
    }
}

// Transition animations
.fcom-mf-reaction-picker-enter-active {
    animation: reaction-picker-in 0.2s ease-out;
}

.fcom-mf-reaction-picker-leave-active {
    animation: reaction-picker-out 0.15s ease-in;
}

@keyframes reaction-picker-in {
    0% {
        opacity: 0;
        transform: scale(0.8) translateY(8px);
    }
    100% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes reaction-picker-out {
    0% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    100% {
        opacity: 0;
        transform: scale(0.8) translateY(8px);
    }
}

// Staggered animation for each emoji
.fcom-mf-reaction-picker__item {
    @for $i from 1 through 6 {
        &:nth-child(#{$i}) {
            animation: emoji-bounce-in 0.3s ease-out #{($i - 1) * 0.03}s both;
        }
    }
}

@keyframes emoji-bounce-in {
    0% {
        opacity: 0;
        transform: scale(0) translateY(10px);
    }
    60% {
        transform: scale(1.1) translateY(-2px);
    }
    100% {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
