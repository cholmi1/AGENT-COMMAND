/* 기다리는 동안 보이는 상자 — 단계 로그 + 명언.
   서버가 진행률을 알려 주지 않으므로 단계는 «보통 걸리는 시간»에 맞춘 어림입니다.
   끝 시간을 넘기면 가짜 100% 대신 «조금 더 걸리고 있습니다».
   쓰는 법: const end = WorkroomWait.start(statusEl, {steps, typical:25, max:40}); … end(); */
(function () {
  var Q = [
    { q: '미래를 예측하는 가장 좋은 방법은 미래를 직접 만드는 것이다.', o: 'The best way to predict the future is to invent it.', who: '앨런 케이 · 1971년' },
    { q: '요즘 가장 뜨거운 새 프로그래밍 언어는 영어다.', o: 'The hottest new programming language is English.', who: '안드레이 카파시 · 2023년 1월' },
    { q: '충분히 발달한 기술은 마법과 구별할 수 없다.', o: 'Any sufficiently advanced technology is indistinguishable from magic.', who: '아서 C. 클라크 · 1973년' },
    { q: '기계가 생각할 수 있는가?', o: 'Can machines think?', who: '앨런 튜링 · 1950년' }
  ];
  var SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function start(anchor, opt) {
    opt = opt || {};
    var steps = opt.steps || ['읽는 중', '쓰는 중'], typical = opt.typical || 25, max = opt.max || 40;
    var box = document.createElement('div');
    box.className = 'mwait'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="mw-hd"><span><span class="mw-spin"></span> ' + esc(opt.title || 'AI가 쓰고 있습니다') + '</span><span><b class="mw-sec">0초</b> · 보통 10~' + max + '초</span></div>'
      + '<ul class="mw-log">' + steps.map(function (s) { return '<li><span class="mw-m">·</span><span>' + esc(s) + '</span><span class="mw-late"></span></li>'; }).join('') + '</ul>'
      + '<div class="mw-q"><p class="mw-qt"></p><p class="mw-qo"></p><p class="mw-qw"></p></div>'
      + '<div class="mw-dots">' + Q.map(function () { return '<i></i>'; }).join('') + '</div>';
    anchor.insertAdjacentElement('afterend', box);
    var li = box.querySelectorAll('.mw-log li'), dots = box.querySelectorAll('.mw-dots i');
    var t0 = Date.now(), qi = Math.floor(Math.random() * Q.length), shownQ = -1, tick = 0;
    function draw() {
      var el = (Date.now() - t0) / 1000, over = el > max;
      var k = Math.min(steps.length - 1, Math.floor(Math.min(el / (typical * 0.9), 0.999) * steps.length));
      box.querySelector('.mw-spin').textContent = calm ? '…' : SPIN[tick % 10];
      box.querySelector('.mw-sec').textContent = Math.floor(el) + '초';
      li.forEach(function (n, i) {
        n.className = i < k ? 'ok' : i === k ? 'on' : '';
        n.querySelector('.mw-m').textContent = i < k ? '✓' : i === k ? (calm ? '›' : SPIN[tick % 10]) : '·';
        n.querySelector('.mw-late').textContent = i === k && over ? ' — 조금 더 걸리고 있습니다' : '';
      });
      var cur = qi % Q.length;
      if (cur !== shownQ) {
        var q = Q[cur], w = box.querySelector('.mw-q');
        w.querySelector('.mw-qt').textContent = '«' + q.q + '»';
        w.querySelector('.mw-qo').textContent = q.o;
        w.querySelector('.mw-qw').textContent = '— ' + q.who;
        dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); });
        shownQ = cur;
      }
    }
    draw();
    var timer = setInterval(function () { tick++; if (tick % 60 === 0) qi++; draw(); }, 100);
    return function end() { clearInterval(timer); box.remove(); };
  }
  window.WorkroomWait = { start: start };
})();
