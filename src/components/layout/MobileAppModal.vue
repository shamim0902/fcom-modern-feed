<script setup lang="ts">
import type { MobileAppModalData } from '@/api/client';

defineProps<{
    show: boolean;
    modal: MobileAppModalData | null;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

function close(): void {
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <div
            v-if="show && modal"
            class="fcom-mf-mobile-app-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fcom-mf-mobile-app-modal-title"
            @click.self="close"
        >
            <div class="fcom-mf-mobile-app-modal">
                <button
                    type="button"
                    class="fcom-mf-mobile-app-modal__close"
                    aria-label="Close"
                    @click="close"
                >
                    &times;
                </button>

                <div class="fcom-mf-mobile-app-modal__content">
                    <!-- How to connect (3-step guide) -->
                    <div class="fcom-mf-mobile-app-card fcom-mf-mobile-app-card--guide">
                        <h2
                            id="fcom-mf-mobile-app-modal-title"
                            class="fcom-mf-mobile-app-modal__title"
                        >
                            {{ modal.title }}
                        </h2>
                        <div class="fcom-mf-mobile-app-guide">
                            <img
                                :src="modal.threeStepImage"
                                :alt="modal.step1Desc"
                                class="fcom-mf-mobile-app-guide__img"
                            />
                            <div class="fcom-mf-mobile-app-guide__steps">
                                <div class="fcom-mf-mobile-app-guide__step fcom-mf-mobile-app-guide__step--1">
                                    <p v-html="modal.step1Desc" />
                                </div>
                                <div class="fcom-mf-mobile-app-guide__step fcom-mf-mobile-app-guide__step--2">
                                    <p v-html="modal.step2Desc" />
                                </div>
                                <div class="fcom-mf-mobile-app-guide__step fcom-mf-mobile-app-guide__step--done">
                                    <p v-html="modal.doneLabel" />
                                </div>
                                <span class="fcom-mf-mobile-app-guide__badge fcom-mf-mobile-app-guide__badge--1">{{ modal.step1Badge }}</span>
                                <span class="fcom-mf-mobile-app-guide__badge fcom-mf-mobile-app-guide__badge--2">{{ modal.step2Badge }}</span>
                                <span class="fcom-mf-mobile-app-guide__badge fcom-mf-mobile-app-guide__badge--done">{{ modal.doneBadge }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 1: Download app (Play + Apple) -->
                    <div class="fcom-mf-mobile-app-cards">
                        <div class="fcom-mf-mobile-app-card">
                            <h3 class="fcom-mf-mobile-app-card__heading">
                                <span class="fcom-mf-mobile-app-card__badge">Step-1:</span>
                                {{ modal.step1Label.replace(/^Step-1:\s*/, '') || 'Download Fluent Community Mobile App' }}
                            </h3>
                            <div class="fcom-mf-mobile-app-stores">
                                <a
                                    :href="modal.playStoreUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fcom-mf-mobile-app-store"
                                >
                                    <img
                                        :src="modal.playStoreImage"
                                        alt="Play Store"
                                        class="fcom-mf-mobile-app-store__img"
                                    />
                                    <p class="fcom-mf-mobile-app-store__label">
                                        <img
                                            :src="modal.googlePlayIcon"
                                            alt="Google Play"
                                            class="fcom-mf-mobile-app-store__icon"
                                        />
                                    </p>
                                </a>
                                <a
                                    :href="modal.appStoreUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fcom-mf-mobile-app-store"
                                >
                                    <img
                                        :src="modal.appleImage"
                                        alt="App Store"
                                        class="fcom-mf-mobile-app-store__img"
                                    />
                                    <p class="fcom-mf-mobile-app-store__label">
                                        <img
                                            :src="modal.appStoreIcon"
                                            alt="App Store"
                                            class="fcom-mf-mobile-app-store__icon"
                                        />
                                    </p>
                                </a>
                            </div>
                        </div>

                        <!-- Step 2: Connect (QR code) -->
                        <div class="fcom-mf-mobile-app-card">
                            <h3 class="fcom-mf-mobile-app-card__heading">
                                <span class="fcom-mf-mobile-app-card__badge">Step-2:</span>
                                {{ modal.step2Label.replace(/^Step-2:\s*/, '') || 'Connect Your Fluent Community Mobile App' }}
                            </h3>
                            <div class="fcom-mf-mobile-app-qr">
                                <img
                                    v-if="modal.qrCodeUrl"
                                    :src="modal.qrCodeUrl"
                                    alt="Community App QR Code"
                                    class="fcom-mf-mobile-app-qr__img"
                                />
                                <p v-else-if="modal.noLicenseMessage" class="fcom-mf-mobile-app-qr__msg">
                                    {{ modal.noLicenseMessage }}
                                </p>
                                <p v-else class="fcom-mf-mobile-app-qr__msg">
                                    Please provide License Key to connect your app.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-mobile-app-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
}

.fcom-mf-mobile-app-modal {
    position: relative;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-lg;
    max-width: min(1024px, 100%);
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    padding: 20px;

    &__close {
        position: absolute;
        top: 12px;
        right: 16px;
        z-index: 1;
        background: none;
        border: none;
        font-size: 28px;
        line-height: 1;
        color: $text-secondary;
        cursor: pointer;
        padding: 4px 8px;

        &:hover {
            color: $text-primary;
        }
    }

    &__content {
        overflow-y: auto;
        max-height: calc(90vh - 40px);
    }

    &__title {
        text-align: center;
        font-size: 24px;
        margin: 0 0 15px;
        font-weight: 600;
    }
}

.fcom-mf-mobile-app-card {
    padding: 16px;
    margin-bottom: 20px;

    &--guide {
        padding: 10px;
    }

    &__heading {
        text-align: center;
        font-size: 16px;
        margin: 0 0 12px;
        font-weight: 600;
    }

    &__badge {
        background-color: #5f9ea0;
        color: #fff;
        padding: 5px 10px;
        border-radius: 15px;
        margin-right: 6px;
    }
}

.fcom-mf-mobile-app-guide {
    position: relative;
    width: 100%;

    &__img {
        width: 100%;
        display: block;
        border-radius: 4px;
        vertical-align: top;
    }

    &__steps {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        text-align: center;
        color: #000;
    }

    &__step {
        position: absolute;
        width: 33%;
        font-size: 14px;
        line-height: 1.4;
        font-weight: 600;
        margin: 0;
        box-sizing: border-box;
        padding: 0 4px;

        p {
            margin: 0;
        }

        &--1 {
            top: 57%;
            left: 3%;
            transform: translateY(-50%);
        }

        &--2 {
            top: 57%;
            left: 35%;
            transform: translateY(-50%);
        }

        &--done {
            top: 57%;
            right: 1%;
            left: auto;
            transform: translateY(-50%);
        }
    }

    &__badge {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;

        &--1 {
            left: 6.8%;
            top: 24.5%;
        }

        &--2 {
            left: 38%;
            top: 71%;
        }

        &--done {
            left: 69.6%;
            top: 24%;
        }
    }
}

.fcom-mf-mobile-app-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
}

.fcom-mf-mobile-app-stores {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: center;
    align-items: flex-start;
}

.fcom-mf-mobile-app-store {
    display: block;
    text-decoration: none;
    color: inherit;

    &__img {
        width: 177px;
        height: 177px;
        display: block;
        border-radius: 4px;
    }

    &__label {
        text-align: center;
        margin: 8px 0 0;
    }

    &__icon {
        width: 100px;
        display: block;
        margin: 0 auto;
    }
}

.fcom-mf-mobile-app-qr {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 120px;

    &__img {
        width: 177px;
        height: 177px;
        display: block;
        border-radius: 4px;
        margin: 0 auto 24px;
    }

    &__msg {
        text-align: center;
        margin: 0;
        color: $text-secondary;
    }
}
</style>
