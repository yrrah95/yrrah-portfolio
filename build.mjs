// 靜態網站產生器：讀 tips 貼文資料，輸出 dist/（零依賴）
// 用法：node build.mjs [--data <tips 資料夾>] [--cards <圖卡資料夾>] [--out dist]
// 環境變數 CF_BEACON_TOKEN 有值時，頁面會加上 Cloudflare Web Analytics 量測碼
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const DATA = arg('data', process.env.YRRAH_DATA || 'C:/Users/user/.claude/skills/threads/data/yrrah_9/tips');
const CARDS = arg('cards', process.env.YRRAH_CARDS || 'C:/Github/mine/Thread/yrrah_9/cards/tips');
const OUT = path.resolve(here, arg('out', 'dist'));
const COVER_BASE = "https://raw.githubusercontent.com/yrrah95/threads-cards/main/tips/site-cover/";
const RAW = 'https://raw.githubusercontent.com/yrrah95/threads-cards/main/tips/';
const PROFILE_URL = 'https://www.threads.com/@yrrah9_';
// 量測代碼（Cloudflare Web Analytics 的公開網站代碼，非機密）：環境變數優先，其次 site.config.json
const CONFIG = fs.existsSync(path.join(here, 'site.config.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'site.config.json'), 'utf8')) : {};
const BEACON = process.env.CF_BEACON_TOKEN || CONFIG.beaconToken || '';

const readJsonl = (f) => fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const overrides = JSON.parse(fs.readFileSync(path.join(here, 'image-overrides.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 只取公開需要的欄位：不帶成效數據、features 內部筆記、note
const rows = [...readJsonl(path.join(DATA, 'archive.jsonl')), ...readJsonl(path.join(DATA, 'posts.jsonl'))];
// --pending <json>：發文前先產頁用，帶一筆還沒寫進 posts.jsonl 的貼文（格式同 posts.jsonl 一行）
const pendingFile = arg('pending', '');
if (pendingFile) {
  const pend = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  const dayOf = (r) => (r.content.match(/Day\s*(\d+)/) || [])[1];
  if (!rows.some((r) => r.id === pend.id || dayOf(r) === dayOf(pend))) rows.push(pend);
}
const warns = [];
const posts = rows.map((r) => {
  const m = r.content.match(/Day\s*(\d+)/);
  if (!m) { warns.push('找不到 Day 編號：' + r.id); return null; }
  const day = +m[1];
  const lines = r.content.split('\n');
  const body = lines.slice(1).join('\n').trim();
  const title = body.split('\n').find((l) => l.trim()) || '';
  // 排行榜用：取最後一筆數據快照（發文超過 14 天的舊文數據已定型）
  const snaps = (r.stats || []).slice().sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)));
  const st = snaps.length ? snaps[snaps.length - 1] : null;
  return {
    day, id: r.id, date: r.posted_at.slice(0, 10), title, body,
    views: st && Number.isFinite(st.views) ? st.views : null,
    likes: st && Number.isFinite(st.likes) ? st.likes : null,
    cta: r.cta_reply && r.cta_reply.text ? r.cta_reply.text : '',
    permalink: r.permalink || '',
    images: imagesFor(day, r),
    // 純文字舊文沒有原圖，站內用另做的封面當縮圖（只用在首頁，不放進貼文頁）
    cover: (r.features && r.features.image_count) ? null : COVER_BASE + "D" + day + ".png",
  };
}).filter(Boolean).sort((a, b) => b.day - a.day);

// 圖片：預設 D<N> 資料夾依檔名排序；例外靠 image-overrides.json
function imagesFor(day, r) {
  const want = (r.features && r.features.image_count) || 0;
  if (!want) return [];
  const ov = overrides[String(day)];
  let files;
  if (Array.isArray(ov)) files = ov;
  else {
    const dir = ov || 'D' + day;
    const abs = path.join(CARDS, dir);
    if (!fs.existsSync(abs)) { warns.push(`Day ${day} 找不到圖片資料夾 ${dir}`); return []; }
    files = fs.readdirSync(abs).filter((f) => f.endsWith('.png')).sort().map((f) => dir + '/' + f);
  }
  if (files.length !== want) warns.push(`Day ${day} 圖片 ${files.length} 張，貼文記 ${want} 張`);
  return files.map((f) => RAW + f);
}

const beacon = BEACON
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(BEACON)}"}'></script>`
  : '';
const page = ({ title, desc, body, depth }) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="${depth}style.css">
${beacon}
</head>
<body>
${body}
</body>
</html>
`;

// 名次：數字大的在前，沒有數據的排最後；同分照 Day 新到舊
const rankBy = (key) => {
  const order = [...posts].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || b.day - a.day);
  return new Map(order.map((p, i) => [p.day, i + 1]));
};
const rankV = rankBy('views'), rankL = rankBy('likes');

const list = (days) => days.map((p) => `
<a class="card${p.images[0] || p.cover ? "" : " txt"}" href="d/${p.day}/" data-d="${p.day}" data-v="${p.views ?? -1}" data-l="${p.likes ?? -1}" data-rv="${rankV.get(p.day)}" data-rl="${rankL.get(p.day)}" data-t="${esc((p.title + ' ' + p.body).toLowerCase())}">
  ${p.images[0] || p.cover ? `<img src="${p.images[0] || p.cover}" alt="" loading="lazy">` : `<div class="noimg"><b>${esc(p.title)}</b></div>`}
  <span class="day">Day ${p.day}</span>
  <span class="meta"></span>
  <span class="ttl">${esc(p.title)}</span>
</a>`).join('');

const index = page({
  title: 'Claude Code Everyday',
  desc: '每天一個 Claude Code 用法，Threads 貼文的完整存檔。',
  depth: '',
  body: `<header class="top"><h1>Claude Code Everyday</h1>
<input id="q" type="search" placeholder="搜尋，例如 hooks、/clear" autocomplete="off"></header>
<nav class="tabs" id="tabs"><button class="on" data-s="d">最新</button><button data-s="v">瀏覽量</button><button data-s="l">按讚量</button></nav>
<main class="grid" id="grid">${list(posts)}</main>
<p class="empty" id="empty" hidden>沒有符合的貼文</p>
<footer><a href="${PROFILE_URL}" rel="noopener">@yrrah9_</a></footer>
<script>
const q=document.getElementById('q'),grid=document.getElementById('grid'),cs=[...document.querySelectorAll('.card')],em=document.getElementById('empty'),tabs=document.getElementById('tabs');
tabs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.s;
tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
[...cs].sort((a,c)=>+c.dataset[k]-+a.dataset[k]||c.dataset.d-a.dataset.d).forEach(c=>grid.appendChild(c));
cs.forEach(c=>{const m=c.querySelector('.meta'),v=+c.dataset[k];
m.textContent=k==='d'||v<0?'':'#'+c.dataset['r'+k]+' · '+v.toLocaleString('zh-TW')+(k==='v'?' 瀏覽':' 讚')})});
q.addEventListener('input',()=>{const k=q.value.trim().toLowerCase();let n=0;
cs.forEach(c=>{const ok=!k||c.dataset.t.includes(k);c.hidden=!ok;if(ok)n++});em.hidden=n>0});
</script>`,
});

// 解釋文案：explain/D<N>.md，一個小型標記：## 標題、- 清單、1. 步驟、空行分段、`行內程式碼`
function inline(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
function explainHtml(day) {
  const f = path.join(here, 'explain', `D${day}.md`);
  if (!fs.existsSync(f)) return '';
  const out = [];
  let list = null, para = [];
  const flushP = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; };
  const flushL = () => { if (list) out.push(`<${list.t}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.t}>`); list = null; };
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if (!line) { flushP(); flushL(); }
    else if ((m = line.match(/^##\s+(.+)/))) { flushP(); flushL(); if (out.length) out.push('</div>'); out.push(`<div class="ex"><h2>${inline(m[1])}</h2>`); }
    else if ((m = line.match(/^[-*]\s+(.+)/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); }
    else if ((m = line.match(/^\d+[.)]\s+(.+)/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); }
    else { flushL(); para.push(line); }
  }
  flushP(); flushL();
  if (out.length) out.push('</div>');
  return `<section class="explain">${out.join('')}</section>`;
}

// 輪播圖：CSS scroll-snap 橫向滑動；多張才有箭頭、圓點與張數，沒有 JS 也能手滑
function carousel(p) {
  if (!p.images.length) return '';
  const n = p.images.length;
  const slides = p.images.map((u, i) => `<img src="${u}" alt="Day ${p.day} 第 ${i + 1} 張" ${i ? 'loading="lazy"' : ''}>`).join('');
  if (n === 1) return `<div class="car one"><div class="track">${slides}</div></div>`;
  const dots = p.images.map((_, i) => `<button type="button" aria-label="第 ${i + 1} 張"${i ? '' : ' class="on"'}></button>`).join('');
  return `<div class="car" data-n="${n}" tabindex="0" aria-roledescription="carousel" aria-label="Day ${p.day} 圖卡">
  <div class="track">${slides}</div>
  <button type="button" class="nav prev" aria-label="上一張" hidden>‹</button>
  <button type="button" class="nav next" aria-label="下一張">›</button>
  <div class="bar"><span class="count">1 / ${n}</span><span class="dots">${dots}</span></div>
</div>
<script>
(function(){var c=document.currentScript.previousElementSibling,t=c.querySelector('.track'),ds=c.querySelectorAll('.dots button'),pv=c.querySelector('.prev'),nx=c.querySelector('.next'),ct=c.querySelector('.count'),n=ds.length;
var want=null;
function cur(){return Math.round(t.scrollLeft/t.clientWidth)}
function base(){return want===null?cur():want}
function go(i){i=Math.max(0,Math.min(n-1,i));want=i;t.scrollTo({left:i*t.clientWidth,behavior:'smooth'})}
t.addEventListener('scroll',function(){var i=cur();if(want!==null&&i===want)want=null;ds.forEach(function(d,k){d.classList.toggle('on',k===i)});ct.textContent=(i+1)+' / '+n;pv.hidden=i===0;nx.hidden=i===n-1},{passive:true});
['touchstart','wheel','pointerdown'].forEach(function(ev){t.addEventListener(ev,function(){want=null},{passive:true})});
pv.onclick=function(){go(base()-1)};nx.onclick=function(){go(base()+1)};
ds.forEach(function(d,k){d.onclick=function(){go(k)}});
c.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){go(base()-1);e.preventDefault()}if(e.key==='ArrowRight'){go(base()+1);e.preventDefault()}});
})();
</script>`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), index);
fs.copyFileSync(path.join(here, 'src', 'style.css'), path.join(OUT, 'style.css'));

posts.forEach((p, i) => {
  const newer = posts[i - 1], older = posts[i + 1];
  const html = page({
    title: `Day ${p.day}｜${p.title}`,
    desc: p.title,
    depth: '../../',
    body: `<header class="top slim"><a class="back" href="../../">← Claude Code Everyday</a></header>
<article class="post">
  <div class="head">
    <h1><span class="day">Day ${p.day}</span>${esc(p.title)}</h1>
    <time>${p.date}</time>
    <div class="text">${esc(p.body.split('\n').slice(p.body.split('\n').indexOf(p.title) + 1).join('\n').trim())}</div>
  </div>
  ${carousel(p)}
  <div class="act">
    ${p.cta ? `<pre class="cta">${esc(p.cta)}</pre>` : ''}
    <p class="src"><a href="${esc(p.permalink || PROFILE_URL)}" rel="noopener">${p.permalink ? '在 Threads 看原文' : '到 Threads 追蹤 @yrrah9_'}</a></p>
  </div>
  ${explainHtml(p.day)}
  <nav class="pn">${older ? `<a href="../${older.day}/">← Day ${older.day}</a>` : '<span></span>'}${newer ? `<a href="../${newer.day}/">Day ${newer.day} →</a>` : ''}</nav>
</article>`,
  });
  const d = path.join(OUT, 'd', String(p.day));
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), html);
});

console.log(`貼文 ${posts.length} 篇，輸出 ${OUT}`);
console.log(`有圖 ${posts.filter((p) => p.images.length).length} 篇，量測碼 ${BEACON ? '有' : '無'}`);
warns.forEach((w) => console.log('警告：' + w));
