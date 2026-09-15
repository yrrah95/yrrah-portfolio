# TODOS

## 舊站清理

### 清掉舊靜態站剩下的檔案

**What:** 把根目錄的 `index.html`、六個 `work-*.html`、`about.html`、`contact.html`、`css/style.css`、`sitemap.xml` 整批刪掉，並把四個 demo 子站裡指回舊站的 `../../work-*.html`、`../../index.html` 回鏈改成乾淨路徑。

**Why:** 新站已經接管全部 route，這些檔案還躺在 repo 裡只會造成兩份真實來源——改內容時很容易改到沒人看的那一份。根目錄的 `sitemap.xml` 更危險：`scripts/copy-legacy.mjs` 只要有人手滑把它加進複製清單，就會蓋掉 prerender 產的乾淨版本。

**Context:** contact 表單已經在 2026-09-15 搬進 `src/content/pages.js` 的 `form` 欄位與 `src/render/pageMarkup.js` 的 `contactForm()`，舊 `contact.html` 不再是唯一有表單的地方，這是動手清理的前提，現在已滿足。`_redirects` 已經備妥 `.html` 與無副檔名兩種轉址，刪檔不會讓舊連結斷掉。demo 子站是鐵律 7 的範圍外檔案，只改回鏈的 `href`，不碰版面與設計系統。`css/tokens.css` **不可以刪**——`demo/dashboard` 與 `demo/family` 以 `../../css/tokens.css` 依賴它。`404.html` 也要留，它是 Cloudflare Pages 的 404 頁（連結已經改成乾淨路徑）。動手前逐檔列清單給使用者點頭。

**Effort:** M
**Priority:** P1
**Depends on:** None（contact 表單搬遷已完成）

## 安全性

### 收緊 CSP：拿掉 script-src 的 'unsafe-inline' 與 jsdelivr

**What:** `_headers` 的 `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` 收成 `script-src 'self'`，Phase 2 掛上 three.js 後再視需要補 `worker-src 'self'`。

**Why:** `'unsafe-inline'` 讓 CSP 對 XSS 幾乎失效——`safeHref()` 擋的是連結目標，擋不了被注入的 `<script>`。jsdelivr 則是舊站時期留下的，新站 three.js 走 npm bundle（同源），沒有任何檔案再從 CDN 取 script。

**Context:** 不能直接改的原因是四個 demo 子站（鐵律 7 範圍外，不重設計）可能還帶著 inline `<script>` 與 CDN script 標籤——CSP 是站台層級的 header，收緊會同時打到它們。動手順序：先 `grep -rn "<script" demo/` 盤點四個 demo 有沒有 inline script 與外部 script，再決定是整站收緊還是用 `_headers` 為 `/demo/*` 開一條較寬的規則。`connect-src` 已經是 `'self' https://api.web3forms.com`（contact 表單需要），那一項不要動。

**Effort:** M
**Priority:** P2
**Depends on:** 四個 demo 的 inline script 盤點

## 測試

### DOM 層測試：jsdom 或 E2E

**What:** 補上目前完全沒測到的 DOM 層：`render/chrome.js` 的 `syncChrome()`、`router.js` 的 `createRouter()`、`lib/keys.js`、`lib/overlay.js`、`lib/contactForm.js`。

**Why:** 這五支合起來就是整站的執行期行為。`syncChrome()` 與 `renderChrome()` 是同一份結構的兩種時機，最容易在改版時走鐘；`createRouter()` 剛加了 search／hash 保留與 popstate 同頁判斷，這些分支目前只有手動實測驗過，沒有回歸網。

**Context:** 現況見 `TESTING.md`「還沒測什麼」。零依賴是刻意的選擇（只用 `node:test`），所以加 jsdom 等於第一次破例，要先確認值得。替代路線是 headless Edge ＋ CDP 腳本（本專案已經這樣手動驗過鍵盤翻頁與 skip-link），把那些一次性腳本收成 `test/e2e/` 就能重複跑。優先順序：`syncChrome` → `contactForm`（成功／失敗／蜜罐三條路）→ `createRouter` → 鍵盤與浮層。

**Effort:** L
**Priority:** P2
**Depends on:** None

## 素材

### 換掉 assets/work/noevii.jpg

**What:** 重拍或重新裁一張 NOEVII 的作品截圖，取代 `assets/work/noevii.jpg`。

**Why:** 現有素材的左緣被裁掉一截，放進相片台（白邊＋微傾）之後那道裁切邊更明顯，看起來像截圖失手而不是設計。NOEVII 是作品集裡的主力案例之一，第一眼就露餡不划算。

**Context:** 相片台版位與尺寸由 `src/content/pages.js` 的 `image: { src, width, height, alt }` 決定，換圖要一起更新 `width`／`height`（`test/pages.test.js` 會檢查檔案存在）。若之後拿到去背 alpha PNG，記得一併加 `silhouette: true`，相片台會改走剪影模式（PROJECT.md 2026-09-15 裁決）。

**Effort:** S
**Priority:** P2
**Depends on:** 重新取得 NOEVII 的畫面素材

## Phase 2

### 7f：書封 loading 動畫

**What:** 進站時用純 HTML/CSS 的閉合書封當 loading，three.js 與資產載完後書翻開進封面。

**Why:** 這是 PROJECT.md「書的結構」裡明文寫的進站體驗，也是「炫技即作品」的第一印象；現在進站是直接出現內容，少了那一下。

**Context:** 規格見 `.claude/PROJECT.md`「書的結構」最後一段。純 HTML/CSS 秒出是關鍵——loading 本身不可以等 three.js，否則無 WebGL 的人會卡在空白畫面（鐵律 3）。

**Effort:** M
**Priority:** P3
**Depends on:** None

### Phase 2 任務 10：three.js 舞台

**What:** 在 `src/main.js` 的 `shouldRenderScene()` 分支裡 `import('./scene/stage.js')`，替每個對開建一個 three.js Scene。

**Why:** 鐵律 2 寫死了全 three.js 場景，那是這個作品集的主要賣點；目前 `#stage` 只是個空的掛載點。

**Context:** 進入點已經備好：`src/main.js` 裡 `document.documentElement.dataset.scene = 'on'` 那一段就是掛載位置，`src/index.html` 有 `<div id="stage" aria-hidden="true">`。限制見 `.claude/PROJECT.md` 技術棧：資產必須同源（`connect-src`）、不可用 blob 貼圖與 blob worker 解碼器（draco／ktx2 那類）。掉幀降級 fallback 是無障礙要求，不是效能預算（鐵律 4）。

**Effort:** XL
**Priority:** P3
**Depends on:** 7f 書封 loading（兩者共用進站時序）

## Completed
