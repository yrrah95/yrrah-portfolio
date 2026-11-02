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
const BUILT = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // 網站建置日（台灣時間）
const ARROW = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
const navHtml = (depth) => `<nav class="nav"><div class="in"><a class="brand" href="${depth || './'}" aria-label="Claude Code Everyday 首頁"><picture><source media="(prefers-color-scheme:dark)" srcset="${depth}logo-dark.png"><img src="${depth}logo-light.png" alt="Claude Code Everyday" width="280" height="26"></picture></a><div class="links"><a href="${depth || './'}">全部貼文</a><a href="${PROFILE_URL}" rel="noopener" target="_blank">Threads ${ARROW}</a></div></div></nav>`;
const footHtml = `<footer class="foot"><div class="in"><span>Claude Code Everyday｜每天一個 Claude Code 用法</span><span class="r"><a href="${PROFILE_URL}" rel="noopener" target="_blank">Threads @yrrah9_ ${ARROW}</a><span>網站更新於 ${BUILT}</span></span></div></footer>`;
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
${navHtml(depth)}
${body}
${footHtml}
<button type="button" class="totop" id="totop" aria-label="回到最上面"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<script>(function(){var b=document.getElementById('totop');function f(){b.classList.toggle('show',window.scrollY>500)}addEventListener('scroll',f,{passive:true});f();b.onclick=function(){window.scrollTo({top:0,behavior:'smooth'})}})();</script>
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
  body: `<header class="top home"><h1 class="sr">Claude Code Everyday</h1><p class="lead">每天一個 Claude Code 用法，Threads 貼文的完整存檔，共 ${posts.length} 篇。</p></header>
<div class="bar"><div class="sortbar"><div class="dd"><button type="button" class="ddb" id="sk" aria-haspopup="listbox" aria-expanded="false"><span id="skl">最新</span><svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><ul class="ddm" id="ddm" role="listbox" hidden><li role="option" data-v="d" aria-selected="true">最新</li><li role="option" data-v="v" aria-selected="false">最多瀏覽</li><li role="option" data-v="l" aria-selected="false">最多按讚</li></ul></div><button type="button" class="dirb" id="sd" aria-label="降冪" title="降冪"><svg class="arr" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h6"/></svg></button></div>
<input id="q" type="search" placeholder="搜尋，例如 hooks、/clear" autocomplete="off"></div>
<main class="grid" id="grid">${list(posts)}</main>
<nav class="pager" id="pg" aria-label="分頁" hidden></nav>
<p class="empty" id="empty" hidden>沒有符合的貼文</p>
<script>
const q=document.getElementById('q'),grid=document.getElementById('grid'),cs=[...document.querySelectorAll('.card')],em=document.getElementById('empty'),sk=document.getElementById('sk'),skl=document.getElementById('skl'),ddm=document.getElementById('ddm'),sd=document.getElementById('sd'),pg=document.getElementById('pg');
const SK='yc-sort',DK='yc-dir',QK='yc-q',PK='yc-p',PER=12,NAMES={d:'最新',v:'最多瀏覽',l:'最多按讚'},ORDER=['d','v','l'];
let key='d',dir='desc',page=1,hits=null;
const CL='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const CR='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
function pageList(n,c){const s=new Set([1,n,c-1,c,c+1]);if(c<=3){s.add(2);s.add(3);s.add(4)}if(c>=n-2){s.add(n-1);s.add(n-2);s.add(n-3)}
const a=[...s].filter(x=>x>=1&&x<=n).sort((x,y)=>x-y),o=[];a.forEach((x,i)=>{if(i&&x-a[i-1]>1)o.push(0);o.push(x)});return o}
function render(){const all=[...grid.querySelectorAll('.card')].filter(c=>!hits||hits.has(c)),n=Math.max(1,Math.ceil(all.length/PER));if(page>n)page=n;if(page<1)page=1;
cs.forEach(c=>{c.hidden=true});all.slice((page-1)*PER,page*PER).forEach(c=>{c.hidden=false});em.hidden=all.length>0;
if(n<=1){pg.hidden=true;pg.innerHTML='';return}pg.hidden=false;
let h='<button type="button" data-p="'+(page-1)+'" aria-label="上一頁"'+(page===1?' disabled':'')+'>'+CL+'</button>';
pageList(n,page).forEach(x=>{h+=x?'<button type="button" data-p="'+x+'" aria-label="第 '+x+' 頁"'+(x===page?' aria-current="page"':'')+'>'+x+'</button>':'<span class="gap">…</span>'});
h+='<button type="button" data-p="'+(page+1)+'" aria-label="下一頁"'+(page===n?' disabled':'')+'>'+CR+'</button>';pg.innerHTML=h}
function apply(){const k=key,asc=dir==='asc';
[...cs].sort((a,c)=>{const x=+a.dataset[k],y=+c.dataset[k];if(k!=='d'&&(x<0)!==(y<0))return x<0?1:-1;
return (asc?x-y:y-x)||(asc?a.dataset.d-c.dataset.d:c.dataset.d-a.dataset.d)}).forEach(c=>grid.appendChild(c));
cs.forEach(c=>{const m=c.querySelector('.meta'),v=+c.dataset[k];
m.textContent=k==='d'||v<0?'':'#'+c.dataset['r'+k]+' · '+v.toLocaleString('zh-TW')+(k==='v'?' 瀏覽':' 讚')});
skl.textContent=NAMES[k];ddm.querySelectorAll('li').forEach(li=>li.setAttribute('aria-selected',String(li.dataset.v===k)));
sd.classList.toggle('asc',asc);const lb=asc?'升冪':'降冪';sd.setAttribute('aria-label',lb);sd.title=lb;render()}
function save(){try{sessionStorage.setItem(SK,key);sessionStorage.setItem(DK,dir);sessionStorage.setItem(PK,String(page))}catch(_){}}
function filt(){const k=q.value.trim().toLowerCase();hits=k?new Set(cs.filter(c=>c.dataset.t.includes(k))):null}
function openM(o){ddm.hidden=!o;sk.setAttribute('aria-expanded',String(o))}
sk.addEventListener('click',e=>{e.stopPropagation();openM(ddm.hidden)});
ddm.addEventListener('click',e=>{const li=e.target.closest('li');if(!li)return;key=li.dataset.v;page=1;apply();save();openM(false);sk.focus()});
document.addEventListener('click',()=>openM(false));
sk.addEventListener('keydown',e=>{if(e.key==='Escape'){openM(false);return}const i=ORDER.indexOf(key);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();key=ORDER[Math.max(0,Math.min(2,i+(e.key==='ArrowDown'?1:-1)))];page=1;apply();save()}});
sd.addEventListener('click',()=>{dir=dir==='asc'?'desc':'asc';page=1;apply();save()});
q.addEventListener('input',()=>{filt();page=1;render();save();try{sessionStorage.setItem(QK,q.value)}catch(_){}});
pg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;page=+b.dataset.p;render();save();document.querySelector('.bar').scrollIntoView({behavior:'smooth',block:'start'})});
try{const k0=sessionStorage.getItem(SK),d0=sessionStorage.getItem(DK),p0=+sessionStorage.getItem(PK);if(k0&&NAMES[k0])key=k0;if(d0==='asc')dir='asc';if(p0>0)page=p0;const q0=sessionStorage.getItem(QK);if(q0){q.value=q0;filt()}}catch(_){}
apply();
history.scrollRestoration='manual';
const nv=performance.getEntriesByType('navigation')[0];
function saveY(){try{sessionStorage.setItem('yc-y',String(window.scrollY))}catch(_){}}
function restoreY(){try{const y=+sessionStorage.getItem('yc-y');if(y)window.scrollTo(0,y)}catch(_){}}
addEventListener('pagehide',saveY);grid.addEventListener('click',saveY);
if(nv&&nv.type==='back_forward'){restoreY();requestAnimationFrame(restoreY);addEventListener('load',restoreY)}
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
  const imgs = p.images.length ? p.images : (p.cover ? [p.cover] : []); // 沒有圖卡的舊文用站內封面圖
  if (!imgs.length) return '';
  const n = imgs.length;
  const slides = imgs.map((u, i) => `<img src="${u}" alt="Day ${p.day} 第 ${i + 1} 張" ${i ? 'loading="lazy"' : ''}>`).join('');
  if (n === 1) return `<div class="car one"><div class="track">${slides}</div></div>`;
  const dots = imgs.map((_, i) => `<button type="button" aria-label="第 ${i + 1} 張"${i ? '' : ' class="on"'}></button>`).join('');
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
for (const f of ['logo-light.png', 'logo-dark.png']) fs.copyFileSync(path.join(here, 'src', f), path.join(OUT, f));

posts.forEach((p, i) => {
  const newer = posts[i - 1], older = posts[i + 1];
  const html = page({
    title: `Day ${p.day}｜${p.title}`,
    desc: p.title,
    depth: '../../',
    body: `<header class="top slim"><a class="back" href="../../" onclick="try{var r=new window.URL(document.referrer);if(r.origin===location.origin&&r.pathname==='/'){history.back();return false}}catch(e){}">← 全部貼文</a></header>
<article class="post${p.images.length || p.cover ? "" : " nocar"}">
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
