/* 결과가 나온 바로 뒤에 «한 줄 남기기» — 한마디 게시판에 올립니다.
   쓰는 법: WorkroomNudge.show(anchorEl, {q:'…', chips:['…','…']})
   한 페이지에서 한 번만 뜹니다. */
(function () {
  var shown = false;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(anchor, opt) {
    if (shown || !anchor || !window.WorkroomApi) return;
    shown = true; opt = opt || {};
    var box = document.createElement('div');
    box.className = 'nudge';
    box.innerHTML = '<p class="nq">' + esc(opt.q || '써 보니 어떠셨어요? 한 줄 남겨 주세요') + '</p>'
      + '<div class="nchips">' + (opt.chips || []).map(function (c) { return '<button type="button" class="nchip">' + esc(c) + '</button>'; }).join('') + '</div>'
      + '<textarea class="ntext" maxlength="200" rows="2" aria-label="한 줄 남기기" placeholder="직접 적어도 됩니다 (200자 안)"></textarea>'
      + '<div class="nrow"><button type="button" class="post npost">한마디에 올리기</button><button type="button" class="ghost nlater">다음에 할게요</button></div>'
      + '<p class="nsay">한마디에 <b>익명으로 올라가 누구나 봅니다</b> · 이름·연락처는 적지 마세요 · 하루 3개</p>'
      + '<p class="nstat" role="status" aria-live="polite"></p>';
    anchor.insertAdjacentElement('afterend', box);
    var ta = box.querySelector('.ntext'), st = box.querySelector('.nstat'), btn = box.querySelector('.npost');
    function say(m, err) { st.textContent = m; st.classList.toggle('err', !!err); }
    box.querySelectorAll('.nchip').forEach(function (b) { b.addEventListener('click', function () { ta.value = b.textContent; ta.focus(); }); });
    box.querySelector('.nlater').addEventListener('click', function () { box.remove(); });
    btn.addEventListener('click', async function () {
      var text = ta.value.trim();
      if (text.length < 2) { say('한마디를 고르거나 적어 주세요.', true); ta.focus(); return; }
      btn.disabled = true; say('올리는 중…');
      try {
        var r = await WorkroomApi.post('/api/board', { tab: 'cheer', text: text });
        box.innerHTML = '<p class="nq">고맙습니다! 올렸습니다.</p><p class="nsay">' + (r.masked ? '연락처·링크로 보이는 부분은 가렸습니다. ' : '') + '한마디 게시판에서 볼 수 있습니다.</p>';
      } catch (e) { say((e && e.message) || '지금은 올리지 못했습니다.', true); btn.disabled = false; }
    });
  }
  window.WorkroomNudge = { show: show };
})();
