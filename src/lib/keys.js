// 鍵盤 ←／→ 翻頁。只在焦點不在可輸入元素、且沒按修飾鍵時作用（contact 表單之後會有 input）

// 可輸入元素：這些節點上的方向鍵屬於游標移動與選項切換，不能被翻頁搶走
const TYPING = /^(?:input|textarea|select)$/i;

// 判斷事件來源是不是正在打字的節點（含 contenteditable 的自訂編輯器）
function isTyping(target) {
  if (!target || !target.tagName) return false;
  if (target.isContentEditable) return true;
  return TYPING.test(target.tagName);
}

// 綁上 ←／→ 翻頁，回傳解除綁定的函式
export function bindPageKeys(router, getCurrent, adjacent) {
  function onKeyDown(event) {
    // 已被別人處理過、或帶修飾鍵（Alt+← 是瀏覽器上一頁）就讓開
    if (event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (isTyping(event.target)) return;

    const page = getCurrent();
    if (!page) return;

    // 端點頁（封面沒有上一頁、封底沒有下一頁）按了不做事
    const { prev, next } = adjacent(page);
    const target = event.key === 'ArrowLeft' ? prev : next;
    if (!target) return;

    // 走 router.go 才會 pushState，瀏覽器上一頁鈕跟著有效；焦點由 onNavigate 移到 h1
    event.preventDefault();
    router.go(target.route);
  }

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
