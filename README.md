# yrrah-cc

Claude Code Everyday（Threads @yrrah9_）貼文的靜態存檔網站。

- 產生網頁：`node build.mjs`（零依賴，輸出到 `dist/`）。資料來源預設是本機 Threads skill 的 tips 資料夾，可用 `--data`、`--cards` 或環境變數 `YRRAH_DATA`、`YRRAH_CARDS` 指定。
- 量測：Cloudflare Web Analytics 的網站代碼放在 `site.config.json`（公開代碼，非機密），build 時自動加進每個頁面；也可用環境變數 `CF_BEACON_TOKEN` 覆蓋。
- 圖片例外：少數貼文的圖卡資料夾不是 `D<N>`，對照寫在 `image-overrides.json`。
- 部署：Cloudflare Pages 連這個 repo，建置指令是空的 `npm run build`（`package.json` 裡只印一行字），輸出資料夾 `dist`，`dist/` 要一起 commit。目前上線在 yrrah-5i5.pages.dev：推到 `yrrah-portfolio` 的 `archive` 分支（Pages 專案 `yrrah` 的生產分支）。
- 內容：貼文文字、圖卡、留言區指令，加上排行榜用的瀏覽量與按讚量（取每篇最後一筆快照，其餘成效數據不放）。
