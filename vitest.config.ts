import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/generated/**',
      ],
    },
    setupFiles: ['./tests/setup.ts'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@app': path.resolve(__dirname, './src/app'),
      '@docs': path.resolve(__dirname, './src/docs'),
    },
  },
});
