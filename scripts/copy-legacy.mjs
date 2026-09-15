// 把不參與 Vite 打包的既有檔案原樣複製進 dist。
// 用複製而非搬移，舊靜態站在 repo 裡的位置一動不動（demo/ 由 demo 自己的相對路徑依賴）。
import { cp, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// demo/ 四個子站原樣上線；css/tokens.css 是 demo/dashboard 與 demo/family 的相依，必須保留在同一個路徑。
// 根目錄那份舊 sitemap.xml 不可加進來——它會蓋掉 prerender 產的乾淨路徑版本（鐵律 5）。
//
// 必要項：少了任何一個，正式站就是壞的（demo 連結 404、CSP 與轉址整組消失），
// 所以直接 throw 讓 build 紅掉，而不是印個 warning 悄悄上線
const REQUIRED = ['demo', 'assets', 'css', '_headers', '_redirects'];
// 可選項：缺了只是少一點點綴，不值得擋下整個 build
const OPTIONAL = ['404.html', 'robots.txt', 'favicon.svg'];

for (const item of [...REQUIRED, ...OPTIONAL]) {
  const from = path.join(root, item);
  try {
    await access(from);
  } catch {
    if (REQUIRED.includes(item)) {
      throw new Error(`copy-legacy: 缺少必要項 ${item}，正式站會壞掉，中止 build`);
    }
    console.warn(`copy-legacy: 跳過（不存在）${item}`);
    continue;
  }
  await cp(from, path.join(dist, item), { recursive: true });
  console.log(`copy-legacy: ${item}`);
}
