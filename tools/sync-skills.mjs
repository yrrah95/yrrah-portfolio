// 從工作站的 skill 清單產生公開版 data/skills.json（對來源唯讀）
// 用法：node tools/sync-skills.mjs [--src <skills.json>]
// 規則：不放自製 skill、不放沒有中文說明的；個人用語靠 data/skill-overrides.json 改寫；只輸出公開需要的欄位
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--src');
const SRC = i > -1 ? process.argv[i + 1] : 'C:/Github/mine/yrrah95/data/skills.json';
const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const over = JSON.parse(fs.readFileSync(path.join(here, 'data', 'skill-overrides.json'), 'utf8'));

// 分組顯示順序（由「想事情」到「做事」到「收尾」）
const GROUPS = ['想清楚要做什麼', '寫程式', '檢查與出貨', '視覺與設計', '動畫與介面手感', '寫東西給人看', '行銷與成長', '找資料與看影片', '記憶、交接與學習', '做檔案', '輸出風格', '安全與環境設定', 'iOS 專用', '自動觸發（不用自己叫）'];
const skipped = { 自製: 0, 無說明: 0 };
const out = [];
for (const s of src.skills) {
  if (s.來源 === '自製') { skipped.自製++; continue; }
  const o = over[s.name] || {};
  const say = o.說明 ?? s.說明;
  if (!say) { skipped.無說明++; continue; }
  out.push({
    name: s.name,
    src: s.來源,
    group: GROUPS.includes(s.組) ? s.組 : '其他',
    say,
    when: o.何時用 ?? s.何時用 ?? '',
    used: s.把握 === '用過',
    orig: String(s.原文 ?? '').replace(/^>s*/, '').trim(),
  });
}
// 併入「沒裝、只收進網站」的目錄（data/catalog.json，由 fetch-catalog 產生）；同作者同名的已裝 skill 不重複收
const catFile = path.join(here, 'data', 'catalog.json');
const catGroups = JSON.parse(fs.readFileSync(path.join(here, 'data', 'catalog-groups.json'), 'utf8'));
const catZh = JSON.parse(fs.readFileSync(path.join(here, 'data', 'catalog-zh.json'), 'utf8'));
let added = 0;
if (fs.existsSync(catFile)) {
  const have = new Set(out.map((x) => x.src + '/' + x.name));
  for (const c of JSON.parse(fs.readFileSync(catFile, 'utf8')).skills) {
    if (have.has(c.author + '/' + c.name)) continue;
    const zh = catZh[c.author + '/' + c.name];
    out.push({ name: c.name, src: c.author, group: catGroups[c.author + '/' + c.name] || '其他', say: zh ? zh.say : c.desc, when: zh ? zh.when : '', used: false, url: c.url, orig: c.orig || c.desc, en: !zh });
    added++;
  }
}
// 中文說明一律是 AI 產生（工作站清單用 AI 翻原文、目錄用 AI 翻公開說明）；還沒有中文的 en=true，先放原文
out.forEach((x) => { x.ai = !x.en; });
const rank = (g) => (GROUPS.includes(g) ? GROUPS.indexOf(g) : 99);
out.sort((a, b) => rank(a.group) - rank(b.group) || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(here, 'data', 'skills.json'), JSON.stringify({ scanned: src.掃描日, groups: [...GROUPS, '其他'], skills: out }, null, 1) + '\n');
console.log(`輸出 ${out.length} 個（其中目錄收進 ${added} 個；略過：自製 ${skipped.自製}、無說明 ${skipped.無說明}），來源掃描日 ${src.掃描日}`);
