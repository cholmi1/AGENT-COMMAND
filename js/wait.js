(function () {
  window.WorkroomWait = { start: function (anchor, options) {
    const box = document.createElement('div'); box.className = 'mwait'; box.setAttribute('aria-hidden', 'true');
    const title = document.createElement('p'); title.textContent = options.title || '요청을 처리하고 있습니다.';
    const bar = document.createElement('div'); bar.className = 'loading-line';
    const note = document.createElement('small'); note.textContent = '응답을 기다리는 중입니다. 실제 진행률은 제공되지 않습니다.';
    box.append(title, bar, note); anchor.after(box);
    return function () { box.remove(); };
  } };
})();
