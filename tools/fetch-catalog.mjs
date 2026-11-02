// 抓「沒裝、只收進網站」的 skill 說明，輸出 data/catalog.json（只讀公開 GitHub 頁面，不安裝任何東西）
// 用法：node tools/fetch-catalog.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'data', 'catalog-sources.json'), 'utf8'));
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'yrrah-cc-catalog' } }); if (!r.ok) throw new Error(r.status + ' ' + u); return r; };

// 讀 SKILL.md 開頭 frontmatter 的 description（支援單行、引號、| 與 > 多行）
function descOf(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return '';
  const lines = m[1].split(/\r?\n/);
  const i = lines.findIndex((l) => /^description:/.test(l));
  if (i < 0) return '';
  let v = lines[i].replace(/^description:\s*/, '');
  if (/^[|>][+-]?$/.test(v.trim())) {
    const buf = [];
    for (let j = i + 1; j < lines.length && /^\s+/.test(lines[j]); j++) buf.push(lines[j].trim());
    v = buf.join(' ');
  }
  return v.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
}
const cut = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/[\s,;，；、]+\S*$/, '') + '…');

const out = [];
for (const s of cfg.sources) {
  const tree = await (await get(`https://api.github.com/repos/${s.repo}/git/trees/${s.branch}?recursive=1`)).json();
  const paths = tree.tree.map((t) => t.path).filter((p) => p.startsWith(s.prefix) && p.endsWith('/SKILL.md') && p.slice(s.prefix.length).split('/').length === 2);
  for (const p of paths) {
    const name = p.split('/').slice(-2)[0];
    const md = await (await get(`https://raw.githubusercontent.com/${s.repo}/${s.branch}/${p}`)).text();
    out.push({ author: s.author, name, desc: cut(descOf(md), 260), url: `https://github.com/${s.repo}/blob/${s.branch}/${p}` });
  }
  console.log(s.author, paths.length);
}
fs.writeFileSync(path.join(here, 'data', 'catalog.json'), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), skills: out }, null, 1) + '\n');
console.log('共 ' + out.length + ' 個 → data/catalog.json');
