import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],

    // Use relative paths for production build so chunks can be found from the assets folder
    base: './',

    build: {
        manifest: true,
        outDir: 'assets',
        assetsDir: '.',
        emptyOutDir: true,

        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/main.ts'),
                admin: resolve(__dirname, 'src/admin/main.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        return '[name].[ext]';
                    }
                    return '[name].[ext]';
                },

                manualChunks: {
                    vue: ['vue', 'pinia'],
                    vendor: ['dayjs'],
                },
            },
        },
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },

    server: {
        port: 8120,
        strictPort: true,
        cors: true,
        // HMR: connect to dev server when the page is served from WordPress (different host/port)
        hmr: {
            host: 'localhost',
            port: 8120,
            protocol: 'ws',
            clientPort: 8120,
        },
    },

    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                additionalData: `@use "@/styles/variables.scss" as *;`,
            },
        },
    },
});
