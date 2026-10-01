import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function version(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  const date = new Date().toISOString().slice(0, 10);
  try {
    return `${date} · ${execSync('git rev-parse --short HEAD').toString().trim()}`;
  } catch {
    return date;
  }
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version()) },
  plugins: [
    react(),
    VitePWA({
      // Registered from src/engine/updates.ts, which decides when to switch to a new version.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'אי האנגלית – English Island',
        short_name: 'English Island',
        description: 'משחק ללימוד אנגלית לילדים',
        lang: 'he',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#e0f2fe',
        theme_color: '#38bdf8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything – including recordings and illustrations – is stored for offline play.
        globPatterns: ['**/*.{js,css,html,png,webp,mp3,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
