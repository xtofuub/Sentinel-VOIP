import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const USER_AGENT_POOL = [
  'JuasApp/6.7 (iPhone; iOS 16.2; Scale/3.00)',
  'JuasApp/6.7 (iPhone; iOS 16.4; Scale/3.00)',
  'JuasApp/6.7 (iPhone; iOS 16.6; Scale/3.00)',
  'JuasApp/6.7 (iPhone; iOS 17.0; Scale/3.00)',
  'JuasApp/6.7 (iPhone; iOS 17.3; Scale/3.00)',
  'JuasApp/6.7 (iPhone; iOS 17.4; Scale/3.00)'
]

const ACCEPT_LANGUAGE_POOL = [
  'fi-FI;q=1',
  'en-GB;q=1',
  'es-ES;q=1',
  'fr-FR;q=1',
  'de-DE;q=1'
]

const pickRandom = (values) => values[Math.floor(Math.random() * values.length)]

const buildProxyHeaders = () => ({
  'User-Agent': pickRandom(USER_AGENT_POOL),
  'Accept': '*/*',
  'Accept-Language': pickRandom(ACCEPT_LANGUAGE_POOL),
  'Connection': 'keep-alive',
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://master.appha.es/lua/bromapp/user',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            proxyReq.removeHeader('sec-ch-ua');
            proxyReq.removeHeader('sec-ch-ua-mobile');
            proxyReq.removeHeader('sec-ch-ua-platform');
            proxyReq.removeHeader('sec-fetch-dest');
            proxyReq.removeHeader('sec-fetch-mode');
            proxyReq.removeHeader('sec-fetch-site');
            const headers = buildProxyHeaders();
            Object.entries(headers).forEach(([key, value]) => {
              proxyReq.setHeader(key, value);
            });
            proxyReq.setHeader('Accept-Charset', 'utf-8');
          });
        }
      },
    },
  },
})
