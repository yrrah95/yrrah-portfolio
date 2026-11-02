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
const navHtml = (depth, active) => `<nav class="nav"><div class="in"><a class="brand" href="${depth || './'}" aria-label="Claude Code Everyday 首頁"><picture><source media="(prefers-color-scheme:dark)" srcset="${depth}logo-dark.png"><img src="${depth}logo-light.png" alt="Claude Code Everyday" width="280" height="26"></picture></a><div class="links"><a href="${depth || './'}"${active === 'posts' ? ' aria-current="page"' : ''}>Tips</a><a href="${depth}skill/"${active === 'skill' ? ' aria-current="page"' : ''}>Skill</a><a href="${PROFILE_URL}" rel="noopener" target="_blank">Threads ${ARROW}</a></div></div></nav>`;
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

const skillsByDay = {}; // 貼文天數 → 該篇提到的 skill（由 Skill 區塊填入）

// ---- Skill 分頁：資料是 data/skills.json（由 tools/sync-skills.mjs 從工作站清單唯讀產生，已濾掉自製與個人用語）
const SKILL_FILE = path.join(here, 'data', 'skills.json');
const skillData = fs.existsSync(SKILL_FILE) ? JSON.parse(fs.readFileSync(SKILL_FILE, 'utf8')) : null;
const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const XICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
if (skillData) {
  // 來源包：收錄條件＝星數 ≥10000、近 12 個月有更新、未封存；不符合的包與包內 skill 不進網站
  const PACK_FILE = path.join(here, 'data', 'packs.json');
  const packData = fs.existsSync(PACK_FILE) ? JSON.parse(fs.readFileSync(PACK_FILE, 'utf8')) : { fetched: '', packs: [] };
  const packZh = JSON.parse(fs.readFileSync(path.join(here, 'data', 'pack-zh.json'), 'utf8'));
  const ageDays = (d) => (Date.parse(packData.fetched) - Date.parse(d)) / 86400000;
  const packs = packData.packs.filter((p) => {
    const ok = p.stars >= 10000 && ageDays(p.pushed) <= 365 && !p.archived && packZh[p.repo];
    if (!ok) warns.push('來源包 ' + p.repo + ' 不符收錄條件或缺中文簡介，已略過');
    return ok;
  }).sort((x, y) => y.stars - x.stars);
  const srcPack = {};
  packs.forEach((p) => { srcPack[p.src] = p; p.merge.forEach((m) => { srcPack[m] = p; }); });
  const sk = skillData.skills.filter((s) => srcPack[s.src]);
  const droppedSk = skillData.skills.filter((s) => !srcPack[s.src]);
  if (droppedSk.length) console.log('略過 ' + droppedSk.length + ' 個不在來源包內的 skill：' + droppedSk.map((s) => s.src + '/' + s.name).join('、'));
  const gc = {}, ac = {};
  sk.forEach((s) => { gc[s.group] = (gc[s.group] || 0) + 1; ac[s.src] = (ac[s.src] || 0) + 1; });
  const groups = skillData.groups.filter((g) => gc[g]);
  const authors = Object.keys(ac);
  const wan = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬' : String(n));
  const packSkills = (p) => sk.filter((s) => srcPack[s.src] === p);
  const maxStars = packs.length ? packs[0].stars : 1;
  const rows = packs.map((p) => {
    const list = packSkills(p);
    const kinds = (p.plugin ? 'plugin ' : '') + (p.hook ? 'hook' : '');
    const gs = [...new Set(list.map((s) => s.group))];
    const pt = (p.name + ' ' + packZh[p.repo] + ' ' + p.repo).toLowerCase();
    const items = list.map((s) => '<li data-g="' + esc(s.group) + '" data-t="' + esc((s.name + ' ' + s.say + ' ' + s.group).toLowerCase()) + '"><a href="' + esc(s.src) + '/' + esc(s.name) + '/"><code>/' + esc(s.name) + '</code><span' + (s.en ? ' lang="en"' : '') + '>' + esc(s.say) + '</span></a></li>').join('');
    return '<li class="pk" data-k="' + kinds.trim() + '" data-g="' + esc(gs.join('|')) + '" data-pt="' + esc(pt) + '" data-t="' + esc(pt + ' ' + list.map((s) => s.name + ' ' + s.say).join(' ').toLowerCase()) + '"><details>'
      + '<summary><span class="rk" aria-hidden="true"></span><span class="pkb"><span class="pkn"><code>' + esc(p.name) + '</code>' + (p.plugin ? '<span class="kd">Plugin</span>' : '') + (p.hook ? '<span class="kd">Hook</span>' : '') + '<span class="ska">AI翻譯</span></span>'
      + '<span class="pkd">' + esc(packZh[p.repo]) + '</span><span class="heat" aria-hidden="true"><i style="width:' + Math.max(2, Math.round(p.stars / maxStars * 100)) + '%"></i></span></span>'
      + '<span class="pkr"><span class="stv"><b>★</b> ' + wan(p.stars) + '</span><span class="pkc"><span class="n">' + list.length + '</span> 個 skill</span></span></summary>'
      + '<div class="pkx"><ul class="pks">' + items + '</ul><p class="pkf"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">到 GitHub 看專案 ' + ARROW + '</a><span>授權 ' + esc(p.license || '未標示') + '</span><span>最近更新 ' + esc(p.pushed) + '</span></p></div></details></li>';
  }).join('\n');
  const railBtn = (attr, v, label, n) => '<button type="button" ' + attr + '="' + esc(v) + '" aria-pressed="false">' + esc(label) + '<small>' + n + '</small></button>';
  const rail = '<aside class="rail"><section><h2>類型</h2>' + railBtn('data-ty', '', '全部', packs.length) + railBtn('data-ty', 'plugin', 'Plugin', packs.filter((p) => p.plugin).length) + railBtn('data-ty', 'hook', 'Hook', packs.filter((p) => p.hook).length) + '</section>'
    + '<section><h2>功能</h2>' + railBtn('data-g', '', '全部', packs.length) + groups.map((g) => railBtn('data-g', g, g, packs.filter((p) => packSkills(p).some((s) => s.group === g)).length)).join('') + '</section></aside>';
  const skillPage = page({
    title: 'Skill｜Claude Code Everyday',
    desc: packs.length + ' 個熱門來源包、' + sk.length + ' 個 Claude Code skill 的中文說明（AI 翻譯）。',
    depth: '../',
    active: 'skill',
    body: '<header class="top home"><h1 class="sr">Skill</h1><p class="lead">只收熱門的來源包，依 GitHub 星數排名。中文說明都是 AI 翻譯，以原文為準。不保證安全，安裝前請自己看過內容。</p></header>\n'
      + '<div class="cw">' + rail + '<div class="cmain"><div class="pkt"><input id="q" type="search" placeholder="搜尋，例如 review、設計、gstack" autocomplete="off"></div>\n'
      + '<ol class="pklist" id="grid">' + rows + '</ol>\n'
      + '<p class="empty" id="empty" hidden>沒有符合的項目</p>\n'
      + '<p class="pknote">星數與更新日抓取於 ' + esc(packData.fetched) + '。Plugin 與 Hook 標示代表專案內有對應檔案，我只檢查檔案是否存在，沒有逐一審查內容。</p></div></div>\n'
      + '<script>\n'
      + "const q=document.getElementById('q'),ps=[...document.querySelectorAll('.pk')],em=document.getElementById('empty'),K={ty:'sk-ty',g:'sk-g',q:'sk-q'};let ty='',g='';\n"
      + "function hit(p,st,sg){const kw=q.value.trim().toLowerCase();if(!st&&ty&&p.dataset.k.split(' ').indexOf(ty)<0)return false;if(!sg&&g&&p.dataset.g.split('|').indexOf(g)<0)return false;return!kw||p.dataset.t.indexOf(kw)>=0}\n"
      + "function save(){try{sessionStorage.setItem(K.ty,ty);sessionStorage.setItem(K.g,g);sessionStorage.setItem(K.q,q.value)}catch(_){}}\n"
      + "function render(){const kw=q.value.trim().toLowerCase();let n=0;\n"
      + "ps.forEach(p=>{const on=hit(p);p.hidden=!on;if(!on)return;n++;const r=p.querySelector('.rk');r.textContent=n;r.classList.toggle('top',n<=3);\n"
      + "const all=kw&&p.dataset.pt.indexOf(kw)>=0;let c=0;p.querySelectorAll('.pks li').forEach(li=>{const v=(!g||li.dataset.g===g)&&(!kw||all||li.dataset.t.indexOf(kw)>=0);li.hidden=!v;if(v)c++});p.querySelector('.pkc .n').textContent=c});\n"
      + "em.hidden=n>0;\n"
      + "document.querySelectorAll('[data-ty]').forEach(b=>{const v=b.dataset.ty;b.setAttribute('aria-pressed',String(v===ty));b.querySelector('small').textContent=ps.filter(p=>hit(p,true)&&(v===''||p.dataset.k.split(' ').indexOf(v)>=0)).length});\n"
      + "document.querySelectorAll('[data-g]').forEach(b=>{const v=b.dataset.g;b.setAttribute('aria-pressed',String(v===g));b.querySelector('small').textContent=ps.filter(p=>hit(p,false,true)&&(v===''||p.dataset.g.split('|').indexOf(v)>=0)).length})}\n"
      + "document.addEventListener('click',e=>{const b=e.target.closest('.rail button');if(!b)return;if(b.dataset.ty!==undefined)ty=b.dataset.ty;if(b.dataset.g!==undefined)g=b.dataset.g;render();save()});\n"
      + "q.addEventListener('input',()=>{render();save()});\n"
      + "try{ty=sessionStorage.getItem(K.ty)||'';g=sessionStorage.getItem(K.g)||'';q.value=sessionStorage.getItem(K.q)||''}catch(_){}\n"
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
    rel.forEach((p) => { (skillsByDay[p.day] = skillsByDay[p.day] || []).push(s); });
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
  ${(skillsByDay[p.day] || []).length ? `<section class="rs"><h2>相關 Skill</h2><ul class="rel">${skillsByDay[p.day].map((s) => `<li><a href="../../skill/${esc(s.src)}/${esc(s.name)}/"><span class="day mono">/${esc(s.name)}</span>${esc(s.say)}</a></li>`).join('')}</ul></section>` : ''}
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
