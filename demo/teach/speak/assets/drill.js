/* drill.js — 共用限時作答元件 */
/*
   用法（HTML）：

   <ul id="drill-criteria">           <!-- 全頁共用的自評標準，寫一次 -->
     <li>十五字以內</li>
     <li>講的是結果，不是過程</li>
   </ul>

   <div class="drill" data-seconds="10">
     <p class="drill-prompt">情境文字</p>
     <div class="drill-model">範例答案（作答前會被藏起來）</div>
   </div>

   元件會自己長出：開始鈕、倒數條、輸入框、對答案鈕、自評清單。
   倒數歸零不鎖輸入框——鎖住只會讓人失去已經想到的答案，沒有教學價值。
   打字比開口慢，所以預設給十秒，等於現實中的三秒。

   答案會自動存進 localStorage（關掉分頁、重新整理都不會掉）。
   頁面底部會長出「複製全部答案」鈕，一鍵複製成純文字，直接貼給老師看。
*/

(function () {
  'use strict';

  var CSS = [
    '.drill{border:1px solid var(--rule);padding:1.1rem 1.3rem;margin:1.6rem 0}',
    '.drill-prompt{margin:0 0 0.9rem;font-weight:700}',
    '.drill-bar{height:3px;background:var(--rule);margin:0.8rem 0;display:none}',
    '.drill-bar.on{display:block}',
    '.drill-bar span{display:block;height:100%;background:var(--accent);width:100%}',
    '.drill-clock{font-size:0.82rem;color:var(--ink-soft);margin:0 0 0.6rem;min-height:1.3em}',
    '.drill-input{display:none;margin-bottom:0.7rem}',
    '.drill-input.on{display:block}',
    '.drill-actions{display:flex;gap:0.5rem;flex-wrap:wrap}',
    '.drill-model{display:none;margin:1rem 0 0;padding:0.8rem 1rem;background:var(--wash);border-left:3px solid var(--good)}',
    '.drill-model.on{display:block}',
    '.drill-model p:last-child{margin-bottom:0}',
    '.drill-model .model-label{display:block;font-size:0.78rem;letter-spacing:0.06em;color:var(--ink-soft);margin-bottom:0.35rem}',
    '.drill-check{display:none;margin:1rem 0 0;padding:0;list-style:none}',
    '.drill-check.on{display:block}',
    '.drill-check .check-label{font-size:0.78rem;letter-spacing:0.06em;color:var(--ink-soft);display:block;margin-bottom:0.4rem}',
    '.drill-check li{margin:0 0 0.3rem;font-size:0.93rem}',
    '.drill-check label{cursor:pointer}',
    '.drill-check input{margin-right:0.5rem}',
    '.drill-export{margin:2.5rem 0;padding:1rem 1.2rem;border:1px dashed var(--rule)}',
    '.drill-export p{margin:0 0 0.7rem;font-size:0.92rem;color:var(--ink-soft)}',
    '.drill-export .export-msg{margin:0.6rem 0 0;font-size:0.85rem;color:var(--good);min-height:1.2em}',
    '@media print{.drill-input,.drill-actions,.drill-bar,.drill-export{display:none!important}',
    '.drill-model,.drill-check{display:block!important}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('drill-styles')) return;
    var s = document.createElement('style');
    s.id = 'drill-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // 答案存進 localStorage：關掉分頁或重新整理都不會掉
  // file:// 下有些瀏覽器設定會擋，一律包 try/catch，擋掉就當作沒有這功能
  function storeKey(i) {
    var page = location.pathname.split('/').pop() || 'lesson';
    return 'drill:' + page + ':' + i;
  }
  function save(i, v) { try { localStorage.setItem(storeKey(i), v); } catch (e) { /* 忽略 */ } }
  function load(i) { try { return localStorage.getItem(storeKey(i)) || ''; } catch (e) { return ''; } }

  // 從頁面上共用的 #drill-criteria 複製一份自評清單
  function buildCheck() {
    var src = document.getElementById('drill-criteria');
    var ul = el('ul', 'drill-check');
    ul.appendChild(el('span', 'check-label', '自評'));
    if (!src) return ul;
    Array.prototype.forEach.call(src.querySelectorAll('li'), function (li) {
      var item = el('li');
      var label = el('label');
      var box = document.createElement('input');
      box.type = 'checkbox';
      label.appendChild(box);
      label.appendChild(document.createTextNode(li.textContent));
      item.appendChild(label);
      ul.appendChild(item);
    });
    return ul;
  }

  // 把所有題目的情境與答案壓成純文字，前面加一段評分指令，直接貼給 AI 用
  function buildExport(drills) {
    var box = el('div', 'drill-export no-print');
    box.appendChild(el('p', null, '寫完了？複製你的答案，貼到 ChatGPT 或 Claude，它會照下面的標準幫你看。'));
    var btn = el('button', null, '複製全部答案');
    var msg = el('p', 'export-msg');
    box.appendChild(btn);
    box.appendChild(msg);

    btn.addEventListener('click', function () {
      // 評分標準直接從頁面上那份清單抓，不同課自動換成該課的標準
      var crit = [];
      var list = document.querySelectorAll('#drill-criteria li');
      for (var c = 0; c < list.length; c++) {
        crit.push('- ' + list[c].textContent.replace(/\s+/g, ' ').trim());
      }
      var lesson = (document.querySelector('h1') || {}).textContent || '';

      var header =
        '你是我的表達力教練。下面是我在一堂線上課的限時練習答案，請你逐題批改。\n\n' +
        '課程：' + lesson.replace(/\s+/g, ' ').trim() + '\n\n' +
        '這一課的評分標準：\n' + (crit.length ? crit.join('\n') : '- 一句話說完，對方聽得懂') + '\n\n' +
        '請對每一題做三件事：\n' +
        '1. 逐條對照上面的標準，指出哪一條沒過，引用我原句裡的字說明\n' +
        '2. 給一個只改最小幅度的修正版\n' +
        '3. 最後總結我這幾題共同的毛病是什麼（只講一個，最致命的那個）\n\n' +
        '不要稱讚。過關的題目一句「這題過」就好。\n\n' +
        '---\n\n';

      var out = header + drills.map(function (d, i) {
        var p = d.querySelector('.drill-prompt');
        var ta = d.querySelector('textarea');
        var situation = p ? p.textContent.replace(/\s+/g, ' ').trim() : ('第 ' + (i + 1) + ' 題');
        var answer = (ta && ta.value.trim()) || '（空白）';
        return (i + 1) + '. 情境：' + situation + '\n   我的答案：' + answer;
      }).join('\n\n');

      function fallback() {
        // 剪貼簿被擋（部分 file:// 情境）就攤出來讓人手動複製
        var fb = document.createElement('textarea');
        fb.value = out;
        fb.rows = 12;
        fb.style.marginTop = '0.7rem';
        box.appendChild(fb);
        fb.select();
        msg.textContent = '瀏覽器擋掉了自動複製。內容在下面，按 Ctrl+C。';
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out).then(function () {
          msg.textContent = '已複製（含評分指令）。貼到 ChatGPT 或 Claude 就好。';
        }, fallback);
      } else {
        fallback();
      }
    });

    return box;
  }

  function setup(drill, index) {
    var seconds = parseInt(drill.dataset.seconds, 10) || 10;
    var model = drill.querySelector('.drill-model');
    if (model && !model.querySelector('.model-label')) {
      model.insertBefore(el('span', 'model-label', '一種寫法（不是標準答案）'), model.firstChild);
    }

    var clock = el('p', 'drill-clock');
    var bar = el('div', 'drill-bar', '<span></span>');
    var fill = bar.querySelector('span');

    var wrap = el('div', 'drill-input');
    var ta = document.createElement('textarea');
    ta.rows = 2;
    ta.placeholder = '你的第一句話……';
    wrap.appendChild(ta);

    var actions = el('div', 'drill-actions');
    var startBtn = el('button', 'drill-start', '開始（' + seconds + ' 秒）');
    var revealBtn = el('button', 'drill-reveal', '對答案');
    revealBtn.style.display = 'none';
    actions.appendChild(startBtn);
    actions.appendChild(revealBtn);

    var check = buildCheck();

    drill.appendChild(clock);
    drill.appendChild(bar);
    drill.appendChild(wrap);
    drill.appendChild(actions);
    if (model) drill.appendChild(model);   // 移到最後，順序才對
    drill.appendChild(check);

    var timer = null;
    var startedAt = 0;

    // 有存過的答案就直接還原，輸入框跟著攤開
    var saved = load(index);
    if (saved) {
      ta.value = saved;
      wrap.classList.add('on');
      revealBtn.style.display = '';
    }
    ta.addEventListener('input', function () { save(index, ta.value); });

    startBtn.addEventListener('click', function () {
      if (timer) return;
      wrap.classList.add('on');
      bar.classList.add('on');
      revealBtn.style.display = '';
      startBtn.disabled = true;
      ta.focus();

      startedAt = Date.now();
      fill.style.width = '100%';

      timer = setInterval(function () {
        var left = seconds - (Date.now() - startedAt) / 1000;
        if (left <= 0) {
          clearInterval(timer);
          timer = 'done';
          fill.style.width = '0%';
          clock.textContent = '時間到。現在框裡的東西就是你的答案，不要再修。';
          return;
        }
        fill.style.width = (left / seconds * 100) + '%';
        clock.textContent = '剩 ' + left.toFixed(1) + ' 秒';
      }, 100);
    });

    revealBtn.addEventListener('click', function () {
      if (timer && timer !== 'done') { clearInterval(timer); }
      var used = startedAt ? ((Date.now() - startedAt) / 1000).toFixed(1) : '—';
      clock.textContent = '你用了 ' + used + ' 秒。';
      timer = 'done';
      if (model) model.classList.add('on');
      check.classList.add('on');
      revealBtn.disabled = true;
    });
  }

  function init() {
    injectStyles();
    var drills = Array.prototype.slice.call(document.querySelectorAll('.drill'));
    drills.forEach(setup);
    if (drills.length) {
      var last = drills[drills.length - 1];
      last.parentNode.insertBefore(buildExport(drills), last.nextSibling);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
