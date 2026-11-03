// 靜態網站產生器：讀 tips 貼文資料，輸出 dist/（零依賴）
// 用法：node build.mjs [--data <tips 資料夾>] [--cards <圖卡資料夾>] [--out dist]
// 環境變數 CF_BEACON_TOKEN 有值時，頁面會加上 Cloudflare Web Analytics 量測碼
import fs from 'node:fs';
import crypto from 'node:crypto';
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
  // 收錄條件：星數 ≥10000、近 12 個月有更新、未封存；新來源包另外要有授權
  const packs = packData.packs.filter((p) => {
    const ok = p.stars >= 10000 && ageDays(p.pushed) <= 365 && !p.archived && (packZh[p.repo] || p.license);
    if (!ok) warns.push('來源包 ' + p.repo + ' 不符收錄條件，已略過');
    return ok;
  }).sort((x, y) => y.stars - x.stars);
  const srcPack = {};
  packs.forEach((p) => { srcPack[p.src] = p; p.merge.forEach((m) => { srcPack[m] = p; }); });
  const zhOf = (p) => packZh[p.repo] || p.desc || '';
  const isZh = (p) => !!packZh[p.repo];
  // 新來源包的 skill：直接用 GitHub 上的原文說明（還沒翻譯、還沒分功能）
  const slug = (n) => String(n).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'skill';
  const UNSORTED = '未分類';
  const newSk = [];
  packs.forEach((p) => (p.skills || []).forEach((x) => newSk.push({ name: slug(x.name), src: p.src, group: UNSORTED, say: x.desc || '（原文沒有說明）', when: '', orig: x.orig || '', used: false, ai: false, en: !/[\u4e00-\u9fff]/.test(x.desc || ''), url: x.url, dir: (x.path || '').split('/').slice(-2, -1)[0] || '' })));
  const sk = skillData.skills.filter((s) => srcPack[s.src]).concat(newSk);
  // 英文說明的 AI 中文翻譯：data/skill-zh.json，鍵＝來源/名稱|英文說明的雜湊；有翻譯就取代說明並標 AI翻譯（原文仍保留在頁面下方）
  const ZH_FILE = path.join(here, 'data', 'skill-zh.json');
  const skillZh = fs.existsSync(ZH_FILE) ? JSON.parse(fs.readFileSync(ZH_FILE, 'utf8')) : {};
  const zhKey = (s) => s.src + '/' + s.name + '|' + crypto.createHash('md5').update(s.say).digest('hex').slice(0, 8);
  sk.forEach((s) => { const z = skillZh[zhKey(s)]; if (z) { s.say = z; s.ai = true; s.en = false; } });
  if (process.env.DUMP_EN) fs.writeFileSync(process.env.DUMP_EN, JSON.stringify(sk.filter((s) => s.en).map((s) => ({ k: zhKey(s), en: s.say })), null, 0));
  // 新收錄 skill 的功能分類（AI 依中文說明判斷，只能選現有功能名）：data/skill-groups.json，鍵＝來源/名稱
  const GRP_FILE = path.join(here, 'data', 'skill-groups.json');
  const skillGrp = fs.existsSync(GRP_FILE) ? JSON.parse(fs.readFileSync(GRP_FILE, 'utf8')) : {};
  sk.forEach((s) => { const g = skillGrp[s.src + '/' + s.name]; if (s.group === UNSORTED && g && skillData.groups.includes(g)) s.group = g; });
  if (process.env.DUMP_UNSORTED) fs.writeFileSync(process.env.DUMP_UNSORTED, JSON.stringify(sk.filter((s) => s.group === UNSORTED).map((s) => ({ k: s.src + '/' + s.name, name: s.name, say: s.say, pack: srcPack[s.src].name }))));
  console.log('還沒分類的 skill：' + sk.filter((s) => s.group === UNSORTED).length + ' / ' + sk.length);
  console.log('仍是英文原文的 skill：' + sk.filter((s) => s.en).length + ' / ' + sk.length);
  const INST_FILE = path.join(here, 'data', 'installs.json');
  const instData = fs.existsSync(INST_FILE) ? JSON.parse(fs.readFileSync(INST_FILE, 'utf8')) : { fetched: '', installs: {} };
  const ALIAS = { 'mattpocock-retro': 'retro', 'emil-prototype': 'prototype' }; // 我們為了避免撞名改過的名字，對回原名
  const instOf = (s) => { const m = instData.installs[srcPack[s.src].repo] || {}; for (const k of [ALIAS[s.name], s.name, s.dir]) { if (k && m[k.toLowerCase()] != null) return m[k.toLowerCase()]; } return 0; };
  const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : n ? String(n) : '');
  sk.forEach((s) => { s.inst = instOf(s); });
  sk.sort((x, y) => y.inst - x.inst || srcPack[y.src].stars - srcPack[x.src].stars || x.name.localeCompare(y.name));
  console.log('有安裝次數的 skill：' + sk.filter((s) => s.inst).length + ' / ' + sk.length);
  const droppedSk = skillData.skills.filter((s) => !srcPack[s.src]);
  if (droppedSk.length) console.log('略過 ' + droppedSk.length + ' 個不在來源包內的 skill：' + droppedSk.map((s) => s.src + '/' + s.name).join('、'));
  const gc = {}, ac = {};
  sk.forEach((s) => { gc[s.group] = (gc[s.group] || 0) + 1; ac[s.src] = (ac[s.src] || 0) + 1; });
  const groups = skillData.groups.filter((g) => gc[g]);
  const groupOrder = skillData.groups.concat([UNSORTED]);
  const authors = Object.keys(ac);
  const wan = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬' : String(n));
  const packSkills = (p) => sk.filter((s) => srcPack[s.src] === p);
  const nOf = (p) => packSkills(p).length || p.skillCount || 0;
  const pluginPacks = packs.filter((p) => p.plugin);
  const maxStars = pluginPacks.length ? pluginPacks[0].stars : 1;
  const rows = pluginPacks.map((p) => {
    const list = packSkills(p);
    const gs = [...new Set(list.map((s) => s.group))];
    const pt = (p.name + ' ' + zhOf(p) + ' ' + p.repo).toLowerCase();
    const ext = list.length === 0;
    const link = ext ? esc(p.url) + '" target="_blank" rel="noopener' : (list.length > 1 ? esc(p.src) + '/' : esc(list[0].src) + '/' + esc(list[0].name) + '/');
    return '<li class="pk" data-g="' + esc(gs.join('|')) + '" data-t="' + esc(pt + ' ' + list.map((s) => s.name).join(' ').toLowerCase()) + '"><a class="pkl" href="' + link + '"><span class="rk" aria-hidden="true"></span><span class="pkb"><span class="pkn"><code>' + esc(p.name) + '</code><span class="kd">Plugin</span>' + (isZh(p) ? '<span class="ska">AI翻譯</span>' : '') + '</span>'
      + '<span class="pkd"' + (isZh(p) ? '' : ' lang="en"') + '>' + esc(zhOf(p)) + '</span><span class="heat" aria-hidden="true"><i style="width:' + Math.max(2, Math.round(p.stars / maxStars * 100)) + '%"></i></span></span>'
      + '<span class="pkr"><span class="stv"><b>★</b> ' + wan(p.stars) + '</span><span class="pkc"><span class="n">' + nOf(p) + '</span> 個 skill' + (ext ? ' ' + ARROW : '') + '</span></span></a></li>';
  }).join('\n');
  const skData = JSON.stringify(sk.map((s) => [s.name, s.src, s.say, s.en ? 1 : 0, srcPack[s.src].name, s.group === UNSORTED ? '' : s.group, s.inst])).replace(/</g, '\\u003c');
  const railBtn = (attr, v, label, n) => '<button type="button" ' + attr + '="' + esc(v) + '" aria-pressed="false">' + esc(label) + '<small>' + n + '</small></button>';
  const rail = '<aside class="rail"><section><h2>類別</h2>' + railBtn('data-ty', 'skill', 'Skill', sk.length) + railBtn('data-ty', 'plugin', 'Plugin', pluginPacks.length) + '</section>'
    + '<section><h2>功能</h2>' + groups.map((g) => railBtn('data-g', g, g, gc[g])).join('') + '</section></aside>';
  const skillPage = page({
    title: 'Skill｜Claude Code Everyday',
    desc: sk.length + ' 個 Claude Code skill 與 ' + pluginPacks.length + ' 個 plugin。',
    depth: '../',
    active: 'skill',
    body: '<header class="top home"><h1 class="sr">Skill</h1><p class="lead">只收熱門專案（1 萬星以上、近一年有更新）。有中文的是 AI 翻譯，以原文為準；還沒翻譯的顯示英文原文。不保證安全，安裝前請自己看過內容。</p></header>\n'
      + '<div class="cw">' + rail + '<div class="cmain"><div class="pkt"><input id="q" type="search" placeholder="搜尋，例如 review、設計、gstack" autocomplete="off"></div>\n'
      + '<div id="sv"><div class="crows" id="sl"></div><nav class="pager" id="pg" aria-label="分頁" hidden></nav></div>\n'
      + '<div id="pv" hidden><ol class="pklist" id="grid">' + rows + '</ol></div>\n'
      + '<p class="empty" id="empty" hidden>沒有符合的項目</p>\n'
      + '<p class="pknote">星數與更新日抓取於 ' + esc(packData.fetched) + '。Plugin 代表專案內有 plugin 檔案，我只檢查檔案是否存在，沒有逐一審查內容，安裝方式請看各專案說明。Skill 依 skills.sh 的安裝次數排序（右側數字，抓取於 ' + esc(instData.fetched) + '），沒有數字的排在後面。安裝次數是匿名的安裝統計，只代表被安裝過，不代表有人在用，也可能被灌高。功能分類目前只有部分 skill 有。</p></div></div>\n'
      + '<script type="application/json" id="sk-data">' + skData + '</script>\n'
      + '<script>\n'
      + "const $=i=>document.getElementById(i),q=$('q'),sl=$('sl'),pg=$('pg'),sv=$('sv'),pv=$('pv'),em=$('empty'),ps=[...document.querySelectorAll('.pk')];\n"
      + "const D=JSON.parse($('sk-data').textContent).map(a=>({n:a[0],s:a[1],d:a[2],en:a[3],p:a[4],g:a[5],i:a[6],t:(a[0]+' '+a[2]+' '+a[4]+' '+a[5]).toLowerCase()}));\n"
      + "const PER=50,K={ty:'sk-ty',g:'sk-g',q:'sk-q',p:'sk-p'};let ty='skill',g='',page=1;\n"
      + "const E=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));\n"
      + "const CL='<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 18l-6-6 6-6\"/></svg>';\n"
      + "const CR='<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\"/></svg>';\n"
      + "function pageList(n,c){const s=new Set([1,n,c-1,c,c+1]);if(c<=3){s.add(2);s.add(3);s.add(4)}if(c>=n-2){s.add(n-1);s.add(n-2);s.add(n-3)}const a=[...s].filter(x=>x>=1&&x<=n).sort((x,y)=>x-y),o=[];a.forEach((x,i)=>{if(i&&x-a[i-1]>1)o.push(0);o.push(x)});return o}\n"
      + "const kw=()=>q.value.trim().toLowerCase();\n"
      + "const fmt=n=>n>=1e6?(n/1e6).toFixed(1).replace(/\\.0$/,'')+'M':n>=1e3?Math.round(n/1e3)+'K':n?String(n):'';\n"
      + "const sHit=(x,sg)=>(sg||!g||x.g===g)&&(!kw()||x.t.indexOf(kw())>=0);\n"
      + "const pHit=(p,sg)=>(sg||!g||p.dataset.g.split('|').indexOf(g)>=0)&&(!kw()||p.dataset.t.indexOf(kw())>=0);\n"
      + "function save(){try{sessionStorage.setItem(K.ty,ty);sessionStorage.setItem(K.g,g);sessionStorage.setItem(K.q,q.value);sessionStorage.setItem(K.p,String(page))}catch(_){}}\n"
      + "function render(){\n"
      + "const sAll=D.filter(x=>sHit(x)),pAll=ps.filter(p=>pHit(p));let any;\n"
      + "sv.hidden=ty!=='skill';pv.hidden=ty==='skill';\n"
      + "if(ty==='skill'){const n=Math.max(1,Math.ceil(sAll.length/PER));if(page>n)page=n;if(page<1)page=1;any=sAll.length>0;\n"
      + "sl.innerHTML=sAll.slice((page-1)*PER,page*PER).map(x=>'<a class=\"crow\" href=\"'+E(x.s)+'/'+E(x.n)+'/\"><code>/'+E(x.n)+'</code><span class=\"d\"'+(x.en?' lang=\"en\"':'')+'>'+E(x.d)+'</span><span class=\"g\">'+E(x.p)+'</span><span class=\"in\">'+fmt(x.i)+'</span></a>').join('');\n"
      + "if(n<=1){pg.hidden=true;pg.innerHTML=''}else{pg.hidden=false;let h='<button type=\"button\" data-p=\"'+(page-1)+'\" aria-label=\"上一頁\"'+(page===1?' disabled':'')+'>'+CL+'</button>';\n"
      + "pageList(n,page).forEach(x=>{h+=x?'<button type=\"button\" data-p=\"'+x+'\" aria-label=\"第 '+x+' 頁\"'+(x===page?' aria-current=\"page\"':'')+'>'+x+'</button>':'<span class=\"gap\">…</span>'});\n"
      + "h+='<button type=\"button\" data-p=\"'+(page+1)+'\" aria-label=\"下一頁\"'+(page===n?' disabled':'')+'>'+CR+'</button>';pg.innerHTML=h}}\n"
      + "else{any=pAll.length>0;let n=0;ps.forEach(p=>{const on=pHit(p);p.hidden=!on;if(!on)return;n++;const r=p.querySelector('.rk');r.textContent=n;r.classList.toggle('top',n<=3)})}\n"
      + "em.hidden=any;\n"
      + "document.querySelectorAll('[data-ty]').forEach(b=>{const v=b.dataset.ty;b.setAttribute('aria-pressed',String(v===ty));b.querySelector('small').textContent=v==='skill'?sAll.length:pAll.length});\n"
      + "document.querySelectorAll('.rail [data-g]').forEach(b=>{const v=b.dataset.g;b.setAttribute('aria-pressed',String(v===g));b.querySelector('small').textContent=ty==='skill'?D.filter(x=>sHit(x,true)&&x.g===v).length:ps.filter(p=>pHit(p,true)&&p.dataset.g.split('|').indexOf(v)>=0).length})}\n"
      + "document.addEventListener('click',e=>{const b=e.target.closest('.rail button');if(!b)return;if(b.dataset.ty!==undefined){ty=b.dataset.ty;page=1}if(b.dataset.g!==undefined){g=(g===b.dataset.g)?'':b.dataset.g;page=1}render();save()});\n"
      + "pg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;page=+b.dataset.p;render();save();document.querySelector('.pkt').scrollIntoView({behavior:'smooth',block:'start'})});\n"
      + "q.addEventListener('input',()=>{page=1;render();save()});\n"
      + "try{ty=sessionStorage.getItem(K.ty)||'skill';g=sessionStorage.getItem(K.g)||'';q.value=sessionStorage.getItem(K.q)||'';page=+sessionStorage.getItem(K.p)||1}catch(_){}\n"
      + "render();\n"
      + '</script>',
  });
  fs.mkdirSync(path.join(OUT, 'skill'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'skill', 'index.html'), skillPage);
  // 詳細頁：完整中文說明、什麼時候用、原文、貼文裡提到過的 Day、來源連結
  const backJs = (a, b) => "try{var r=new window.URL(document.referrer);if(r.origin===location.origin&&(r.pathname==='" + a + "'||r.pathname==='" + b + "')){history.back();return false}}catch(e){}";
  let packPageN = 0;
  const packHasPage = (p) => packSkills(p).length > 1;
  const gi = (g) => groupOrder.indexOf(g);
  for (const p of packs) {
    if (!packHasPage(p)) continue;
    const list = packSkills(p);
    const secs = groupOrder.map((g) => ({ g, items: list.filter((s) => s.group === g) })).filter((x) => x.items.length);
    const html = page({
      title: p.name + '｜Skill｜Claude Code Everyday',
      desc: zhOf(p).slice(0, 110),
      depth: '../../',
      active: 'skill',
      body: '<header class="top slim skdh skph"><a class="back" href="../" onclick="' + backJs('/skill/', '/skill') + '">← Skill</a></header>\n'
        + '<article class="skd skp">\n<h1><code>' + esc(p.name) + '</code></h1>\n'
        + '<div class="tags">' + (p.plugin ? '<span class="tg">Plugin</span>' : '') + (isZh(p) ? '<span class="ska">AI翻譯</span>' : '') + '</div>\n'
        + '<p class="lede"' + (isZh(p) ? '' : ' lang="en"') + '>' + esc(zhOf(p)) + '</p>\n'
        + '<p class="pkf"><span><b class="ac">★</b> ' + wan(p.stars) + '</span><span>' + list.length + ' 個 skill</span><span>授權 ' + esc(p.license || '未標示') + '</span><span>最近更新 ' + esc(p.pushed) + '</span></p>\n'
        + '<a class="gh" href="' + esc(p.url) + '" target="_blank" rel="noopener">到 GitHub 看專案 ' + ARROW + '</a>\n'
        + '<div class="pkt pq"><input id="q" type="search" placeholder="搜尋這個包的 skill" autocomplete="off"></div>\n'
        + '<div class="crows">' + list.map((s) => '<a class="crow" data-t="' + esc((s.name + ' ' + s.say + ' ' + s.group).toLowerCase()) + '" href="../' + esc(s.src) + '/' + esc(s.name) + '/"><code>/' + esc(s.name) + '</code><span class="d"' + (s.en ? ' lang="en"' : '') + '>' + esc(s.say) + '</span><span class="g">' + (s.group === UNSORTED ? '' : esc(s.group)) + '</span><span class="in">' + fmtN(s.inst) + '</span></a>').join('') + '</div>'
        + '\n<p class="empty" id="empty" hidden>沒有符合的 skill</p>\n</article>\n'
        + '<script>\n'
        + "const q=document.getElementById('q'),em=document.getElementById('empty');\n"
        + "q.addEventListener('input',()=>{const kw=q.value.trim().toLowerCase();let n=0;document.querySelectorAll('.crow').forEach(r=>{const v=!kw||r.dataset.t.indexOf(kw)>=0;r.hidden=!v;if(v)n++});em.hidden=n>0})\n"
        + '</script>',
    });
    const dir = path.join(OUT, 'skill', p.src);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    packPageN++;
  }
  console.log('來源包專屬頁 ' + packPageN + ' 頁');
  // 從 Skill 列表進來時，返回鈕改成「← Skill」、回到列表（history.back 會保留分頁與篩選）
  const BACK_FROM_LIST = '<script>(function(){try{var r=new URL(document.referrer);if(r.origin===location.origin&&(r.pathname==="/skill/"||r.pathname==="/skill")){var a=document.querySelector(".skdh .back");a.textContent="← Skill";a.setAttribute("href","../../");a.setAttribute("onclick","history.back();return false")}}catch(e){}})()</script>';
  const BACK_SKILL = "try{var r=new window.URL(document.referrer);if(r.origin===location.origin&&(r.pathname==='/skill/'||r.pathname==='/skill')){history.back();return false}}catch(e){}";
  const reFor = (n) => { const e = n.replace(/[.*+?^$()|[\]\\{}-]/g, '\\$&'); return n.includes('-') ? new RegExp('(?<![A-Za-z0-9-])' + e + '(?![A-Za-z0-9-])', 'i') : new RegExp('(/|`)' + e + '(?![A-Za-z0-9-])'); };
  const relPosts = (s) => { const re = reFor(s.name); return posts.filter((p) => re.test((p.body || '') + '\n' + (p.cta || ''))); };
  let detailN = 0, relN = 0;
  const pkOf = (s) => srcPack[s.src];
  // 詳細頁的手寫補充（跟相近 skill 差在哪、較短的「什麼時候用」）：data/skill-vs.json，沒有就略過
  const VS_FILE = path.join(here, 'data', 'skill-vs.json');
  const skillVs = fs.existsSync(VS_FILE) ? JSON.parse(fs.readFileSync(VS_FILE, 'utf8')) : {};
  const bigN = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬' : String(n));
  const factsHtml = (s) => {
    const p = pkOf(s); if (!p) return '';
    const it = [];
    if (s.inst) it.push('<div><dt>安裝次數</dt><dd class="hot">' + bigN(s.inst) + '</dd></div>');
    it.push('<div><dt>所屬包星數</dt><dd>' + bigN(p.stars) + ' <small>★</small></dd></div>');
    it.push('<div><dt>授權</dt><dd>' + esc(p.license || '未標示') + '</dd></div>');
    it.push('<div><dt>包最近更新</dt><dd>' + esc(p.pushed) + '</dd></div>');
    return '<dl class="facts">' + it.join('') + '</dl>\n';
  };
  const vsHtml = (x) => {
    if (!x.vs || !x.vs.length) return '';
    return '<section><h2>跟相近的 skill 差在哪</h2><ul class="vs">' + x.vs.map((v) => { const o = sk.find((y) => y.name === v[0] && y.src === (v[2] || x.src || '')); const nm = '/' + esc(v[0]); return '<li>' + (o ? '<a class="mono" href="../../' + esc(o.src) + '/' + esc(o.name) + '/">' + nm + '</a>' : '<span class="mono">' + nm + '</span>') + '<span>' + esc(v[1]) + '</span></li>'; }).join('') + '</ul></section>\n';
  };
  // 只有 skills.sh 查得到安裝次數的 skill 才給安裝指令（指令寫法取自 skills.sh 頁面）
  const installHtml = (s) => {
    const p = pkOf(s); if (!p || !s.inst) return '';
    const cmd = 'npx skills add ' + p.url + ' --skill ' + (ALIAS[s.name] || s.dir || s.name);
    return '<section><h2>怎麼裝</h2><div class="cmd"><code class="mono">' + esc(cmd) + '</code><button type="button" data-copy>複製</button></div><p class="note">裝進你的 Claude Code。這個網站不保證安全，裝之前先看過原文。</p></section>\n';
  };
  const COPY_JS = '<script>document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var c=b.parentNode.querySelector("code");function ok(){b.textContent="已複製";setTimeout(function(){b.textContent="複製"},1500)}function sel(){var r=document.createRange();r.selectNodeContents(c);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="請按 Ctrl+C"}try{navigator.clipboard.writeText(c.textContent).then(ok,sel)}catch(e){sel()}})})</script>';
  for (const s of sk) {
    const rel = relPosts(s);
    if (rel.length) relN++;
    rel.forEach((p) => { const l = (skillsByDay[p.day] = skillsByDay[p.day] || []); if (!l.some((x) => x.name === s.name)) l.push(s); });
    const vsx = skillVs[s.name] && (skillVs[s.name].src || s.src) === s.src ? skillVs[s.name] : {};
    const origLang = /[\u4e00-\u9fff]/.test(s.orig || '') ? '' : ' lang="en"';
    const html = page({
      title: '/' + s.name + '｜Skill｜Claude Code Everyday',
      desc: s.say.slice(0, 110),
      depth: '../../../',
      active: 'skill',
      body: '<header class="top slim skdh">' + (pkOf(s) && packHasPage(pkOf(s)) ? '<a class="back" href="../../' + esc(pkOf(s).src) + '/" onclick="' + backJs('/skill/' + pkOf(s).src + '/', '/skill/' + pkOf(s).src) + '">← ' + esc(pkOf(s).name) + '</a>' + BACK_FROM_LIST : '<a class="back" href="../../" onclick="' + BACK_SKILL + '">← Skill</a>') + '</header>\n'
        + '<article class="skd">\n'
        + '<h1><code>/' + esc(s.name) + '</code></h1>\n'
        + '<div class="tags">' + (s.group === UNSORTED ? '' : '<span class="tg">' + esc(s.group) + '</span>') + (pkOf(s) && packHasPage(pkOf(s)) ? '<a class="tg" href="../../' + esc(pkOf(s).src) + '/">' + esc(pkOf(s).name) + '</a>' : '<span class="tg">' + esc(s.src) + '</span>') + (s.ai ? '<span class="ska">AI翻譯</span>' : '') + '</div>\n'
        + '<p class="lede"' + (s.en ? ' lang="en"' : '') + '>' + esc(s.say) + '</p>\n'
        + factsHtml(s)
        + (vsx.when || s.when ? '<section><h2>什麼時候用</h2><p class="when">' + esc(vsx.when || s.when) + '</p></section>\n' : '')
        + vsHtml(vsx)
        + installHtml(s)
        + (s.orig && s.orig !== s.say ? '<section><h2>原文</h2><p class="orig"' + origLang + '>' + esc(s.orig) + '</p><p class="orig-note">原作者的說明，以原文為準。</p></section>\n' : '')
        + (rel.length ? '<section><h2>相關貼文</h2><ul class="rel">' + rel.map((p) => '<li><a href="../../../d/' + p.day + '/"><span class="day">Day ' + p.day + '</span>' + esc(p.title) + '</a></li>').join('') + '</ul></section>\n' : '')
        + '<div class="go">' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">到 GitHub 看原文 ' + ARROW + '</a>' : '') + (pkOf(s) && packHasPage(pkOf(s)) ? '<a class="sub" href="../../' + esc(pkOf(s).src) + '/">看 ' + esc(pkOf(s).name) + ' 的 ' + packSkills(pkOf(s)).length + ' 個 skill</a>' : '') + '</div>\n'
        + COPY_JS
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
