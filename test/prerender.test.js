// prerender 的前置條件測試。
// scripts/prerender.mjs 是頂層腳本（import 就會讀 dist/ 並寫檔），不能在單元測試裡呼叫，
// 所以路徑與佔位符規則抽在 scripts/lib/prerenderPaths.mjs，這裡直接測那支純函式。
// 這三件事任何一件壞掉，build 會在 prerender 那一步炸掉（鐵律 3 的語意 HTML 就不會產生）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, visiblePages } from '../src/content/pages.js';
import { renderMain, renderHead } from '../src/render/pageMarkup.js';
import { renderChrome } from '../src/render/chrome.js';
import { PLACEHOLDERS, outFileFor } from '../scripts/lib/prerenderPaths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = readFileSync(path.join(root, 'src/index.html'), 'utf8');

test('src/index.html 帶著 prerender 需要的三個佔位符', () => {
  for (const mark of PLACEHOLDERS) {
    assert.ok(shell.includes(mark), `src/index.html 少了 ${mark}，prerender 會丟錯中止 build`);
  }
});

test('每個佔位符只出現一次（replace 只換第一個，多的會留在輸出裡）', () => {
  for (const mark of PLACEHOLDERS) {
    const hits = shell.split(mark).length - 1;
    assert.equal(hits, 1, `${mark} 出現 ${hits} 次，應該剛好一次`);
  }
});

test('掛載點與佔位符對得起來：#chrome 裝書殼、#book 裝語意層', () => {
  assert.match(shell, /<div id="chrome"><!--chrome--><\/div>/);
  assert.match(shell, /<div id="book"><!--book--><\/div>/);
  // main.js 靠這兩個 id 取節點，改 id 會讓執行期換頁整個停擺
  assert.match(shell, /<script type="module" src="\/main\.js"><\/script>/);
});

test('填完三個佔位符後，輸出裡不該再殘留任何佔位符', () => {
  for (const page of pages) {
    const html = shell
      .replace('<!--head-->', () => renderHead(page))
      .replace('<!--chrome-->', () => renderChrome(page))
      .replace('<!--book-->', () => renderMain(page));
    for (const mark of PLACEHOLDERS) {
      assert.ok(!html.includes(mark), `${page.route} 填完後還留著 ${mark}`);
    }
    // 每一頁都要有 <main id="main">，無 JS 的讀者靠的就是它
    assert.match(html, /<main id="main"/);
  }
});

const dist = path.join(root, 'dist');
const rel = (route) => path.relative(dist, outFileFor(dist, route)).split(path.sep).join('/');

test('輸出是平檔：/ 落 index.html，其餘落 <route>.html', () => {
  // 平檔才能讓 Cloudflare Pages 把 /about 直接回 200；目錄式會 308 到 /about/（鐵律 5）
  assert.equal(rel('/'), 'index.html');
  assert.equal(rel('/about'), 'about.html');
  assert.equal(rel('/work/family'), 'work/family.html');
});

test('10 個 route（含 hidden 頁）各自落在不重複的 dist 輸出路徑', () => {
  const files = pages.map((p) => rel(p.route));
  assert.equal(files.length, 10, `route 數量應該是 10，實際 ${files.length}`);
  assert.equal(visiblePages.length, 9, '書裡看得見的是 9 頁');
  assert.equal(new Set(files).size, pages.length, `輸出路徑有重複：${files.join(', ')}`);
  for (const file of files) {
    assert.ok(!file.startsWith('/'), `${file} 不該以 / 開頭`);
    assert.ok(file.endsWith('.html'), `${file} 應該是 .html 平檔`);
  }
});

test('hidden 頁照樣 prerender：/contact/sent 落在 dist/contact/sent.html', () => {
  assert.equal(rel('/contact/sent'), 'contact/sent.html');
  // 跟 /contact 的平檔不會互相蓋掉：一個是 contact.html、一個是 contact/ 目錄下的檔
  assert.equal(rel('/contact'), 'contact.html');
});

test('sitemap 只收 visiblePages：hidden 頁不進去', () => {
  // prerender.mjs 的 sitemap 那段就是走 visiblePages，這裡守住那份清單的內容
  const routes = visiblePages.map((p) => p.route);
  assert.ok(!routes.includes('/contact/sent'), 'hidden 頁不該進 sitemap');
  assert.equal(routes.length, 9);
});

test('會逃出 dist 的 route 直接丟錯，不寫到專案其他地方', () => {
  assert.throws(() => outFileFor(dist, '/../x'), /dist 之外/);
  assert.throws(() => outFileFor(dist, '/work/../../x'), /dist 之外/);
});
