/* order.js — 共用排序題元件 */
/*
   把打散的句子排成正確順序。每一列顯示它目前落在哪一站。

   用法（HTML）：

   <div class="order" data-labels="P 結論,R 理由,E 例子,P 結論＋下一步">
     <ul class="order-items">
       <li data-pos="1">這句該排第一</li>
       <li data-pos="2">這句該排第二</li>
     </ul>
   </div>

   data-labels 依序對應第一站、第二站……數量要跟題目數一樣。
   載入時洗牌（若洗成正確順序就再洗一次，不然一開場就是答案）。
   用 ▲▼ 搬動，按「檢查」逐列給對錯。
*/

(function () {
  'use strict';

  var CSS = [
    '.order{border:1px solid var(--rule);padding:1.1rem 1.3rem;margin:1.6rem 0}',
    '.order-items{list-style:none;padding:0;margin:0}',
    '.order-items li{display:grid;grid-template-columns:7rem 1fr auto;gap:0.7rem;align-items:start;',
    'padding:0.6rem 0;border-top:1px solid var(--rule)}',
    '.order-items li:first-child{border-top:none}',
    '.order-slot{font-size:0.85rem;color:var(--accent);padding-top:0.15rem}',
    '.order-text{min-width:0}',
    '.order-move{display:flex;gap:0.25rem}',
    '.order-move button{padding:0.15rem 0.5rem;line-height:1.3;font-size:0.85rem}',
    '.order-items li.is-correct .order-slot{color:var(--good);font-weight:700}',
    '.order-items li.is-wrong .order-slot{color:var(--bad)}',
    '.order-check{margin-top:1rem}',
    '.order-score{margin:0.8rem 0 0;font-size:0.88rem;color:var(--ink-soft)}',
    '@media (max-width:34rem){.order-items li{grid-template-columns:1fr auto}',
    '.order-slot{grid-column:1 / -1}}',
    '@media print{.order-move,.order-check{display:none}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('order-styles')) return;
    var s = document.createElement('style');
    s.id = 'order-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function setup(box) {
    var list = box.querySelector('.order-items');
    if (!list) return;

    var labels = (box.dataset.labels || '').split(',').map(function (s) { return s.trim(); });
    var items = Array.prototype.slice.call(list.children);

    // 洗牌，但不接受洗成正確順序的結果
    function shuffled() {
      var a = items.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    var order = shuffled();
    var tries = 0;
    while (tries < 20 && order.every(function (li, i) { return li.dataset.pos === String(i + 1); })) {
      order = shuffled();
      tries++;
    }
    order.forEach(function (li) { list.appendChild(li); });

    // 每一列改造成：站名 + 句子 + 搬動鈕
    items.forEach(function (li) {
      var text = li.textContent.trim();
      li.textContent = '';

      var slot = document.createElement('span');
      slot.className = 'order-slot';

      var body = document.createElement('span');
      body.className = 'order-text';
      body.textContent = text;

      var move = document.createElement('span');
      move.className = 'order-move';

      var up = document.createElement('button');
      up.textContent = '▲';
      up.setAttribute('aria-label', '往上移');
      var down = document.createElement('button');
      down.textContent = '▼';
      down.setAttribute('aria-label', '往下移');

      up.addEventListener('click', function () {
        var prev = li.previousElementSibling;
        if (prev) { list.insertBefore(li, prev); repaint(); }
      });
      down.addEventListener('click', function () {
        var next = li.nextElementSibling;
        if (next) { list.insertBefore(next, li); repaint(); }
      });

      move.appendChild(up);
      move.appendChild(down);
      li.appendChild(slot);
      li.appendChild(body);
      li.appendChild(move);
    });

    var score = document.createElement('p');
    score.className = 'order-score';

    // 重畫站名；搬動後把上一次的判定清掉，舊的對錯會誤導
    function repaint(keepVerdict) {
      Array.prototype.forEach.call(list.children, function (li, i) {
        li.querySelector('.order-slot').textContent = labels[i] || ('第 ' + (i + 1) + ' 站');
        if (!keepVerdict) li.classList.remove('is-correct', 'is-wrong');
      });
      if (!keepVerdict) score.textContent = '';
    }
    repaint();

    var btn = document.createElement('button');
    btn.className = 'order-check';
    btn.textContent = '檢查';

    btn.addEventListener('click', function () {
      var right = 0;
      Array.prototype.forEach.call(list.children, function (li, i) {
        var ok = li.dataset.pos === String(i + 1);
        li.classList.remove('is-correct', 'is-wrong');
        li.classList.add(ok ? 'is-correct' : 'is-wrong');
        if (ok) right++;
      });
      repaint(true);
      score.textContent = right === list.children.length
        ? '全對。這就是 PREP 的順序。'
        : '對了 ' + right + ' / ' + list.children.length + '。紅色的那幾站再搬一次。';
    });

    box.appendChild(btn);
    box.appendChild(score);
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll('.order'), setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
