/* ============================================================
   站台層行為：假門、已讀紀錄、匿名事件。
   無登入、無後端、不收 email。
   ============================================================ */
(function () {
  'use strict';

  // 同一頁若不小心載入兩次，事件會送兩份。擋掉。
  if (window.__siteBooted) return;
  window.__siteBooted = true;

  /* ---------- 匿名事件 ----------
     這份是作品集裡的示範拷貝，不接任何分析服務。track() 只在
     SITE_DEBUG 開著時印到 console，其餘情況是 no-op。 */
  function track(name, props) {
    try {
      if (window.SITE_DEBUG) {
        console.log('[track]', name, props || {});
      }
    } catch (e) { /* 量測不能弄壞頁面 */ }
  }
  window.siteTrack = track;

  /* ---------- localStorage 安全包裝 ----------
     無痕模式與 quota 滿都會丟例外。丟了就當作沒有這個功能。 */
  var storeOk = true;
  function get(k) {
    try { return window.localStorage.getItem(k); }
    catch (e) { storeOk = false; return null; }
  }
  function set(k, v) {
    try { window.localStorage.setItem(k, v); }
    catch (e) { storeOk = false; }
  }
  function sessGet(k) {
    try { return window.sessionStorage.getItem(k); }
    catch (e) { return null; }
  }
  function sessSet(k, v) {
    try { window.sessionStorage.setItem(k, v); }
    catch (e) { /* 忽略 */ }
  }

  /* ---------- 頁面識別 ----------
     不用 location.pathname.split('/').pop()。
     Cloudflare Pages 預設把 /x.html 轉向 /x，那個做法的 key 會漂移。
     改用寫在頁面上的 data-page，值是固定的 slug。 */
  var root = document.documentElement;
  var pageId = root.getAttribute('data-page') || '';
  var pageKind = root.getAttribute('data-kind') || '';
  var topic = root.getAttribute('data-topic') || '';

  /* ---------- 已讀紀錄 ---------- */
  var READ_KEY = 'site:read';

  function readSet() {
    var raw = get(READ_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; }
    catch (e) { return {}; }
  }

  function markRead(id) {
    if (!id) return;
    var m = readSet();
    if (m[id]) return;
    m[id] = 1;
    set(READ_KEY, JSON.stringify(m));
  }

  window.siteReadSet = readSet;
  window.siteStorageOk = function () { return storeOk; };

  /* ---------- 把已讀狀態畫出來 ----------
     課程列的號碼變實心；主題卡與主題頁上方的點亮一顆。 */
  function paintChecks() {
    var m = readSet();

    var rows = document.querySelectorAll('[data-lesson-id]');
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].getAttribute('data-lesson-id');
      rows[i].setAttribute('data-done', m[id] ? '1' : '0');
    }

    var bars = document.querySelectorAll('[data-progress-topic]');
    for (var b = 0; b < bars.length; b++) {
      var t = bars[b].getAttribute('data-progress-topic');
      var total = parseInt(bars[b].getAttribute('data-progress-total'), 10) || 0;
      var done = 0;
      for (var k in m) {
        if (m.hasOwnProperty(k) && k.indexOf(t + '/') === 0) done++;
      }
      if (done > total) done = total;

      var dots = bars[b].querySelector('.site-dots');
      if (dots) {
        var html = '';
        for (var d = 0; d < total; d++) {
          html += '<span class="site-dot" data-done="' + (d < done ? '1' : '0') + '"></span>';
        }
        dots.innerHTML = html;
      }
      var txt = bars[b].querySelector('.site-progress-text');
      if (txt) {
        txt.textContent = done ? (done + ' / ' + total + ' 課') : (total + ' 課');
      }
    }

    if (!storeOk) {
      var note = document.querySelector('[data-storage-note]');
      if (note) {
        note.textContent = '這個瀏覽器不會保存進度，關掉分頁就沒了。';
      }
    }
  }

  /* ---------- 課程頁：進入、互動、讀完 ---------- */
  function initLesson() {
    track('lesson_start', { topic: topic, lesson: pageId });

    /* 互動事件。兩支 quiz.js 的 DOM 不同，用委派一次蓋掉兩種：
       business 版是 .quiz button.opt，speak 版是 .quiz .quiz-options button。 */
    var fired = {};
    function once(type) {
      if (fired[type]) return;
      fired[type] = 1;
      track('interaction', { topic: topic, lesson: pageId, type: type });
    }

    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest('.quiz button')) once('quiz');
      if (t.closest('.match')) once('match');
      if (t.closest('.sort')) once('sort');
      if (t.closest('.order')) once('order');

      /* drill 完成的定義：按下「對答案」而且輸入框有字。
         只按開始或讓倒數跑完都不算完成。 */
      var reveal = t.closest('.drill-reveal');
      if (reveal) {
        var box = reveal.closest('.drill');
        var ta = box ? box.querySelector('textarea') : null;
        if (ta && ta.value.trim().length > 0) once('drill');
      }
    }, true);

    /* Singing 的麥克風練習不走 quiz/drill，另外送。 */
    var fb = document.querySelector('.feedback');
    if (fb && window.MutationObserver) {
      new MutationObserver(function () {
        if (fb.classList.contains('correct')) once('pitch');
      }).observe(fb, { attributes: true, attributeFilter: ['class'] });
    }

    /* 讀完的定義：捲到最後一個練習區塊的底部，而且再停留三秒。

       不用「捲到頁面底部」——一萬字的頁面三秒就能滑到底，那量不到東西。
       也不用 IntersectionObserver——它在部分環境（離屏 iframe、自動化瀏覽器）
       不回報，而這個訊號是這一版最重要的量測之一，不能靠不穩的東西。
       純 scroll 計算最笨但最可靠。 */
    var blocks = document.querySelectorAll('.drill, .quiz, .sort, .match, .order');
    var last = blocks.length ? blocks[blocks.length - 1]
                             : document.querySelector('.site-foot');
    if (last) {
      var armed = false;
      var ticking = false;

      function endTop() {
        var r = last.getBoundingClientRect();
        return r.bottom + (window.pageYOffset || document.documentElement.scrollTop || 0);
      }

      function check() {
        ticking = false;
        if (armed) return;
        var y = (window.pageYOffset || document.documentElement.scrollTop || 0);
        if (y + window.innerHeight < endTop()) return;
        armed = true;
        window.removeEventListener('scroll', onScroll);
        // 一次性計時器。捲過去了也不取消——快速滑過的人一樣算走到最後一個
        // 練習，只是還要再留三秒才記一次。
        window.setTimeout(function () {
          markRead(pageId);
          track('lesson_end', { topic: topic, lesson: pageId });
        }, 3000);
      }

      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(check);
      }

      window.addEventListener('scroll', onScroll, { passive: true });

      // 保險：每半秒也自己看一次。
      // 某些環境（部分 in-app webview、程式化捲動）不派發 scroll 事件，
      // 只靠事件會整個量不到。這是第一版最重要的訊號之一，值得多這一道。
      var poll = window.setInterval(function () {
        if (armed) { window.clearInterval(poll); return; }
        check();
      }, 500);
      // 開著三十分鐘還沒讀完就別再查了
      window.setTimeout(function () { window.clearInterval(poll); }, 1800000);

      check();   // 短頁面可能一進來就已經看得到最後一個練習
    }
  }

  /* ---------- 假門 ----------
     點下去不執行任何功能。只展開一段說明，並記一次數。
     不收 email、不存個資。同一個 session 只算第一次。 */
  function initDoor() {
    var buttons = document.querySelectorAll('.site-door');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (ev) {
        var btn = ev.currentTarget;
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;

        var open = panel.getAttribute('data-open') === '1';
        panel.setAttribute('data-open', open ? '0' : '1');
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (open) return;

        var first = !sessGet('site:door');
        if (first) sessSet('site:door', '1');
        track('fakedoor_click', {
          topic: topic || 'home',
          page: pageId || pageKind,
          first_time: first
        });
      });
    }

    var gos = document.querySelectorAll('.site-door-go');
    for (var j = 0; j < gos.length; j++) {
      gos[j].addEventListener('click', function () {
        track('fakedoor_to_threads', { topic: topic || 'home', page: pageId || pageKind });
      });
    }
  }

  function boot() {
    initDoor();
    if (pageKind === 'lesson') initLesson();
    if (pageKind === 'topic' || pageKind === 'home') paintChecks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
