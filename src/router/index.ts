import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// Lazy load views for better performance
const FeedView = () => import('@/views/FeedView.vue');
const SinglePostView = () => import('@/views/SinglePostView.vue');

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
