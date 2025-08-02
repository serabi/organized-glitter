import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  return {
    base: '/', // Ensure all assets load from root path
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
        manifest: {
          name: 'Organized Glitter',
          short_name: 'Organized Glitter',
          description:
            'An app for diamond art project tracking - track progress, stash, and completed diamond art paintings',
          id: '/',
          theme_color: '#9966cc',
          background_color: '#faf7fe',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'favicon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
            },
            {
              src: 'favicon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
            },
            {
              src: 'android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      preserveSymlinks: false,
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      reporters: ['verbose'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*'],
        exclude: [
          'src/test/setup.ts',
          'src/types',
          'src/main.tsx',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/__tests__',
          'src/**/constants.ts',
        ],
        all: true,
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
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
      port: 3000,
      host: true,
      strictPort: false, // Allow fallback to next available port
      hmr: {
        port: undefined, // Use same port as dev server
      },
      cors: true,
    },

    preview: {
      port: 3001,
      host: true,
    },
  };
});
