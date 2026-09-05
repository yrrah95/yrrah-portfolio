/* sort.js — 共用二分類元件 */
/*
   一串句子，每句丟進兩個桶子之一。答完即時給對錯與理由。

   用法（HTML）：

   <div class="sort" data-labels="狀態,變化">
     <ul class="sort-items">
       <li data-answer="變化" data-feedback="為什麼">這週第一次有人付錢</li>
       <li data-answer="狀態" data-feedback="為什麼">我在開發我的副業</li>
     </ul>
   </div>

   data-labels 的兩個值就是按鈕文字，也是 data-answer 要對上的值。
   題目順序每次載入洗牌。分類錯了可以再選，計數只算答對的。
*/

(function () {
  'use strict';

  var CSS = [
    '.sort{border:1px solid var(--rule);padding:1.1rem 1.3rem;margin:1.6rem 0}',
    '.sort-items{list-style:none;padding:0;margin:0}',
    '.sort-items li{padding:0.7rem 0;border-top:1px solid var(--rule)}',
    '.sort-items li:first-child{border-top:none}',
    '.sort-row{display:flex;gap:0.7rem;align-items:center;flex-wrap:wrap}',
    '.sort-text{flex:1 1 14rem;min-width:0}',
    '.sort-btns{display:flex;gap:0.4rem;flex:0 0 auto}',
    '.sort-btns button{padding:0.35rem 0.8rem;font-size:0.9rem}',
    '.sort-btns button.picked-ok{border-color:var(--good);background:var(--wash)}',
    '.sort-btns button.picked-no{border-color:var(--bad);opacity:.7}',
    '.sort-why{margin:0.45rem 0 0;font-size:0.88rem;line-height:1.55;color:var(--ink-soft);display:none}',
    '.sort-why.on{display:block}',
    '.sort-why .verdict{font-weight:700;margin-right:0.35em}',
    '.sort-why.ok .verdict{color:var(--good)}',
    '.sort-why.no .verdict{color:var(--bad)}',
    '.sort-score{margin:1rem 0 0;font-size:0.88rem;color:var(--ink-soft)}',
    '@media print{.sort-btns{display:none}.sort-why{display:block}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('sort-styles')) return;
    var s = document.createElement('style');
    s.id = 'sort-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function setup(sort) {
    var list = sort.querySelector('.sort-items');
    if (!list) return;

    var labels = (sort.dataset.labels || '對,錯').split(',').map(function (s) { return s.trim(); });
    var items = Array.prototype.slice.call(list.children);
    shuffle(items).forEach(function (li) { list.appendChild(li); });

    var solved = 0;
    var score = document.createElement('p');
    score.className = 'sort-score';
    sort.appendChild(score);

    function paintScore() {
      score.textContent = '答對 ' + solved + ' / ' + items.length;
    }
    paintScore();

    items.forEach(function (li) {
      var answer = li.dataset.answer;
      var why = li.dataset.feedback || '';
      var text = li.textContent.trim();
      li.textContent = '';

      var row = document.createElement('div');
      row.className = 'sort-row';

      var span = document.createElement('span');
      span.className = 'sort-text';
      span.textContent = text;
      row.appendChild(span);

      var btns = document.createElement('div');
      btns.className = 'sort-btns';

      var note = document.createElement('p');
      note.className = 'sort-why';
      var done = false;

      labels.forEach(function (label) {
        var b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('click', function () {
          if (done) return;
          var ok = label === answer;
          Array.prototype.forEach.call(btns.children, function (x) {
            x.classList.remove('picked-ok', 'picked-no');
          });
          b.classList.add(ok ? 'picked-ok' : 'picked-no');
          note.className = 'sort-why on ' + (ok ? 'ok' : 'no');
          note.innerHTML = '<span class="verdict">' + (ok ? '對。' : '不是。') + '</span>' +
                           (ok ? why : '再看一次：這句話裡有東西動了嗎？');
          if (ok) {
            done = true;
            solved++;
            paintScore();
            Array.prototype.forEach.call(btns.children, function (x) {
              if (x !== b) x.disabled = true;
            });
          }
        });
        btns.appendChild(b);
      });

      row.appendChild(btns);
      li.appendChild(row);
      li.appendChild(note);
    });
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll('.sort'), setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
