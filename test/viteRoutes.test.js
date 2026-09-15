// vite.config.js 的路由 middleware 測試：dev 把乾淨路徑導回 index.html，
// preview 補上 Cloudflare Pages 對平檔的無副檔名解析。兩者都是純字串改寫，用假的 server 就能測。
// 這一層測不準的話，本地跟正式站的行為會走鐘（本地 404、正式站正常，或反過來）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';

const plugin = config.plugins.flat().find((p) => p?.name === 'yrrah-dev-route-fallback');

// 假 server：把註冊進來的 middleware 抓出來，直接拿 req 物件餵它
function middlewareOf(hook) {
  let fn = null;
  plugin[hook]({ middlewares: { use: (m) => (fn = m) } });
  assert.equal(typeof fn, 'function', `${hook} 沒有註冊 middleware`);
  return (url) => {
    const req = { url };
    let called = false;
    fn(req, {}, () => (called = true));
    assert.ok(called, `${hook} 沒有呼叫 next()：${url}`);
    return req.url;
  };
}

test('plugin 存在且掛了 dev 與 preview 兩個 hook', () => {
  assert.ok(plugin, 'vite.config.js 應該有 yrrah-dev-route-fallback plugin');
  assert.equal(typeof plugin.configureServer, 'function');
  assert.equal(typeof plugin.configurePreviewServer, 'function');
  assert.equal(config.appType, 'mpa', 'mpa 才會吃 dist/<route>.html 這種平檔');
});

test('dev：已註冊的乾淨路徑導回 /index.html，含尾斜線與 query 的版本也算', () => {
  const dev = middlewareOf('configureServer');
  assert.equal(dev('/about'), '/index.html');
  assert.equal(dev('/work/family'), '/index.html');
  assert.equal(dev('/work/family/'), '/index.html');
  assert.equal(dev('/about?x=1'), '/index.html');
});

test('dev：根路徑與未註冊路徑原樣放行，舊 demo 站不被攔截', () => {
  const dev = middlewareOf('configureServer');
  assert.equal(dev('/'), '/');
  assert.equal(dev('/demo/family/index.html'), '/demo/family/index.html');
  assert.equal(dev('/assets/work/family.webp'), '/assets/work/family.webp');
  assert.equal(dev('/nope'), '/nope');
});

test('preview：乾淨路徑補成 <route>.html 平檔，query 要留著', () => {
  const preview = middlewareOf('configurePreviewServer');
  // 對齊 scripts/prerender.mjs 的平檔輸出；目錄式的話正式站會 308 到尾斜線（違反鐵律 5）
  assert.equal(preview('/about'), '/about.html');
  assert.equal(preview('/work/family'), '/work/family.html');
  assert.equal(preview('/work/family/'), '/work/family.html');
  assert.equal(preview('/about?x=1'), '/about.html?x=1');
});

test('preview：根路徑與未註冊路徑原樣放行', () => {
  const preview = middlewareOf('configurePreviewServer');
  assert.equal(preview('/'), '/');
  assert.equal(preview('/demo/family/index.html'), '/demo/family/index.html');
  assert.equal(preview('/sitemap.xml'), '/sitemap.xml');
});
