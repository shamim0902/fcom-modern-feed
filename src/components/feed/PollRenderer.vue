<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api/client';
import { useUiStore } from '@/stores';
import type { SurveyConfig, SurveyOption } from '@/api/types';

const props = defineProps<{
    feedId: number;
    surveyConfig: SurveyConfig;
}>();

const uiStore = useUiStore();

const options = ref<SurveyOption[]>([]);
const isVoting = ref(false);
const totalVotes = ref(0);

const isMultiChoice = computed(() => props.surveyConfig.type === 'multi_choice');

const isEnded = computed(() => {
    if (!props.surveyConfig.end_date) return false;
    return new Date(props.surveyConfig.end_date) < new Date();
});

const endDateLabel = computed(() => {
    if (!props.surveyConfig.end_date) return '';
    const endDate = new Date(props.surveyConfig.end_date);
    const now = new Date();

    if (endDate < now) {
        return `Ended ${formatRelativeTime(endDate)}`;
    }
    return `Ends ${formatRelativeTime(endDate)}`;
});

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffMs > 0 ? 'from now' : 'ago'}`;
    }
    if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMs > 0 ? 'from now' : 'ago'}`;
    }
    return diffMs > 0 ? 'soon' : 'recently';
}

function getVotePercentage(option: SurveyOption): number {
    if (totalVotes.value === 0) return 0;
    return Math.round((option.vote_counts / totalVotes.value) * 100);
}

async function toggleVote(optionIndex: number): Promise<void> {
    if (isEnded.value) {
        uiStore.showError('This poll has ended.');
        return;
    }

    if (isVoting.value) return;

    // Update local state
    const option = options.value[optionIndex];

    if (isMultiChoice.value) {
        option.voted = !option.voted;
    } else {
        // Single choice - unselect others
        options.value.forEach((opt, idx) => {
            opt.voted = idx === optionIndex ? !option.voted : false;
        });
    }

    // Sync with server
    await syncVotes();
}

async function syncVotes(): Promise<void> {
    isVoting.value = true;

    try {
        const voteIndexes = options.value
            .filter(opt => opt.voted)
            .map(opt => opt.slug);

        const response = await api.post<{ survey_config: SurveyConfig } | SurveyConfig>(
            `feeds/${props.feedId}/apps/survey-vote`,
            { vote_indexes: voteIndexes }
        );

        console.log('[PollRenderer] Vote response:', response);

        // Handle both response formats: { survey_config: ... } or direct SurveyConfig
        const surveyConfig = 'survey_config' in response ? response.survey_config : response;

        if (surveyConfig && surveyConfig.options) {
            setupOptions(surveyConfig);
        }
    } catch (error) {
        uiStore.showError('Failed to record vote');
        console.error('[PollRenderer] Vote error:', error);
    } finally {
        isVoting.value = false;
    }
}

function setupOptions(config: SurveyConfig): void {
    options.value = [...config.options];
    totalVotes.value = config.options.reduce((sum, opt) => sum + (opt.vote_counts || 0), 0);
}

onMounted(() => {
    setupOptions(props.surveyConfig);
});
</script>

<template>
    <div class="fcom-mf-poll">
        <div class="fcom-mf-poll__options">
            <button
                v-for="(option, index) in options"
                :key="option.slug"
                class="fcom-mf-poll__option"
                :class="{
                    'fcom-mf-poll__option--voted': option.voted,
                    'fcom-mf-poll__option--ended': isEnded
                }"
                :disabled="isVoting"
                @click="toggleVote(index)"
            >
                <div class="fcom-mf-poll__option-content">
                    <span class="fcom-mf-poll__checkbox">
                        <svg v-if="isMultiChoice" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline v-if="option.voted" points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle v-if="option.voted" cx="12" cy="12" r="6"></circle>
                        </svg>
                    </span>
                    <span class="fcom-mf-poll__label">{{ option.label }}</span>
                    <span v-if="totalVotes > 0" class="fcom-mf-poll__percent">
                        {{ getVotePercentage(option) }}%
                    </span>
                </div>
                <div
                    class="fcom-mf-poll__bar"
                    :style="{ width: getVotePercentage(option) + '%' }"
                ></div>
            </button>
        </div>
        <div class="fcom-mf-poll__meta">
            <span class="fcom-mf-poll__total">
                {{ totalVotes }} vote{{ totalVotes !== 1 ? 's' : '' }}
            </span>
            <span v-if="endDateLabel" class="fcom-mf-poll__end-date">
                {{ endDateLabel }}
            </span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-poll {
    margin: $spacing-md $spacing-lg;

    &__options {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
    }

    &__option {
        @include button-reset;
        position: relative;
        display: block;
        width: 100%;
        padding: $spacing-md;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        transition: all $transition-fast;

        &:hover:not(:disabled) {
            border-color: var(--fcom-mf-primary, #1877f2);
        }

        &--voted {
            border-color: var(--fcom-mf-primary, #1877f2);
            background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.05);

            .fcom-mf-poll__checkbox {
                background: var(--fcom-mf-primary, #1877f2);
                border-color: var(--fcom-mf-primary, #1877f2);
                color: $white;
            }

            .fcom-mf-poll__bar {
                background: rgba(var(--fcom-mf-primary-rgb, 24, 119, 242), 0.2);
            }
        }

        &--ended {
            cursor: default;
            opacity: 0.8;
        }

        &:disabled {
            cursor: wait;
        }
    }

    &__option-content {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: $spacing-sm;
    }

    &__checkbox {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid $border-color;
        border-radius: $border-radius-sm;
        flex-shrink: 0;
        transition: all $transition-fast;
    }

    // Radio style for single choice
    .fcom-mf-poll__option:not(.fcom-mf-poll__option--voted) {
        .fcom-mf-poll__checkbox {
            border-radius: $border-radius-full;
        }
    }

    &__label {
        flex: 1;
        font-size: $font-size-md;
        color: $text-primary;
    }

    &__percent {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $text-secondary;
    }

    &__bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: $gray-100;
        transition: width 0.3s ease;
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        margin-top: $spacing-md;
        font-size: $font-size-sm;
        color: $text-tertiary;
    }

    &__total {
        font-weight: $font-weight-medium;
    }

    &__end-date {
        &::before {
            content: '·';
            margin-right: $spacing-sm;
        }
    }
}
</style>
