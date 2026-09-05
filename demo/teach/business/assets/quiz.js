// 共用測驗元件：點選項即時回饋，答完顯示解說
// 用法：<div class="quiz" data-answer="2"> 內放 .q、多個 button.opt、.explain
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var answer = parseInt(quiz.dataset.answer, 10);
    var opts = quiz.querySelectorAll('button.opt');
    opts.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        if (quiz.classList.contains('answered')) return;
        quiz.classList.add('answered');
        if (i === answer) {
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          opts[answer].classList.add('correct');
        }
      });
    });
  });
});
