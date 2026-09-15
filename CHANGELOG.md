# Changelog

所有對外可見的改動都記在這裡。格式依 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版號四位 `MAJOR.MINOR.PATCH.MICRO`。

## [0.1.0.0] - 2026-09-15

立體書改版 Phase 1：整站從靜態 Atelier 版重做成「可翻閱的互動立體書」骨架，取代舊的 `*.html` 頁面。

### Added
- 一本 9 頁的書：封面、6 個作品對開、作者的話、聯絡。每頁一個乾淨網址（`/`、`/work/<slug>`、`/about`、`/contact`），舊 `*.html` 網址全部 301 轉過去。
- 每個作品頁先看精華旁白與作品相片，想看細節再展開「讀更多」完整案例；沒有 JavaScript 也能展開閱讀。
- 書殼：頂部星星進度列（可點跳頁）、底部上一頁／下一頁、右上角目錄浮層；鍵盤 ← → 翻頁、Esc 關目錄、Tab 走得完所有控制項。
- 桌機兩欄對開（左文字卡、右相片台、中央摺線），手機單欄；作品截圖做成「貼進書裡的相片」（奶油白邊、微傾、落影）。
- 聯絡頁表單重新搬進新版（姓名、Email、LINE ID、案子類型、預算、時間點、內容），送出成功會告知；沒有 JavaScript 也能送，送出後跳到 `/contact/sent` 確認頁。
- 每頁在建置時預先產出完整 HTML，搜尋引擎與螢幕報讀軟體不必等 JavaScript。
- 網址列會保留 `?utm_*` 與 `#錨點`，「跳到主要內容」連結正常運作。

### Changed
- 配色改為深夜藍底＋燈火暖橘強調、奶油色文字卡；標題 Noto Serif TC、內文 Noto Sans TC。
- 四個 demo 子站維持原樣可用，路徑不變。

### Fixed
- 首屏作品相片不再延遲載入，開頁更快看到主圖。
- 使用者要求減少動態、或裝置不支援 WebGL 時，只顯示靜態內容，不啟動任何動畫。

### Infrastructure
- 建置改為 Vite；`npm test` 使用 Node 內建測試（零依賴），GitHub Actions 每次 push 跑測試與建置。
