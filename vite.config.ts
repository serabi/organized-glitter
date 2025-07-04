import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  return {
    base: '/', // Ensure all assets load from root path
    plugins: [react()],

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
