# yrrah-cc

Claude Code Everyday（Threads @yrrah9_）貼文的靜態存檔網站。

- 產生網頁：`node build.mjs`（零依賴，輸出到 `dist/`）。資料來源預設是本機 Threads skill 的 tips 資料夾，可用 `--data`、`--cards` 或環境變數 `YRRAH_DATA`、`YRRAH_CARDS` 指定。
- 量測：設定環境變數 `CF_BEACON_TOKEN`（Cloudflare Web Analytics 的網站代碼）再 build，頁面才會帶量測碼。
- 圖片例外：少數貼文的圖卡資料夾不是 `D<N>`，對照寫在 `image-overrides.json`。
- 部署：Cloudflare Pages 連這個 repo，建置指令留空，輸出資料夾 `dist`。`dist/` 要一起 commit。
- 只放貼文文字、圖卡與留言區指令，不放成效數據。
