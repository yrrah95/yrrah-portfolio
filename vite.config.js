import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pages } from './src/content/pages.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const routes = new Set(pages.map((p) => p.route));

// 開發時把已註冊的乾淨路徑導回 index.html（dev 沒有 prerender 產物）。
// preview 與正式環境維持 mpa：直接吃 dist/<route>.html 這種平檔，行為與 Cloudflare Pages 一致。
function devRouteFallback() {
  return {
    name: 'yrrah-dev-route-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url.split('?')[0].replace(/\/+$/, '') || '/';
        if (routes.has(pathname) && pathname !== '/') req.url = '/index.html';
        next();
      });
    },
    // preview 端補上 Cloudflare Pages 的無副檔名解析：/about 與 /about/ 都改寫成 /about.html，
    // 對齊 scripts/prerender.mjs 的平檔輸出。不補這段，本地會 404 而正式站正常，測不準
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [pathname, query = ''] = req.url.split('?');
        const clean = pathname.replace(/\/+$/, '');
        if (routes.has(clean) && clean !== '') {
          req.url = `${clean}.html${query ? `?${query}` : ''}`;
        }
        next();
      });
    },
  };
}

// 新站原始碼全部放 src/，舊靜態站（index.html、work-*.html、demo/…）原地不動，
// 由 scripts/copy-legacy.mjs 在 build 後複製進 dist，避免搬動既有檔案
export default defineConfig({
  // mpa：每個 route 都有自己的 prerender 產物，不做 SPA 萬用 fallback
  appType: 'mpa',
  plugins: [devRouteFallback()],
  root: path.join(here, 'src'),
  // 新站專用靜態資產（翻頁音效、去背剪影 PNG…）放 public/，原樣複製到 dist 根目錄
  publicDir: path.join(here, 'public'),
  build: {
    outDir: path.join(here, 'dist'),
    emptyOutDir: true,
    // 資產一律同源：CSP 的 connect-src 只允許 'self'，3D 資產不能走 CDN
    assetsDir: 'app',
  },
  server: {
    port: 5173,
  },
});
