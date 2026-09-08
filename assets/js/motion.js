// 捲動觸發：case-study 區塊進場淡入上移。
// JS 先補上 .armed（沒 JS 時內容照常顯示），進入視窗再加 .in。
(function () {
  var els = document.querySelectorAll(".rise");
  if (!els.length || !("IntersectionObserver" in window)) return;

  els.forEach(function (el) { el.classList.add("armed"); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

  els.forEach(function (el) { io.observe(el); });
})();
