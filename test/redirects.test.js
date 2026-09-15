// _redirects 與 pages.js 的一致性：舊 .html 網址一律 301 到新的乾淨路徑（鐵律 5）。
// 換 route 卻忘了改這張表，正式站的舊連結就會 301 到 404，而且本地測不出來。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { byRoute, visiblePages } from '../src/content/pages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 解析成 [{ from, to, code }]，跳過註解與空行
const rules = readFileSync(path.join(root, '_redirects'), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [from, to, code] = line.split(/\s+/);
    return { from, to, code };
  });

test('每條轉址的目的地都是有註冊的 route，且是 301', () => {
  assert.equal(rules.length, 15, `_redirects 規則數量變了（現在 ${rules.length} 條），改表時請一起更新這個數字`);
  for (const { from, to, code } of rules) {
    assert.ok(byRoute.has(to), `${from} 轉到未註冊的 route：${to}`);
    assert.equal(code, '301', `${from} 應該用 301 永久轉址`);
    assert.ok(!byRoute.has(from), `${from} 轉到自己，會變成無窮迴圈`);
  }
});

test('舊站的六個作品頁，帶不帶 .html 都有規則接住', () => {
  // Cloudflare Pages 會先試 <path>.html 平檔再進 _redirects，所以兩種寫法都要各一條
  const froms = new Set(rules.map((r) => r.from));
  for (const slug of ['family', 'teach', 'insurance', 'dashboard', 'noevii', 'atomspin']) {
    assert.ok(froms.has(`/work-${slug}.html`), `缺 /work-${slug}.html 的轉址`);
    assert.ok(froms.has(`/work-${slug}`), `缺 /work-${slug}（無副檔名）的轉址`);
  }
});

test('根目錄的 /index.html 轉到乾淨的 /', () => {
  const rule = rules.find((r) => r.from === '/index.html');
  assert.ok(rule, '缺 /index.html 的轉址');
  assert.equal(rule.to, '/');
});

// hidden 頁（/contact/sent）是新的，舊站沒有對應網址，所以只檢查 visiblePages
test('除了封面，書裡看得見的每一頁都有一條舊 .html 轉址接住', () => {
  const covered = new Set(rules.map((r) => r.to));
  for (const page of visiblePages) {
    if (page.kind === 'cover') continue; // 封面是 /，舊站本來就是 index.html
    assert.ok(covered.has(page.route), `${page.route} 沒有對應的舊網址轉址`);
  }
});

test('demo/ 底下不設轉址規則，四個 demo 子站維持原生相對路徑', () => {
  for (const { from } of rules) {
    assert.ok(!from.startsWith('/demo'), `demo 不該被轉址：${from}`);
  }
});
