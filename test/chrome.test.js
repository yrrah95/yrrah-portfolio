// 書殼測試：只測 renderChrome／adjacent 這兩個純字串／純資料函式。
// syncChrome 會碰 DOM，不在這一層測（見 TESTING.md）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, visiblePages, byRoute } from '../src/content/pages.js';
import { renderChrome, adjacent } from '../src/render/chrome.js';

const cover = visiblePages[0];
const last = visiblePages[visiblePages.length - 1];
const about = byRoute.get('/about');

// 切出星星列那一段，避免跟目錄浮層的 aria-current 混在一起
const starsRegion = (html) => html.slice(html.indexOf('<nav class="stars"'), html.indexOf('</nav>'));

// 取出指定 class 的 <a> 開頭標籤，用來檢查有沒有 href／aria-disabled
const anchorTag = (html, cls) => html.match(new RegExp(`<a class="${cls}"[^>]*>`))[0];

test('星星列每頁一顆，共 9 顆', () => {
  const html = renderChrome(cover);
  assert.equal(visiblePages.length, 9, '書的頁數應該是 9');
  assert.equal(starsRegion(html).match(/class="star"/g).length, 9);
});

test('目前頁那顆星星帶 aria-current，且 data-route 等於該頁 route', () => {
  const stars = starsRegion(renderChrome(about));
  const current = stars.match(/<a class="star"[^>]*aria-current="page"[^>]*>/g);
  assert.equal(current.length, 1, 'aria-current 只能落在一顆星星上');
  assert.match(current[0], /data-route="\/about"/);
});

test('adjacent：封面沒有上一頁、下一頁是第二頁；最後一頁沒有下一頁', () => {
  const first = adjacent(cover);
  assert.equal(first.index, 0);
  assert.ok(!first.prev, '封面不該有上一頁');
  assert.equal(first.next, visiblePages[1]);

  const end = adjacent(last);
  assert.equal(end.index, visiblePages.length - 1);
  assert.equal(end.prev, visiblePages[visiblePages.length - 2]);
  assert.ok(!end.next, '最後一頁不該有下一頁');
});

test('端點頁的那一側沒有 href 且標 aria-disabled，中間頁兩端都有 href', () => {
  const first = renderChrome(cover);
  assert.ok(!anchorTag(first, 'controls__prev').includes('href='));
  assert.match(anchorTag(first, 'controls__prev'), /aria-disabled="true"/);
  assert.match(anchorTag(first, 'controls__next'), /href="\/work\/family"/);

  const end = renderChrome(last);
  assert.ok(!anchorTag(end, 'controls__next').includes('href='));
  assert.match(anchorTag(end, 'controls__next'), /aria-disabled="true"/);

  const middle = renderChrome(about);
  assert.match(anchorTag(middle, 'controls__prev'), /href="/);
  assert.match(anchorTag(middle, 'controls__next'), /href="/);
  assert.ok(!anchorTag(middle, 'controls__prev').includes('aria-disabled'));
  assert.ok(!anchorTag(middle, 'controls__next').includes('aria-disabled'));
});

test('頁碼顯示「目前頁 / 總頁數」', () => {
  assert.match(renderChrome(cover), /<span class="controls__count" aria-live="polite">1 \/ 9<\/span>/);
  assert.match(renderChrome(about), /class="controls__count"[^>]*>8 \/ 9</);
  assert.match(renderChrome(last), /class="controls__count"[^>]*>9 \/ 9</);
});

test('目錄在書殼裡，aria-current 落在目前頁的目錄連結上', () => {
  const html = renderChrome(about);
  assert.match(html, /<nav class="toc" aria-label="目錄">/);

  const tocRegion = html.slice(html.indexOf('<nav class="toc"'));
  assert.match(tocRegion, /<a href="\/about" aria-current="page">作者的話<\/a>/);
  assert.equal(tocRegion.match(/aria-current/g).length, 1, '目錄裡只能有一個 aria-current');
  // 封面被排除在目錄之外，只列其餘 8 頁
  assert.equal(tocRegion.match(/<li>/g).length, visiblePages.length - 1);
});

test('adjacent：route 不在書裡時退回封面位置，不炸也不回負數索引', () => {
  const ghost = adjacent({ route: '/不存在的頁' });
  assert.equal(ghost.index, 0, 'findIndex 回 -1 時要退回 0');
  assert.equal(ghost.prev, null);
  assert.equal(ghost.next, visiblePages[1]);
});

test('adjacent：中間頁的前後頁就是陣列上的鄰居', () => {
  const middle = visiblePages[4];
  const { index, prev, next } = adjacent(middle);
  assert.equal(index, 4);
  assert.equal(prev, visiblePages[3]);
  assert.equal(next, visiblePages[5]);
});

test('星星的 aria-label 是「第 N 頁：標題」，順序跟 visiblePages 一致', () => {
  const stars = [...renderChrome(cover).matchAll(/<a class="star"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(stars.length, visiblePages.length);
  assert.deepEqual(
    stars,
    visiblePages.map((p, i) => `第 ${i + 1} 頁：${p.heading}`),
  );
});

test('目錄浮層用 <details>，無 JS 也能展開（鐵律 3）', () => {
  const html = renderChrome(cover);
  assert.match(html, /<details class="toc-overlay">/);
  assert.match(html, /<summary class="toc-overlay__button" aria-label="開啟目錄">目錄<\/summary>/);
  // 預設收合：沒有 open 屬性
  assert.ok(!/<details class="toc-overlay" open/.test(html));
});

test('封面頁在星星列與目錄的待遇：有星星但不進目錄', () => {
  const html = renderChrome(cover);
  const stars = starsRegion(html);
  assert.match(stars, /data-route="\/"/, '封面要有自己的星星');
  const tocRegion = html.slice(html.indexOf('<nav class="toc"'));
  assert.ok(!/<a href="\/"/.test(tocRegion), '封面不該出現在目錄清單裡');
});

// ── hidden 頁（/contact/sent）：有書殼但不進頁序 ──────────────────────────
const sent = byRoute.get('/contact/sent');

test('hidden 頁不在 visiblePages 裡，但 byRoute 仍找得到（router 要 resolve 得動）', () => {
  assert.equal(pages.length, 10, 'pages 含 hidden 頁共 10 筆');
  assert.equal(visiblePages.length, 9, '書裡看得見的仍是 9 頁');
  assert.ok(sent, 'byRoute 應該含 /contact/sent');
  assert.ok(!visiblePages.includes(sent), 'hidden 頁不該進 visiblePages');
});

test('hidden 頁沒有自己的星星，也不讓任何一顆亮起來', () => {
  const stars = starsRegion(renderChrome(sent));
  assert.equal(stars.match(/class="star"/g).length, 9, '星星仍是 9 顆');
  assert.ok(!stars.includes('data-route="/contact/sent"'), 'hidden 頁不該有星星');
  assert.ok(!stars.includes('aria-current'), 'hidden 頁不該點亮任何一顆星星');
});

test('hidden 頁不出現在目錄清單裡', () => {
  const html = renderChrome(sent);
  const tocRegion = html.slice(html.indexOf('<nav class="toc"'));
  assert.ok(!tocRegion.includes('/contact/sent'), '目錄不該列出 hidden 頁');
  assert.equal(tocRegion.match(/<li>/g).length, visiblePages.length - 1);
});

test('adjacent：hidden 頁 index 為 -1、上一頁指回 /contact、沒有下一頁', () => {
  const { index, prev, next } = adjacent(sent);
  assert.equal(index, -1);
  assert.equal(prev, byRoute.get('/contact'));
  assert.equal(next, null);
});

test('hidden 頁的頁碼顯示「— / 9」，prev 有 href、next 標 aria-disabled', () => {
  const html = renderChrome(sent);
  assert.match(html, /class="controls__count"[^>]*>— \/ 9</);
  assert.match(anchorTag(html, 'controls__prev'), /href="\/contact"/);
  assert.match(anchorTag(html, 'controls__next'), /aria-disabled="true"/);
});
