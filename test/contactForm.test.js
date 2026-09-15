// contact 表單送出邏輯測試：只測 submitContact()——它是純函式，不碰 DOM。
// bindContactForm() 要 document 與真的 <form>，不在這一層測（見 TESTING.md）。
//
// 注意：這裡的 fetchImpl 全是 stub，測試永遠不會對 Web3Forms 發出真實請求。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitContact, MESSAGES } from '../src/lib/contactForm.js';

const ENDPOINT = 'https://api.web3forms.com/submit';
const ENTRIES = [
  ['name', '小明'],
  ['email', 'a@b.c'],
  ['message', '想做一個網站'],
];

// 假 fetch：記下收到的參數，回傳指定的假 Response
function stub(response) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return { calls, fetchImpl };
}

// 最小可用的假 Response（只有 submitContact 會讀的那幾個欄位）
const fakeRes = ({ ok = true, redirected = false, json } = {}) => ({
  ok,
  redirected,
  json: json ?? (async () => ({ success: true })),
});

test('成功：回 { success: true } 的 JSON 就是送出成功', async () => {
  const { fetchImpl } = stub(fakeRes());
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.deepEqual(result, { ok: true, message: MESSAGES.ok });
});

test('成功：res.redirected 為真也算成功（Web3Forms 吃到 redirect 會回 302）', async () => {
  // 轉址後的頁面不是 JSON，硬解析一定炸——所以 redirected 要先被收掉
  const { fetchImpl } = stub(
    fakeRes({
      redirected: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }),
  );
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.message, MESSAGES.ok);
});

test('失敗：JSON 回 success: false', async () => {
  const { fetchImpl } = stub(fakeRes({ json: async () => ({ success: false, message: '拒絕' }) }));
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.deepEqual(result, { ok: false, message: MESSAGES.fail });
});

test('失敗：body 不是 JSON（解析炸掉）不能被當成送出成功', async () => {
  const { fetchImpl } = stub(
    fakeRes({
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }),
  );
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.equal(result.ok, false);
});

test('失敗：HTTP 狀態非 2xx', async () => {
  const { fetchImpl } = stub(fakeRes({ ok: false, json: async () => ({ success: true }) }));
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.equal(result.ok, false);
});

test('失敗：fetch 直接 reject（斷線）不丟例外，回同一句失敗文案', async () => {
  const { fetchImpl } = stub(new TypeError('Failed to fetch'));
  const result = await submitContact({ endpoint: ENDPOINT, entries: ENTRIES, fetchImpl });
  assert.deepEqual(result, { ok: false, message: MESSAGES.fail });
});

test('失敗：拿不到 endpoint 就不送，直接回失敗', async () => {
  const { calls, fetchImpl } = stub(fakeRes());
  const result = await submitContact({ endpoint: '', entries: ENTRIES, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0, '沒有 endpoint 時不該發出請求');
});

test('送出的 body 帶著所有 entries，且不含 redirect', async () => {
  const { calls, fetchImpl } = stub(fakeRes());
  await submitContact({
    endpoint: ENDPOINT,
    // 呼叫端（bindContactForm）已經先 fd.delete('redirect')，這裡守住「沒有就是沒有」
    entries: [...ENTRIES, ['案子類型', '網頁開發']],
    fetchImpl,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Accept, 'application/json');
  const sent = [...calls[0].init.body.entries()];
  assert.deepEqual(sent, [...ENTRIES, ['案子類型', '網頁開發']]);
  assert.ok(!sent.some(([name]) => name === 'redirect'), 'redirect 不該跟著 AJAX 送出');
});

test('失敗文案指向 Threads，不叫人寄信——全站沒有公開 email', () => {
  assert.match(MESSAGES.fail, /Threads/);
  assert.ok(!/寄信|信箱|mail/i.test(MESSAGES.fail), '失敗文案不該叫人寄信');
});
