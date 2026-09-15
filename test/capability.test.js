// 能力偵測測試：capability.js 只讀 window.matchMedia 與 document.createElement 兩個全域，
// 用假的全域替身就能在 node 裡跑完所有分支，不需要 jsdom（見 TESTING.md）。
// 鐵律 3 的開關就在這裡——判斷錯了，無 WebGL 或要求減少動態的人會被硬塞 render loop。
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { hasWebGL, prefersReducedMotion, shouldRenderScene } from '../src/lib/capability.js';

// 裝上假的 window.matchMedia，回傳指定的 matches
function stubWindow(matchMedia) {
  globalThis.window = matchMedia === undefined ? {} : { matchMedia };
}

// 裝上假的 document.createElement，canvas.getContext 依 contexts 清單決定給不給
function stubDocument(contexts) {
  globalThis.document = {
    createElement: () => ({ getContext: (type) => (contexts.includes(type) ? {} : null) }),
  };
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
});

test('prefersReducedMotion 直接回 matchMedia 的 matches', () => {
  stubWindow(() => ({ matches: true }));
  assert.equal(prefersReducedMotion(), true);

  stubWindow(() => ({ matches: false }));
  assert.equal(prefersReducedMotion(), false);
});

test('prefersReducedMotion 查的是 prefers-reduced-motion: reduce', () => {
  let asked = null;
  stubWindow((query) => {
    asked = query;
    return { matches: false };
  });
  prefersReducedMotion();
  assert.equal(asked, '(prefers-reduced-motion: reduce)');
});

test('瀏覽器沒有 matchMedia 時當作「沒要求減少動態」', () => {
  stubWindow(undefined);
  assert.equal(prefersReducedMotion(), false);
});

test('hasWebGL：webgl2 或 webgl 任一拿得到就算有', () => {
  stubDocument(['webgl2', 'webgl']);
  assert.equal(hasWebGL(), true);

  // 只有舊版 webgl 的環境也算有
  stubDocument(['webgl']);
  assert.equal(hasWebGL(), true);
});

test('hasWebGL：兩種 context 都拿不到就是沒有', () => {
  stubDocument([]);
  assert.equal(hasWebGL(), false);
});

test('hasWebGL：createElement 或 getContext 丟例外時吞掉並回 false', () => {
  globalThis.document = {
    createElement: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(hasWebGL(), false);

  globalThis.document = {
    createElement: () => ({
      getContext: () => {
        throw new Error('context lost');
      },
    }),
  };
  assert.equal(hasWebGL(), false);
});

test('shouldRenderScene：有 WebGL 且沒要求減少動態才啟動場景', () => {
  stubDocument(['webgl2']);
  stubWindow(() => ({ matches: false }));
  assert.equal(shouldRenderScene(), true);
});

test('shouldRenderScene：要求減少動態時不啟動（鐵律 3）', () => {
  stubDocument(['webgl2']);
  stubWindow(() => ({ matches: true }));
  assert.equal(shouldRenderScene(), false);
});

test('shouldRenderScene：沒有 WebGL 時不啟動，也不必再問 matchMedia', () => {
  stubDocument([]);
  let asked = false;
  stubWindow(() => {
    asked = true;
    return { matches: false };
  });
  assert.equal(shouldRenderScene(), false);
  assert.equal(asked, false, 'hasWebGL 為假就該短路，不再查 matchMedia');
});
