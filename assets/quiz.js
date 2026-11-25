/* Hub 自测题库 · 在线作答引擎（依赖 window.HUB_QUIZ 题目数组） */
(function () {
  'use strict';
  var QUESTIONS = window.HUB_QUIZ || [];
  var box = document.getElementById('quiz-box');
  if (!box) return;

  var KEY = 'hub_quiz_progress_v1';
  var state = { idx: 0, answers: {}, filter: '全部', wrongOnly: false, paper: null };

  /* ---------- 分类 ---------- */
  var cats = ['全部'];
  QUESTIONS.forEach(function (q) { if (cats.indexOf(q.cat) < 0) cats.push(q.cat); });

  function pool() {
    if (state.paper) return state.paper;
    return QUESTIONS.filter(function (q) { return state.filter === '全部' || q.cat === state.filter; });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state.answers)); } catch (e) {}
  }
  function restore() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY));
      if (a && typeof a === 'object') state.answers = a;
    } catch (e) {}
  }

  /* ---------- 渲染分类栏 ---------- */
  var catBar = document.getElementById('quiz-cats');
  function renderCats() {
    catBar.innerHTML = '';
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip quiz-cat' + (state.filter === c ? ' active' : '');
      var n = c === '全部' ? QUESTIONS.length : QUESTIONS.filter(function (q) { return q.cat === c; }).length;
      b.textContent = c + ' ' + n;
      b.onclick = function () { state.filter = c; state.idx = 0; state.paper = null; renderCats(); render(); };
      catBar.appendChild(b);
    });
  }

  /* ---------- 渲染单题 ---------- */
  function render() {
    var list = pool();
    var stat = document.getElementById('quiz-stat');
    if (!list.length) { box.innerHTML = '<p class="tool-empty">该分类暂无题目</p>'; return; }
    if (state.idx >= list.length) state.idx = list.length - 1;
    if (state.idx < 0) state.idx = 0;

    var q = list[state.idx];
    var gid = q.cat + '|' + q.q;
    var picked = state.answers[gid];
    var answered = typeof picked === 'number';

    var html = '';
    html += '<div class="quiz-meta"><span class="chip">' + q.cat + '</span>' +
      (state.paper ? '<span class="chip gold">🎲 组卷模式</span><button class="ghost" id="quiz-exit-paper" style="padding:2px 10px;font-size:12px">退出组卷</button>' : '') +
      '<span class="muted">第 ' + (state.idx + 1) + ' / ' + list.length + ' 题</span></div>';
    html += '<p class="quiz-q">' + q.q + '</p>';
    html += '<p class="quiz-q-en">' + q.qEn + '</p>';
    html += '<div class="quiz-opts">';
    q.opts.forEach(function (o, i) {
      var cls = 'quiz-opt';
      if (answered) {
        if (i === q.answer) cls += ' correct';
        else if (i === picked) cls += ' wrong';
      }
      html += '<button class="' + cls + '" data-i="' + i + '"' + (answered ? ' disabled' : '') + '>' +
              '<span class="quiz-key">' + 'ABCD'[i] + '</span><span>' + o + '</span></button>';
    });
    html += '</div>';
    if (answered) {
      html += '<div class="quiz-exp' + (picked === q.answer ? ' ok' : ' bad') + '">' +
              '<p><strong>' + (picked === q.answer ? '✅ 回答正确' : '❌ 回答错误，正确答案：' + 'ABCD'[q.answer]) + '</strong></p>' +
              '<p class="en-sub">' + q.exp + '</p>' +
              '<p class="en-sub quiz-exp-en">' + q.expEn + '</p></div>';
    }
    html += '<div class="quiz-nav">' +
            '<button class="ghost" id="quiz-prev"' + (state.idx === 0 ? ' disabled' : '') + '>← 上一题</button>' +
            '<button class="ghost" id="quiz-next"' + (state.idx === list.length - 1 ? ' disabled' : '') + '>下一题 →</button>' +
            '</div>';
    box.innerHTML = html;

    box.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.onclick = function () {
        state.answers[gid] = parseInt(b.dataset.i, 10);
        save(); render(); renderStat();
      };
    });
    var p = document.getElementById('quiz-prev'), n = document.getElementById('quiz-next');
    if (p) p.onclick = function () { state.idx--; render(); };
    if (n) n.onclick = function () { state.idx++; render(); };
    var ep = document.getElementById('quiz-exit-paper');
    if (ep) ep.onclick = function () { state.paper = null; state.idx = 0; render(); };
    renderStat();
  }

  /* ---------- 随机组卷 ---------- */
  var rnd = document.getElementById('quiz-random');
  if (rnd) rnd.onclick = function () {
    var p = QUESTIONS.filter(function (q) { return state.filter === '全部' || q.cat === state.filter; });
    for (var i = p.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    state.paper = p.slice(0, Math.min(10, p.length));
    state.idx = 0;
    render();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---------- 统计 ---------- */
  function renderStat() {
    var el = document.getElementById('quiz-stat');
    if (!el) return;
    var done = 0, right = 0;
    QUESTIONS.forEach(function (q) {
      var gid = q.cat + '|' + q.q;
      if (typeof state.answers[gid] === 'number') {
        done++;
        if (state.answers[gid] === q.answer) right++;
      }
    });
    var rate = done ? Math.round(right / done * 100) : 0;
    el.innerHTML = '已答 <strong>' + done + '</strong> / ' + QUESTIONS.length +
      ' 题 · 正确 <strong>' + right + '</strong> 题 · 正确率 <strong>' + rate + '%</strong>';
  }

  /* ---------- 重置 ---------- */
  var reset = document.getElementById('quiz-reset');
  if (reset) reset.onclick = function () {
    if (!confirm('确定要清空所有作答记录吗？')) return;
    state.answers = {}; state.idx = 0; save(); render(); renderStat();
  };

  restore();
  renderCats();
  render();
  renderStat();
})();
