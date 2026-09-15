// contact 表單的 AJAX 送出。委派在 document 上綁一次，換頁重繪表單也不用重綁。
// 沒有 JS 時這支根本不存在，表單就原生 POST 到 Web3Forms（鐵律 3）——AJAX 只是體驗加分，不是必要條件。
// CSP 的 connect-src／form-action 都已放行 https://api.web3forms.com（見 _headers）。
//
// 分兩層：submitContact() 是純函式（只吃 endpoint／entries／fetchImpl，node 測得動），
// bindContactForm() 只負責收 entries、寫狀態列，DOM 的部分不混進送出邏輯。

// 狀態列文案集中一處，改字不用翻程式邏輯
export const MESSAGES = {
  sending: '送出中…',
  ok: '收到了，我會回信。',
  // 全站沒有公開 email，失敗時能給的下一步只有 Threads
  fail: '送不出去。稍後再試，或直接在 Threads 找我。',
};

// 送出一份表單內容，回傳 { ok, message }。不丟例外——呼叫端只要看 ok
export async function submitContact({ endpoint, entries = [], fetchImpl } = {}) {
  const send = fetchImpl || globalThis.fetch;
  if (!endpoint || typeof send !== 'function') return { ok: false, message: MESSAGES.fail };

  const body = new FormData();
  for (const [name, value] of entries) body.append(name, value);

  try {
    const res = await send(endpoint, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    });
    // Web3Forms 若吃到 redirect 欄位會回 302，fetch 跟完轉址後 redirected 為 true——
    // 那個頁面不是 JSON，解析一定失敗，但送出其實成功了，所以先在這裡收掉
    if (res.redirected) return { ok: true, message: MESSAGES.ok };
    // 正常路徑回的是 JSON；非 JSON body 解析不出來就當失敗，不能憑空宣稱送到了
    const data = await res.json().catch(() => null);
    if (!res.ok || data === null || data.success === false) {
      return { ok: false, message: MESSAGES.fail };
    }
    return { ok: true, message: MESSAGES.ok };
  } catch {
    // 網路斷線與伺服器回錯給同一句：對填表的人來說下一步都一樣
    return { ok: false, message: MESSAGES.fail };
  }
}

// 綁上 submit 委派，回傳解除綁定的函式
export function bindContactForm(root = document) {
  async function onSubmit(event) {
    // submit 事件的 target 一定是 <form>；不是聯絡表單就完全不插手
    const form = event.target;
    if (!form || !form.classList || !form.classList.contains('contact-form')) return;

    // 原生驗證沒過就交回給瀏覽器：不 preventDefault，使用者才看得到原生提示。
    // （表單沒有 novalidate，所以這一步其實只是保險）
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;

    // 端點用 getAttribute 取：表單裡有 name 欄位時 form.action 會被同名欄位遮蔽成 DOM 節點。
    // 真的拿不到就不攔，讓原生送出去試
    const endpoint = form.getAttribute('action');
    if (!endpoint) return;

    event.preventDefault();

    // 蜜罐：真人看不到也按不到這個 checkbox，勾了就靜靜吞掉，不給機器人任何回饋
    const honeypot = form.querySelector('[name="botcheck"]');
    if (honeypot && honeypot.checked) return;

    const statusEl = form.querySelector('.contact-form__status');
    const submitEl = form.querySelector('.contact-form__submit');

    // 送出中／已送出就不再受理：用 aria-disabled 而不是 disabled，
    // disabled 會把焦點丟回 body，鍵盤使用者會不知道自己在哪
    if (submitEl && submitEl.getAttribute('aria-disabled') === 'true') return;

    const setStatus = (text, state) => {
      if (!statusEl) return;
      statusEl.textContent = text;
      // 錯誤要立刻打斷報讀，所以換成 role="alert"；其他時候維持禮貌的 status
      statusEl.setAttribute('role', state === 'err' ? 'alert' : 'status');
      if (state) statusEl.setAttribute('data-state', state);
      else statusEl.removeAttribute('data-state');
    };

    if (submitEl) submitEl.setAttribute('aria-disabled', 'true');
    setStatus(MESSAGES.sending);

    // redirect 是給無 JS 原生送出用的；AJAX 帶著它會讓 Web3Forms 回 302，白白多跑一趟轉址
    const fd = new FormData(form);
    fd.delete('redirect');

    const result = await submitContact({ endpoint, entries: [...fd.entries()] });
    if (result.ok) {
      form.reset();
      setStatus(result.message, 'ok');
      // 成功後維持 aria-disabled：表單已清空，再按一次只會送出一份空白
    } else {
      setStatus(result.message, 'err');
      if (submitEl) submitEl.removeAttribute('aria-disabled');
    }
  }

  root.addEventListener('submit', onSubmit);
  return () => root.removeEventListener('submit', onSubmit);
}
