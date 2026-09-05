/* quiz.js — 共用選擇題元件 */
/*
   用法（HTML）：

   <div class="quiz">
     <p class="quiz-prompt">題目文字</p>
     <ol class="quiz-options">
       <li><button data-correct data-feedback="為什麼對">選項文字</button></li>
       <li><button data-feedback="為什麼錯">選項文字</button></li>
     </ol>
   </div>

   規則：所有選項字數必須相同，不能靠長度或語氣猜答案。
   選項預設每次載入重新洗牌（重看時仍是回憶練習，不是位置記憶）。
   在 .quiz 上加 data-shuffle="off" 可關閉洗牌。
*/

(function () {
  'use strict';

  var CSS = [
    '.quiz{border:1px solid var(--rule);padding:1.1rem 1.3rem;margin:1.6rem 0}',
    '.quiz-prompt{margin:0 0 0.9rem;font-weight:700}',
    '.quiz-options{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem}',
    '.quiz-options li{margin:0}',
    '.quiz-options button{width:100%;display:block;transition:background .12s}',
    '.quiz-options button.is-correct{border-color:var(--good);background:var(--wash)}',
    '.quiz-options button.is-wrong{border-color:var(--bad);opacity:.72}',
    '.quiz-fb{margin:0.9rem 0 0;font-size:0.92rem;line-height:1.6;padding-left:0.9rem;border-left:3px solid var(--rule)}',
    '.quiz-fb.ok{border-left-color:var(--good)}',
    '.quiz-fb.no{border-left-color:var(--bad)}',
    '.quiz-fb .verdict{font-weight:700;margin-right:0.4em}',
    '.quiz-fb.ok .verdict{color:var(--good)}',
    '.quiz-fb.no .verdict{color:var(--bad)}',
    '@media print{.quiz-options button{border-color:#bbb}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('quiz-styles')) return;
    var s = document.createElement('style');
    s.id = 'quiz-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Fisher–Yates 洗牌
  function shuffle(nodes) {
    for (var i = nodes.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = nodes[i];
      nodes[i] = nodes[j];
      nodes[j] = tmp;
    }
    return nodes;
  }

  function setup(quiz) {
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;

    if (quiz.dataset.shuffle !== 'off') {
      shuffle(Array.prototype.slice.call(list.children))
        .forEach(function (li) { list.appendChild(li); });
    }

    var fb = document.createElement('p');
    fb.className = 'quiz-fb';
    fb.hidden = true;
    quiz.appendChild(fb);

    var solved = false;

    list.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn || solved) return;

      var correct = btn.hasAttribute('data-correct');

      btn.classList.remove('is-correct', 'is-wrong');
      btn.classList.add(correct ? 'is-correct' : 'is-wrong');

      fb.hidden = false;
      fb.className = 'quiz-fb ' + (correct ? 'ok' : 'no');
      fb.innerHTML = '<span class="verdict">' + (correct ? '對。' : '再想一次。') + '</span>' +
                     (btn.dataset.feedback || '');

      if (correct) {
        solved = true;
        // 答對後把其餘選項的理由一併攤開，答錯的路徑也要被看見
        Array.prototype.forEach.call(list.querySelectorAll('button'), function (b) {
          if (b !== btn) b.disabled = true;
        });
      }
    });
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll('.quiz'), setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
