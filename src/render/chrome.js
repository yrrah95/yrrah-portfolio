// 書殼（chrome）：頂部星星進度列＋目錄浮層，與底部翻頁控制列。
// 純字串產生器給 build 期的 prerender 用，DOM 同步器給執行期換頁用——同一份結構、兩種時機。
import { byRoute, visiblePages } from '../content/pages.js';
import { esc, safeHref, tableOfContents } from './pageMarkup.js';

// 星形圖示：純裝飾，語意由外層 <a> 的 aria-label 提供，故對輔助技術隱藏
const STAR_GLYPH =
  '<svg class="star__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.7 1.2 6.7L12 17.8l-5.9 3.2 1.2-6.7L2.5 9.6l6.6-.9z" />' +
  '</svg>';

// 依 visiblePages 陣列順序取出目前位置與前後頁；封面沒有上一頁、最後一頁沒有下一頁。
// export 出去給鍵盤翻頁（lib/keys.js）共用同一份前後頁定義，兩邊不會各算各的
//
// hidden 頁（例如 /contact/sent）不在書的頁序裡，規則是：
//   index = -1 → 頁碼顯示「—」、星星一顆都不亮；
//   prev = route 去掉最後一段後找得到的那一頁（/contact/sent → /contact），找不到就退回封面；
//   next = 無。
// 這樣不必在 pages.js 多掛一個「回哪一頁」欄位，路徑本身就說明了它掛在誰底下
export function adjacent(page) {
  if (page.hidden) {
    const parent = String(page.route).replace(/\/[^/]*$/, '') || '/';
    return { index: -1, prev: byRoute.get(parent) ?? visiblePages[0], next: null };
  }
  const found = visiblePages.findIndex((p) => p.route === page.route);
  const index = found < 0 ? 0 : found;
  return {
    index,
    prev: index > 0 ? visiblePages[index - 1] : null,
    next: index < visiblePages.length - 1 ? visiblePages[index + 1] : null,
  };
}

// 頁碼左半：hidden 頁不在頁序裡，顯示破折號而不是 0
const countLabel = (index) => (index < 0 ? '—' : String(index + 1));

// 端點頁的那一側不給 href：沒有 href 的 <a> 不可 focus，router 的 closest('a[href]') 也會自然放行
function controlAttrs(target) {
  return target ? ` href="${esc(safeHref(target.route))}"` : ' aria-disabled="true"';
}

// 產生整個書殼的 HTML 字串（prerender 填進 <!--chrome-->，dev 首次載入時由 syncChrome 補）
export function renderChrome(page) {
  const { index, prev, next } = adjacent(page);

  // 星星列：書裡看得見的 9 頁（含封面）各一顆，data-route 供執行期同步 aria-current。
  // hidden 頁沒有自己的星星，也不會讓任何一顆亮起來（route 對不上）
  const stars = visiblePages
    .map((p, i) => {
      const here = p.route === page.route ? ' aria-current="page"' : '';
      const label = `第 ${i + 1} 頁：${esc(p.heading)}`;
      return `<li class="stars__item"><a class="star" href="${esc(safeHref(p.route))}" data-route="${esc(p.route)}" aria-label="${label}"${here}>${STAR_GLYPH}</a></li>`;
    })
    .join('\n          ');

  return `<header class="chrome__top">
      <nav class="stars" aria-label="頁面進度">
        <ol class="stars__list">
          ${stars}
        </ol>
      </nav>
      <details class="toc-overlay">
        <summary class="toc-overlay__button" aria-label="開啟目錄">目錄</summary>
        <div class="toc-overlay__panel">
          ${tableOfContents(page.route)}
        </div>
      </details>
    </header>
    <footer class="chrome__bottom">
      <nav class="controls" aria-label="翻頁">
        <a class="controls__prev" rel="prev"${controlAttrs(prev)}>上一頁</a>
        <span class="controls__count" aria-live="polite">${countLabel(index)} / ${visiblePages.length}</span>
        <a class="controls__next" rel="next"${controlAttrs(next)}>下一頁</a>
      </nav>
    </footer>`;
}

// 單顆控制項的前後頁狀態切換：有目標就給 href、沒有就標 aria-disabled。
// href 一樣過 safeHref，跟 renderChrome 的字串版走同一份規則（兩種時機、一份白名單）
function setControl(el, target) {
  if (!el) return;
  if (target) {
    el.setAttribute('href', safeHref(target.route));
    el.removeAttribute('aria-disabled');
  } else {
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
  }
}

// 執行期換頁：只改屬性與文字，不重繪 DOM（Phase 2 的星星動畫不能被重繪打斷）
export function syncChrome(root, page) {
  if (!root) return;

  // 空殼（dev server 沒跑 prerender，裡面只有 <!--chrome--> 註解）先補一次，之後每次都走同步
  if (!root.querySelector('.chrome__top')) {
    root.innerHTML = renderChrome(page);
    return;
  }

  const { index, prev, next } = adjacent(page);

  // 星星列：aria-current 只留在目前這一顆
  root.querySelectorAll('.star').forEach((star) => {
    if (star.dataset.route === page.route) star.setAttribute('aria-current', 'page');
    else star.removeAttribute('aria-current');
  });

  // 目錄浮層的清單：aria-current 跟星星同做法，只留在目前這一頁的連結上。
  // 比對值也過 safeHref，跟 tableOfContents() 印出來的 href 是同一份規則
  const here = safeHref(page.route);
  root.querySelectorAll('.toc__list a').forEach((link) => {
    if (link.getAttribute('href') === here) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // 換頁後收起浮層：從目錄點進某一頁，浮層不該還蓋在新頁面上
  const overlay = root.querySelector('.toc-overlay');
  if (overlay) overlay.open = false;

  setControl(root.querySelector('.controls__prev'), prev);
  setControl(root.querySelector('.controls__next'), next);

  const count = root.querySelector('.controls__count');
  if (count) count.textContent = `${countLabel(index)} / ${visiblePages.length}`;
}
