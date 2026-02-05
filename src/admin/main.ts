import { createApp } from 'vue';
import AdminApp from './App.vue';

const el = document.getElementById('fcom-mf-admin-app');
if (el) {
    createApp(AdminApp).mount(el);
}


// Remove all elements before the Fluent Mailbox app container
document.addEventListener('DOMContentLoaded', function () {
    const app = document.getElementById('fcom-modern-dashboard-app');
    const container = document.getElementById('wpbody-content');

    if (!app || !container) return;

    // Find the direct child of wpbody-content that contains the app
    let target = app.closest('#wpbody-content > div');

    if (!target) return;

    // Remove all elements before the target
    let prev = target.previousElementSibling;
    while (prev) {
        const toRemove = prev;
        prev = prev.previousElementSibling;
        toRemove.remove();
    }
});