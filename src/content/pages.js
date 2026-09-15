// 全站內容的唯一真實來源。
// prerender 腳本與執行期的 three.js overlay 都讀這一份，兩邊不會走鐘。
//
// narration：精華旁白（3–6 短句），第一人稱、場景開場，逐字反黃跑的就是這幾句。
// longform：「讀更多」展開的長文，沿用舊 work-*.html 的案例文字，只改導覽用語。
//   block 形狀（渲染見 src/render/pageMarkup.js）：
//     { h2 }      小節標題，保住 prerender 的標題階層（鐵律 3）
//     { p }       段落
//     { note }    附註（隱私、示意資料聲明）
//     { demo }    試玩連結 { href, label, note }
//     { figure }  補充圖 { src, width, height, alt, caption }
//     { cta }     段尾邀約 { lead, href, label }
//   href 以 http 開頭者渲染成外連（target=_blank rel=noopener）。
// image.silhouette: true 表示該圖是去背 alpha PNG，相片台不加白邊與傾斜。
//
// form：只有 contact 頁有，渲染見 src/render/pageMarkup.js contactForm()。形狀：
//   { action }     表單 POST 目的地（Web3Forms 端點）
//   { accessKey }  Web3Forms 的公開表單 key——會出現在 HTML 原始碼裡，不是機密
//   { subject }    收到的信件主旨（hidden 欄位）
//   { redirect }   無 JS 時原生 POST 後跳到的確認頁，必須是絕對 URL（見下方 contact 頁註解）
//   { fields }     欄位陣列 { id, name, label, type, required, placeholder, options }
//                  type 支援 text／email／textarea／select，其餘一律當 text 渲染成 <input>
//                  type: 'select' 才讀 options：字串＝value 與顯示文字相同，
//                  { value, label } 可做出空值提示（第一個放 { value: '', label: '選一個' }）
//   ⚠ fields[].name 不可用 action／reset／submit／method 等 HTMLFormElement 屬性名——
//     同名欄位會在 DOM 上遮蔽掉表單本身的屬性（所以 contactForm.js 用 getAttribute('action')）

export const SITE = {
  name: 'Yrrah',
  tagline: '網頁開發・UI設計・平面設計',
  baseUrl: 'https://yrrah-5i5.pages.dev',
  ogImage: '/assets/og.png',
  threads: 'https://www.threads.net/@yrrah9_',
};

// kind: cover | work | about | contact | sent —— 決定該對開用哪個場景模板
// hidden: true 的頁不進星星列／目錄／前後頁／sitemap，但仍 prerender 出平檔、router 也 resolve 得到
// noindex: true 會讓 renderHead 多輸出 <meta name="robots" content="noindex">
export const pages = [
  {
    slug: 'cover',
    route: '/',
    kind: 'cover',
    title: 'Yrrah — 網頁開發・UI設計・平面設計',
    heading: 'Yrrah',
    description: 'Yrrah 的接案作品集：一本可以翻的立體書。網頁開發、UI設計、平面設計。',
    narration: [
      '這是一本可以翻的書，六個案子，一頁一個。',
      '每一頁先講「為什麼做」，想看細節再展開。',
      '網頁開發、UI設計、平面設計——我做的東西都在裡面。',
      '往下翻，或從目錄挑一頁開始。',
    ],
    longform: [],
  },
  {
    slug: 'family',
    route: '/work/family',
    kind: 'work',
    title: 'Family — Yrrah',
    heading: 'Family',
    tags: '網頁開發 · 產品設計',
    description: 'React、Vite、Firebase 打造的家庭感謝 PWA，讓家人之間互相留一句感謝的地方。',
    image: { src: '/assets/work/family.webp', width: 1242, height: 2688, alt: 'Family App 首頁畫面，顯示家人之間互相感謝的訊息牆' },
    narration: [
      '「晚安，媽媽。今天家裡有 2 份付出被看見。」',
      '這是 Family 打開時，你會看到的第一句話。',
      '煮飯、接送、張羅——家人不是不感謝，是想不起來。',
      '也沒有一個地方可以隨手留一句。',
      '所以我做了一面牆，讓付出被看見。',
    ],
    longform: [
      { demo: { href: '/demo/family/index.html', label: '▶ 試玩 demo', note: '純前端重製，沒有真的帳號系統，留言只存在你的瀏覽器裡。' } },
      { h2: '問題' },
      { p: '煮飯、接送、張羅這些事，家人不是不感謝，只是想不起來，也沒有一個地方可以隨手留一句。付出久了沒人回應，慢慢就不想再說了。' },
      { h2: '怎麼做' },
      { p: 'Family 是一個能加到手機主畫面的 PWA。輸入一句話，例如「煮飯」，選一個對象，對方會收到通知，牆上也會留下紀錄，其他家人也看得到。介面上用角色稱謂——媽媽、爸爸、兒子、妹妹，不用真名，因為這是要給任何一個家庭用的，不是只給我家用的。' },
      { h2: '技術' },
      { p: 'React 19、Vite、Firebase 打底，帳號與資料都在 Firebase 上。設計成 PWA，可以直接「加到主畫面」當一個真的 App 使用，也包了一層 Android TWA，離上架只差最後幾步。' },
      { h2: '我的角色' },
      { p: '一個人包了產品定義、介面設計、前後端開發。README 跟設計文件從第一版寫到現在——用角色稱謂取代真名，是設計過程裡的一個決定，不是後來才想到的補救。' },
      { note: '案例畫面使用產品本身的上架素材，內容以角色稱謂呈現，未使用真實姓名。' },
      { cta: { lead: '想做一個類似、給更多人用的產品？', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'teach',
    route: '/work/teach',
    kind: 'work',
    title: 'TEACH — Yrrah',
    heading: 'TEACH',
    tags: '網頁開發 · 平面設計',
    description: '20堂互動課程的靜態教學網站，涵蓋表達、商業思維、唱歌音準。',
    image: { src: '/assets/work/teach.jpg', width: 1568, height: 744, alt: 'TEACH 教學網站首頁，一堂互動選擇題畫面' },
    narration: [
      '「主管在走廊攔住你：『登入功能進度如何？』四個選項都是十五個字，挑一個。」',
      '這是 TEACH 每一課的開場。',
      '線上課程常常是講完就結束，看完不代表學會。',
      '臨場該怎麼回答這種事，光看影片練不出來，要真的被問一次。',
      '所以 20 堂課，每一課都先問你，再讓你往下讀。',
    ],
    longform: [
      { demo: { href: '/demo/teach/index.html', label: '▶ 試玩 demo', note: '完整網站，可以直接玩幾堂課。' } },
      { h2: '問題' },
      { p: '線上課程常常是講完就結束，看完不代表學會。尤其是「臨場該怎麼回答」這種技能，光看影片練不出來，需要真的被問一次。' },
      { h2: '怎麼做' },
      { p: 'TEACH 是一個純靜態網站，20 堂課、三個主題——中文表達力、商業思維、唱歌音準，免費、不用註冊。每一課都用情境選擇題開場，答錯了不是扣分，畫面會告訴你「這是你的過程，不是結果」，逼你在看到正確答案之前先想一次，再往下讀。' },
      { h2: '設計' },
      { p: '整站是手刻的靜態頁面，自己定了一套設計規則、404 頁、社群分享圖，沒有套用任何課程平台的樣板。' },
      { h2: '我的角色' },
      { p: '內容規劃、介面設計、前端全部自己做。' },
      { cta: { lead: '想做一個把「被動看」變成「主動答」的教學網站？', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'insurance',
    route: '/work/insurance',
    kind: 'work',
    title: '保險客戶分堆工具 — Yrrah',
    heading: '保險客戶分堆工具',
    tags: 'UI設計 · 工具設計',
    description: '幫媽媽做的保險客戶管理工具，深色紙感介面，一個人真的在用的實戰案例。',
    image: { src: '/assets/work/insurance.jpg', width: 1568, height: 744, alt: '保險客戶分堆工具的滑卡介面，深色紙感風格' },
    narration: [
      '一份客戶名單攤開，幾十個名字。',
      '誰該這週就聯絡、誰先放著，我媽全靠記憶。',
      '「已經很久沒聯絡」這種訊號，最容易漏掉。',
      '所以我做了一個一次只顯示一位客戶的畫面。',
      '滑向三個桶，分完就是一份可以照著做的名單。',
    ],
    longform: [
      { demo: { href: '/demo/insurance/index.html', label: '▶ 試玩 demo', note: '點「看示範資料」就能滑分類，全是假客戶。' } },
      { h2: '問題' },
      { p: '這是我媽的真實工作痛點：客戶名單一多，分級跟聯絡狀況都在腦子裡，沒有整理過。' },
      { h2: '怎麼做' },
      { p: '單檔網頁，不用裝、不用登入。上傳一份客戶名單，畫面一次顯示一位客戶——分級、已經幾天沒聯絡、上次聯絡日期，一眼看到。滑向三個桶：「今年有機會」「要維繫」「先放著」，分完就是一份可以照著做的名單。' },
      { h2: '隱私設計' },
      { p: '資料只存在瀏覽器裡，不上傳雲端。另外寫了幾支 Python 小工具幫忙整理外部匯出的資料，但那些工具讀寫的資料夾刻意放在專案外面，程式碼本身沒有寫死任何真實客戶資料。' },
      { h2: '我的角色' },
      { p: '一個人做的，使用者是真的在用——我媽。' },
      { note: '案例畫面使用測試資料（「測試客戶01」～「12」這類假名），不是真實客戶資訊。' },
      { cta: { lead: '家人、朋友的小工具，也值得好好設計。', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'dashboard',
    route: '/work/dashboard',
    kind: 'work',
    title: '個人資料儀表板 — Yrrah',
    heading: '個人資料儀表板',
    tags: 'UI設計 · 資料視覺化',
    description: '自己在用的進度追蹤工具，倒數、里程碑時間軸、加權分數條、任務清單。畫面為隱私改用示意資料重建。',
    image: { src: '/assets/work/dashboard.jpg', width: 820, height: 675, alt: '個人資料儀表板畫面，倒數天數、里程碑時間軸與加權進度條' },
    narration: [
      '距離那一天還有幾天，我常常答不出來。',
      '進度散在腦子裡和備忘錄裡，看不到全貌。',
      '迷失的不是「有沒有做」，是「做到哪、還剩多少」。',
      '所以我做了一頁：倒數、時間軸、分數條、沒做完的事，一眼看完。',
      '這是我自己每天在用的東西。',
    ],
    longform: [
      { demo: { href: '/demo/dashboard/index.html', label: '▶ 試玩 demo', note: '總覽、閱讀、技能、Threads、消費、每週六個頁面都可以逛，任務清單能打勾。' } },
      { h2: '問題' },
      { p: '不管是準備考試、申請一個學程，還是任何拆成好幾個階段的長期目標，中途最容易迷失的不是「有沒有做」，而是「做到哪、還剩多少、現在該做什麼」。' },
      { h2: '怎麼做' },
      { p: '自己做了一個任務追蹤工具：倒數天數、里程碑時間軸、依權重計算的分數條、還沒做完的任務清單，一頁看完現在的狀態。' },
      { note: '真實版本裡的日期、機構、聯絡人都是我自己的申請進度，不方便公開，這裡看到的數字是示意，版面跟互動邏輯跟實際使用中的工具相同。' },
      { h2: '同一套系統，套進不同資料' },
      { p: '這套暖色紙感、單一強調色、膠囊形進度條的視覺語言，也用在同一個工作站的其他頁面——這兩張是真實畫面，沒有經過改造。' },
      { figure: { src: '/assets/work/dashboard-reading.jpg', width: 1390, height: 540, alt: '閱讀進度頁面，在讀與已完成的書分欄呈現，書封搭配狀態徽章', caption: '閱讀進度——在讀、已完成，分欄呈現。' } },
      { figure: { src: '/assets/work/dashboard-skill.jpg', width: 1568, height: 530, alt: '技能清單頁面，深色主題，卡片輪播與分類數量徽章', caption: '技能清單——112 個工具，分類、輪播複習。' } },
      { h2: '視覺設計' },
      { p: '暖色紙感背景，統計數字統一用墨色，只留一個強調色標記「現在在哪一關」，進度條做成膠囊形，數字對齊用等寬字體。這套語言後來也直接用在這個作品集網站上——你現在看到的強調色，就是同一支橘紅。' },
      { h2: '我的角色' },
      { p: '一個人做的，自己每天在用。' },
      { cta: { lead: '想把一堆散落的資料整理成一眼看懂的畫面？', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'noevii',
    route: '/work/noevii',
    kind: 'work',
    title: 'NOEVII — Yrrah',
    heading: 'NOEVII',
    tags: '網頁開發 · UI設計',
    description: '蘇格拉底式提問陪你深讀一本書，六階段流程、成長報告，真實上線、邀請制測試中。',
    image: { src: '/assets/work/noevii.jpg', width: 945, height: 709, alt: 'NOEVII 首頁畫面，深色主題，標語「AI 不會給你答案，只會問對問題」' },
    narration: [
      '「AI 不會給你答案，只會問對問題。」',
      '這是 NOEVII 打開時的第一句話。',
      '很多人買書、存書單，真的讀懂的沒幾本。',
      '看完摘要以為自己懂了，其實只是被動接收。',
      '所以 NOEVII 不給摘要，它問你問題，你自己打字回答。',
    ],
    longform: [
      { demo: { href: 'https://noevii.com/login', label: '▶ 看網站', note: '真實上線的網站，目前邀請制測試中，首頁公開可以看。' } },
      { h2: '問題' },
      { p: '很多人買書、存書單，但真的讀完、讀懂的沒幾本。看完懶人包摘要以為自己懂了，其實只是被動接收，沒有真的想清楚。' },
      { h2: '怎麼做' },
      { p: 'NOEVII 用蘇格拉底式提問陪你深讀一本書——選一本書，AI 針對這本書問問題，你自己打字回答，不是選選項。走過六個階段：暖身、閱讀、測驗、教學、報告、推薦，讀完生成一份專屬成長報告，記錄這趟思考的軌跡。' },
      { figure: { src: '/assets/work/noevii-flow.jpg', width: 1568, height: 609, alt: '怎麼運作三步驟：選一本書、六階段蘇格拉底提問、產出成長報告', caption: '怎麼運作——選書、六階段提問、成長報告，三步驟講清楚流程。' } },
      { figure: { src: '/assets/work/noevii-report.jpg', width: 1568, height: 280, alt: '成長報告範例卡片，顯示應用、批判思考、概念連結、理解力四項分數', caption: '成長報告範例——讀完一本書後，思考軌跡量化成看得懂的分數。' } },
      { h2: '另一個入口：先聊卡住的問題' },
      { p: '不知道要讀什麼的人，也可以先跟 AI 聊聊卡住自己的問題，它會從書架推薦對症的書，並附上這本書能給的具體工具。' },
      { figure: { src: '/assets/work/noevii-exlibris.jpg', width: 1568, height: 649, alt: 'EX LIBRIS 對症之書卡片範例，書名、作者、推薦理由與可用工具', caption: '對症之書——針對困擾推薦書，並直接給出書中的一個具體工具。' } },
      { h2: '技術' },
      { p: 'Next.js、Supabase 打底，深色系設計語言，統一用金色系強調色標記重點。' },
      { h2: '我的角色' },
      { p: '一個人設計、開發，也在自己每天讀書時驗證這套方法——「為什麼不直接看書就好？因為我自己就做不到」，這句話寫在網站上，是真心話。' },
      { cta: { lead: '想做一個有態度、不是為做而做的產品？', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'atomspin',
    route: '/work/atomspin',
    kind: 'work',
    title: 'AtomSpin — Yrrah',
    heading: 'AtomSpin',
    tags: '教育工具 · 3D視覺化',
    description: '團隊做的化學教學工具，把電子軌域、成鍵、反應配平變成可以轉的 3D 畫面；我負責離線化與雙語 i18n。',
    image: { src: '/assets/work/atomspin.webp', width: 1469, height: 567, alt: 'AtomSpin 軌域視角，碳原子 p 軌域的紅藍兩瓣立體圖' },
    narration: [
      '課本上的電子軌域，是一張不會動的圖。',
      '兩個原子怎麼結合、方程式怎麼配平，也都是紙上的靜態圖。',
      '學生只能靠想像，然後背起來。',
      'AtomSpin 把這些變成可以用手轉的 3D 畫面。',
      '團隊做的工具，我負責讓它離得開平台、講得了兩種語言。',
    ],
    longform: [
      { demo: { href: 'https://atomspin.pages.dev', label: '▶ 開啟 AtomSpin', note: '週期表選元素，切「電子殼層 / 軌域 / 鍵結」三種視角，反應式配平在另一頁。' } },
      { h2: '為什麼做這個' },
      { p: '電子軌域是什麼形狀、原子核外面的電子怎麼排、一條化學方程式怎麼兩邊平衡——這些課本只給一張圖，學生記得住答案，但沒真的「看過」。做這個工具就是想讓這些概念變成看得到、可以自己轉一轉的東西，理解就不用全靠硬記。' },
      { h2: '三種看法，一個工具' },
      { p: '同一個元素可以用三種方式看：電子殼層用波耳模型，一層一層把電子數出來；軌域畫電子雲的真實形狀；鍵結演示兩個原子怎麼共用電子、變成一個分子。另外一頁是反應式配平器，輸入一條方程式，它算出最小整數係數。' },
      { figure: { src: '/assets/work/atomspin-shells.webp', width: 1469, height: 567, alt: 'AtomSpin 電子殼層視角，鐵原子的波耳模型，26 個電子分布在四層軌道上', caption: '電子殼層視角——鐵有 26 個電子，一層一層排出來。' } },
      { h2: '做成雙語' },
      { p: '原本是越南文版。加了越南文 ↔ 繁體中文的即時切換，術語照台灣高中課綱（軌域、混成、價電子、八隅體⋯⋯），讓兩邊的學生都能用自己的母語學同一個內容。' },
      { h2: '我的角色' },
      { p: '團隊專案。核心的化學視覺化由團隊成員打造；我負責把它從線上編輯器裡抽出來、拿掉平台相依讓它能獨立部署，以及做雙語 i18n。' },
      { cta: { lead: '想把一個抽象的概念做成一眼看得懂的畫面？', href: '/contact', label: '寫信聊聊 →' } },
    ],
  },
  {
    slug: 'about',
    route: '/about',
    kind: 'about',
    title: '作者的話 — Yrrah',
    heading: '作者的話',
    description: 'Yrrah——網頁開發、UI設計、平面設計，接案中。',
    narration: [
      '凌晨兩點，螢幕還亮著。',
      '我大部分的作品，都是在這個時間完成的。',
      '我做事設計優先——先想清楚要讓看的人感覺到什麼，再動手。',
      '目標很簡單：讓每一個把案子交給我的人，拿到東西的時候是滿意的。',
      '作品比我自己講更準，都在前面幾頁。',
    ],
    longform: [
      { p: '網頁開發、UI設計、平面設計都做。這本書裡的六個案子，有的是接的案，有的是自己每天在用的工具，也有幫家人做的小東西——標準是一樣的。' },
      { p: '我最想接的是小型工作室、個人品牌、新創，或朋友介紹過來的小案子。規模不用大，但想把東西做好的人，我們應該會合得來。' },
      { cta: { lead: '想聊聊你的案子？', href: '/contact', label: '寫信給我 →' } },
    ],
  },
  {
    slug: 'contact',
    route: '/contact',
    kind: 'contact',
    title: '聯絡 — Yrrah',
    heading: '想聊聊你的案子',
    description: '案子想聊聊，填表單或在 Threads 上找我。',
    narration: [
      '書翻到最後一頁了。',
      '如果你手上有一個案子，想找人把它做好——',
      '小型工作室、個人品牌、新創，或朋友介紹過來的小案子都可以。',
      '規模不用大，但想把東西做好的人，我們應該會合得來。',
      '留個訊息，我會回信。',
    ],
    // 沿用舊 contact.html 的 Web3Forms 設定，欄位與名稱不變，收到的信才跟以前同格式
    form: {
      action: 'https://api.web3forms.com/submit',
      accessKey: 'c61263c4-36c2-4062-a952-fddbaaa58a81',
      subject: '作品集案子邀約',
      // 一定要絕對 URL：Web3Forms 只是把這個值放進 302 的 Location，相對路徑會被瀏覽器
      // 拿 api.web3forms.com 當 base 解析、落到 404（舊 contact.html 上線版也是絕對 URL）
      redirect: `${SITE.baseUrl}/contact/sent`,
      fields: [
        { id: 'cf-name', name: 'name', label: '怎麼稱呼你', type: 'text', required: true },
        { id: 'cf-email', name: 'email', label: '你的信箱', type: 'email', required: true },
        { id: 'cf-line', name: 'LINE ID', label: 'LINE ID（非必填，留了回信會比較快）', type: 'text' },
        {
          id: 'cf-type',
          name: '案子類型',
          label: '案子類型',
          type: 'select',
          options: [{ value: '', label: '選一個' }, '網頁開發', 'UI設計', '平面設計', '不確定，想聊聊'],
        },
        { id: 'cf-budget', name: '預算範圍', label: '預算範圍（大概就好）', type: 'text', placeholder: '例如：1–3 萬' },
        { id: 'cf-time', name: '時間點', label: '時間點／deadline', type: 'text', placeholder: '例如：這個月內、不急' },
        { id: 'cf-message', name: 'message', label: '想做什麼，簡單說一下', type: 'textarea', required: true },
      ],
    },
    // Threads 的邀約已經移到表單下方（contactForm() 的 .contact-form__alt），
    // 收在 <details> 裡的 cta 沒人看得到，這裡只留這一段說明
    longform: [
      { p: '網頁開發、UI設計、平面設計，小案子也歡迎。填一下你想做什麼、大概的預算跟時間點，我會回信。' },
    ],
  },
  {
    // 無 JS 原生送出後的落地頁：hidden 不進書的頁序，只讓表單有地方可以跳
    slug: 'contact-sent',
    route: '/contact/sent',
    kind: 'sent',
    hidden: true,
    noindex: true,
    title: '收到了 — Yrrah',
    heading: '收到了',
    description: '訊息已送出，我會回信。',
    narration: [
      '你的訊息已經送出。',
      '我看到就會回信，通常一兩天內。',
      '等回信的時候，可以先翻翻前面的作品。',
    ],
    longform: [],
  },
];

// 書的頁序：星星列、目錄、前後頁、頁碼、sitemap 一律以這份為準，hidden 頁不列入。
// prerender 仍走完整的 pages（hidden 頁也要有自己的平檔）
export const visiblePages = pages.filter((p) => !p.hidden);

// route → page 物件；router 與 prerender 共用。含 hidden 頁，否則 /contact/sent 會解析不到
export const byRoute = new Map(pages.map((p) => [p.route, p]));

// 封面的作品清單用（見 render/pageMarkup.js renderMain）
export const workPages = pages.filter((p) => p.kind === 'work');
