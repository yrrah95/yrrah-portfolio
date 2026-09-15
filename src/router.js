// 客端路由：History API ＋乾淨路徑。
// prerender 已為每個 route 產出靜態 HTML，這裡只負責站內導覽時不整頁重載。
import { byRoute, pages } from './content/pages.js';

const FALLBACK = pages[0];

// 把任意 pathname 正規化成有註冊的 route（解百分號編碼、收合重複斜線、去尾斜線；找不到回 null）
export function resolve(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(pathname)); // /%61bout 與 /about 是同一頁
  } catch {
    return null; // 壞掉的百分號編碼（/%E0）不當成站內路徑，交給原生導覽去 404
  }
  const collapsed = decoded.replace(/\/{2,}/g, '/'); // //about 收成 /about，避免同一頁有兩種寫法
  const clean = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  return byRoute.get(clean) || null;
}

export function createRouter(onNavigate) {
  // 目前這一頁的 route：popstate 時用來判斷是不是只換了 hash／search（那就不該重繪）
  let currentRoute = null;

  // 實際切換頁面；replace 用於首次載入，不推新的歷史紀錄。
  // search／hash 原樣帶著走，進站的 ?utm_source= 與 #main 不會被洗掉
  function go(pathname, { search = '', hash = '', replace = false, silent = false } = {}) {
    const page = resolve(pathname) || FALLBACK;
    if (!silent) {
      const method = replace ? 'replaceState' : 'pushState';
      history[method]({ route: page.route }, '', page.route + search + hash);
    }
    currentRoute = page.route;
    onNavigate(page);
    return page;
  }

  // 攔截站內連結，避免整頁重載；外部連結、新分頁、下載一律放行
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // 事件可能來自非元素節點（文字節點、document），沒有 closest 就直接放行——與 overlay.js 同寫法
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    // 同頁錨點（含 skip-link 的 #main）交給瀏覽器原生跳：攔下來會沒有捲動也沒有焦點移動
    if (url.pathname === location.pathname && url.hash) return;
    if (!resolve(url.pathname)) return; // 舊 demo/ 等非 SPA 路徑走原生導覽
    event.preventDefault();
    go(url.pathname, { search: url.search, hash: url.hash });
  }

  document.addEventListener('click', onClick);
  window.addEventListener('popstate', () => {
    // 只差 hash／search 的同頁歷史紀錄不重繪：重繪會把展開的 <details> 收起來、焦點也被搬走
    const page = resolve(location.pathname) || FALLBACK;
    if (page.route === currentRoute) return;
    go(location.pathname, { silent: true });
  });

  return {
    go,
    start: () =>
      go(location.pathname, { search: location.search, hash: location.hash, replace: true }),
  };
}
