// 進入點：接上路由，把語意 HTML 換頁；three.js 舞台於 Phase 2 任務 10 掛上。
import './styles/tokens.css';
import './styles/app.css';
import { createRouter } from './router.js';
import { renderMain } from './render/pageMarkup.js';
import { syncChrome, adjacent } from './render/chrome.js';
import { shouldRenderScene } from './lib/capability.js';
import { bindPageKeys } from './lib/keys.js';
import { bindTocOverlay } from './lib/overlay.js';
import { bindContactForm } from './lib/contactForm.js';

// 首次載入還沒互動，不移焦點（見 onNavigate）
let firstLoad = true;

// 目前這一頁：鍵盤翻頁要靠它算前後頁（router 自己不保留狀態）
let current = null;

// 掛載點取不到就整組互動停用：先報一句再收手，免得每次 keydown 都在 null 上丟 TypeError。
// 語意層由 prerender 產出，靜態內容照樣看得到（鐵律 3）
function boot() {
  const shell = document.getElementById('book');
  const chromeEl = document.getElementById('chrome');
  if (!shell || !chromeEl) {
    console.error('main.js: 找不到 #book 或 #chrome，執行期換頁與鍵盤翻頁停用');
    return;
  }

  // 換頁：替換語意層並更新 <title>。Phase 2 會在這裡同步觸發翻頁動畫與 overlay 轉場
  function onNavigate(page) {
    current = page;
    shell.innerHTML = renderMain(page);
    document.title = page.title;
    document.documentElement.dataset.page = page.slug;
    // 書殼不重繪只同步：星星列與控制列的 DOM 跨頁沿用同一批節點，
    // Phase 2 的星星點亮動畫才不會被 innerHTML 重建打斷（也省掉每頁重綁事件）
    syncChrome(chromeEl, page);
    // 換頁後把焦點移到主標題，鍵盤與螢幕報讀使用者才知道內容換了。
    // 首次載入跳過：使用者還沒互動，Chromium 會把程式化 focus 畫成 :focus-visible 的框
    const heading = shell.querySelector('.page__title');
    if (heading && !firstLoad) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    firstLoad = false;
  }

  const router = createRouter(onNavigate);
  router.start();

  // 鍵盤 ←／→ 翻頁：start() 之後才綁，current 已經有值
  bindPageKeys(router, () => current, adjacent);

  // 目錄浮層的 Esc／點外側關閉：start() 之後書殼已經在 DOM 裡
  bindTocOverlay(chromeEl);

  // contact 表單的 AJAX 送出：委派在 document 上綁一次，換頁重繪表單也不用重綁
  bindContactForm(document);

  // 有能力才啟動場景；否則整站就是上面那份語意 HTML（鐵律 3）
  if (shouldRenderScene()) {
    document.documentElement.dataset.scene = 'on';
    // Phase 2 任務 10：import('./scene/stage.js') 並初始化 three.js 舞台
  }
}

boot();
