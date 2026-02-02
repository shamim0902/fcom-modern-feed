import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// Lazy load views for better performance
const FeedView = () => import('@/views/FeedView.vue');
const SinglePostView = () => import('@/views/SinglePostView.vue');
const MembersView = () => import('@/views/MembersView.vue');
const SpacesView = () => import('@/views/SpacesView.vue');
const SpaceView = () => import('@/views/SpaceView.vue');
const ProfileView = () => import('@/views/ProfileView.vue');
const EditProfileView = () => import('@/views/EditProfileView.vue');
const NotificationsView = () => import('@/views/NotificationsView.vue');
const BookmarksView = () => import('@/views/BookmarksView.vue');
const LeaderboardView = () => import('@/views/LeaderboardView.vue');

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'feed',
        component: FeedView,
    },
    {
        path: '/post/:id',
        name: 'single-post',
        component: SinglePostView,
        props: true,
    },
    {
        path: '/post/s/:slug',
        name: 'single-post-slug',
        component: SinglePostView,
        props: true,
    },
    {
        path: '/members',
        name: 'members',
        component: MembersView,
    },
    {
        path: '/spaces',
        name: 'spaces',
        component: SpacesView,
    },
    {
        path: '/space/:slug',
        name: 'space',
        component: SpaceView,
        props: true,
    },
    {
        path: '/u/:username',
        name: 'profile',
        component: ProfileView,
        props: true,
    },
    {
        path: '/u/:username/edit',
        name: 'edit-profile',
        component: EditProfileView,
        props: true,
    },
    {
        path: '/notifications',
        name: 'notifications',
        component: NotificationsView,
    },
    {
        path: '/bookmarks',
        name: 'bookmarks',
        component: BookmarksView,
    },
    {
        path: '/leaderboard',
        name: 'leaderboard',
        component: LeaderboardView,
    },
    // Catch-all route - redirect to feed
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    },
];

export function createAppRouter(basePath: string = '/') {
    return createRouter({
        history: createWebHistory(basePath),
        routes,
        scrollBehavior(to, _from, savedPosition) {
            if (savedPosition) {
                return savedPosition;
            }
            if (to.hash) {
                return { el: to.hash };
            }
            return { top: 0 };
        },
    });
}
