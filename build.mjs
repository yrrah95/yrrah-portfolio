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
const navHtml = (depth, active) => `<nav class="nav"><div class="in"><a class="brand" href="${depth || './'}" aria-label="Claude Code Everyday 首頁"><picture><source media="(prefers-color-scheme:dark)" srcset="${depth}logo-dark.png"><img src="${depth}logo-light.png" alt="Claude Code Everyday" width="280" height="26"></picture></a><div class="links"><a href="${depth || './'}"${active === 'posts' ? ' aria-current="page"' : ''}>全部貼文</a><a href="${depth}skill/"${active === 'skill' ? ' aria-current="page"' : ''}>Skill</a><a href="${PROFILE_URL}" rel="noopener" target="_blank">Threads ${ARROW}</a></div></div></nav>`;
const footHtml = `<footer class="foot"><div class="in"><span>Claude Code Everyday｜每天一個 Claude Code 用法</span><span class="r"><a href="${PROFILE_URL}" rel="noopener" target="_blank">Threads @yrrah9_ ${ARROW}</a><span>網站更新於 ${BUILT}</span></span></div></footer>`;
const page = ({ title, desc, body, depth, active = 'posts' }) => `<!doctype html>
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
${navHtml(depth, active)}
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


// ---- Skill 分頁：資料是 data/skills.json（由 tools/sync-skills.mjs 從工作站清單唯讀產生，已濾掉自製與個人用語）
const SKILL_FILE = path.join(here, 'data', 'skills.json');
const skillData = fs.existsSync(SKILL_FILE) ? JSON.parse(fs.readFileSync(SKILL_FILE, 'utf8')) : null;
const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const XICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
if (skillData) {
  const sk = skillData.skills;
  const gc = {}, ac = {};
  sk.forEach((s) => { gc[s.group] = (gc[s.group] || 0) + 1; ac[s.src] = (ac[s.src] || 0) + 1; });
  const groups = skillData.groups.filter((g) => gc[g]);
  const authors = Object.keys(ac).sort((x, y) => ac[y] - ac[x] || x.localeCompare(y));
  const cards = sk.map((s) => '<li class="sk" data-g="' + esc(s.group) + '" data-a="' + esc(s.src) + '" data-t="' + esc((s.name + ' ' + s.say + ' ' + s.when + ' ' + s.src + ' ' + s.group).toLowerCase()) + '">'
    + '<div class="skh"><code class="skn"><a href="' + esc(s.src) + '/' + esc(s.name) + '/">/' + esc(s.name) + '</a></code>' + (s.ai ? '<span class="ska">AI翻譯</span>' : '') + '<span class="sks">' + esc(s.src) + '</span></div>'
    + '<p class="sksay"' + (s.en ? ' lang="en"' : '') + '>' + esc(s.say) + '</p>'
    + '</li>').join('\n');
  const opts = (all, list, cnt) => '<li role="option" data-v="" aria-selected="true">' + all + '<small>' + sk.length + '</small></li>'
    + list.map((v) => '<li role="option" data-v="' + esc(v) + '" aria-selected="false">' + esc(v) + '<small>' + cnt[v] + '</small></li>').join('');
  const dd = (k, label, menu) => '<div class="sortbar solo" id="' + k + 'bar"><div class="dd"><button type="button" class="ddb" id="' + k + 'k" aria-haspopup="listbox" aria-expanded="false"><span id="' + k + 'l">' + label + '</span>' + CHEV + '</button><ul class="ddm long" id="' + k + 'm" role="listbox" hidden>' + menu + '</ul></div></div>';
  const skillPage = page({
    title: 'Skill｜Claude Code Everyday',
    desc: sk.length + ' 個 Claude Code skill 的中文說明（AI 翻譯），附上什麼時候用。',
    depth: '../',
    active: 'skill',
    body: '<header class="top home"><h1 class="sr">Skill</h1><p class="lead">' + sk.length + ' 個 Claude Code skill 的中文說明，附上什麼時候用。中文都是 AI 翻譯，以原文為準。整理自各作者的公開頁面，不代表我用過或保證安全，安裝前請自己看過內容。</p></header>\n'
      + '<div class="bar">' + dd('g', '全部功能', opts('全部功能', groups, gc)) + dd('a', '全部作者', opts('全部作者', authors, ac))
      + '<button type="button" class="clr" id="clr" hidden>' + XICON + '清除</button>'
      + '<input id="q" type="search" placeholder="搜尋，例如 review、設計、gstack" autocomplete="off"></div>\n'
      + '<ul class="skgrid" id="grid">' + cards + '</ul>\n'
      + '<nav class="pager" id="pg" aria-label="分頁" hidden></nav>\n'
      + '<p class="empty" id="empty" hidden>沒有符合的 skill</p>\n'
      + '<script>\n'
      + "const q=document.getElementById('q'),cs=[...document.querySelectorAll('.sk')],em=document.getElementById('empty'),pg=document.getElementById('pg'),clr=document.getElementById('clr');\n"
      + "const PER=12,K={g:'sk-g',a:'sk-a',q:'sk-q',p:'sk-p'},ALL={g:'全部功能',a:'全部作者'};let sel={g:'',a:''},page=1;\n"
      + "const D={};['g','a'].forEach(k=>{D[k]={btn:document.getElementById(k+'k'),lbl:document.getElementById(k+'l'),menu:document.getElementById(k+'m'),bar:document.getElementById(k+'bar')}});\n"
      + "const CL='<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 18l-6-6 6-6\"/></svg>';\n"
      + "const CR='<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\"/></svg>';\n"
      + "function pageList(n,c){const s=new Set([1,n,c-1,c,c+1]);if(c<=3){s.add(2);s.add(3);s.add(4)}if(c>=n-2){s.add(n-1);s.add(n-2);s.add(n-3)}const a=[...s].filter(x=>x>=1&&x<=n).sort((x,y)=>x-y),o=[];a.forEach((x,i)=>{if(i&&x-a[i-1]>1)o.push(0);o.push(x)});return o}\n"
      + "function save(){try{sessionStorage.setItem(K.g,sel.g);sessionStorage.setItem(K.a,sel.a);sessionStorage.setItem(K.q,q.value);sessionStorage.setItem(K.p,String(page))}catch(_){}}\n"
      + "function ok(c,skip){const kw=q.value.trim().toLowerCase();return(skip==='g'||!sel.g||c.dataset.g===sel.g)&&(skip==='a'||!sel.a||c.dataset.a===sel.a)&&(!kw||c.dataset.t.includes(kw))}\n"
      + "function render(){const all=cs.filter(c=>ok(c)),n=Math.max(1,Math.ceil(all.length/PER));if(page>n)page=n;if(page<1)page=1;cs.forEach(c=>{c.hidden=true});all.slice((page-1)*PER,page*PER).forEach(c=>{c.hidden=false});em.hidden=all.length>0;\n"
      + "['g','a'].forEach(k=>{const base=cs.filter(c=>ok(c,k)),cnt={};base.forEach(c=>{const v=c.dataset[k];cnt[v]=(cnt[v]||0)+1});\n"
      + "D[k].menu.querySelectorAll('li').forEach(li=>{const v=li.dataset.v,m=v===''?base.length:(cnt[v]||0);li.querySelector('small').textContent=m;li.classList.toggle('zero',m===0&&v!==sel[k]);li.setAttribute('aria-selected',String(v===sel[k]))});\n"
      + "D[k].lbl.textContent=sel[k]||ALL[k];D[k].bar.classList.toggle('on',!!sel[k])});\n"
      + "clr.hidden=!(sel.g||sel.a||q.value.trim());\n"
      + "if(n<=1){pg.hidden=true;pg.innerHTML='';return}pg.hidden=false;\n"
      + "let h='<button type=\"button\" data-p=\"'+(page-1)+'\" aria-label=\"上一頁\"'+(page===1?' disabled':'')+'>'+CL+'</button>';\n"
      + "pageList(n,page).forEach(x=>{h+=x?'<button type=\"button\" data-p=\"'+x+'\" aria-label=\"第 '+x+' 頁\"'+(x===page?' aria-current=\"page\"':'')+'>'+x+'</button>':'<span class=\"gap\">…</span>'});\n"
      + "h+='<button type=\"button\" data-p=\"'+(page+1)+'\" aria-label=\"下一頁\"'+(page===n?' disabled':'')+'>'+CR+'</button>';pg.innerHTML=h}\n"
      + "function closeAll(except){['g','a'].forEach(k=>{if(k!==except){D[k].menu.hidden=true;D[k].btn.setAttribute('aria-expanded','false')}})}\n"
      + "['g','a'].forEach(k=>{const d=D[k];\n"
      + "d.btn.addEventListener('click',e=>{e.stopPropagation();closeAll(k);d.menu.hidden=!d.menu.hidden;d.btn.setAttribute('aria-expanded',String(!d.menu.hidden))});\n"
      + "d.menu.addEventListener('click',e=>{const li=e.target.closest('li');if(!li||li.classList.contains('zero'))return;sel[k]=li.dataset.v;page=1;render();save();closeAll();d.btn.focus()});\n"
      + "d.btn.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()})});\n"
      + "document.addEventListener('click',()=>closeAll());\n"
      + "q.addEventListener('input',()=>{page=1;render();save()});\n"
      + "clr.addEventListener('click',()=>{sel={g:'',a:''};q.value='';page=1;render();save()});\n"
      + "pg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;page=+b.dataset.p;render();save();document.querySelector('.bar').scrollIntoView({behavior:'smooth',block:'start'})});\n"
      + "try{sel.g=sessionStorage.getItem(K.g)||'';sel.a=sessionStorage.getItem(K.a)||'';q.value=sessionStorage.getItem(K.q)||'';page=+sessionStorage.getItem(K.p)||1}catch(_){}\n"
      + "render();\n"
      + '</script>',
  });
  fs.mkdirSync(path.join(OUT, 'skill'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'skill', 'index.html'), skillPage);
  // 詳細頁：完整中文說明、什麼時候用、原文、貼文裡提到過的 Day、來源連結
  const BACK_SKILL = "try{var r=new window.URL(document.referrer);if(r.origin===location.origin&&(r.pathname==='/skill/'||r.pathname==='/skill')){history.back();return false}}catch(e){}";
  const reFor = (n) => { const e = n.replace(/[.*+?^$()|[\]\\{}-]/g, '\\$&'); return n.includes('-') ? new RegExp('(?<![A-Za-z0-9-])' + e + '(?![A-Za-z0-9-])', 'i') : new RegExp('(/|`)' + e + '(?![A-Za-z0-9-])'); };
  const relPosts = (s) => { const re = reFor(s.name); return posts.filter((p) => re.test((p.body || '') + '\n' + (p.cta || ''))); };
  let detailN = 0, relN = 0;
  for (const s of sk) {
    const rel = relPosts(s);
    if (rel.length) relN++;
    const origLang = /[\u4e00-\u9fff]/.test(s.orig || '') ? '' : ' lang="en"';
    const html = page({
      title: '/' + s.name + '｜Skill｜Claude Code Everyday',
      desc: s.say.slice(0, 110),
      depth: '../../../',
      active: 'skill',
      body: '<header class="top slim skdh"><a class="back" href="../../" onclick="' + BACK_SKILL + '">← Skill</a></header>\n'
        + '<article class="skd">\n'
        + '<h1><code>/' + esc(s.name) + '</code></h1>\n'
        + '<div class="tags"><span class="tg">' + esc(s.group) + '</span><span class="tg">' + esc(s.src) + '</span>' + (s.ai ? '<span class="ska">AI翻譯</span>' : '') + '</div>\n'
        + '<p class="lede"' + (s.en ? ' lang="en"' : '') + '>' + esc(s.say) + '</p>\n'
        + (s.when ? '<section><h2>什麼時候用</h2><p>' + esc(s.when) + '</p></section>\n' : '')
        + (s.orig && s.orig !== s.say ? '<section><h2>原文</h2><p class="orig"' + origLang + '>' + esc(s.orig) + '</p></section>\n' : '')
        + (rel.length ? '<section><h2>相關貼文</h2><ul class="rel">' + rel.map((p) => '<li><a href="../../../d/' + p.day + '/"><span class="day">Day ' + p.day + '</span>' + esc(p.title) + '</a></li>').join('') + '</ul></section>\n' : '')
        + (s.url ? '<p class="go"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">到 GitHub 看原文 ' + ARROW + '</a></p>\n' : '')
        + '</article>',
    });
    const dir = path.join(OUT, 'skill', s.src, s.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    detailN++;
  }
  console.log('Skill 詳細頁 ' + detailN + ' 頁（其中 ' + relN + ' 個有相關貼文）');
  console.log('Skill ' + sk.length + ' 個，功能 ' + groups.length + ' 組，作者 ' + authors.length + ' 位');
} else {
  warns.push('沒有 data/skills.json，Skill 分頁略過（node tools/sync-skills.mjs 產生）');
}

console.log(`貼文 ${posts.length} 篇，輸出 ${OUT}`);
console.log(`有圖 ${posts.filter((p) => p.images.length).length} 篇，量測碼 ${BEACON ? '有' : '無'}`);
warns.forEach((w) => console.log('警告：' + w));
