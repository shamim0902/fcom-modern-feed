<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { Notification, NotificationsResponse } from '@/api/types';
import { useAuthStore } from '@/stores';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const router = useRouter();
const authStore = useAuthStore();

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const unreadCount = ref(0);

async function fetchNotifications(page = 1, append = false): Promise<void> {
    if (page === 1) {
        loading.value = true;
    } else {
        loadingMore.value = true;
    }

    try {
        const response = await api.get<NotificationsResponse>('notifications', {
            page,
            per_page: 20,
        });

        if (append) {
            notifications.value = [...notifications.value, ...response.notifications.data];
        } else {
            notifications.value = response.notifications.data;
        }

        hasMore.value = response.notifications.has_more;
        currentPage.value = response.notifications.current_page;
        unreadCount.value = response.unread_count || 0;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

function loadMore(): void {
    if (!loadingMore.value && hasMore.value) {
        fetchNotifications(currentPage.value + 1, true);
    }
}

async function markAsRead(notification: Notification): Promise<void> {
    if (notification.subscriber?.is_read) return;

    try {
        await api.post(`notifications/${notification.id}/read`);
        if (notification.subscriber) {
            notification.subscriber.is_read = 1;
        }
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (error) {
        console.error('Failed to mark as read:', error);
    }
}

async function markAllAsRead(): Promise<void> {
    try {
        await api.post('notifications/read-all');
        notifications.value.forEach(n => {
            if (n.subscriber) {
                n.subscriber.is_read = 1;
            }
        });
        unreadCount.value = 0;
    } catch (error) {
        console.error('Failed to mark all as read:', error);
    }
}

function handleNotificationClick(notification: Notification): void {
    markAsRead(notification);

    if (notification.feed_id) {
        router.push({ name: 'single-post', params: { id: notification.feed_id } });
    }
}

function goBack(): void {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push('/');
    }
}

function formatTime(date: string): string {
    return dayjs(date).fromNow();
}

function getNotificationIcon(type: string): string {
    switch (type) {
        case 'comment':
        case 'comment_reply':
            return 'comment';
        case 'reaction':
        case 'like':
            return 'heart';
        case 'mention':
            return 'at';
        case 'follow':
            return 'user-plus';
        default:
            return 'bell';
    }
}

onMounted(() => {
    if (!authStore.isLoggedIn) {
        router.push('/');
        return;
    }
    fetchNotifications();
});

const icons: Record<string, string> = {
    comment: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
    heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
    at: `<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>`,
    'user-plus': `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>`,
    bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
};
</script>

<template>
    <div class="fcom-mf-notifications-view">
        <!-- Header -->
        <div class="fcom-mf-notifications-header">
            <button @click="goBack" class="fcom-mf-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>

            <div class="fcom-mf-notifications-header__title">
                <h1>Notifications</h1>
                <span v-if="unreadCount > 0" class="fcom-mf-notifications-header__badge">
                    {{ unreadCount }} unread
                </span>
            </div>

            <button
                v-if="unreadCount > 0"
                class="fcom-mf-mark-read-btn"
                @click="markAllAsRead"
            >
                Mark all read
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-notifications-loading">
            <div v-for="i in 5" :key="i" class="fcom-mf-notification-skeleton">
                <div class="fcom-mf-notification-skeleton__avatar"></div>
                <div class="fcom-mf-notification-skeleton__content">
                    <div class="fcom-mf-notification-skeleton__text"></div>
                    <div class="fcom-mf-notification-skeleton__time"></div>
                </div>
            </div>
        </div>

        <!-- Notifications List -->
        <div v-else class="fcom-mf-notifications-list">
            <div
                v-for="notification in notifications"
                :key="notification.id"
                class="fcom-mf-notification-item"
                :class="{ 'fcom-mf-notification-item--unread': !notification.subscriber?.is_read }"
                @click="handleNotificationClick(notification)"
            >
                <div class="fcom-mf-notification-item__icon-wrapper">
                    <img
                        v-if="notification.xprofile?.avatar"
                        :src="notification.xprofile.avatar"
                        :alt="notification.xprofile.display_name"
                        class="fcom-mf-notification-item__avatar"
                    />
                    <div v-else class="fcom-mf-notification-item__icon">
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            v-html="icons[getNotificationIcon(notification.type)]"
                        ></svg>
                    </div>
                    <div class="fcom-mf-notification-item__type-badge" :class="`fcom-mf-notification-item__type-badge--${notification.type}`">
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            v-html="icons[getNotificationIcon(notification.type)]"
                        ></svg>
                    </div>
                </div>

                <div class="fcom-mf-notification-item__content">
                    <p class="fcom-mf-notification-item__text">
                        <strong v-if="notification.xprofile">{{ notification.xprofile.display_name }}</strong>
                        {{ notification.title }}
                    </p>
                    <span class="fcom-mf-notification-item__time">
                        {{ formatTime(notification.created_at) }}
                    </span>
                </div>

                <div v-if="!notification.subscriber?.is_read" class="fcom-mf-notification-item__unread-dot"></div>
            </div>
        </div>

        <!-- Load More -->
        <div v-if="!loading && hasMore" class="fcom-mf-load-more">
            <button
                class="fcom-mf-btn fcom-mf-btn--outline"
                :disabled="loadingMore"
                @click="loadMore"
            >
                <span v-if="loadingMore">Loading...</span>
                <span v-else>Load More</span>
            </button>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && notifications.length === 0" class="fcom-mf-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h2>No notifications yet</h2>
            <p>When you get notifications, they'll show up here.</p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-notifications-view {
    width: 100%;
}

.fcom-mf-notifications-header {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    background: $white;
    padding: $spacing-md $spacing-lg;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;
    margin-bottom: $spacing-md;

    &__title {
        flex: 1;
        display: flex;
        align-items: center;
        gap: $spacing-sm;

        h1 {
            font-size: $font-size-xl;
            font-weight: $font-weight-bold;
            color: $text-primary;
            margin: 0;
        }
    }

    &__badge {
        padding: 2px 8px;
        background: $primary-color;
        color: $white;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        border-radius: $border-radius-full;
    }
}

.fcom-mf-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: $gray-100;
    border-radius: $border-radius-full;
    color: $text-primary;
    cursor: pointer;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-200;
    }
}

.fcom-mf-mark-read-btn {
    padding: $spacing-sm $spacing-md;
    border: none;
    background: transparent;
    color: $primary-color;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
}

.fcom-mf-notifications-loading {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: $white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-notification-skeleton {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $white;

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    &__content {
        flex: 1;
    }

    &__text {
        height: 16px;
        width: 70%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: $spacing-xs;
    }

    &__time {
        height: 12px;
        width: 20%;
        border-radius: $border-radius-sm;
        background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
}

.fcom-mf-notifications-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: $border-color;
    border-radius: $border-radius-lg;
    overflow: hidden;
    box-shadow: $shadow-sm;
}

.fcom-mf-notification-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $white;
    cursor: pointer;
    transition: background-color $transition-fast;

    &:hover {
        background: $gray-50;
    }

    &--unread {
        background: rgba($primary-color, 0.03);

        &:hover {
            background: rgba($primary-color, 0.06);
        }
    }

    &__icon-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        object-fit: cover;
    }

    &__icon {
        width: 48px;
        height: 48px;
        border-radius: $border-radius-full;
        background: $gray-100;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $text-tertiary;
    }

    &__type-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 20px;
        height: 20px;
        border-radius: $border-radius-full;
        border: 2px solid $white;
        display: flex;
        align-items: center;
        justify-content: center;
        background: $primary-color;
        color: $white;

        &--comment,
        &--comment_reply {
            background: $primary-color;
        }

        &--reaction,
        &--like {
            background: $error-color;
        }

        &--mention {
            background: $warning-color;
        }

        &--follow {
            background: $success-color;
        }
    }

    &__content {
        flex: 1;
        min-width: 0;
    }

    &__text {
        font-size: $font-size-sm;
        color: $text-primary;
        margin: 0 0 2px;
        line-height: $line-height-normal;

        strong {
            font-weight: $font-weight-semibold;
        }
    }

    &__time {
        font-size: $font-size-xs;
        color: $text-tertiary;
    }

    &__unread-dot {
        width: 10px;
        height: 10px;
        background: $primary-color;
        border-radius: $border-radius-full;
        flex-shrink: 0;
    }
}

.fcom-mf-load-more {
    text-align: center;
    margin-top: $spacing-lg;
}

.fcom-mf-btn {
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover {
            background: $gray-50;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }
}

.fcom-mf-empty-state {
    text-align: center;
    padding: $spacing-xxxl;
    background: $white;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-sm;

    svg {
        color: $text-tertiary;
        margin-bottom: $spacing-lg;
    }

    h2 {
        font-size: $font-size-xl;
        color: $text-primary;
        margin: 0 0 $spacing-sm;
    }

    p {
        color: $text-secondary;
        margin: 0;
    }
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
