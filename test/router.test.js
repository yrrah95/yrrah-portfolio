// router 測試：只測 resolve()——它是純函式。
// createRouter 會碰 document／history，不能在 node 裡呼叫（見 TESTING.md）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pages, byRoute } from '../src/content/pages.js';
import { resolve } from '../src/router.js';

test('帶尾斜線的路徑會被正規化後找到對應頁', () => {
  const page = resolve('/work/family/');
  assert.ok(page, '/work/family/ 應該解析得到頁面');
  assert.equal(page.slug, 'family');
  // 去尾斜線後跟不帶斜線的版本要指到同一個物件
  assert.equal(page, resolve('/work/family'));
});

test('沒註冊的路徑回 null，交給原生導覽處理', () => {
  assert.equal(resolve('/nope'), null);
  assert.equal(resolve('/work/nope'), null);
});

test('根路徑回封面，且不會被當成尾斜線砍掉', () => {
  const page = resolve('/');
  assert.equal(page, pages[0]);
  assert.equal(page.kind, 'cover');
});

test('連續多個尾斜線一次砍乾淨', () => {
  assert.equal(resolve('/about///'), byRoute.get('/about'));
  assert.equal(resolve('/work/family//'), byRoute.get('/work/family'));
  // '//' 收合成 '/' 就是封面：同一個位置不該因為多打一個斜線變成未註冊路徑
  assert.equal(resolve('//'), pages[0]);
});

test('路徑中間的重複斜線收合成一個', () => {
  assert.equal(resolve('//about'), byRoute.get('/about'));
  assert.equal(resolve('/work//family'), byRoute.get('/work/family'));
  assert.equal(resolve('///work///family///'), byRoute.get('/work/family'));
});

test('百分號編碼先解開再比對', () => {
  assert.equal(resolve('/%61bout'), byRoute.get('/about'));
  assert.equal(resolve('/work/%66amily'), byRoute.get('/work/family'));
});

test('壞掉的百分號編碼回 null，不讓 decodeURIComponent 把整個 router 炸掉', () => {
  assert.equal(resolve('/%E0%A4%A'), null);
  assert.equal(resolve('/about%'), null);
});

test('空字串路徑回 null，不會誤判成封面', () => {
  assert.equal(resolve(''), null);
});

test('每一頁的 route 都解析得回自己（含尾斜線版本）', () => {
  for (const page of pages) {
    assert.equal(resolve(page.route), page, `${page.route} 解析不到自己`);
    const trailing = page.route === '/' ? '/' : `${page.route}/`;
    assert.equal(resolve(trailing), page, `${trailing} 解析不到自己`);
  }
});
