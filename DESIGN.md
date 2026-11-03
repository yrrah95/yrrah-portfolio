---
name: Claude Code Everyday
description: Threads 貼文存檔與 Claude Code skill 目錄，米色紙本質感，一個橘紅點綴色。
colors:
  paper: "#f6f1e6"
  paper-card: "#fbf8f0"
  paper-code: "#ece5d3"
  ink: "#201f1a"
  ink-muted: "#6b6558"
  hairline: "#e0d8c6"
  stamp-orange: "#b04a28"
  on-stamp: "#ffffff"
  night: "#1c1b17"
  night-card: "#25241f"
  night-code: "#14130f"
  night-ink: "#efe9db"
  night-ink-muted: "#a39c8c"
  night-hairline: "#34322b"
  night-stamp-orange: "#e08a66"
  night-on-stamp: "#1c1b17"
typography:
  display:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "44px"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.stamp-orange}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-outline-hover:
    backgroundColor: "{colors.stamp-orange}"
    textColor: "{colors.paper}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.paper-card}"
    rounded: "{rounded.lg}"
  command-box:
    backgroundColor: "{colors.paper-code}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: Claude Code Everyday

> 這份文件由現有網站的樣式檔反推而成（2026-11-03）。「North Star」「顏色名稱」「Do/Don't」裡有幾條是我替你下的結論，不是你親口說的，標了「待你確認」。改了請直接改這份，不用問我。

## Overview

**Creative North Star: "The Paper Archive"（紙本索引卡）**

一個把 Threads 短貼文和 skill 清單整理成「可以翻找的索引卡」的網站。米色紙、細線、深墨色字，只有一種橘紅像印章一樣蓋在重要的數字和連結上。畫面不靠裝飾，靠位置、分組和字級的階層讓人看懂；每個區塊都該回答「這是什麼、值不值得點進去」。

它是 Read 型網站：人來這裡是為了看懂一個用法、挑一個 skill。所以密度偏高（列表一列一個項目、三到四個資訊），但文字一律有行距和行長限制，不為了塞資訊犧牲可讀性。深色模式不是反白，是另一張同樣溫暖的紙：暖黑底、米白字。

**Key Characteristics:**
- 暖米色（淺）與暖黑（深）兩套完整配色，跟著系統設定走，沒有切換鈕。
- 單一點綴色：橘紅，只用在數字、連結、焦點與主要按鈕。
- 平面為主：靠 1px 細線和底色差分層，不用陰影堆深度。
- 只用系統字，不載入網路字體（零依賴、不外連）。
- 固定字級階梯，不隨意加新尺寸。

## Colors

暖紙與暖墨，加一個橘紅。中性色全部偏黃，沒有純灰、純白或純黑。

### Primary
- **印章橘紅** (#b04a28 淺 / #e08a66 深)：數字（安裝次數、瀏覽量）、連結 hover、焦點框、主要按鈕、頁碼目前頁、選取色（28% 透明）。淺色版刻意加深到對比度 4.8:1（舊值 #c96644 只有 3.4:1，不合格）。按鈕上的字用 `--on-acc`：淺色是白、深色是暖黑（白字在深色版的橘底只有 2.6:1）。

### Neutral
- **米色紙** (#f6f1e6 / #1c1b17)：頁面底色。
- **卡片紙** (#fbf8f0 / #25241f)：面板、列表底、輸入框。比頁面底色略亮，靠這個差距分層。
- **程式碼紙** (#ece5d3 / #14130f)：安裝指令框。比頁面底色略深，讓「可複製的東西」看起來像貼上去的紙條。
- **墨色** (#201f1a / #efe9db)：主要文字，對比度約 14:1。
- **灰墨** (#6b6558 / #a39c8c)：次要文字（說明、日期、分類）。淺色版在米色底 5.1:1，在程式碼紙上 4.6:1；不要再調淡。
- **細線** (#e0d8c6 / #34322b)：分隔線和外框，只用 1px。它不是文字色，只當結構線。

### Named Rules
**The One Stamp Rule.** 橘紅出現的地方，是這一頁最值得看的東西。一個畫面裡橘紅字不超過幾處，不拿它當裝飾。

**The Both Themes Rule.** 每個新顏色同時定義淺色與深色兩個值，寫成 token（`:root` 與深色媒體查詢）；元件裡不寫死色碼。文字對比度一律 4.5:1 以上，大字 3:1。

## Typography

**Body Font:** Noto Sans TC（備援：PingFang TC、Microsoft JhengHei、system-ui）
**Code Font:** ui-monospace、SFMono-Regular、Consolas

**Character:** 純系統字，中文為主、不裝飾。靠字級與粗細分層，不靠換字體。只有兩種字重（400 與 700），因為微軟正黑只有這兩種，其他字重會被瀏覽器猜成 700。等寬字只用在 skill 名稱與指令。

### Hierarchy
字級用 token `--fs-*`，不要在元件裡直接寫 px。

- **Display** (700, 32px `--fs-4xl`, 1.25)：Skill 詳細頁的 skill 名稱。手機降為 28px。
- **Headline** (700, 28px `--fs-3xl`, 1.3)：頁面主標題（列表頁、套件頁、首頁）。
- **Title** (700, 18–24px `--fs-lg`／`--fs-2xl`)：貼文標題 24px、套件名稱 18px、排名數字 24px（前三名橘紅，其餘灰墨）。
- **Lede** (400, 20px `--fs-xl`, 1.75)：詳細頁一句話簡介，行寬限制約 34 個中文字。
- **Body** (400, 16px `--fs-base`, 1.7–1.8)：內文與貼文全文。長文行高 1.8。
- **List** (400／700, 15px `--fs-list`)：列表裡的 skill 名稱與簡介，密度優先。
- **Label** (700, 14px `--fs-sm`, 字距 0.04em)：區塊小標、日期、標籤、數字說明。
- **Caption** (700, 12px `--fs-xs`)：最小的字，只給分類縮寫與徽章，不低於 12px。

### Named Rules
**The No New Size Rule.** 想要新字級，先確認既有九階（12/14/15/16/18/20/24/28/32）是否不夠；不夠才補，並同步更新 token。

**The Measure Rule.** 長文行寬限制在約 34em（中文約 34 字）。容器可以寬，文字不跟著拉長。

**The Tabular Rule.** 會對齊比較的數字（安裝次數、排名、頁碼、瀏覽量）一律 `font-variant-numeric: tabular-nums`。

## Layout

單欄為主，內容寬度由 token 決定：

- 列表、套件頁、首頁、導覽與頁尾：最寬 1320px（`--wrap`）。
- 貼文頁：最寬 1200px，電腦版左邊圖卡（約 440px）、右邊文字。
- Skill 詳細頁：最寬 1080px，單欄。
- 兩側留白至少 16px，手機也一樣。

斷點只用四個：520px（詳細頁數字格縮小）、560px（導覽收合）、760px（列表改單欄、功能分類收成下拉選單）、860px（貼文頁分兩欄）。間距以 8 的倍數為主：列表間距 14–16px、區塊上方 44px、區塊標題與內容 10px；同一組的東西靠緊，不同組放寬。

導覽列固定在上方，高度 56px，背景是 88% 的底色加 8px 模糊，只為了讓捲動時文字不被蓋住。

## Elevation & Depth

平面為主。深度靠兩件事：卡片紙比頁面底色亮一階、1px 細線。只有兩處用陰影，都是「浮在上面的東西」：排序下拉選單（`box-shadow: 0 8px 24px rgba(0,0,0,.28)`）和回到頂端按鈕（`0 2px 10px rgba(0,0,0,.3)`）。陰影有偏移與模糊，不用零偏移光暈，不用硬邊陰影。

### Named Rules
**The Flat-By-Default Rule.** 面板、列表、標籤在靜止時沒有陰影；只有浮動元件有。

## Shapes

圓角溫和、分四階：標籤與小徽章 6px、按鈕與輸入框 10px、面板與列表外框 12px、圖卡 12–14px；標籤藥丸與圓形按鈕用 999px／50%。外框一律 1px 細線，沒有粗框。避免超過 1px 的彩色單側邊框。

## Components

### 外框按鈕（主要動作）
- **Shape:** 40px 高、10px 圓角、左右 16px。
- **Default:** 透明底、1px 橘紅框、橘紅粗體字。
- **Hover:** 橘紅填滿、字改成頁面底色。
- **次要版本:** 框與字用細線色與灰墨，不搶眼（如「看套件」）。
- **Focus:** 2px 橘紅焦點框、外移 2px（全站統一）。

### 標籤（tag）
- 藥丸形（999px）、1px 細線框、14px 灰墨字、行高 26px。
- 可點的標籤在 hover 時框線與字變深；不加底線。可點範圍用偽元素外擴 6px，外觀不變。
- 「AI翻譯」徽章：12px、虛線框、6px 圓角，只出現在詳細頁與套件頁。

### 列表列（套件列、skill 列）
- 無外框、列與列之間 1px 細線；hover 時底色變成卡片紙。
- 左：名稱（等寬、粗體 15px）加分類（12px 灰墨）；中：簡介（15px，最多兩行）；右：安裝次數（橘紅、等寬數字、右對齊）。
- 手機：名稱與次數同一行，簡介與分類換到下面。

### 數字格（facts）
- 四欄自適應網格、格與格 1px 細線、整組 12px 圓角外框、卡片紙底。
- 標籤 14px 灰墨、數字 18px 粗體；最重要的一格（安裝次數）用橘紅。

### 指令框
- 程式碼紙底、10px 圓角、等寬 14px；右邊整塊「複製」按鈕，墨色粗體（橘紅在程式碼紙底上對比不足 4.5:1），中間 1px 細線隔開。指令過長時框內橫向捲動。

### 圖卡輪播（貼文頁）
- 圖片直接放進 12px 圓角細線框；下方只有「1 / N」；左右圓形箭頭浮在圖上。可用鍵盤左右鍵與滑動。沒有圓點。

### 導覽與頁尾
- 導覽：站名字標圖（深淺兩版）、三個連結（目前頁為墨色粗體、其餘灰墨）；每個連結可點高度至少 40px。
- 頁尾：只放 Threads 連結與網站更新日期。

## Do's and Don'ts

### Do:
- **Do** 所有顏色走 token，淺深兩個值同時定義；文字對比度 4.5:1 以上。
- **Do** 字級走 `--fs-*`、內容寬度走 `--wrap`；新尺寸先補 token。
- **Do** 互動元素的可點高度至少 40px（密集列表整列可點時例外）。
- **Do** 長文加 `text-wrap: pretty`、標題加 `text-wrap: balance`，行寬限制約 34 個中文字。
- **Do** 一個點、一個說法：免責聲明、標籤、連結入口在整個網站只說一次（待你確認：這是 2026-11-03「砍多餘」那輪確立的做法）。

### Don't:
- **Don't** 引入網路字體或第二個字族（鐵律 1 零依賴、也不外連）。
- **Don't** 用 800 或 600 字重：微軟正黑只有 400／700。
- **Don't** 在元件裡寫死色碼或 px 字級。
- **Don't** 用 kicker／eyebrow（標題上方的小字標籤）、漸層字、單側粗彩色邊框、巢狀卡片。
- **Don't** 用陰影分層；浮動元件以外的東西保持平面。
- **Don't** 為了「看起來完整」加說明字：靠位置、分組、大小讓人看懂（全域規則）。
