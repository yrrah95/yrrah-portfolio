// 目錄浮層的關閉行為：Esc 關、點浮層外側關。
// 獨立成一支而不塞進 lib/keys.js——keys.js 的職責寫死是「←／→ 翻頁」，
// 而「點外側關閉」根本不是鍵盤事件；兩種關法放同一支，才看得出它們是同一件事的兩個入口。
// 打開浮層不需要 JS：<summary> 自己會切 <details>（無 JS 仍可展開，鐵律 3）。

// 綁上 Esc／點外側關閉，回傳解除綁定的函式
export function bindTocOverlay(root = document) {
  // 每次事件才查 DOM：dev server 沒跑 prerender 時書殼是由 syncChrome 後補的，綁定當下不一定存在
  const find = () => root.querySelector('.toc-overlay');

  // 關浮層；focusButton 為真時把焦點還給常駐鈕，鍵盤使用者不會掉到頁面開頭
  function close(focusButton) {
    const overlay = find();
    if (!overlay || !overlay.open) return false;
    overlay.open = false;
    if (focusButton) overlay.querySelector('.toc-overlay__button')?.focus();
    return true;
  }

  // Esc 在任何地方都該能關浮層，所以不檢查修飾鍵與輸入元素；沒開浮層就完全不攔，←／→ 翻頁不受影響
  function onKeyDown(event) {
    if (event.defaultPrevented || event.key !== 'Escape') return;
    if (close(true)) event.preventDefault();
  }

  // 點浮層外側就關。點鈕與點清單都落在 .toc-overlay 內，這裡放行：
  // 鈕由 <details> 自己切換，清單連結換頁後由 syncChrome 收起
  function onClick(event) {
    if (event.target?.closest?.('.toc-overlay')) return;
    close(false);
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  return () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onClick);
  };
}
