import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface CurrentUser {
    id: number;
    name: string;
    avatar: string;
    email: string;
}

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref<CurrentUser | null>(null);
    const isLoggedIn = ref(false);

    // Getters
    const currentUser = computed(() => user.value);
    const userId = computed(() => user.value?.id);
    const userName = computed(() => user.value?.name);
    const userAvatar = computed(() => user.value?.avatar);

    // Actions
    function initialize(): void {
        const config = window.fcomModernFeed;
        isLoggedIn.value = config.isLoggedIn;
        user.value = config.user;
    }

    function requireAuth(): boolean {
        if (!isLoggedIn.value) {
            window.location.href = window.fcomModernFeed.loginUrl;
            return false;
        }
        return true;
    }

    function canCreatePost(): boolean {
        return window.fcomModernFeed.features.createPost;
    }

    function canUploadMedia(): boolean {
        return window.fcomModernFeed.features.mediaUpload;
    }

    return {
        // State
        user,
        isLoggedIn,

        // Getters
        currentUser,
        userId,
        userName,
        userAvatar,

        // Actions
        initialize,
        requireAuth,
        canCreatePost,
        canUploadMedia,
    };
});
