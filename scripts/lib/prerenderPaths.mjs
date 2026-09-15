// prerender 的輸出路徑與佔位符規則。抽成純函式是為了能被測試 import——
// scripts/prerender.mjs 是頂層腳本，一 import 就會讀 dist/ 並寫檔，測不了。
import path from 'node:path';

// 殼（src/index.html → dist/index.html）必須帶著這三個標記，prerender 才有地方填內容
export const PLACEHOLDERS = ['<!--head-->', '<!--chrome-->', '<!--book-->'];

// 平檔輸出：'/' → dist/index.html，其餘 → dist/<route>.html（/work/family → dist/work/family.html）。
//
// 為什麼不是目錄式的 dist/<route>/index.html：Cloudflare Pages 對目錄式產物會把
// /about 308 到 /about/（帶尾斜線），對平檔則是把 /about 直接對到 about.html 回 200。
// 鐵律 5 要的是無尾斜線的乾淨路徑，只有平檔做得到。
// 實測 https://yrrah-5i5.pages.dev：/about = 200、/about/ = 308 → /about；
// 目錄式的 /demo/dashboard = 308 → /demo/dashboard/，正是要避免的那個行為。
export function outFileFor(dist, route) {
  const rel = route === '/' ? 'index.html' : `${String(route).replace(/^\/+/, '')}.html`;
  const file = path.resolve(dist, rel);
  // containment：route 若含 .. 會解析到 dist 之外，寧可讓 build 炸掉也不要寫到專案其他地方
  if (!file.startsWith(path.resolve(dist) + path.sep)) {
    throw new Error(`prerender: route ${route} 解析後落在 dist 之外（${file}），拒絕寫檔`);
  }
  return file;
}
