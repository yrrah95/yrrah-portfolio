// build 後為每個 route 產一份完整語意 HTML（鐵律 3）。
// 不用 headless 瀏覽器：內容來自 src/content/pages.js，與執行期 overlay 同一份來源。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { PLACEHOLDERS, outFileFor } from './lib/prerenderPaths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { pages, visiblePages, SITE } = await load('src/content/pages.js');
const { renderMain, renderHead } = await load('src/render/pageMarkup.js');
const { renderChrome } = await load('src/render/chrome.js');

// vite build 產出的 index.html 已帶好雜湊過的 script/link；拿它當殼
const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
const missing = PLACEHOLDERS.filter((mark) => !shell.includes(mark));
if (missing.length) {
  throw new Error(`dist/index.html 少了 ${missing.join('、')} 佔位符，prerender 無法填入內容`);
}

for (const page of pages) {
  // 替換值一律用函式形式：字串形式會把內容裡的 $&、$1 當成 replace 的特殊樣式展開
  const html = shell
    .replace('<!--head-->', () => renderHead(page))
    .replace('<!--chrome-->', () => renderChrome(page))
    .replace('<!--book-->', () => renderMain(page));
  const file = outFileFor(dist, page.route);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
  console.log(`prerender: ${page.route} -> ${path.relative(root, file)}`);
}

// sitemap 用乾淨路徑重產，蓋掉舊的 .html 版本（鐵律 5）。
// 只列 visiblePages：hidden 頁（/contact/sent）有自己的平檔但不該被索引
const today = new Date().toISOString().slice(0, 10);
const urls = visiblePages
  .map((p) => `  <url>\n    <loc>${SITE.baseUrl}${p.route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
  .join('\n');
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  'utf8',
);
console.log(`prerender: sitemap.xml（${visiblePages.length} 筆）`);
