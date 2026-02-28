import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Feed, Comment } from '@/api/types';

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
    // Blank avatar for logged-out users (gray circle with person silhouette)
    const defaultAvatarUrl =
        "data:image/svg+xml," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#e5e7eb"/><circle cx="12" cy="8" r="3" fill="#9ca3af"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>'
        );
    const userAvatar = computed(() => user.value?.avatar || defaultAvatarUrl);
    const loginUrl = computed(() => window.fcomModernFeed?.loginUrl || '/wp-login.php');
    const registerUrl = computed(() => window.fcomModernFeed?.registerUrl || '');
    const logoutUrl = computed(() => window.fcomModernFeed?.logoutUrl || '/wp-login.php?action=logout');
    const canAccessAdminSettings = computed(() => window.fcomModernFeed?.features?.adminSettings || false);
    const adminSettingsUrl = computed(() => window.fcomModernFeed?.adminSettingsUrl || '/portal/admin/settings');

    // Actions
    function initialize(): void {
        const config = window.fcomModernFeed;
        if (!config) {
            isLoggedIn.value = false;
            user.value = null;
            return;
        }
        isLoggedIn.value = config.isLoggedIn ?? false;
        user.value = config.user ?? null;
    }

    function requireAuth(): boolean {
        if (!isLoggedIn.value) {
            window.location.href = window.fcomModernFeed?.loginUrl || '/wp-login.php';
            return false;
        }
        return true;
    }

    function hasInPermission(permission: string, allPermissions?: Record<string, boolean>): boolean {
        if (!allPermissions || typeof allPermissions !== 'object') {
            return false;
        }
        return !!allPermissions[permission];
    }

    function hasPermission(permission: string): boolean {
        return hasInPermission(permission, window.fcomModernFeed?.permissions);
    }

    function hasCurrentSpacePermission(permission: string): boolean {
        return hasInPermission(permission, window.fcom_current_community?.permissions);
    }

    function hasPermissionOrInCurrentSpace(permission: string): boolean {
        return hasPermission(permission) || hasCurrentSpacePermission(permission);
    }

    function canDeleteFeed(feed: Pick<Feed, 'user_id'>): boolean {
        const currentUserId = Number(userId.value || 0);
        if (!currentUserId) {
            return false;
        }

        return Number(feed.user_id) === currentUserId || hasPermissionOrInCurrentSpace('delete_any_feed');
    }

    function canEditFeed(feed: Pick<Feed, 'user_id'>): boolean {
        const currentUserId = Number(userId.value || 0);
        if (!currentUserId) {
            return false;
        }

        return Number(feed.user_id) === currentUserId || hasPermissionOrInCurrentSpace('edit_any_feed');
    }

    function canDeleteComment(comment: Pick<Comment, 'user_id'>): boolean {
        const currentUserId = Number(userId.value || 0);
        if (!currentUserId) {
            return false;
        }

        return Number(comment.user_id) === currentUserId || hasPermissionOrInCurrentSpace('delete_any_comment');
    }

    function canEditComment(comment: Pick<Comment, 'user_id'>): boolean {
        const currentUserId = Number(userId.value || 0);
        if (!currentUserId) {
            return false;
        }

        return Number(comment.user_id) === currentUserId || hasPermissionOrInCurrentSpace('edit_any_comment');
    }

    function canCreatePost(): boolean {
        return window.fcomModernFeed?.features?.createPost ?? false;
    }

    function canUploadMedia(): boolean {
        return window.fcomModernFeed?.features?.mediaUpload ?? false;
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
        registerUrl,
        logoutUrl,
        canAccessAdminSettings,
        adminSettingsUrl,

        // Actions
        initialize,
        requireAuth,
        hasInPermission,
        hasPermission,
        hasCurrentSpacePermission,
        hasPermissionOrInCurrentSpace,
        canDeleteFeed,
        canEditFeed,
        canDeleteComment,
        canEditComment,
        canCreatePost,
        canUploadMedia,
    };
});
