import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from "path"
import { exit } from 'process'

const REQUIRED_ENVS = [
  'FRONTEND_URL',
  'BACKEND_URL'
];

const OPTIONAL_ENVS = [
  'WS_BACKEND_URL'
];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const frontendEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...rootEnv, ...frontendEnv };

  const definedEnvVariables: Record<string, string> = {};
  const missingEnvVariables: string[] = [];

  for (const key of REQUIRED_ENVS) {
    if (!env[key]) {
      missingEnvVariables.push(key);
      continue;
    }
    
    // Add it to the define object dynamically
    definedEnvVariables[`import.meta.env.${key}`] = JSON.stringify(env[key]);
  }

  for (const key of OPTIONAL_ENVS) {
    if (env[key]) {
      definedEnvVariables[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  if (missingEnvVariables.length > 0 && mode !== 'test') {
    console.error(`\x1b[31mThe following environmental variables are required but were not found. Please set them in the .env file: ${missingEnvVariables.join(', ')}\x1b[0m`);
    exit(1);
  }

  if (mode === 'test') {
    if (!definedEnvVariables['import.meta.env.FRONTEND_URL']) {
      definedEnvVariables['import.meta.env.FRONTEND_URL'] = JSON.stringify('http://localhost:3000');
    }

    if (!definedEnvVariables['import.meta.env.BACKEND_URL']) {
      definedEnvVariables['import.meta.env.BACKEND_URL'] = JSON.stringify('http://localhost:5000');
    }
  }

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePattern: 'components|.*\\.(test|spec)\\.(ts|tsx)$',
      }),
      react(),
      tailwindcss(),
      tsConfigPaths(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: definedEnvVariables,
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: true,
      restoreMocks: true,
      clearMocks: true,
      mockReset: true,
    },
  };
})
