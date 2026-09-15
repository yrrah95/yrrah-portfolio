// 渲染層測試：renderMain／renderHead／esc 都是純字串函式，可直接在 node 跑，不需要 DOM。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE, pages, byRoute } from '../src/content/pages.js';
import { esc, safeHref, renderMain, renderHead, contactForm, tableOfContents } from '../src/render/pageMarkup.js';

const family = byRoute.get('/work/family');
const about = byRoute.get('/about');
const contact = byRoute.get('/contact');
const sent = byRoute.get('/contact/sent');

// 依序取出 HTML 裡所有標題層級，例如 ['h1', 'h2', 'h2']
const headings = (html) => [...html.matchAll(/<h([1-6])\b/g)].map((m) => `h${m[1]}`);

// 造一個最小可渲染的假 page，用來測不存在於真實內容裡的分支
const fakePage = (over = {}) => ({
  slug: 'fake',
  route: '/fake',
  kind: 'work',
  title: '假頁',
  heading: '假頁',
  description: '假的描述',
  narration: [],
  longform: [],
  ...over,
});

test('作品頁渲染成對開：卡片、相片台、page--spread 三者齊全', () => {
  const html = renderMain(family);
  assert.match(html, /class="page__card"/);
  assert.match(html, /class="page__stand"/);
  assert.match(html, /page--spread/);
});

test('作品頁只有一個 h1，且它是文件的第一個標題', () => {
  const list = headings(renderMain(family));
  assert.equal(list.filter((h) => h === 'h1').length, 1);
  assert.equal(list[0], 'h1');
  // 長文有小節標題，確認這頁真的不只一個標題（不然上面那條等於沒測到）
  assert.ok(list.length > 1, '作品頁長文應該還有 h2');
});

test('about 頁沒有相片，所以不是對開、也沒有相片台', () => {
  const html = renderMain(about);
  assert.ok(!html.includes('page--spread'));
  assert.ok(!html.includes('page__stand'));
  assert.match(html, /class="page page--about"/);
});

test('目錄已搬到書殼，<main> 內不再出現 class="toc"', () => {
  for (const page of pages) {
    assert.ok(!renderMain(page).includes('class="toc"'), `${page.route} 的 <main> 不應該含目錄`);
  }
});

test('讀更多標籤：作品頁加「的完整案例」，非作品頁只帶頁名', () => {
  assert.match(renderMain(family), /讀更多——Family的完整案例/);
  assert.match(renderMain(about), /讀更多——作者的話/);
  assert.ok(!renderMain(about).includes('的完整案例'));
});

test('esc() 會跳脫 & < > " 與單引號共五個字元', () => {
  assert.equal(esc(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  // & 必須先跳脫，否則會變成 &amp;lt;
  assert.equal(esc('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('內容帶 <script> 時不會原樣輸出到 HTML', () => {
  const html = renderMain(fakePage({ heading: '<script>alert(1)</script>', description: '5 > 3 & 2 < 4' }));
  assert.ok(!html.includes('<script>'), '標題裡的 script 標籤必須被跳脫');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /5 &gt; 3 &amp; 2 &lt; 4/);
});

test('相片台依 width／height 判斷直橫式', () => {
  const portrait = renderMain(fakePage({ image: { src: '/a.png', width: 100, height: 200, alt: '直式' } }));
  assert.match(portrait, /page__figure page__figure--portrait/);

  const landscape = renderMain(fakePage({ image: { src: '/a.png', width: 200, height: 100, alt: '橫式' } }));
  assert.match(landscape, /page__figure page__figure--landscape/);

  // 真實素材：family.webp 是 1242x2688 的直式手機截圖
  assert.match(renderMain(family), /page__figure--portrait/);
});

test('image.silhouette 為 true 才加 page__figure--silhouette', () => {
  const plain = renderMain(fakePage({ image: { src: '/a.png', width: 200, height: 100, alt: '一般' } }));
  assert.ok(!plain.includes('page__figure--silhouette'));

  const cut = renderMain(fakePage({ image: { src: '/a.png', width: 200, height: 100, alt: '去背', silhouette: true } }));
  assert.match(cut, /page__figure page__figure--landscape page__figure--silhouette/);
});

test('renderHead 的 canonical 等於 baseUrl 加上 route', () => {
  for (const page of pages) {
    const head = renderHead(page);
    assert.ok(
      head.includes(`<link rel="canonical" href="${SITE.baseUrl}${page.route}" />`),
      `${page.route} 的 canonical 不正確`,
    );
    // og:url 與 canonical 同一個值，別讓兩者走鐘
    assert.ok(head.includes(`<meta property="og:url" content="${SITE.baseUrl}${page.route}" />`));
  }
});

test('renderHead 的 og:type：作品頁是 article，其餘是 website', () => {
  assert.match(renderHead(family), /<meta property="og:type" content="article" \/>/);
  assert.match(renderHead(about), /<meta property="og:type" content="website" \/>/);
  assert.match(renderHead(pages[0]), /<meta property="og:type" content="website" \/>/);
});

test('narration 每句一個 <p>，data-line 由 0 起連號', () => {
  const html = renderMain(fakePage({ narration: ['第一句', '第二句', '第三句'] }));
  const lines = [...html.matchAll(/<p class="narration__line" data-line="(\d+)">([^<]*)<\/p>/g)];
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((m) => m[1]), ['0', '1', '2']);
  assert.deepEqual(lines.map((m) => m[2]), ['第一句', '第二句', '第三句']);
  assert.match(html, /<div class="page__narration">/);
});

test('narration 的句子也會被跳脫', () => {
  const html = renderMain(fakePage({ narration: ['<b>粗體</b> & 符號'] }));
  assert.ok(!html.includes('<b>'));
  assert.match(html, /&lt;b&gt;粗體&lt;\/b&gt; &amp; 符號/);
});

test('沒有 narration 的頁面退回 description 單段落，不留空白頁', () => {
  const html = renderMain(fakePage({ narration: [], description: '只有描述' }));
  assert.ok(!html.includes('page__narration'), 'narration 為空時不該輸出旁白容器');
  assert.match(html, /<p>只有描述<\/p>/);

  // narration 這個 key 根本不存在時（?. 這一支）也要退回 description
  const noKey = fakePage({ description: '沒有 narration key' });
  delete noKey.narration;
  assert.match(renderMain(noKey), /<p>沒有 narration key<\/p>/);
});

test('page.tags 有才輸出 page__tags', () => {
  assert.match(renderMain(fakePage({ tags: '網頁開發 · UI設計' })), /<p class="page__tags">網頁開發 · UI設計<\/p>/);
  assert.ok(!renderMain(fakePage()).includes('page__tags'));
  // 真實內容：作品頁有 tags、about 沒有
  assert.match(renderMain(family), /class="page__tags"/);
  assert.ok(!renderMain(about).includes('page__tags'));
});

test('longform 為空時完全不輸出 <details>', () => {
  assert.ok(!renderMain(fakePage({ longform: [] })).includes('page__longform'));
  const noKey = fakePage();
  delete noKey.longform;
  assert.ok(!renderMain(noKey).includes('page__longform'));
});

test('longform 的 note block 渲染成 longform__note 並跳脫內容', () => {
  const html = renderMain(fakePage({ longform: [{ note: '示意資料 <未使用真實姓名>' }] }));
  assert.match(html, /<p class="longform__note">示意資料 &lt;未使用真實姓名&gt;<\/p>/);
});

test('demo block 一律開新分頁，label／note 分兩個節點', () => {
  const html = renderMain(
    fakePage({ longform: [{ demo: { href: '/demo/family/index.html', label: '▶ 試玩 demo', note: '純前端重製' } }] }),
  );
  assert.match(
    html,
    /<a class="longform__demo-link" href="\/demo\/family\/index\.html" target="_blank" rel="noopener">▶ 試玩 demo<\/a>/,
  );
  assert.match(html, /<span class="longform__demo-note">純前端重製<\/span>/);
});

test('figure block：有 caption 才輸出 figcaption，圖一律 lazy load', () => {
  const withCap = renderMain(
    fakePage({ longform: [{ figure: { src: '/a.webp', width: 800, height: 600, alt: '說明', caption: '圖說' } }] }),
  );
  assert.match(withCap, /<figure class="longform__figure">/);
  assert.match(withCap, /<img src="\/a\.webp" width="800" height="600" alt="說明" loading="lazy" \/>/);
  assert.match(withCap, /<figcaption>圖說<\/figcaption>/);

  const noCap = renderMain(
    fakePage({ longform: [{ figure: { src: '/a.webp', width: 800, height: 600, alt: '說明' } }] }),
  );
  assert.ok(!noCap.includes('<figcaption>'));
});

test('cta block：只有 http(s) 連結才加 target／rel，站內連結保持乾淨', () => {
  const external = renderMain(
    fakePage({ longform: [{ cta: { lead: '找我聊聊：', href: 'https://example.com/x', label: 'Threads →' } }] }),
  );
  assert.match(external, /<p class="longform__cta">找我聊聊： <a href="https:\/\/example\.com\/x" target="_blank" rel="noopener">Threads →<\/a><\/p>/);

  const internal = renderMain(
    fakePage({ longform: [{ cta: { lead: '想聊你的案子？', href: '/contact', label: '寫信聊聊 →' } }] }),
  );
  assert.match(internal, /<a href="\/contact">寫信聊聊 →<\/a>/);
  assert.ok(!internal.includes('target="_blank"'), '站內連結不該開新分頁，否則 router 攔不到');

  // 協定相對、mailto 這種非 http(s) 也不加（extAttrs 用 /^https?:/ 判斷）
  const mail = renderMain(fakePage({ longform: [{ cta: { lead: '寄信：', href: 'mailto:a@b.c', label: '寄信' } }] }));
  assert.ok(!mail.includes('target="_blank"'));
});

test('未知的 longform block 被跳過，不炸掉整頁', () => {
  const html = renderMain(fakePage({ longform: [{ video: '/x.mp4' }, { p: '還在的段落' }] }));
  assert.match(html, /<p>還在的段落<\/p>/);
  assert.ok(!html.includes('x.mp4'), '未支援的 block 不該被渲染出來');
  // 全部都是未知 block 時，<details> 裡只剩 summary，內容不應該出現殘骸
  const allUnknown = renderMain(fakePage({ longform: [{ video: '/x.mp4' }] }));
  assert.match(allUnknown, /<details class="page__longform">/);
  assert.ok(!allUnknown.includes('x.mp4'));
});

test('封面：page--cover、tagline、6 個作品清單，且沒有相片台', () => {
  const html = renderMain(pages[0]);
  assert.match(html, /<main id="main" class="page page--cover">/);
  assert.match(html, new RegExp(`<p class="page__tagline">${SITE.tagline}</p>`));
  const works = html.match(/<li><a href="\/work\//g);
  assert.equal(works.length, 6, '封面應該列出 6 個作品');
  assert.ok(!html.includes('page__stand'), '封面不吃對開');
  assert.ok(!html.includes('page--spread'));
});
test('safeHref：站內絕對路徑、http(s)、mailto 放行，其餘一律換成 #', () => {
  assert.equal(safeHref('/work/family'), '/work/family');
  assert.equal(safeHref('https://example.com/x'), 'https://example.com/x');
  assert.equal(safeHref('mailto:hi@example.com'), 'mailto:hi@example.com');
  // 協定相對網址會把使用者帶去別的網域，擋
  assert.equal(safeHref('//evil.example'), '#');
  assert.equal(safeHref('javascript:alert(1)'), '#');
  assert.equal(safeHref(''), '#');
});

test('作品頁主視覺不 lazy：換成 fetchpriority="high" 與 decoding="async"', () => {
  const html = renderMain(family);
  const figure = html.match(/<figure class="page__figure[^]*?<\/figure>/)[0];
  assert.ok(!figure.includes('loading="lazy"'), '首屏主視覺不該 lazy');
  assert.match(figure, /fetchpriority="high"/);
  assert.match(figure, /decoding="async"/);
});

test('長文裡的補充圖仍然 lazy：它在 <details> 裡，展開前不該先載', () => {
  const html = renderMain(
    fakePage({ longform: [{ figure: { src: '/a.webp', width: 800, height: 600, alt: '說明' } }] }),
  );
  assert.match(html, /<figure class="longform__figure">[^]*?loading="lazy"/);
});

test('width／height 不是正整數時整個屬性不輸出，不把垃圾塞進 HTML', () => {
  const bad = renderMain(
    fakePage({ longform: [{ figure: { src: '/a.webp', width: '800" onerror="x', height: -3, alt: '說明' } }] }),
  );
  assert.ok(!bad.includes('width='), `不該輸出 width 屬性：${bad}`);
  assert.ok(!bad.includes('height='), '不該輸出 height 屬性');

  // 數字字串仍然算數，內容資料寫 '800' 不會整個屬性消失
  const strNum = renderMain(
    fakePage({ longform: [{ figure: { src: '/a.webp', width: '800', height: '600', alt: '說明' } }] }),
  );
  assert.match(strNum, /width="800" height="600"/);
});

test('contact 頁渲染出 Web3Forms 表單：access_key、蜜罐、狀態列都在卡片裡', () => {
  const html = renderMain(contact);
  assert.match(html, /<form class="contact-form"/);
  assert.match(html, /action="https:\/\/api\.web3forms\.com\/submit"/);
  assert.match(html, /<input type="hidden" name="access_key" value="[0-9a-f-]+" \/>/);
  assert.match(html, /name="botcheck"[^>]*aria-hidden="true"/);
  // 不寫 aria-live：作者明寫的 aria-live 會蓋掉 role 的隱含值，錯誤時切 role="alert" 才升得成 assertive
  assert.match(html, /class="contact-form__status" role="status"><\/p>/);
  // 位置：在 .page__card 內、旁白之後、長文 <details> 之前（<details> 是卡片外的下一個區塊）
  assert.ok(html.indexOf('page__card') < html.indexOf('<form'), '表單應該在卡片開頭之後');
  assert.ok(html.indexOf('page__narration') < html.indexOf('<form'), '表單應該排在旁白之後');
  assert.ok(html.indexOf('<form') < html.indexOf('page__longform'), '表單應該在卡片內，不是長文裡');
});

test('contact 表單無 JS 也能送：原生 method=POST，且 noscript 有說明', () => {
  const html = renderMain(contact);
  assert.match(html, /<form class="contact-form"[^>]*method="POST"/);
  assert.match(html, /<noscript>[^]*?沒有 JavaScript 也能送出/);
  assert.match(html, /<button type="submit" class="contact-form__submit">送出<\/button>/);
});

test('其他頁沒有 form 欄位就不渲染表單', () => {
  assert.ok(!renderMain(about).includes('contact-form'));
  assert.ok(!renderMain(family).includes('contact-form'));
});

test('safeHref：反斜線一律擋——WHATWG URL 把反斜線當斜線，/\\evil.com 會變成跨網域', () => {
  assert.equal(safeHref('/\\evil.com'), '#');
  assert.equal(safeHref('\\\\evil.com'), '#');
  assert.equal(safeHref('https://example.com/a\\b'), '#');
});

test('contact 表單不加 novalidate：required 才是真的必填', () => {
  const html = renderMain(contact);
  assert.ok(!html.includes('novalidate'), 'novalidate 會讓原生驗證整組失效');
  assert.match(html, /<input class="contact-form__input" id="cf-name"[^>]*required/);
});

test('contact 表單的 redirect hidden 欄位是正式站的絕對 URL /contact/sent', () => {
  const html = renderMain(contact);
  assert.match(html, /<input type="hidden" name="redirect" value="https:\/\/yrrah-5i5\.pages\.dev\/contact\/sent" \/>/);
});

test('type: select 渲染成 <select> ＋ <option>，第一個是空值提示', () => {
  const html = renderMain(contact);
  const select = html.match(/<select[^]*?<\/select>/)[0];
  assert.match(select, /class="contact-form__input contact-form__input--select"/);
  assert.match(select, /id="cf-type" name="案子類型"/);
  assert.match(select, /<option value="">選一個<\/option>/);
  assert.match(select, /<option value="網頁開發">網頁開發<\/option>/);
  assert.equal(select.match(/<option/g).length, 5);
  // 整頁只有這一個 select
  assert.equal(html.match(/<select/g).length, 1);
});

test('select 的選項內容也會被跳脫，字串與 { value, label } 兩種寫法都吃', () => {
  const html = contactForm({
    action: 'https://api.web3forms.com/submit',
    accessKey: 'k',
    fields: [{ id: 'f', name: 'f', label: '選', type: 'select', options: ['<b>x</b>', { value: 'v', label: 'L' }] }],
  });
  assert.match(html, /<option value="&lt;b&gt;x&lt;\/b&gt;">&lt;b&gt;x&lt;\/b&gt;<\/option>/);
  assert.match(html, /<option value="v">L<\/option>/);
});

test('表單下方有 Threads 備案，連到 SITE.threads 且開新分頁', () => {
  const html = renderMain(contact);
  assert.match(html, /<p class="contact-form__alt">不想填表單的話/);
  assert.match(
    html,
    new RegExp(`<a href="${SITE.threads.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}" target="_blank" rel="noopener">Threads →</a>`),
  );
  // 它在卡片內、長文 <details> 之前——收在 details 裡才是原本那個問題
  assert.ok(html.indexOf('contact-form__alt') < html.indexOf('page__longform'));
});

test('contact 的長文不再含 Threads cta（同一句話不該出現兩次）', () => {
  const html = renderMain(contact);
  const details = html.slice(html.indexOf('page__longform'));
  assert.ok(!details.includes('longform__cta'), '長文裡不該再有 cta');
  assert.ok(!details.includes('Threads'));
});

test('kind: sent 的頁：h1、旁白、回封面連結，沒有表單也沒有長文', () => {
  const html = renderMain(sent);
  assert.match(html, /<main id="main" class="page page--sent">/);
  assert.match(html, /<h1 class="page__title">收到了<\/h1>/);
  assert.match(html, /<p class="page__back"><a href="\/">回到封面<\/a><\/p>/);
  assert.match(html, /class="page__narration"/);
  assert.ok(!html.includes('contact-form'), '確認頁不該再放一次表單');
  assert.ok(!html.includes('page__longform'));
});

test('noindex 頁的 renderHead 多一行 robots meta，其餘頁沒有', () => {
  assert.match(renderHead(sent), /<meta name="robots" content="noindex" \/>/);
  assert.equal(renderHead(sent).match(/noindex/g).length, 1);
  for (const page of pages) {
    if (page.noindex) continue;
    assert.ok(!renderHead(page).includes('noindex'), `${page.route} 不該有 noindex`);
  }
});

test('目錄不列 hidden 頁', () => {
  const toc = tableOfContents('/contact');
  assert.ok(!toc.includes('/contact/sent'));
  assert.match(toc, /<a href="\/contact" aria-current="page">/);
});
