# yrrah-cc

Claude Code Everyday（Threads @yrrah9_）貼文存檔網站。零依賴靜態站，`node build.mjs` 產出 `dist/`。上線在 https://yrrah-5i5.pages.dev。

## 鐵律（不可違反；與全域規則衝突時此區優先）

1. **零依賴**。不引入 npm 套件、不加前端框架；新增任何依賴先問使用者。
2. **部署只走 GitHub 同步**：`git push portfolio main:archive`（Pages 專案 `yrrah` 的生產分支是 `archive`）。不用 wrangler 上傳，排程不需要 Cloudflare 金鑰。`dist/` 要一起 commit。
3. **`portfolio` remote 的 `master` 分支不准動**：那是接客作品集（myweb）的原始碼，要留著還原用。
4. **只放公開需要的欄位**：貼文文字、圖卡、CTA 文字、瀏覽量與按讚量。不放其餘成效數據、`features` 內部筆記、`note`、追蹤數、任何機密。
5. **網頁先於貼文**：每篇貼文要先上線、發文後 CTA 留言附該頁連結（`/d/<N>/`）。發文前的上線由 threads skill 的 `bin/site-publish.mjs` 負責，這個專案不能讓它壞掉。
6. **貼文資料來源是 threads skill 的 tips 資料夾**，這個專案只讀不寫。Skill 與 Plugin 清單來自 `data/` 底下的資料檔，由 `tools/` 的同步與抓取指令唯讀產生（2026-11-03 裁決：原條文只寫 tips 資料夾，與 Skill 頁矛盾）；`build.mjs` 只讀本地資料、不連網。

## 指令

- 產生網站：`node build.mjs`（`--out <資料夾>` 輸出到別處、`--pending <json>` 帶一筆還沒進 posts.jsonl 的貼文）
- 解釋文案：`explain/D<N>.md`（STE 寫法，一篇一檔；沒有檔的頁面不顯示解釋區），由 `site-publish.mjs --explain` 放進來
- 圖片例外：`image-overrides.json`
- 量測碼：`site.config.json`（Cloudflare Web Analytics，公開代碼）。只在正式站網址（yrrah-5i5.pages.dev）載入，預覽分支與本機不計數
- Skill 資料：`tools/sync-skills.mjs`（工作站同步）、`fetch-packs.mjs`、`fetch-installs.mjs`、`fetch-catalog.mjs`，輸出到 `data/`
- 視覺設計：改版型、字體、顏色前先讀 `DESIGN.md`（字級用 `--fs-*`、內容寬用 `--wrap`、顏色一律走 token，深淺兩套都要過對比度 4.5:1）

## 收工

`/ship` 或手動 commit 後，異動說明寫進 `.claude/worklog.md` 最上面。
