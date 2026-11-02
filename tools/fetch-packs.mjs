// 抓來源包的公開資料：星數、最近更新、授權、專案說明，並檢查有沒有 plugin 與 hook。輸出 data/packs.json
// 只讀 GitHub 公開 API，不安裝任何東西。用法：node tools/fetch-packs.mjs（建議帶 GITHUB_TOKEN 避免被限流）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'data', 'packs-sources.json'), 'utf8'));
const H = { 'user-agent': 'yrrah-cc-packs', accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) H.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
const get = async (u) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };

const out = [];
for (const p of cfg.packs) {
  try {
    const r = await get(`https://api.github.com/repos/${p.repo}`);
    const t = await get(`https://api.github.com/repos/${p.repo}/git/trees/${r.default_branch}?recursive=1`);
    const paths = (t.tree || []).map((x) => x.path);
    // plugin：有 .claude-plugin 資料夾；hook：有 hooks.json
    const plugin = paths.some((x) => /(^|\/)\.claude-plugin\/(plugin|marketplace)\.json$/.test(x));
    const hook = paths.some((x) => /(^|\/)hooks\/hooks\.json$/.test(x));
    out.push({
      src: p.src, merge: p.merge || [], name: p.name, repo: p.repo, url: r.html_url,
      stars: r.stargazers_count, pushed: r.pushed_at.slice(0, 10),
      license: r.license && r.license.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
      archived: r.archived, desc: r.description || '', plugin, hook,
    });
    console.log(p.repo, r.stargazers_count, r.pushed_at.slice(0, 10), plugin ? 'plugin' : '-', hook ? 'hook' : '-');
  } catch (e) { console.log('失敗', p.repo, e.message); }
}
fs.writeFileSync(path.join(here, 'data', 'packs.json'), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), packs: out }, null, 1) + '\n');
console.log('寫入 data/packs.json：' + out.length + ' 包');
