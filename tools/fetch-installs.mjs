// 抓 skills.sh 每個來源包頁面上「每個 skill 的安裝次數」，輸出 data/installs.json（只讀公開頁面，robots.txt 允許）
// 安裝次數來自 `npx skills add` 的匿名統計，只代表被安裝過，不代表有人在用，也可能被灌高；網站只拿來排序參考。
// 用法：node tools/fetch-installs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packs = JSON.parse(fs.readFileSync(path.join(here, 'data', 'packs.json'), 'utf8')).packs;
const num = (s) => { const m = String(s).match(/^([\d.]+)\s*([KMB]?)$/i); if (!m) return 0; return Math.round(parseFloat(m[1]) * ({ '': 1, K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()])); };

const out = {};
let next = 0;
const worker = async () => {
  while (next < packs.length) {
    const p = packs[next++];
    try {
      const r = await fetch('https://www.skills.sh/' + p.repo, { headers: { 'user-agent': 'Mozilla/5.0 yrrah-cc-installs' } });
      if (!r.ok) { console.log('沒有頁面', p.repo, r.status); continue; }
      const html = await r.text();
      const map = {};
      const re = new RegExp('href="/' + p.repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/([^"/]+)"[^>]*>([\\s\\S]*?)</a>', 'gi');
      let m;
      while ((m = re.exec(html))) {
        const v = m[2].match(/text-foreground">([\d.]+[KMB]?)<\/span>/);
        if (v) map[decodeURIComponent(m[1]).toLowerCase()] = num(v[1]);
      }
      out[p.repo] = map;
      console.log(p.repo, Object.keys(map).length + ' 個有數字');
    } catch (e) { console.log('失敗', p.repo, e.message); }
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
fs.writeFileSync(path.join(here, 'data', 'installs.json'), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), source: 'skills.sh', installs: out }, null, 1) + '\n');
console.log('寫入 data/installs.json：' + Object.keys(out).length + ' 個專案有資料');
