import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ mode }) => {
    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            preserveSymlinks: false,
        },
        build: {
            sourcemap: false,
            manifest: 'manifest.json', // Enable manifest generation as manifest.json
            target: 'es2020',
            minify: 'terser',
            chunkSizeWarningLimit: 1000,
            terserOptions: {
                compress: {
                    drop_console: mode === 'production',
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info'],
                },
                mangle: {
                    safari10: true,
                },
                format: {
                    comments: false,
                },
            },
            rollupOptions: {
                input: './index.html',
            },
        },
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
            exclude: ['pocketbase'],
        },
        server: {
            port: 3001,
            host: true,
            strictPort: false, // Allow fallback to next available port
            hmr: {
                port: undefined, // Use same port as dev server
            },
            cors: true,
        },
        preview: {
            port: 3000,
            host: true,
        },
    };
});
