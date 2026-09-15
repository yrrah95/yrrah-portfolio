// 內容資料完整性測試：pages.js 是全站唯一真實來源，壞掉會同時打到 prerender 與執行期。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, pages, visiblePages, byRoute, workPages } from '../src/content/pages.js';

// 專案根目錄：資產路徑以 '/' 開頭，對應根目錄下的實體檔
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetPath = (src) => path.join(root, src.replace(/^\//, ''));

// longform block 允許的 key（形狀說明見 src/content/pages.js 檔頭註解）
const ALLOWED_BLOCK_KEYS = ['h2', 'p', 'note', 'demo', 'figure', 'cta'];

test('書裡看得見的共 9 頁，route 不重複，byRoute 索引跟陣列對得起來', () => {
  assert.equal(visiblePages.length, 9);
  assert.equal(pages.length, 10, '加上 hidden 的 /contact/sent 共 10 筆');
  const routes = pages.map((p) => p.route);
  assert.equal(new Set(routes).size, routes.length, `route 有重複：${routes.join(', ')}`);
  assert.equal(byRoute.size, pages.length);
  for (const page of pages) assert.equal(byRoute.get(page.route), page);
});

test('每頁都有 slug／route／kind／title／heading／description', () => {
  for (const page of pages) {
    for (const key of ['slug', 'route', 'kind', 'title', 'heading', 'description']) {
      assert.equal(typeof page[key], 'string', `${page.route} 缺少 ${key}`);
      assert.ok(page[key].length > 0, `${page.route} 的 ${key} 是空字串`);
    }
    assert.match(page.route, /^\//, `${page.slug} 的 route 要以 / 開頭`);
  }
});

test('每個作品頁的相片都有 src／寬高／alt，且檔案真的存在', () => {
  assert.equal(workPages.length, 6, '書裡應該有 6 個作品');
  for (const page of workPages) {
    assert.ok(page.image, `${page.route} 沒有 image`);
    const { src, width, height, alt } = page.image;
    assert.ok(existsSync(assetPath(src)), `${page.route} 的相片不存在：${src}`);
    assert.ok(Number.isInteger(width) && width > 0, `${src} 的 width 不是正整數`);
    assert.ok(Number.isInteger(height) && height > 0, `${src} 的 height 不是正整數`);
    assert.ok(alt && alt.length > 0, `${src} 少了 alt`);
  }
});

test('longform 裡的 figure 圖檔也要存在', () => {
  for (const page of pages) {
    for (const block of page.longform ?? []) {
      if (!block.figure) continue;
      assert.ok(existsSync(assetPath(block.figure.src)), `${page.route} 的補充圖不存在：${block.figure.src}`);
      assert.ok(block.figure.alt?.length > 0, `${block.figure.src} 少了 alt`);
    }
  }
});

test('longform block 只使用允許的 key，避免內容默默不被渲染', () => {
  for (const page of pages) {
    for (const block of page.longform ?? []) {
      const keys = Object.keys(block);
      assert.equal(keys.length, 1, `${page.route} 有一個 block 帶了多個 key：${keys.join(', ')}`);
      assert.ok(
        ALLOWED_BLOCK_KEYS.includes(keys[0]),
        `${page.route} 出現未支援的 block key：${keys[0]}（pageMarkup.js 會直接跳過它）`,
      );
    }
  }
});

test('hidden 頁：contact-sent 標了 hidden 與 noindex，且不在 visiblePages 裡', () => {
  const sent = byRoute.get('/contact/sent');
  assert.ok(sent, '應該有 /contact/sent 這一頁');
  assert.equal(sent.hidden, true);
  assert.equal(sent.noindex, true);
  assert.equal(sent.kind, 'sent');
  assert.ok(!visiblePages.includes(sent));
  // visiblePages 就是 pages 扣掉 hidden，沒有第三種來源
  assert.deepEqual(visiblePages, pages.filter((p) => !p.hidden));
});

test('contact 表單的 redirect 是正式站絕對 URL，且指到真的存在的頁', () => {
  const contact = byRoute.get('/contact');
  // Web3Forms 只把值放進 302 Location，相對路徑會被解析到 api.web3forms.com 底下
  assert.ok(contact.form.redirect.startsWith(SITE.baseUrl + '/'), 'redirect 必須是絕對 URL');
  assert.ok(byRoute.has(contact.form.redirect.slice(SITE.baseUrl.length)), 'redirect 目的地必須是有註冊的 route');
});

test('contact 表單有案子類型 select，選項沿用舊 contact.html', () => {
  const contact = byRoute.get('/contact');
  const select = contact.form.fields.find((f) => f.type === 'select');
  assert.ok(select, '缺少 type: select 的欄位');
  assert.equal(select.name, '案子類型');
  const labels = select.options.map((o) => (typeof o === 'string' ? o : o.label));
  assert.deepEqual(labels, ['選一個', '網頁開發', 'UI設計', '平面設計', '不確定，想聊聊']);
});

test('fields[].name 不可撞上 HTMLFormElement 的屬性名（會遮蔽 form.action 等）', () => {
  const RESERVED = ['action', 'method', 'reset', 'submit', 'elements', 'target', 'enctype'];
  for (const page of pages) {
    for (const field of page.form?.fields ?? []) {
      assert.ok(!RESERVED.includes(field.name), `${page.route} 的欄位 name 撞到表單屬性：${field.name}`);
    }
  }
});

test('contact 的 longform 不再塞 Threads cta——它已經搬到表單下方', () => {
  const contact = byRoute.get('/contact');
  assert.ok(!contact.longform.some((b) => b.cta), 'cta 收在 <details> 裡沒人看得到');
  assert.equal(contact.longform.length, 1);
});
