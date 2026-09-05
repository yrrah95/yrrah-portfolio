/* match.js — 共用配對題元件 */
/*
   一件事 × 多個聽眾：把每個聽眾配上該講的那一句。

   用法（HTML）：

   <div class="match">
     <p class="match-fact">事實：……</p>
     <ul class="match-rows">
       <li data-correct="a" data-feedback="為什麼是這句">主管</li>
       <li data-correct="b" data-feedback="……">同事</li>
     </ul>
     <ul class="match-bank">
       <li data-key="a">句子一</li>
       <li data-key="b">句子二</li>
     </ul>
   </div>

   元件把 bank 收成每一列的下拉選單（順序洗牌），bank 本身隱藏。
   按「檢查」後逐列給對錯與理由；錯的列可以改，改完再檢查。
*/

(function () {
  'use strict';

  var CSS = [
    '.match{border:1px solid var(--rule);padding:1.1rem 1.3rem;margin:1.6rem 0}',
    '.match-fact{margin:0 0 1rem;font-weight:700}',
    '.match-bank{display:none}',
    '.match-rows{list-style:none;padding:0;margin:0}',
    '.match-rows li{display:grid;grid-template-columns:7rem 1fr;gap:0.8rem;align-items:start;',
    'padding:0.7rem 0;border-top:1px solid var(--rule)}',
    '.match-rows li:first-child{border-top:none}',
    '.match-who{color:var(--ink-soft);font-size:0.95rem;padding-top:0.35rem}',
    '.match-pick select{font:inherit;color:inherit;background:var(--paper);',
    'border:1px solid var(--rule);padding:0.4rem 0.5rem;width:100%;max-width:100%}',
    '.match-pick.is-correct select{border-color:var(--good)}',
    '.match-pick.is-wrong select{border-color:var(--bad)}',
    '.match-why{margin:0.45rem 0 0;font-size:0.88rem;line-height:1.55;color:var(--ink-soft);display:none}',
    '.match-why.on{display:block}',
    '.match-why .verdict{font-weight:700;margin-right:0.35em}',
    '.match-why.ok .verdict{color:var(--good)}',
    '.match-why.no .verdict{color:var(--bad)}',
    '.match-check{margin-top:1rem}',
    '@media (max-width:34rem){.match-rows li{grid-template-columns:1fr;gap:0.3rem}}',
    '@media print{.match-pick select{border-color:#bbb}.match-why{display:block}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('match-styles')) return;
    var s = document.createElement('style');
    s.id = 'match-styles';
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

  function setup(match) {
    var bank = match.querySelector('.match-bank');
    var rows = match.querySelector('.match-rows');
    if (!bank || !rows) return;

    var choices = Array.prototype.map.call(bank.querySelectorAll('li'), function (li) {
      return { key: li.dataset.key, text: li.textContent.trim() };
    });

    Array.prototype.forEach.call(rows.children, function (row) {
      var who = row.textContent.trim();
      row.textContent = '';

      row.appendChild((function () {
        var s = document.createElement('span');
        s.className = 'match-who';
        s.textContent = who;
        return s;
      })());

      var cell = document.createElement('div');
      cell.className = 'match-pick';

      var sel = document.createElement('select');
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '—— 選一句 ——';
      sel.appendChild(blank);
      shuffle(choices.slice()).forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.key;
        o.textContent = c.text;
        sel.appendChild(o);
      });

      var why = document.createElement('p');
      why.className = 'match-why';

      cell.appendChild(sel);
      cell.appendChild(why);
      row.appendChild(cell);

      // 改選就把上一次的判定清掉，不然舊的對錯會誤導
      sel.addEventListener('change', function () {
        cell.classList.remove('is-correct', 'is-wrong');
        why.classList.remove('on');
      });
    });

    var btn = document.createElement('button');
    btn.className = 'match-check';
    btn.textContent = '檢查';
    match.appendChild(btn);

    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(rows.children, function (row) {
        var cell = row.querySelector('.match-pick');
        var sel = cell.querySelector('select');
        var why = cell.querySelector('.match-why');
        if (!sel.value) return;

        var ok = sel.value === row.dataset.correct;
        cell.classList.remove('is-correct', 'is-wrong');
        cell.classList.add(ok ? 'is-correct' : 'is-wrong');
        why.className = 'match-why on ' + (ok ? 'ok' : 'no');
        why.innerHTML = '<span class="verdict">' + (ok ? '對。' : '不是這句。') + '</span>' +
                        (ok ? (row.dataset.feedback || '') : '想一下：這個人聽完，要拿這句話去做什麼？');
      });
    });
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll('.match'), setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
