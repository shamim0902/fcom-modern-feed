<script setup lang="ts">
// Loading skeleton for feed items
</script>

<template>
    <div class="fcom-mf-feed-skeleton fcom-mf-card">
        <div class="fcom-mf-feed-skeleton__header">
            <div class="fcom-mf-feed-skeleton__avatar fcom-mf-skeleton"></div>
            <div class="fcom-mf-feed-skeleton__meta">
                <div class="fcom-mf-skeleton" style="width: 40%; height: 14px;"></div>
                <div class="fcom-mf-skeleton" style="width: 25%; height: 12px; margin-top: 6px;"></div>
            </div>
        </div>
        <div class="fcom-mf-feed-skeleton__content">
            <div class="fcom-mf-skeleton" style="width: 100%; height: 14px;"></div>
            <div class="fcom-mf-skeleton" style="width: 90%; height: 14px;"></div>
            <div class="fcom-mf-skeleton" style="width: 70%; height: 14px;"></div>
        </div>
        <div class="fcom-mf-feed-skeleton__actions">
            <div class="fcom-mf-skeleton" style="width: 60px; height: 32px;"></div>
            <div class="fcom-mf-skeleton" style="width: 80px; height: 32px;"></div>
            <div class="fcom-mf-skeleton" style="width: 60px; height: 32px;"></div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.fcom-mf-feed-skeleton {
    padding: $spacing-lg;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);

    &__header {
        display: flex;
        gap: $spacing-md;
        margin-bottom: $spacing-lg;
    }

    &__avatar {
        width: $avatar-md;
        height: $avatar-md;
        border-radius: $border-radius-full;
    }

    &__meta {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    &__content {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
        margin-bottom: $spacing-lg;
    }

    &__actions {
        display: flex;
        gap: $spacing-md;
        padding-top: $spacing-md;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
}
</style>
