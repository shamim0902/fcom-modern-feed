import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

export const useUiStore = defineStore('ui', () => {
    // State
    const layout = ref<'card' | 'compact'>('card');
    const lightboxOpen = ref(false);
    const lightboxImages = ref<string[]>([]);
    const lightboxIndex = ref(0);
    const toasts = ref<Toast[]>([]);
    const createPostModalOpen = ref(false);
    const scrollPositions = ref<Record<string, number>>({});
    /** Unread notification count for sidebar/mobile nav badge */
    const notificationUnreadCount = ref(0);

    // Getters
    const currentLayout = computed(() => layout.value);
    const isLightboxOpen = computed(() => lightboxOpen.value);
    const currentLightboxImages = computed(() => lightboxImages.value);
    const currentLightboxIndex = computed(() => lightboxIndex.value);
    const activeToasts = computed(() => toasts.value);
    const isCreatePostModalOpen = computed(() => createPostModalOpen.value);

    // Actions
    function setLayout(newLayout: 'card' | 'compact'): void {
        layout.value = newLayout;
    }

    function openLightbox(images: string[], index = 0): void {
        lightboxImages.value = images;
        lightboxIndex.value = index;
        lightboxOpen.value = true;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox(): void {
        lightboxOpen.value = false;
        document.body.style.overflow = '';
    }

    function setLightboxIndex(index: number): void {
        if (index >= 0 && index < lightboxImages.value.length) {
            lightboxIndex.value = index;
        }
    }

    function nextLightboxImage(): void {
        if (lightboxIndex.value < lightboxImages.value.length - 1) {
            lightboxIndex.value += 1;
        }
    }

    function prevLightboxImage(): void {
        if (lightboxIndex.value > 0) {
            lightboxIndex.value -= 1;
        }
    }

    function showToast(toast: Omit<Toast, 'id'>): void {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 3000,
        };

        toasts.value.push(newToast);

        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }
    }

    function removeToast(id: string): void {
        toasts.value = toasts.value.filter((t) => t.id !== id);
    }

    function showSuccess(message: string): void {
        showToast({ type: 'success', message });
    }

    function showError(message: string): void {
        showToast({ type: 'error', message, duration: 5000 });
    }

    function showInfo(message: string): void {
        showToast({ type: 'info', message });
    }

    function openCreatePostModal(): void {
        createPostModalOpen.value = true;
    }

    function closeCreatePostModal(): void {
        createPostModalOpen.value = false;
    }

    function saveScrollPosition(key: string): void {
        scrollPositions.value[key] = window.scrollY;
    }

    function getScrollPosition(key: string): number {
        return scrollPositions.value[key] || 0;
    }

    function setNotificationUnreadCount(count: number): void {
        notificationUnreadCount.value = Math.max(0, count);
    }

    function t(key: string, ...args: (string | number)[]): string {
        let text = window.fcomModernFeed?.i18n?.[key] || key;

        // Simple sprintf-like replacement
        if (args.length > 0) {
            args.forEach((arg) => {
                text = text.replace(/%[sd]/, String(arg));
            });
        }

        return text;
    }

    return {
        // State
        layout,
        lightboxOpen,
        lightboxImages,
        lightboxIndex,
        toasts,
        createPostModalOpen,
        scrollPositions,
        notificationUnreadCount,

        // Getters
        currentLayout,
        isLightboxOpen,
        currentLightboxImages,
        currentLightboxIndex,
        activeToasts,
        isCreatePostModalOpen,

        // Actions
        setLayout,
        openLightbox,
        closeLightbox,
        setLightboxIndex,
        nextLightboxImage,
        prevLightboxImage,
        showToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        openCreatePostModal,
        closeCreatePostModal,
        saveScrollPosition,
        getScrollPosition,
        setNotificationUnreadCount,
        t,
    };
});
