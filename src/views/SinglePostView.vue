<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, useFeedStore } from '@/stores';
import type { Feed } from '@/stores/feed';
import FeedItem from '@/components/feed/FeedItem.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const feedStore = useFeedStore();

const post = ref<Feed | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const postId = computed(() => {
    const id = route.params.id;
    return typeof id === 'string' ? parseInt(id, 10) : null;
});

const postSlug = computed(() => {
    const slug = route.params.slug;
    return typeof slug === 'string' ? slug : null;
});

const loginUrlWithRedirect = computed(() => {
    const base = authStore.loginUrl;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}redirect_to=${encodeURIComponent(window.location.href)}`;
});

async function fetchPost() {
    if (!authStore.isLoggedIn) {
        loading.value = false;
        return;
    }
    // Check if we have an ID or slug
    if (!postId.value && !postSlug.value) {
        error.value = 'Invalid post';
        loading.value = false;
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        let fetchedPost: Feed | null = null;

        if (postId.value) {
            fetchedPost = await feedStore.fetchSinglePost(postId.value);
        } else if (postSlug.value) {
            fetchedPost = await feedStore.fetchSinglePostBySlug(postSlug.value);
        }

        if (fetchedPost) {
            post.value = fetchedPost;
        } else {
            error.value = 'Post not found';
        }
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to load post';
    } finally {
        loading.value = false;
    }
}

function goBack() {
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push('/');
    }
}

onMounted(() => {
    fetchPost();
});

watch([() => route.params.id, () => route.params.slug], () => {
    fetchPost();
});
</script>

<template>
    <div class="fcom-mf-single-post">
        <!-- Back button -->
        <div class="fcom-mf-single-post__header">
            <button class="fcom-mf-single-post__back" @click="goBack">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Back to Feed</span>
            </button>
        </div>

        <!-- Guest: login required modal -->
        <div v-if="!authStore.isLoggedIn" class="fcom-mf-single-post__login-card">
            <div class="fcom-mf-single-post__login-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>
            <h2 class="fcom-mf-single-post__login-title">Log in to view this post</h2>
            <p class="fcom-mf-single-post__login-text">
                Sign in to your account to read this post and join the conversation.
            </p>
            <div class="fcom-mf-single-post__login-actions">
                <a
                    :href="loginUrlWithRedirect"
                    class="fcom-mf-single-post__login-btn fcom-mf-single-post__login-btn--primary"
                >
                    Log in
                </a>
                <button
                    type="button"
                    class="fcom-mf-single-post__login-btn fcom-mf-single-post__login-btn--secondary"
                    @click="goBack"
                >
                    Back to Feed
                </button>
            </div>
        </div>

        <!-- Loading state -->
        <div v-else-if="loading" class="fcom-mf-single-post__loading">
            <div class="fcom-mf-skeleton-card">
                <div class="fcom-mf-skeleton-header">
                    <div class="fcom-mf-skeleton-avatar"></div>
                    <div class="fcom-mf-skeleton-lines">
                        <div class="fcom-mf-skeleton-line" style="width: 40%"></div>
                        <div class="fcom-mf-skeleton-line" style="width: 25%"></div>
                    </div>
                </div>
                <div class="fcom-mf-skeleton-content">
                    <div class="fcom-mf-skeleton-line"></div>
                    <div class="fcom-mf-skeleton-line" style="width: 80%"></div>
                    <div class="fcom-mf-skeleton-line" style="width: 60%"></div>
                </div>
            </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="fcom-mf-single-post__error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2>{{ error }}</h2>
            <p>The post you're looking for might have been removed or is not available.</p>
            <button class="fcom-mf-btn fcom-mf-btn--primary" @click="goBack">
                Go Back to Feed
            </button>
        </div>

        <!-- Post content -->
        <template v-else-if="post">
            <FeedItem
                :feed="post"
                :show-full-content="true"
                :show-comments-inline="true"
            />
        </template>
    </div>
</template>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.fcom-mf-single-post {
    width: 100%;

    // Hide dividers in single post view
    :deep(.fcom-mf-divider) {
        display: none;
    }

    &__header {
        margin-bottom: $spacing-md;
    }

    &__back {
        display: inline-flex;
        align-items: center;
        gap: $spacing-sm;
        padding: $spacing-sm $spacing-md;
        border: none;
        background: $white;
        border-radius: $border-radius-md;
        color: $text-primary;
        font-size: $font-size-md;
        font-weight: $font-weight-medium;
        cursor: pointer;
        transition: background-color $transition-fast;
        box-shadow: $shadow-sm;

        &:hover {
            background: $gray-50;
        }

        svg {
            color: $text-secondary;
        }
    }

    &__loading {
        .fcom-mf-skeleton-card {
            background: $white;
            border-radius: $border-radius-md;
            padding: $spacing-lg;
            box-shadow: $shadow-sm;
        }

        .fcom-mf-skeleton-header {
            display: flex;
            gap: $spacing-md;
            margin-bottom: $spacing-lg;
        }

        .fcom-mf-skeleton-avatar {
            width: 48px;
            height: 48px;
            border-radius: $border-radius-full;
            background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }

        .fcom-mf-skeleton-lines {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: $spacing-sm;
            justify-content: center;
        }

        .fcom-mf-skeleton-line {
            height: 14px;
            border-radius: $border-radius-sm;
            background: linear-gradient(90deg, $gray-100 25%, $gray-200 50%, $gray-100 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }

        .fcom-mf-skeleton-content {
            display: flex;
            flex-direction: column;
            gap: $spacing-md;
        }
    }

    &__login-card {
        background: $white;
        border-radius: $border-radius-lg;
        padding: $spacing-xxxl;
        text-align: center;
        box-shadow: $shadow-md;
        max-width: 420px;
        margin: 0 auto;
    }

    &__login-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        height: 96px;
        margin: 0 auto $spacing-xl;
        border-radius: $border-radius-full;
        background: linear-gradient(135deg, $gray-50 0%, $gray-100 100%);
        color: $primary-color;
    }

    &__login-title {
        font-size: $font-size-xxl;
        font-weight: $font-weight-bold;
        color: $text-primary;
        margin: 0 0 $spacing-md;
        line-height: $line-height-tight;
    }

    &__login-text {
        font-size: $font-size-md;
        color: $text-secondary;
        line-height: $line-height-relaxed;
        margin: 0 0 $spacing-xl;
    }

    &__login-actions {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
    }

    &__login-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: $spacing-md $spacing-xl;
        border-radius: $border-radius-md;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        text-decoration: none;
        cursor: pointer;
        transition: background $transition-fast, transform $transition-instant;
        border: none;
        font-family: inherit;

        &--primary {
            background: $primary-color;
            color: $white;

            &:hover {
                background: $primary-hover;
            }
        }

        &--secondary {
            background: $gray-100;
            color: $text-primary;

            &:hover {
                background: $gray-200;
            }
        }
    }

    &__error {
        background: $white;
        border-radius: $border-radius-md;
        padding: $spacing-xl * 2;
        text-align: center;
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
            margin: 0 0 $spacing-lg;
        }
    }

}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
