// 抓來源包的公開資料：星數、最近更新、授權、專案說明，並檢查有沒有 plugin 與 hook。輸出 data/packs.json
// 設了 fetchSkills 的包，另外抓每個 SKILL.md 的 name 與 description（原文，不翻譯）；countOnly 的包只記 skill 數量。
// 只讀 GitHub 公開 API，不安裝任何東西。用法：node tools/fetch-packs.mjs（建議帶 GITHUB_TOKEN 避免被限流）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'data', 'packs-sources.json'), 'utf8'));
const H = { 'user-agent': 'yrrah-cc-packs', accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) H.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
const get = async (u) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const raw = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'yrrah-cc-packs' } }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.text(); };

// 讀 SKILL.md 開頭 frontmatter 的 name 與 description（支援單行、引號、| 與 > 多行）
function front(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { name: '', desc: '' };
  const lines = m[1].split(/\r?\n/);
  const val = (key) => {
    const i = lines.findIndex((l) => new RegExp('^' + key + ':').test(l));
    if (i < 0) return '';
    let v = lines[i].replace(new RegExp('^' + key + ':\\s*'), '');
    if (/^[|>][+-]?$/.test(v.trim())) {
      const buf = [];
      for (let j = i + 1; j < lines.length && /^\s+/.test(lines[j]); j++) buf.push(lines[j].trim());
      v = buf.join(' ');
    }
    return v.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
  };
  return { name: val('name'), desc: val('description') };
}
const cut = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/[\s,;，；、]+\S*$/, '') + '…');

const out = [];
for (const p of cfg.packs) {
  try {
    const r = await get(`https://api.github.com/repos/${p.repo}`);
    const t = await get(`https://api.github.com/repos/${p.repo}/git/trees/${r.default_branch}?recursive=1`);
    const paths = (t.tree || []).map((x) => x.path);
    const plugin = paths.some((x) => /(^|\/)\.claude-plugin\/(plugin|marketplace)\.json$/.test(x));
    const hook = paths.some((x) => /(^|\/)hooks\/hooks\.json$/.test(x));
    const skillPaths = paths.filter((x) => /(^|\/)SKILL\.md$/i.test(x));
    const rec = {
      src: p.src, merge: p.merge || [], name: p.name, repo: p.repo, url: r.html_url,
      stars: r.stargazers_count, pushed: r.pushed_at.slice(0, 10),
      license: r.license && r.license.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '',
      archived: r.archived, desc: r.description || '', plugin, hook, skillCount: skillPaths.length,
    };
    if (p.fetchSkills && skillPaths.length <= 300) {
      // 同時抓 12 個，結果依原順序排好再去重命名
      const got = new Array(skillPaths.length);
      let next = 0;
      const worker = async () => {
        while (next < skillPaths.length) {
          const i = next++;
          try { got[i] = front(await raw(`https://raw.githubusercontent.com/${p.repo}/${r.default_branch}/${skillPaths[i]}`)); }
          catch (e) { console.log('  略過 skill', skillPaths[i], e.message); }
        }
      };
      await Promise.all(Array.from({ length: 12 }, worker));
      const seen = new Set();
      rec.skills = [];
      skillPaths.forEach((sp, i) => {
        const f = got[i];
        if (!f) return;
        const dir = sp.split('/').slice(-2, -1)[0] || p.name;
        let name = (f.name || dir).replace(/\s+/g, '-');
        if (seen.has(name)) name = name + '-' + (sp.split('/').slice(-3, -2)[0] || seen.size);
        seen.add(name);
        rec.skills.push({ name, desc: cut(f.desc, 300), orig: f.desc, path: sp, url: `${r.html_url}/blob/${r.default_branch}/${sp}` });
      });
    }
    out.push(rec);
    console.log(p.repo, r.stargazers_count, r.pushed_at.slice(0, 10), plugin ? 'plugin' : '-', 'skill ' + skillPaths.length, rec.skills ? '(已抓 ' + rec.skills.length + ')' : '');
  } catch (e) { console.log('失敗', p.repo, e.message); }
}
fs.writeFileSync(path.join(here, 'data', 'packs.json'), JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), packs: out }, null, 1) + '\n');
console.log('寫入 data/packs.json：' + out.length + ' 包');
