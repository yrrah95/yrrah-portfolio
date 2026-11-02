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
const BEACON = process.env.CF_BEACON_TOKEN || '';

const readJsonl = (f) => fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const overrides = JSON.parse(fs.readFileSync(path.join(here, 'image-overrides.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 只取公開需要的欄位：不帶成效數據、features 內部筆記、note
const rows = [...readJsonl(path.join(DATA, 'archive.jsonl')), ...readJsonl(path.join(DATA, 'posts.jsonl'))];
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
  <h1><span class="day">Day ${p.day}</span>${esc(p.title)}</h1>
  <time>${p.date}</time>
  <div class="text">${esc(p.body.split('\n').slice(p.body.split('\n').indexOf(p.title) + 1).join('\n').trim())}</div>
  <div class="imgs">${p.images.map((u, n) => `<img src="${u}" alt="Day ${p.day} 第 ${n + 1} 張" loading="lazy">`).join('')}</div>
  ${p.cta ? `<pre class="cta">${esc(p.cta)}</pre>` : ''}
  <p class="src"><a href="${esc(p.permalink || PROFILE_URL)}" rel="noopener">${p.permalink ? '在 Threads 看原文' : '到 Threads 追蹤 @yrrah9_'}</a></p>
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
