<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores';

interface ProfileData {
    user_id: number;
    username: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    short_description?: string;
    avatar: string;
    cover_photo?: string;
    email?: string;
    website?: string;
    social_links?: Record<string, string>;
    can_change_username?: boolean;
    can_change_email?: boolean;
}

interface SocialPlatform {
    key: string;
    label: string;
    placeholder: string;
    icon: string;
}

const socialPlatforms: SocialPlatform[] = [
    { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/username', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username', icon: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel', icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username', icon: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
];

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const uploadingAvatar = ref(false);
const uploadingCover = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const profile = ref<ProfileData | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const coverInput = ref<HTMLInputElement | null>(null);

// Form fields
const formData = ref({
    first_name: '',
    last_name: '',
    short_description: '',
    website: '',
    username: '',
    email: '',
    social_links: {} as Record<string, string>,
});

const username = computed(() => route.params.username as string);

const isOwnProfile = computed(() => {
    if (!profile.value || !authStore.isLoggedIn) return false;
    return profile.value.user_id === authStore.userId;
});

async function fetchProfile(): Promise<void> {
    if (!username.value) {
        error.value = 'No username provided';
        loading.value = false;
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const response = await api.get<{ profile: ProfileData }>(`profile/${encodeURIComponent(username.value)}`);
        profile.value = response.profile;

        // Check if user can edit this profile
        if (!isOwnProfile.value) {
            error.value = 'You can only edit your own profile';
            return;
        }

        // Populate form data
        const nameParts = (profile.value.display_name || '').split(' ');
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ') || lastName;

        formData.value = {
            first_name: profile.value.first_name || firstName,
            last_name: profile.value.last_name || (nameParts.length > 0 ? lastName : ''),
            short_description: profile.value.short_description || '',
            website: profile.value.website || '',
            username: profile.value.username || '',
            email: profile.value.email || '',
            social_links: profile.value.social_links ? { ...profile.value.social_links } : {},
        };
    } catch (e: unknown) {
        console.error('Profile fetch error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to load profile';
        }
    } finally {
        loading.value = false;
    }
}

async function saveProfile(): Promise<void> {
    if (!profile.value || saving.value) return;

    saving.value = true;
    error.value = null;
    successMessage.value = null;

    try {
        // Filter out empty social links
        const filteredSocialLinks: Record<string, string> = {};
        Object.entries(formData.value.social_links).forEach(([key, value]) => {
            if (value && value.trim()) {
                filteredSocialLinks[key] = value.trim();
            }
        });

        const response = await api.post<{ message: string }>(`profile/${profile.value.username}`, {
            data: {
                first_name: formData.value.first_name,
                last_name: formData.value.last_name,
                short_description: formData.value.short_description,
                website: formData.value.website,
                username: formData.value.username,
                email: formData.value.email,
                social_links: filteredSocialLinks,
            }
        });

        successMessage.value = response.message || 'Profile updated successfully';

        // If username changed, redirect to new profile URL
        if (formData.value.username !== profile.value.username) {
            setTimeout(() => {
                router.push(`/u/${formData.value.username}`);
            }, 1500);
        }
    } catch (e: unknown) {
        console.error('Profile save error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to save profile';
        }
    } finally {
        saving.value = false;
    }
}

function goBack(): void {
    router.push(`/u/${username.value}`);
}

function navigateToMembers(): void {
    router.push({ name: 'members' });
}

function triggerAvatarUpload(): void {
    avatarInput.value?.click();
}

function triggerCoverUpload(): void {
    coverInput.value?.click();
}

async function handleAvatarUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !profile.value) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        error.value = 'Please select an image file';
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        error.value = 'Image size must be less than 5MB';
        return;
    }

    uploadingAvatar.value = true;
    error.value = null;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', 'user_avatar');

        const response = await api.uploadFile('feeds/media-upload', formData);

        if (response.media?.url) {
            await api.put(`profile/${profile.value.username}`, { data: { avatar: response.media.url } });
            profile.value.avatar = response.media.url;
            successMessage.value = 'Avatar updated successfully';
        }
    } catch (e: unknown) {
        console.error('Avatar upload error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to upload avatar';
        }
    } finally {
        uploadingAvatar.value = false;
        input.value = '';
    }
}

async function handleCoverUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !profile.value) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        error.value = 'Please select an image file';
        return;
    }

    // Validate file size (max 10MB for cover)
    if (file.size > 10 * 1024 * 1024) {
        error.value = 'Image size must be less than 10MB';
        return;
    }

    uploadingCover.value = true;
    error.value = null;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', 'user_cover_photo');

        const response = await api.uploadFile('feeds/media-upload', formData);

        if (response.media?.url) {
            await api.put(`profile/${profile.value.username}`, { data: { cover_photo: response.media.url } });
            profile.value.cover_photo = response.media.url;
            successMessage.value = 'Cover photo updated successfully';
        }
    } catch (e: unknown) {
        console.error('Cover upload error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to upload cover photo';
        }
    } finally {
        uploadingCover.value = false;
        input.value = '';
    }
}

async function removeAvatar(): Promise<void> {
    if (!profile.value) return;

    uploadingAvatar.value = true;
    error.value = null;

    try {
        await api.put(`profile/${profile.value.username}`, { data: { avatar: '' } });
        profile.value.avatar = '';
        successMessage.value = 'Avatar removed successfully';
    } catch (e: unknown) {
        console.error('Avatar remove error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to remove avatar';
        }
    } finally {
        uploadingAvatar.value = false;
    }
}

async function removeCover(): Promise<void> {
    if (!profile.value) return;

    uploadingCover.value = true;
    error.value = null;

    try {
        await api.put(`profile/${profile.value.username}`, { data: { cover_photo: '' } });
        profile.value.cover_photo = '';
        successMessage.value = 'Cover photo removed successfully';
    } catch (e: unknown) {
        console.error('Cover remove error:', e);
        if (e && typeof e === 'object' && 'message' in e) {
            error.value = (e as { message: string }).message;
        } else {
            error.value = 'Failed to remove cover photo';
        }
    } finally {
        uploadingCover.value = false;
    }
}

onMounted(() => {
    fetchProfile();
});
</script>

<template>
    <div class="fcom-mf-edit-profile">
        <!-- Breadcrumb -->
        <div class="fcom-mf-edit-profile__header">
            <div class="fcom-mf-edit-profile__breadcrumb">
                <button @click="navigateToMembers" class="fcom-mf-breadcrumb__link">Members</button>
                <span class="fcom-mf-breadcrumb__separator">/</span>
                <button @click="goBack" class="fcom-mf-breadcrumb__link">My Profile</button>
                <span class="fcom-mf-breadcrumb__separator">/</span>
                <span class="fcom-mf-breadcrumb__current">Edit Profile</span>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="fcom-mf-edit-profile__loading">
            <div class="fcom-mf-spinner"></div>
            <p>Loading profile...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error && !profile" class="fcom-mf-error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>{{ error }}</h2>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back
            </button>
        </div>

        <!-- Edit Form -->
        <div v-else-if="profile" class="fcom-mf-edit-profile__form-container">
            <!-- Success Message -->
            <div v-if="successMessage" class="fcom-mf-alert fcom-mf-alert--success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {{ successMessage }}
            </div>

            <!-- Error Message -->
            <div v-if="error" class="fcom-mf-alert fcom-mf-alert--error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {{ error }}
            </div>

            <form @submit.prevent="saveProfile" class="fcom-mf-edit-profile__form">
                <!-- Hidden file inputs -->
                <input
                    ref="avatarInput"
                    type="file"
                    accept="image/*"
                    class="fcom-mf-hidden-input"
                    @change="handleAvatarUpload"
                />
                <input
                    ref="coverInput"
                    type="file"
                    accept="image/*"
                    class="fcom-mf-hidden-input"
                    @change="handleCoverUpload"
                />

                <!-- Cover Photo -->
                <div class="fcom-mf-form-section">
                    <h3>Cover Photo</h3>
                    <div class="fcom-mf-cover-upload">
                        <div class="fcom-mf-cover-preview" :class="{ 'has-cover': profile.cover_photo }">
                            <img v-if="profile.cover_photo" :src="profile.cover_photo" alt="Cover photo" />
                            <div v-else class="fcom-mf-cover-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span>No cover photo</span>
                            </div>
                            <div v-if="uploadingCover" class="fcom-mf-upload-overlay">
                                <div class="fcom-mf-spinner fcom-mf-spinner--sm"></div>
                            </div>
                        </div>
                        <div class="fcom-mf-cover-actions">
                            <button type="button" class="fcom-mf-btn fcom-mf-btn--sm fcom-mf-btn--outline" @click="triggerCoverUpload" :disabled="uploadingCover">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Upload Cover
                            </button>
                            <button v-if="profile.cover_photo" type="button" class="fcom-mf-btn fcom-mf-btn--sm fcom-mf-btn--danger-outline" @click="removeCover" :disabled="uploadingCover">
                                Remove
                            </button>
                        </div>
                        <small>Recommended size: 1200x400 pixels. Max 10MB.</small>
                    </div>
                </div>

                <!-- Avatar -->
                <div class="fcom-mf-form-section">
                    <h3>Profile Photo</h3>
                    <div class="fcom-mf-avatar-upload">
                        <div class="fcom-mf-avatar-preview-large">
                            <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.display_name" />
                            <div v-else class="fcom-mf-avatar-placeholder">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div v-if="uploadingAvatar" class="fcom-mf-upload-overlay fcom-mf-upload-overlay--round">
                                <div class="fcom-mf-spinner fcom-mf-spinner--sm"></div>
                            </div>
                        </div>
                        <div class="fcom-mf-avatar-info">
                            <span class="fcom-mf-avatar-preview__name">{{ profile.display_name }}</span>
                            <span class="fcom-mf-avatar-preview__username">@{{ profile.username }}</span>
                            <div class="fcom-mf-avatar-actions">
                                <button type="button" class="fcom-mf-btn fcom-mf-btn--sm fcom-mf-btn--outline" @click="triggerAvatarUpload" :disabled="uploadingAvatar">
                                    Change Photo
                                </button>
                                <button v-if="profile.avatar" type="button" class="fcom-mf-btn fcom-mf-btn--sm fcom-mf-btn--danger-outline" @click="removeAvatar" :disabled="uploadingAvatar">
                                    Remove
                                </button>
                            </div>
                            <small>Square image recommended. Max 5MB.</small>
                        </div>
                    </div>
                </div>

                <!-- Name Fields -->
                <div class="fcom-mf-form-section">
                    <h3>Basic Information</h3>
                    <div class="fcom-mf-form-row">
                        <div class="fcom-mf-form-group">
                            <label for="first_name">First Name <span class="required">*</span></label>
                            <input
                                id="first_name"
                                v-model="formData.first_name"
                                type="text"
                                required
                                placeholder="Enter your first name"
                            />
                        </div>
                        <div class="fcom-mf-form-group">
                            <label for="last_name">Last Name</label>
                            <input
                                id="last_name"
                                v-model="formData.last_name"
                                type="text"
                                placeholder="Enter your last name"
                            />
                        </div>
                    </div>

                    <div v-if="profile.can_change_username" class="fcom-mf-form-group">
                        <label for="username">Username</label>
                        <div class="fcom-mf-input-prefix">
                            <span>@</span>
                            <input
                                id="username"
                                v-model="formData.username"
                                type="text"
                                placeholder="username"
                            />
                        </div>
                        <small>Only letters, numbers, underscores and dashes allowed</small>
                    </div>

                    <div v-if="profile.can_change_email" class="fcom-mf-form-group">
                        <label for="email">Email Address</label>
                        <input
                            id="email"
                            v-model="formData.email"
                            type="email"
                            placeholder="your@email.com"
                        />
                    </div>
                </div>

                <!-- Bio -->
                <div class="fcom-mf-form-section">
                    <h3>About</h3>
                    <div class="fcom-mf-form-group">
                        <label for="short_description">Bio</label>
                        <textarea
                            id="short_description"
                            v-model="formData.short_description"
                            rows="4"
                            placeholder="Tell us about yourself..."
                        ></textarea>
                    </div>

                    <div class="fcom-mf-form-group">
                        <label for="website">Website</label>
                        <input
                            id="website"
                            v-model="formData.website"
                            type="url"
                            placeholder="https://yourwebsite.com"
                        />
                    </div>
                </div>

                <!-- Social Links -->
                <div class="fcom-mf-form-section">
                    <h3>Social Links</h3>
                    <p class="fcom-mf-form-section__description">Add your social media profiles to help others connect with you.</p>

                    <div class="fcom-mf-social-links">
                        <div v-for="platform in socialPlatforms" :key="platform.key" class="fcom-mf-form-group fcom-mf-social-link-group">
                            <label :for="`social_${platform.key}`">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path :d="platform.icon"/>
                                </svg>
                                {{ platform.label }}
                            </label>
                            <input
                                :id="`social_${platform.key}`"
                                v-model="formData.social_links[platform.key]"
                                type="url"
                                :placeholder="platform.placeholder"
                            />
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="fcom-mf-form-actions">
                    <button type="button" class="fcom-mf-btn fcom-mf-btn--outline" @click="goBack">
                        Cancel
                    </button>
                    <button type="submit" class="fcom-mf-btn fcom-mf-btn--primary" :disabled="saving">
                        <span v-if="saving">Saving...</span>
                        <span v-else>Save Changes</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-edit-profile {
    width: 100%;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $spacing-md;
        padding: $spacing-md;
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;
    }

    &__breadcrumb {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        font-size: $font-size-sm;
    }

    &__loading {
        text-align: center;
        padding: $spacing-xxxl;
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;

        p {
            margin-top: $spacing-md;
            color: $text-secondary;
        }
    }

    &__form-container {
        background: $white;
        border-radius: $border-radius-lg;
        box-shadow: $shadow-sm;
        padding: $spacing-xl;
    }

    &__form {
        max-width: 600px;
        margin: 0 auto;
    }
}

.fcom-mf-breadcrumb {
    &__link {
        color: $primary-color;
        background: none;
        border: none;
        padding: 0;
        font-size: inherit;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    &__separator {
        color: $text-tertiary;
    }

    &__current {
        color: $text-secondary;
        font-weight: $font-weight-medium;
    }
}

.fcom-mf-alert {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    border-radius: $border-radius-md;
    margin-bottom: $spacing-lg;
    font-size: $font-size-sm;

    &--success {
        background: rgba($success-color, 0.1);
        color: darken($success-color, 10%);

        svg {
            color: $success-color;
        }
    }

    &--error {
        background: rgba($error-color, 0.1);
        color: darken($error-color, 10%);

        svg {
            color: $error-color;
        }
    }
}

.fcom-mf-hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.fcom-mf-form-section {
    margin-bottom: $spacing-xl;
    padding-bottom: $spacing-xl;
    border-bottom: 1px solid $border-color;

    &:last-of-type {
        border-bottom: none;
        margin-bottom: $spacing-lg;
    }

    h3 {
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $spacing-lg;
    }

    &__description {
        font-size: $font-size-sm;
        color: $text-tertiary;
        margin: -$spacing-sm 0 $spacing-lg;
    }
}

.fcom-mf-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;

    @media (max-width: $breakpoint-sm) {
        grid-template-columns: 1fr;
    }
}

.fcom-mf-form-group {
    margin-bottom: $spacing-md;

    &:last-child {
        margin-bottom: 0;
    }

    label {
        display: block;
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        color: $text-secondary;
        margin-bottom: $spacing-xs;

        .required {
            color: $error-color;
        }
    }

    input,
    textarea {
        width: 100%;
        padding: $spacing-sm $spacing-md;
        border: 1px solid $border-color;
        border-radius: $border-radius-md;
        font-size: $font-size-md;
        font-family: inherit;
        color: $text-primary;
        transition: border-color $transition-fast, box-shadow $transition-fast;

        &::placeholder {
            color: $text-tertiary;
        }

        &:focus {
            outline: none;
            border-color: $primary-color;
            box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
        }
    }

    textarea {
        resize: vertical;
        min-height: 100px;
    }

    small {
        display: block;
        margin-top: $spacing-xs;
        font-size: $font-size-xs;
        color: $text-tertiary;
    }
}

.fcom-mf-input-prefix {
    display: flex;
    align-items: center;
    border: 1px solid $border-color;
    border-radius: $border-radius-md;
    overflow: hidden;
    transition: border-color $transition-fast, box-shadow $transition-fast;

    &:focus-within {
        border-color: $primary-color;
        box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
    }

    span {
        padding: $spacing-sm $spacing-md;
        background: $gray-50;
        color: $text-tertiary;
        border-right: 1px solid $border-color;
    }

    input {
        border: none;
        border-radius: 0;

        &:focus {
            box-shadow: none;
        }
    }
}

// Cover Photo Upload
.fcom-mf-cover-upload {
    small {
        display: block;
        margin-top: $spacing-sm;
        font-size: $font-size-xs;
        color: $text-tertiary;
    }
}

.fcom-mf-cover-preview {
    position: relative;
    width: 100%;
    height: 150px;
    background: $gray-100;
    border-radius: $border-radius-lg;
    overflow: hidden;
    margin-bottom: $spacing-md;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    &.has-cover {
        background: transparent;
    }
}

.fcom-mf-cover-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: $text-tertiary;

    svg {
        margin-bottom: $spacing-sm;
        opacity: 0.5;
    }

    span {
        font-size: $font-size-sm;
    }
}

.fcom-mf-cover-actions {
    display: flex;
    gap: $spacing-sm;
}

.fcom-mf-upload-overlay {
    position: absolute;
    inset: 0;
    background: rgba($white, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;

    &--round {
        border-radius: $border-radius-full;
    }
}

// Avatar Upload
.fcom-mf-avatar-upload {
    display: flex;
    align-items: flex-start;
    gap: $spacing-lg;
}

.fcom-mf-avatar-preview-large {
    position: relative;
    width: 100px;
    height: 100px;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        border-radius: $border-radius-full;
        object-fit: cover;
    }
}

.fcom-mf-avatar-placeholder {
    width: 100%;
    height: 100%;
    border-radius: $border-radius-full;
    background: $gray-100;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-tertiary;
}

.fcom-mf-avatar-info {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    small {
        font-size: $font-size-xs;
        color: $text-tertiary;
        margin-top: $spacing-xs;
    }
}

.fcom-mf-avatar-actions {
    display: flex;
    gap: $spacing-sm;
    margin-top: $spacing-sm;
}

.fcom-mf-avatar-preview {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    img {
        width: 80px;
        height: 80px;
        border-radius: $border-radius-full;
        object-fit: cover;
    }

    &__info {
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;
    }

    &__name {
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    &__username {
        font-size: $font-size-sm;
        color: $text-tertiary;
    }
}

// Social Links
.fcom-mf-social-links {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
}

.fcom-mf-social-link-group {
    label {
        display: flex;
        align-items: center;
        gap: $spacing-sm;

        svg {
            color: $text-tertiary;
        }
    }
}

.fcom-mf-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-md;
    padding-top: $spacing-lg;
    border-top: 1px solid $border-color;
}

.fcom-mf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;
    text-decoration: none;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &--sm {
        padding: $spacing-xs $spacing-md;
        font-size: $font-size-sm;
    }

    &--primary {
        background: $primary-color;
        color: $white;

        &:hover:not(:disabled) {
            background: $primary-hover;
        }
    }

    &--outline {
        background: $white;
        border: 1px solid $border-color;
        color: $text-primary;

        &:hover:not(:disabled) {
            background: $gray-50;
        }
    }

    &--danger-outline {
        background: $white;
        border: 1px solid $error-color;
        color: $error-color;

        &:hover:not(:disabled) {
            background: rgba($error-color, 0.05);
        }
    }
}

.fcom-mf-error-state {
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
        margin: 0 0 $spacing-lg;
    }
}

.fcom-mf-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid $gray-200;
    border-top-color: $primary-color;
    border-radius: $border-radius-full;
    animation: spin 1s linear infinite;
    margin: 0 auto;

    &--sm {
        width: 24px;
        height: 24px;
        border-width: 2px;
    }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
