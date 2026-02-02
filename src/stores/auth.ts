import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface CurrentUser {
    id: number;
    name: string;
    username: string;
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
    const userUsername = computed(() => user.value?.username);
    const userAvatar = computed(() => user.value?.avatar);
    const loginUrl = computed(() => window.fcomModernFeed?.loginUrl || '/wp-login.php');
    const logoutUrl = computed(() => loginUrl.value + '?action=logout');
    const canAccessAdminSettings = computed(() => window.fcomModernFeed?.features?.adminSettings || false);
    const adminSettingsUrl = computed(() => window.fcomModernFeed?.adminSettingsUrl || '/portal/admin/settings');

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
        userUsername,
        userAvatar,
        loginUrl,
        logoutUrl,
        canAccessAdminSettings,
        adminSettingsUrl,

        // Actions
        initialize,
        requireAuth,
        canCreatePost,
        canUploadMedia,
    };
});
