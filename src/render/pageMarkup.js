// 語意 HTML 產生器：純字串、不碰 DOM，讓 build 期的 prerender 與瀏覽器端共用同一份。
// 這一層就是鐵律 3 的承重結構——無 WebGL／reduced-motion 時使用者看到的就是它。
import { SITE, visiblePages, workPages } from '../content/pages.js';

// export 出去讓 chrome.js 共用同一份跳脫規則，避免兩處實作走鐘
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 站外連結才加 target/rel；站內乾淨路徑交給 router 攔截
const extAttrs = (href) => (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '');

// 連結目標白名單：只放行站內絕對路徑、http(s) 與 mailto。
// javascript:／data: 與 //evil.com 這種協定相對網址一律換成 '#'，
// 內容資料哪天被污染也不會變成可點的攻擊面。chrome.js 共用同一份規則
export function safeHref(href) {
  const value = String(href ?? '');
  // 反斜線也要擋：WHATWG URL 把 \ 當成 /，所以 /\evil.com 會被瀏覽器解析成 //evil.com（跨網域）
  if (value.includes('\\')) {
    console.warn(`safeHref: 擋下不安全的連結目標 ${JSON.stringify(value)}`);
    return '#';
  }
  const allowed =
    (value.startsWith('/') && !value.startsWith('//')) ||
    /^https?:/i.test(value) ||
    /^mailto:/i.test(value);
  if (allowed) return value;
  console.warn(`safeHref: 擋下不安全的連結目標 ${JSON.stringify(value)}`);
  return '#';
}

// width／height 只收正整數，其他一律省略該屬性（這兩個原本是唯二沒過濾就插進 HTML 的值）
function dim(name, value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? ` ${name}="${n}"` : '';
}

// 旁白：一句一個 <p>，帶 data-line 供 Phase 2 的逐字反黃逐句接管
function narration(list) {
  if (!list || !list.length) return '';
  const lines = list
    .map((t, i) => `<p class="narration__line" data-line="${i}">${esc(t)}</p>`)
    .join('\n        ');
  return `<div class="page__narration">
        ${lines}
      </div>`;
}

// longform block → HTML。未知 block 直接跳過，不讓內容錯誤炸掉整頁
function longformBlock(block) {
  if (block.h2) return `<h2 class="longform__heading">${esc(block.h2)}</h2>`;
  if (block.p) return `<p>${esc(block.p)}</p>`;
  if (block.note) return `<p class="longform__note">${esc(block.note)}</p>`;

  if (block.demo) {
    const { href, label, note } = block.demo;
    // demo 一律開新分頁：站內 demo 是獨立小站，開新頁才不會把這本書的閱讀位置洗掉
    return `<p class="longform__demo">
        <a class="longform__demo-link" href="${esc(safeHref(href))}" target="_blank" rel="noopener">${esc(label)}</a>
        <span class="longform__demo-note">${esc(note)}</span>
      </p>`;
  }

  if (block.figure) {
    const { src, width, height, alt, caption } = block.figure;
    const figcaption = caption ? `\n        <figcaption>${esc(caption)}</figcaption>` : '';
    // 長文裡的補充圖仍然 lazy：它們在 <details> 裡，展開前不該佔用頻寬
    return `<figure class="longform__figure">
        <img src="${esc(safeHref(src))}"${dim('width', width)}${dim('height', height)} alt="${esc(alt)}" loading="lazy" />${figcaption}
      </figure>`;
  }

  if (block.cta) {
    const { lead, href, label } = block.cta;
    return `<p class="longform__cta">${esc(lead)} <a href="${esc(safeHref(href))}"${extAttrs(href)}>${esc(label)}</a></p>`;
  }

  return '';
}

// 「讀更多」的長文。用 <details> 讓無 JS 也能展開——Phase 2 的同頁覆蓋動畫接管時，
// 語意還是這一份，螢幕報讀軟體讀得到全文（鐵律 3）
function longform(list, page) {
  if (!list || !list.length) return '';
  const body = list.map(longformBlock).filter(Boolean).join('\n      ');
  // 只有作品頁是「案例」；about／contact 只帶頁名
  const label = page.kind === 'work' ? `${page.heading}的完整案例` : page.heading;
  return `<details class="page__longform">
      <summary class="longform__toggle">讀更多——${esc(label)}</summary>
      ${body}
    </details>`;
}

function workFigure(page) {
  if (!page.image) return '';
  const { src, width, height, alt, silhouette } = page.image;
  // 直橫式交給 CSS 判斷做不到（width/height 是屬性不是樣式），所以在這裡先算好掛成 class
  const orient = height > width ? 'portrait' : 'landscape';
  // 去背 alpha PNG 才加這個 modifier：相片台會拿掉白邊與傾斜（目前素材全無 alpha，一律 undefined）
  const kind = silhouette ? ' page__figure--silhouette' : '';
  // 主視覺在首屏，不能 lazy：高優先取圖＋非同步解碼，別讓它排在其他資源後面
  return `<figure class="page__figure page__figure--${orient}${kind}">
        <img src="${esc(safeHref(src))}"${dim('width', width)}${dim('height', height)} alt="${esc(alt)}" fetchpriority="high" decoding="async" />
      </figure>`;
}

// 目錄：每一頁都放，讓無 JS 的讀者與螢幕報讀軟體能走完整本書。
// 7e 起由書殼（render/chrome.js）放進 #chrome 的目錄浮層，不再印在 <main> 頁尾。
// 標題用 <p> 不用 <h2>：目錄排在 <main> 的 <h1> 之前，用 h2 會讓文件第一個標題變 h2；
// 這份清單的標籤由外層 <nav aria-label="目錄"> 承擔，語意已經夠
export function tableOfContents(current) {
  const items = visiblePages
    .filter((p) => p.kind !== 'cover')
    .map((p) => {
      const here = p.route === current ? ' aria-current="page"' : '';
      return `<li><a href="${esc(safeHref(p.route))}"${here}>${esc(p.heading)}</a></li>`;
    })
    .join('\n        ');
  return `<nav class="toc" aria-label="目錄">
      <p class="toc__title">目錄</p>
      <ol class="toc__list">
        ${items}
      </ol>
    </nav>`;
}

// contact 表單。無 JS 時就是一張原生 POST 到 Web3Forms 的表單（鐵律 3），
// 有 JS 時由 lib/contactForm.js 攔截改走 AJAX，頁面不跳走。
// access_key 是 Web3Forms 的公開表單 key，本來就會出現在 HTML 裡，不是機密
export function contactForm(form) {
  if (!form) return '';

  const hidden = [
    `<input type="hidden" name="access_key" value="${esc(form.accessKey)}" />`,
    form.subject ? `<input type="hidden" name="subject" value="${esc(form.subject)}" />` : '',
    form.redirect
      ? `<input type="hidden" name="redirect" value="${esc(safeHref(form.redirect))}" />`
      : '',
  ]
    .filter(Boolean)
    .join('\n        ');

  const fields = (form.fields || [])
    .map((field) => {
      const id = esc(field.id);
      const required = field.required ? ' required' : '';
      const placeholder = field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : '';
      // textarea／select／input 三種，都掛 .contact-form__input，樣式不會各長各的
      let control;
      if (field.type === 'textarea') {
        control = `<textarea class="contact-form__input contact-form__input--area" id="${id}" name="${esc(field.name)}" rows="5"${required}${placeholder}></textarea>`;
      } else if (field.type === 'select') {
        // 選項可寫成字串（value 與顯示文字相同）或 { value, label }（做得出空值提示）
        const options = (field.options || [])
          .map((opt) => {
            const { value, label } = typeof opt === 'string' ? { value: opt, label: opt } : opt || {};
            return `<option value="${esc(value ?? '')}">${esc(label ?? value ?? '')}</option>`;
          })
          .join('\n            ');
        control = `<select class="contact-form__input contact-form__input--select" id="${id}" name="${esc(field.name)}"${required}>
            ${options}
          </select>`;
      } else {
        control = `<input class="contact-form__input" id="${id}" type="${esc(field.type || 'text')}" name="${esc(field.name)}"${required}${placeholder} />`;
      }
      return `<div class="contact-form__field">
          <label class="contact-form__label" for="${id}">${esc(field.label)}</label>
          ${control}
        </div>`;
    })
    .join('\n        ');

  // 有 redirect 就會跳到站內的確認頁，沒有才會停在 Web3Forms 的確認頁——文案照實際行為寫
  const noscript = form.redirect
    ? '沒有 JavaScript 也能送出，送出後會跳到一頁確認訊息。'
    : '沒有 JavaScript 也能送出，送出後會跳到 Web3Forms 的確認頁。';

  // 不加 novalidate：原生驗證擋下時 submit 事件根本不會發生，AJAX 那條路徑也一起被擋住，
  // required 才是真的必填而不是裝飾
  return `<form class="contact-form" action="${esc(safeHref(form.action))}" method="POST">
        ${hidden}
        ${fields}
        <input type="checkbox" name="botcheck" class="contact-form__botcheck" tabindex="-1" aria-hidden="true" autocomplete="off" />
        <button type="submit" class="contact-form__submit">送出</button>
        <p class="contact-form__status" role="status"></p>
        <noscript>
          <p class="contact-form__noscript">${noscript}</p>
        </noscript>
        <p class="contact-form__privacy">送出的內容會透過第三方服務（Web3Forms）寄到我的信箱，只用來回覆你的來信。</p>
      </form>
      <p class="contact-form__alt">不想填表單的話，直接在 Threads 上找我：<a href="${esc(safeHref(SITE.threads))}" target="_blank" rel="noopener">Threads →</a></p>`;
}

export function renderMain(page) {
  const tags = page.tags ? `<p class="page__tags">${esc(page.tags)}</p>` : '';
  // 旁白與長文都還沒填的頁面，至少把 description 撐住，不留空白頁
  const intro = page.narration?.length ? narration(page.narration) : `<p>${esc(page.description)}</p>`;

  if (page.kind === 'cover') {
    const list = workPages
      .map(
        (p) =>
          `<li><a href="${esc(safeHref(p.route))}">${esc(p.heading)}</a> — ${esc(p.description)}</li>`,
      )
      .join('\n        ');
    // 封面不吃對開：右半頁留給 Phase 2 的 three.js 書封，這裡只把文字包成一張卡
    return `<main id="main" class="page page--cover">
      <div class="page__card">
        <h1 class="page__title">${esc(page.heading)}</h1>
        <p class="page__tagline">${esc(SITE.tagline)}</p>
        ${intro}
        <ol class="cover__works">
          ${list}
        </ol>
      </div>
    </main>`;
  }

  // 送出確認頁：只有一句「收到了」與回頭的路，不放表單也不放長文
  if (page.kind === 'sent') {
    return `<main id="main" class="page page--sent">
      <div class="page__card">
        <h1 class="page__title">${esc(page.heading)}</h1>
        ${intro}
        <p class="page__back"><a href="/">回到封面</a></p>
      </div>
    </main>`;
  }

  // 有相片的頁才是對開（卡片浮左、相片台站右）；about／contact 沒有 image，維持單欄
  const spread = page.image ? ' page--spread' : '';
  // 相片台：包一層讓 CSS 掛白邊、微傾與落影，圖本身只管尺寸與 alt
  const stand = page.image ? `<div class="page__stand">${workFigure(page)}</div>` : '';
  // 表單放在卡片內、旁白之後：contact 頁的旁白是開場白，表單是它的下一句
  const form = page.form ? contactForm(page.form) : '';

  return `<main id="main" class="page page--${esc(page.kind)}${spread}">
      <div class="page__card">
        ${tags}
        <h1 class="page__title">${esc(page.heading)}</h1>
        ${intro}
        ${form}
      </div>
      ${stand}
      ${longform(page.longform, page)}
    </main>`;
}

// <head> 內的 meta，prerender 每個 route 各產一份
export function renderHead(page) {
  const url = SITE.baseUrl + page.route;
  const og = SITE.baseUrl + SITE.ogImage;
  const type = page.kind === 'work' ? 'article' : 'website';
  // noindex 頁（送出確認頁）不該進搜尋結果，也已被排除在 sitemap 之外
  const robots = page.noindex ? '\n  <meta name="robots" content="noindex" />' : '';
  return `<title>${esc(page.title)}</title>${robots}
  <meta name="description" content="${esc(page.description)}" />
  <link rel="canonical" href="${esc(safeHref(url))}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${esc(SITE.name)}" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:title" content="${esc(page.title)}" />
  <meta property="og:description" content="${esc(page.description)}" />
  <meta property="og:image" content="${esc(og)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(page.title)}" />
  <meta name="twitter:description" content="${esc(page.description)}" />
  <meta name="twitter:image" content="${esc(og)}" />`;
}
