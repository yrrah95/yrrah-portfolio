# 測試

測試是讓 vibe coding 變安全的那道護欄——改得快，但不會在沒人發現的情況下改壞。

## 框架

**Node 內建 `node:test` + `node:assert/strict`，零依賴**。不裝 Jest、Vitest 或任何測試套件。

需要 Node 22 以上：`package.json` 的 `engines.node` 寫 `>=22`，`.nvmrc` 也釘 22。（`node:test` 本身從 Node 20 起穩定，這裡要求 22 是為了跟 CI 對齊。）本機開發用的版本是 Node 24，CI 跑 Node 22。

## 怎麼跑

```bash
npm test
```

建置驗證另外跑：

```bash
npm run build
```

兩者在每次 push 與 PR 都會由 `.github/workflows/test.yml` 自動執行。

> `package.json` 的指令是 `node --test "test/**/*.test.js"`，不是 `node --test test/`。
> Node 22 之後位置參數當成 glob 樣式解讀，直接給目錄名會被當成單一檔案而失敗。

## 目前測什麼

| 檔案 | 範圍 |
|---|---|
| `test/pageMarkup.test.js` | 語意 HTML 產生器：對開／單欄結構、標題階層、目錄不再印在 `<main>`、讀更多標籤、`esc()` 跳脫與 `safeHref()` 白名單、相片直橫式與去背 modifier、主視覺 `fetchpriority` 與長文圖 lazy、`width`／`height` 只收正整數、contact 表單（access_key／蜜罐／狀態列／無 JS 可送）、`renderHead` 的 canonical |
| `test/chrome.test.js` | 書殼字串：9 顆星星與 `aria-current`、`adjacent()` 前後頁、端點頁控制項停用、頁碼、目錄浮層；hidden 頁（`/contact/sent`）不進星星／目錄／頁序，頁碼顯示「— / 9」 |
| `test/router.test.js` | `resolve()` 的路徑正規化（尾斜線、重複斜線、百分號編碼與壞編碼、未註冊路徑、根路徑） |
| `test/pages.test.js` | 內容資料完整性：route 唯一、必填欄位、圖檔真的存在於 `assets/`、longform block 只用支援的 key |
| `test/capability.test.js` | `hasWebGL`／`prefersReducedMotion`／`shouldRenderScene` 的所有分支（用假的 `window`／`document` 全域替身，不需要 jsdom） |
| `test/prerender.test.js` | `scripts/lib/prerenderPaths.mjs` 的平檔輸出路徑、10 條不重複（含 hidden 頁）、逃出 `dist` 會丟錯；以及殼裡三個佔位符 |
| `test/viteRoutes.test.js` | `vite.config.js` 的 dev／preview route middleware（用假 server 抓 middleware 直接餵 req） |
| `test/contactForm.test.js` | `submitContact()` 送出結果判讀：成功 JSON、`res.redirected` 也算成功、`success:false`／非 JSON／非 2xx／fetch reject 皆失敗、entries 不含 `redirect`。fetch 全是 stub，不對 Web3Forms 發真實請求 |
| `test/redirects.test.js` | `_redirects` 與 `pages.js` 的一致性：規則數、目的地已註冊、不自我轉址、帶不帶 `.html` 都有規則 |

共通點：**都是純函式或純字串改寫**——輸入資料、輸出字串或物件，不碰真瀏覽器。這一層正好是鐵律 3 的承重結構（prerender 產出的語意 HTML），壞掉會同時打到 SEO 與無障礙，所以優先測它。

## 還沒測什麼

以下需要 jsdom 或真瀏覽器，目前一律不測，列為之後的事（TODOS.md 有一條 P2）：

- `render/chrome.js` 的 `syncChrome()`——執行期 DOM 屬性同步
- `router.js` 的 `createRouter()`——會碰 `document` 與 `history`，**不可以在 node 裡呼叫**
- `lib/keys.js` 鍵盤翻頁、`lib/overlay.js` 浮層
- `lib/contactForm.js` 的送出流程（要有 `fetch` 與 DOM 事件才測得到成功／失敗／蜜罐三條路）
- three.js 場景與視覺回歸

`lib/capability.js` 原本也在這張清單上，後來發現它只讀兩個全域，用替身就測得到，已經移到上面那張表。

要補的話，優先順序是先加 jsdom 補 `syncChrome`（它與 `renderChrome` 是同一份結構的兩種時機，最容易走鐘），再補 `contactForm`，最後才考慮瀏覽器層的 e2e。

瀏覽器層目前靠手動實測補：headless Edge ＋ CDP 腳本（放在 session 的 scratchpad，不進版控）驗過鍵盤翻頁、skip-link 不推 SPA 歷史、`?utm_source=` 進站不被洗掉。

## 慣例

- 檔名 `test/<module>.test.js`，一個原始檔對一個測試檔
- 一律 `import assert from 'node:assert/strict'`（用嚴格比較，不要寬鬆版）
- 全部用扁平的 `test()`，不用 `describe`/`it`，一個 `test` 測一個行為
- 測試名稱用繁體中文，描述「行為」不是「函式名」
- 需要測真實內容裡不存在的分支（例如去背相片）時，造一個最小的假 page 物件，不要去改 `src/content/pages.js`
- 測試紅了先確認是不是測試寫錯；如果是 `src/` 真的有 bug，修 src 並補一個回歸測試
